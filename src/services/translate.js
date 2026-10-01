// English -> Korean via the free MyMemory API (no key, small daily quota). Quality is basic,
// so it only fills gaps: a missing Korean meaning and the Korean line under an example sentence.
const ENDPOINT = 'https://api.mymemory.translated.net/get'

export async function translateToKorean(text, signal) {
  const query = text.trim()
  if (!query) return ''
  try {
    const res = await fetch(`${ENDPOINT}?q=${encodeURIComponent(query)}&langpair=en|ko`, { signal })
    if (!res.ok) return ''
    const data = await res.json()
    const translated = data?.responseData?.translatedText ?? ''
    // quota and other errors come back inside a 200 response
    if (Number(data.responseStatus) !== 200 || /MYMEMORY WARNING|INVALID|QUERY LENGTH/i.test(translated)) return ''
    return translated
  } catch (err) {
    if (err.name === 'AbortError') throw err
    return ''
  }
}

const HANGUL = /[가-힣]/
const MEANING_CONCURRENCY = 4

// Korean meanings for words read from a file or photo, so they show up before registering.
// onFound(word, meaning) fires as each one arrives; a reply without Korean in it counts as not found.
export async function findMeanings(words, { onFound, onProgress, signal } = {}) {
  let next = 0
  let done = 0
  let found = 0
  const worker = async () => {
    while (next < words.length) {
      const word = words[next++]
      const meaning = (await translateToKorean(word, signal)).trim()
      done += 1
      if (HANGUL.test(meaning) && meaning.toLowerCase() !== word.toLowerCase()) {
        found += 1
        onFound?.(word, meaning)
      }
      onProgress?.(done)
    }
  }
  await Promise.all(Array.from({ length: Math.min(MEANING_CONCURRENCY, words.length) }, worker))
  return found
}
