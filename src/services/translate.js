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
