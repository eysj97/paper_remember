// small string helpers shared by the dictionary lookup, the study rules and the quiz

export function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i]
    for (let j = 1; j <= b.length; j += 1) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = row
  }
  return prev[b.length]
}

export function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// matches the word as a whole word, ignoring case
export function wordPattern(word) {
  return new RegExp(`\\b${escapeRegExp(word.trim())}\\b`, 'i')
}

export const containsWord = (sentence, word) => wordPattern(word).test(sentence)
