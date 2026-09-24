// The saved word list, kept in the browser until there is a backend.
const KEY = 'warld.wordbook'

export function loadWordbook() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveWordbook(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // storage full or blocked: the in-memory list still works for this session
  }
}

export function removeWord(list, word) {
  const key = word.toLowerCase()
  return list.filter((w) => w.word.toLowerCase() !== key)
}

// adds new words and updates ones already saved (matched case-insensitively)
export function upsertWords(list, words, tags = []) {
  const byWord = new Map(list.map((w) => [w.word.toLowerCase(), w]))
  for (const word of words) {
    const key = word.word.toLowerCase()
    const existing = byWord.get(key)
    byWord.set(key, { ...existing, ...word, tags, addedAt: existing?.addedAt ?? Date.now() })
  }
  return [...byWord.values()]
}
