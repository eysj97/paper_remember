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

// "It rained. We stayed in!" -> ['It rained.', 'We stayed in!'] (line breaks also split)
export function splitSentences(text = '') {
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?]["')\]]*)\s+(?=["'(]?[A-Z])/))
    .map((s) => s.trim())
    .filter(Boolean)
}

const SPEAKER_LINE = /^\s*([A-Za-z][A-Za-z ]{0,11})\s*:\s*(.+)$/

// a pasted example read as a short conversation: "A: … / B: …" lines, or otherwise its sentences
// taken in turn by A and B. null when there is only one line to work with.
export function dialogueTurns(text = '') {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const labelled = lines.map((l) => l.match(SPEAKER_LINE))
  const turns = labelled.length >= 2 && labelled.every(Boolean)
    ? labelled.map((m) => ({ speaker: m[1].trim(), text: m[2].trim() }))
    : splitSentences(text).map((s, i) => ({ speaker: i % 2 === 0 ? 'A' : 'B', text: s }))
  return turns.length >= 2 ? turns.slice(0, 4) : null
}
