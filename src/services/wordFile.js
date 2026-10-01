// Reads word lists from a file:
//   .csv / .tsv / .txt : "word, meaning" lines (comma, tab, " - " or ":" between the two)
//   .xlsx              : the first sheet, column A = word and column B = meaning
import { unzipSync, strFromU8 } from 'fflate'

const WORD_PATTERN = /^[A-Za-z][A-Za-z '-]*$/
const HEADER_WORDS = new Set(['word', 'words', 'english', '영단어', '단어', '영어'])

async function readText(file) {
  const buffer = await file.arrayBuffer()
  const utf8 = new TextDecoder('utf-8').decode(buffer)
  if (!utf8.includes('\uFFFD')) return utf8.replace(/^\uFEFF/, '')
  // Korean spreadsheets often export CSV as EUC-KR
  try {
    return new TextDecoder('euc-kr').decode(buffer)
  } catch {
    return utf8
  }
}

function unquote(value) {
  return value.trim().replace(/^"(.*)"$/, '$1').trim()
}

// [word, meaning] pairs -> the word list: English words only, header rows and repeats skipped
function collectWords(pairs) {
  const words = []
  const seen = new Set()
  for (const [rawWord, rawMeaning = ''] of pairs) {
    const word = rawWord.trim()
    const meaning = rawMeaning.trim()
    if (!WORD_PATTERN.test(word) || HEADER_WORDS.has(word.toLowerCase())) continue
    const key = word.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    words.push({ word, meaning })
  }
  return words
}

export function parseWordText(text) {
  const pairs = []
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const match = line.match(/^(.*?)\s*(?:[,\t]|\s-\s|\s:\s|:)\s*(.*)$/)
    pairs.push(match ? [unquote(match[1]), unquote(match[2])] : [unquote(line), ''])
  }
  return collectWords(pairs)
}

// ---------------------------------------------------------------------------------------------
// .xlsx: a zip of XML files. Only what's needed for two text columns is read: the shared string
// table, and the cells of the workbook's first sheet.
// ---------------------------------------------------------------------------------------------
const parseXml = (text) => new DOMParser().parseFromString(text, 'application/xml')
// elements by local name, whatever namespace prefix the file uses
const byTag = (node, tag) => [...node.getElementsByTagNameNS('*', tag)]
const textOf = (node) => byTag(node, 't').map((t) => t.textContent).join('')

// "B12" -> 1 (zero-based column index)
function columnIndex(ref) {
  const letters = ref.replace(/\d+/g, '')
  let index = 0
  for (const ch of letters) index = index * 26 + (ch.charCodeAt(0) - 64)
  return index - 1
}

function firstSheetPath(files) {
  const workbook = files['xl/workbook.xml'] && parseXml(strFromU8(files['xl/workbook.xml']))
  const rels = files['xl/_rels/workbook.xml.rels'] && parseXml(strFromU8(files['xl/_rels/workbook.xml.rels']))
  const sheet = workbook && byTag(workbook, 'sheet')[0]
  const relId = sheet?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
  const target = rels && byTag(rels, 'Relationship').find((r) => r.getAttribute('Id') === relId)?.getAttribute('Target')
  if (target) return target.startsWith('/') ? target.slice(1) : `xl/${target}`
  return Object.keys(files).filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).sort()[0]
}

export function parseXlsx(buffer) {
  const files = unzipSync(new Uint8Array(buffer))
  const sheetPath = firstSheetPath(files)
  if (!sheetPath || !files[sheetPath]) throw new Error('no sheet')

  const shared = files['xl/sharedStrings.xml']
    ? byTag(parseXml(strFromU8(files['xl/sharedStrings.xml'])), 'si').map(textOf)
    : []

  const pairs = byTag(parseXml(strFromU8(files[sheetPath])), 'row').map((row) => {
    const cells = []
    for (const cell of byTag(row, 'c')) {
      const type = cell.getAttribute('t')
      const value = byTag(cell, 'v')[0]?.textContent ?? ''
      let text = value
      if (type === 's') text = shared[Number(value)] ?? ''
      else if (type === 'inlineStr') text = textOf(cell)
      cells[columnIndex(cell.getAttribute('r') ?? 'A1')] = text
    }
    return [cells[0] ?? '', cells[1] ?? '']
  })
  return collectWords(pairs)
}

export const isSpreadsheet = (file) => /\.xlsx$/i.test(file.name)

export async function readWordFile(file) {
  if (isSpreadsheet(file)) return parseXlsx(await file.arrayBuffer())
  return parseWordText(await readText(file))
}
