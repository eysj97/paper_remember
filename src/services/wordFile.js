// Reads "word, meaning" lines from a plain-text / CSV / TSV file.
const WORD_PATTERN = /^[A-Za-z][A-Za-z '-]*$/
const HEADER_WORDS = new Set(['word', 'words', '영단어', '단어'])

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

export function parseWordText(text) {
  const words = []
  const seen = new Set()

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const match = line.match(/^(.*?)\s*(?:[,\t]|\s-\s|\s:\s|:)\s*(.*)$/)
    const word = unquote(match ? match[1] : line)
    const meaning = unquote(match ? match[2] : '')

    if (!WORD_PATTERN.test(word) || HEADER_WORDS.has(word.toLowerCase())) continue
    const key = word.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    words.push({ word, meaning })
  }

  return words
}

export async function readWordFile(file) {
  return parseWordText(await readText(file))
}
