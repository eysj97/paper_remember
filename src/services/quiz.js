// Builds and grades study questions (spec section 3).
//   exam         : 'meaning'  - see the English word, type the Korean meaning
//                  'spelling' - see the Korean meaning, type the English word (exact match)
//   conversation : 'cloze'          - example sentence with the word blanked, pick the word
//                  'contextMeaning' - sentence with the word underlined, pick its meaning
//                  'arrange'        - Korean sentence, put the English words in order
// Wrong-answer choices come from the user's other saved words, so no extra data is needed.
import { questionTypesFor } from './study.js'
import { editDistance, wordPattern } from './text.js'

const CHOICE_COUNT = 4
export const BLANK = '_____'

export const QUESTION_LABELS = {
  meaning: '뜻 쓰기',
  spelling: '스펠링 쓰기',
  cloze: '빈칸 채우기',
  contextMeaning: '뜻 떠올리기',
  arrange: '문장 조합',
}

function shuffle(list, random = Math.random) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const normalizeKo = (text) => text.replace(/[\s.,!?~"'()]/g, '').toLowerCase()

// "불안한, 걱정하는 / 초조한" -> ['불안한', '걱정하는', '초조한']
function meaningPieces(meaning) {
  return meaning.split(/[,;/·]/).map((piece) => piece.trim()).filter(Boolean)
}

// The meaning is graded loosely: any one of the listed meanings counts, a one-letter slip is
// forgiven for longer answers, and an answer that clearly contains (or is contained in) a meaning is accepted.
export function isMeaningCorrect(answer, meaning) {
  const given = normalizeKo(answer)
  if (!given) return false

  const candidates = [...meaningPieces(meaning), meaning].map(normalizeKo).filter(Boolean)
  return candidates.some((candidate) => {
    if (candidate === given) return true
    if (given.length >= 3 && candidate.length >= 3 && editDistance(given, candidate) <= 1) return true
    const [short, long] = given.length <= candidate.length ? [given, candidate] : [candidate, given]
    return short.length >= 2 && long.includes(short) && short.length / long.length >= 0.4
  })
}

const normalizeEnglish = (text) => text.trim().replace(/\s+/g, ' ').toLowerCase()

export const isSpellingCorrect = (answer, word) => normalizeEnglish(answer) === normalizeEnglish(word)

// other saved words to draw wrong choices from; the same part of speech first, which makes them
// plausible, and never a duplicate of the right answer
function pickDistractors(item, allWords, valueOf, random) {
  const others = allWords.filter((w) => w.word.toLowerCase() !== item.word.toLowerCase() && valueOf(w))
  const samePos = shuffle(others.filter((w) => w.partOfSpeech && w.partOfSpeech === item.partOfSpeech), random)
  const rest = shuffle(others.filter((w) => !samePos.includes(w)), random)

  const correct = normalizeKo(valueOf(item))
  const seen = new Set([correct])
  const picked = []
  for (const w of [...samePos, ...rest]) {
    const value = valueOf(w)
    const key = normalizeKo(value)
    if (seen.has(key)) continue
    seen.add(key)
    picked.push(value)
    if (picked.length === CHOICE_COUNT - 1) break
  }
  return picked
}

function withChoices(question, correct, distractors, random) {
  // with no other word to borrow from, the question falls back to typing the answer
  if (distractors.length === 0) return { ...question, choices: null }
  return { ...question, choices: shuffle([correct, ...distractors], random) }
}

function shuffleTokens(tokens, random) {
  const chips = tokens.map((text, id) => ({ id, text }))
  if (chips.length < 2) return chips
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const mixed = shuffle(chips, random)
    if (mixed.some((chip, i) => chip.id !== i)) return mixed
  }
  return [...chips].reverse()
}

// one question for a saved word, or null when the mode has nothing to ask about it
export function makeQuestion(item, mode, allWords = [], random = Math.random) {
  const types = questionTypesFor(item, mode)
  if (types.length === 0) return null
  const type = types[Math.floor(random() * types.length)]
  const base = { id: `${item.word}-${type}`, type, item }

  if (type === 'meaning' || type === 'spelling') return base

  if (type === 'cloze') {
    const question = { ...base, sentence: item.example.replace(wordPattern(item.word), BLANK) }
    return withChoices(question, item.word, pickDistractors(item, allWords, (w) => w.word, random), random)
  }

  if (type === 'contextMeaning') {
    const question = { ...base, sentence: item.example }
    return withChoices(question, item.meaning, pickDistractors(item, allWords, (w) => w.meaning, random), random)
  }

  const tokens = item.example.trim().split(/\s+/)
  return { ...base, chips: shuffleTokens(tokens, random), solution: tokens }
}

export function makeQuestions(items, mode, allWords, random = Math.random) {
  return items.map((item) => makeQuestion(item, mode, allWords, random)).filter(Boolean)
}

// answer: typed text, a picked choice, or (arrange) the chip ids in the order the user placed them
export function gradeAnswer(question, answer) {
  const { type, item } = question
  switch (type) {
    case 'meaning':
      return isMeaningCorrect(answer, item.meaning)
    case 'spelling':
    case 'cloze':
      return isSpellingCorrect(answer, item.word)
    case 'contextMeaning':
      return question.choices ? answer === item.meaning : isMeaningCorrect(answer, item.meaning)
    case 'arrange':
      return (
        answer.length === question.solution.length &&
        answer.every((id, i) => question.chips.find((chip) => chip.id === id)?.text === question.solution[i])
      )
    default:
      return false
  }
}

// what to show as "the answer" once a question is done
export function correctAnswerText(question) {
  const { type, item } = question
  if (type === 'meaning' || type === 'contextMeaning') return item.meaning
  if (type === 'arrange') return item.example
  return item.word
}

// how the user's own answer reads in the feedback
export function answerText(question, answer) {
  if (question.type === 'arrange') {
    return answer.map((id) => question.chips.find((chip) => chip.id === id)?.text).join(' ')
  }
  return answer
}
