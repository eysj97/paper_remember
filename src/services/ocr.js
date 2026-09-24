// Reads English words out of a photo. tesseract.js is loaded on demand because it is large
// and only needed when someone scans an image.
const MAX_WORDS = 30

// very common words would drown the useful ones in a photo of ordinary text
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our',
  'out', 'has', 'his', 'how', 'its', 'who', 'did', 'yes', 'she', 'him', 'had', 'that', 'with',
  'this', 'from', 'they', 'have', 'been', 'were', 'will', 'your', 'what', 'when', 'them',
])

export function extractWords(text) {
  const tokens = text.match(/[A-Za-z][A-Za-z'-]{2,}/g) ?? []
  const seen = new Set()
  const words = []
  for (const token of tokens) {
    const word = token.toLowerCase().replace(/'s$/, '').replace(/^['-]+|['-]+$/g, '')
    if (word.length < 3 || STOP_WORDS.has(word) || seen.has(word)) continue
    seen.add(word)
    words.push(word)
    if (words.length >= MAX_WORDS) break
  }
  return words
}

export async function readWordsFromImage(image) {
  const { default: Tesseract } = await import('tesseract.js')
  const { data } = await Tesseract.recognize(image, 'eng')
  return extractWords(data.text)
}
