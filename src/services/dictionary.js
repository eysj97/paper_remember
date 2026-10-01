// Fills in pronunciation, an example sentence, synonyms and part of speech for an English word
// from free, key-less APIs that answer in well under a second and allow browser requests:
//   - Datamuse    -> IPA pronunciation and synonyms
//   - Wiktionary  -> example sentences, part of speech and an English definition
// (dictionaryapi.dev was dropped: it regularly hangs for ~20s or answers 522.)
// The Korean meaning comes from the user; when it is left empty it is machine-translated,
// with the English definition as the last fallback.
import { translateToKorean } from './translate.js'
import { editDistance } from './text.js'

const DATAMUSE = 'https://api.datamuse.com/words'
const WIKTIONARY = 'https://en.wiktionary.org/api/rest_v1/page/definition/'
const MAX_SYNONYMS = 5
const MAX_EXAMPLE_LENGTH = 120
const CONCURRENCY = 3
const MAX_SUGGESTIONS = 3
const MAX_TYPO_DISTANCE = 3
// ignore obscure look-alikes (Datamuse frequency is per million words)
const MIN_SUGGESTION_FREQUENCY = 1

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }

function stripHtml(html = '') {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:amp|lt|gt|quot|nbsp|#39);/g, (m) => ENTITIES[m])
    .replace(/\s+/g, ' ')
    .trim()
}

async function getJson(url, signal) {
  try {
    const res = await fetch(url, { signal })
    return res.ok ? await res.json() : null
  } catch (err) {
    if (err.name === 'AbortError') throw err
    return null
  }
}

async function fetchPronunciation(term, signal) {
  const list = await getJson(`${DATAMUSE}?sp=${encodeURIComponent(term)}&md=r&ipa=1&max=5`, signal)
  const hit = list?.find((item) => item.word === term)
  const ipa = hit?.tags?.find((tag) => tag.startsWith('ipa_pron:'))?.slice('ipa_pron:'.length)
  return ipa ? `/${ipa}/` : ''
}

async function fetchSynonyms(term, signal) {
  const list = await getJson(`${DATAMUSE}?rel_syn=${encodeURIComponent(term)}&max=${MAX_SYNONYMS}`, signal)
  return (list ?? []).map((item) => item.word)
}

// Similar-looking real words for a word the dictionary does not know: fuzzy matches (typos)
// plus words that start with it (cut-off words), keeping only reasonably common ones.
async function fetchSuggestions(term, signal) {
  const [similar, completions] = await Promise.all(
    [term, `${term}*`].map((pattern) =>
      getJson(`${DATAMUSE}?sp=${encodeURIComponent(pattern)}&md=f&max=10`, signal),
    ),
  )
  const seen = new Set()
  return [...(similar ?? []), ...(completions ?? [])]
    .map((item) => ({
      word: item.word,
      frequency: Number(item.tags?.find((t) => t.startsWith('f:'))?.slice(2)) || 0,
    }))
    .filter((c) => {
      if (c.word === term || seen.has(c.word) || !/^[a-z]+$/.test(c.word)) return false
      seen.add(c.word)
      return c.frequency >= MIN_SUGGESTION_FREQUENCY && editDistance(term, c.word) <= MAX_TYPO_DISTANCE
    })
    .sort((a, b) => editDistance(term, a.word) - editDistance(term, b.word) || b.frequency - a.frequency)
    .slice(0, MAX_SUGGESTIONS)
    .map((c) => c.word)
}

// Wiktionary lists common typos as their own entries: "Misspelling of <a title="receive">"
function findMisspellingTarget(definitions) {
  for (const { definition = '' } of definitions) {
    if (!/misspelling of/i.test(stripHtml(definition))) continue
    const target = definition.match(/<a [^>]*title="([^"]+)"/)?.[1]
    if (target) return target
  }
  return ''
}

// picks a short example that actually contains the word, else the first one available
function pickExample(examples, term) {
  const short = examples.filter((e) => e.length <= MAX_EXAMPLE_LENGTH)
  const pool = short.length ? short : examples
  return pool.find((e) => e.toLowerCase().includes(term)) ?? pool[0] ?? ''
}

function parseWiktionary(data, term) {
  const entries = data?.en ?? []
  const definitions = entries.flatMap((entry) => entry.definitions ?? [])
  const examples = definitions.flatMap((d) => (d.parsedExamples ?? []).map((e) => stripHtml(e.example)))

  const misspellingOf = findMisspellingTarget(definitions)

  return {
    example: misspellingOf ? '' : pickExample(examples.filter(Boolean), term),
    definition: misspellingOf ? '' : stripHtml(definitions.find((d) => d.definition)?.definition),
    partOfSpeech: misspellingOf ? '' : entries[0]?.partOfSpeech?.toLowerCase() ?? '',
    misspellingOf,
    found: entries.length > 0,
  }
}

async function lookupWord(word, signal) {
  const term = word.trim().toLowerCase()
  const [phonetic, synonyms, wiktionary] = await Promise.all([
    fetchPronunciation(term, signal),
    fetchSynonyms(term, signal),
    getJson(`${WIKTIONARY}${encodeURIComponent(term)}`, signal),
  ])
  const entry = parseWiktionary(wiktionary, term)

  let suggestions = []
  if (entry.misspellingOf) suggestions = [entry.misspellingOf]
  else if (!entry.found) suggestions = await fetchSuggestions(term, signal)

  return {
    ...entry,
    phonetic,
    synonyms,
    suggestions,
    found: entry.found || Boolean(phonetic) || synonyms.length > 0,
  }
}

async function enrichOne({ word, meaning }, signal) {
  const info = await lookupWord(word, signal)
  const [exampleKo, wordKo] = await Promise.all([
    info.example ? translateToKorean(info.example, signal) : '',
    meaning ? '' : translateToKorean(word, signal),
  ])
  // the translator echoes back words it does not know, which is not a meaning
  const translated = wordKo.toLowerCase() === word.toLowerCase() ? '' : wordKo
  return {
    word,
    userMeaning: meaning,
    meaning: meaning || translated || info.definition,
    phonetic: info.phonetic,
    example: info.example,
    exampleKo,
    partOfSpeech: info.partOfSpeech,
    synonyms: info.synonyms,
    suggestions: info.suggestions,
    found: info.found,
  }
}

// words: [{ word, meaning }]; onProgress(doneCount) fires as each word finishes.
// Results keep the input order even though a few lookups run at the same time.
export async function enrichWords(words, { signal, onProgress } = {}) {
  const results = new Array(words.length)
  let next = 0
  let done = 0

  const worker = async () => {
    while (next < words.length) {
      const index = next++
      results[index] = await enrichOne(words[index], signal)
      done += 1
      onProgress?.(done)
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, words.length) }, worker))
  return results
}
