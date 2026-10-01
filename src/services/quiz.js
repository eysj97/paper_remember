// Builds and grades study questions (spec section 3).
//   exam         : 'meaning'        - see the English word, type the Korean meaning
//                  'spelling'       - see the Korean meaning, type the English word (exact match)
//                  'meaningChoice'  - see the English word, pick the meaning (4 choices)
//                  'wordChoice'     - see the meaning, pick the English word (4 choices)
//                  'letterBlank'    - see the meaning and the word with letters blanked (a_p_e), type it
//                  'anagram'        - see the meaning, put the shuffled letters in order
//                  'matching'       - pair several words with their meanings
//                  'synonym'        - see the word, pick the word with a similar meaning
//   conversation : 'cloze'          - example sentence with the word blanked, pick the word
//                  'contextMeaning' - sentence with the word underlined, pick its meaning
//                  'arrange'        - Korean sentence, put the English words in order
//                  'clozeTyped'     - example sentence with the word blanked, type the word
//                  'translation'    - English sentence, pick its Korean translation
//                  'sentenceOrder'  - put the sentences of a longer example in order
//                  'makeSentence'   - write an English sentence of your own with the word
//                  'dialogue'       - a short conversation with a blank, pick the word
// Wrong choices and matching pairs come from the user's other saved words, so no extra data is needed.
import { questionTypesFor } from './study.js'
import { dialogueTurns, editDistance, escapeRegExp, splitSentences, wordPattern } from './text.js'

const CHOICE_COUNT = 4
const MATCHING_PAIRS = 4
const MAX_ORDER_SENTENCES = 5
const MIN_OWN_SENTENCE_WORDS = 3
export const BLANK = '_____'

export const QUESTION_LABELS = {
  meaning: '영단어 보고 뜻 쓰기',
  spelling: '뜻 보고 영단어 쓰기',
  meaningChoice: '영단어 보고 뜻 고르기',
  wordChoice: '뜻 보고 영단어 고르기',
  letterBlank: '철자 빈칸 채우기',
  anagram: '뒤섞인 철자 배열하기',
  matching: '짝 맞추기',
  synonym: '유의어 고르기',
  cloze: '예문 빈칸 채우기',
  contextMeaning: '뜻 떠올리기',
  arrange: '한국어 보고 영어 조합하기',
  clozeTyped: '예문 빈칸 채우기 (철자 입력)',
  translation: '해석 고르기',
  sentenceOrder: '예문 순서 맞추기',
  makeSentence: '단어로 내 문장 만들기',
  dialogue: '대화 빈칸 채우기',
}

// answered by typing / by putting chips in order / by pairing
export const TYPED_TYPES = new Set(['meaning', 'spelling', 'letterBlank', 'clozeTyped', 'makeSentence'])
export const CHIP_TYPES = new Set(['arrange', 'anagram', 'sentenceOrder'])

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

// an own sentence counts when it has a few words and uses the word, inflections included
// (anxious -> anxiously, make -> making, study -> studied)
export function isOwnSentence(answer, word) {
  if (answer.trim().split(/\s+/).length < MIN_OWN_SENTENCE_WORDS) return false
  const base = word.trim().toLowerCase()
  const stems = new Set([base, base.replace(/e$/, ''), base.replace(/y$/, 'i')].filter((s) => s.length >= 2))
  const pattern = new RegExp(`\\b(?:${[...stems].map(escapeRegExp).join('|')})[a-z]{0,4}\\b`, 'i')
  return pattern.test(answer)
}

// other saved words to draw wrong choices from; the same part of speech first, which makes them
// plausible, and never a duplicate of the right answer
function pickDistractors(item, allWords, valueOf, random, count = CHOICE_COUNT - 1) {
  const others = allWords.filter((w) => w.word.toLowerCase() !== item.word.toLowerCase() && valueOf(w))
  const samePos = shuffle(others.filter((w) => w.partOfSpeech && w.partOfSpeech === item.partOfSpeech), random)
  const rest = shuffle(others.filter((w) => !samePos.includes(w)), random)

  const seen = new Set([normalizeKo(valueOf(item))])
  const picked = []
  for (const w of [...samePos, ...rest]) {
    const value = valueOf(w)
    const key = normalizeKo(value)
    if (seen.has(key)) continue
    seen.add(key)
    picked.push(w)
    if (picked.length === count) break
  }
  return picked
}

// a pick-one question, or null when there is nothing to put next to the right answer
function withChoices(question, correct, wrong, random) {
  if (wrong.length === 0) return null
  return { ...question, answer: correct, choices: shuffle([correct, ...wrong], random) }
}

function shuffleTokens(tokens, random) {
  const chips = tokens.map((text, id) => ({ id, text }))
  if (chips.length < 2) return chips
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const mixed = shuffle(chips, random)
    // a shuffle that still reads the same (e.g. repeated letters) isn't a puzzle
    if (mixed.map((c) => c.text).join('\u0000') !== tokens.join('\u0000')) return mixed
  }
  return [...chips].reverse()
}

// "apple" -> "a_p_e": the first letter stays, about 40% of the rest are hidden
function letterPattern(word, random) {
  const letters = [...word]
  const hideCount = Math.max(1, Math.round((letters.length - 1) * 0.4))
  const hidden = new Set(shuffle(letters.map((_, i) => i).slice(1), random).slice(0, hideCount))
  return letters.map((ch, i) => (hidden.has(i) ? '_' : ch)).join('')
}

const blankOut = (sentence, word) => sentence.replace(wordPattern(word), BLANK)

const BUILDERS = {
  meaning: (q) => q,
  spelling: (q) => q,
  makeSentence: (q) => q,

  meaningChoice: (q, item, all, random) =>
    withChoices(q, item.meaning, pickDistractors(item, all, (w) => w.meaning, random).map((w) => w.meaning), random),

  wordChoice: (q, item, all, random) =>
    withChoices(q, item.word, pickDistractors(item, all, (w) => w.meaning && w.word, random).map((w) => w.word), random),

  letterBlank: (q, item, all, random) => ({ ...q, pattern: letterPattern(item.word, random) }),

  anagram: (q, item, all, random) => {
    const letters = [...item.word]
    return { ...q, chips: shuffleTokens(letters, random), solution: letters, joiner: '' }
  },

  // this word plus up to three other saved words, each meaning distinct so every pair is unambiguous
  matching: (q, item, all, random) => {
    const others = pickDistractors(item, all, (w) => w.meaning, random, MATCHING_PAIRS - 1)
    if (others.length < 2) return null
    const pairs = [item, ...others].map((w) => ({ word: w.word, meaning: w.meaning }))
    return {
      ...q,
      pairs,
      words: shuffle(pairs.map((p) => p.word), random),
      meanings: shuffle(pairs.map((p) => p.meaning), random),
    }
  },

  // one of the word's synonyms among other saved words (and their synonyms) that aren't synonyms of it
  synonym: (q, item, all, random) => {
    const own = new Set([item.word, ...item.synonyms].map((s) => s.toLowerCase()))
    const plain = item.synonyms.filter((s) => /^[a-z-]+$/i.test(s))
    const correct = shuffle(plain.length > 0 ? plain : item.synonyms, random)[0]
    const pool = shuffle(
      [...new Set(all.flatMap((w) => [w.word, ...(w.synonyms ?? [])]).filter((s) => !own.has(s.toLowerCase())))],
      random,
    )
    return withChoices(q, correct, pool.slice(0, CHOICE_COUNT - 1), random)
  },

  cloze: (q, item, all, random) =>
    withChoices(
      { ...q, sentence: blankOut(item.example, item.word) },
      item.word,
      pickDistractors(item, all, (w) => w.word, random).map((w) => w.word),
      random,
    ),

  contextMeaning: (q, item, all, random) =>
    withChoices(
      { ...q, sentence: item.example },
      item.meaning,
      pickDistractors(item, all, (w) => w.meaning, random).map((w) => w.meaning),
      random,
    ),

  arrange: (q, item, all, random) => {
    const tokens = item.example.trim().split(/\s+/)
    return { ...q, chips: shuffleTokens(tokens, random), solution: tokens, joiner: ' ' }
  },

  clozeTyped: (q, item) => ({ ...q, sentence: blankOut(item.example, item.word) }),

  translation: (q, item, all, random) =>
    withChoices(q, item.exampleKo, pickDistractors(item, all, (w) => w.exampleKo, random).map((w) => w.exampleKo), random),

  sentenceOrder: (q, item, all, random) => {
    const sentences = splitSentences(item.example).slice(0, MAX_ORDER_SENTENCES)
    return { ...q, chips: shuffleTokens(sentences, random), solution: sentences, joiner: ' ' }
  },

  dialogue: (q, item, all, random) => {
    const turns = dialogueTurns(item.example)
    const at = turns?.findIndex((turn) => wordPattern(item.word).test(turn.text)) ?? -1
    if (at < 0) return null
    const blanked = turns.map((turn, i) => (i === at ? { ...turn, text: blankOut(turn.text, item.word) } : turn))
    return withChoices(
      { ...q, turns: blanked },
      item.word,
      pickDistractors(item, all, (w) => w.word, random).map((w) => w.word),
      random,
    )
  },
}

// one question for a saved word, or null when the mode has nothing to ask about it. The type is
// picked at random; one that can't be built (e.g. no other words to choose from) gives way to the next.
export function makeQuestion(item, mode, allWords = [], random = Math.random) {
  for (const type of shuffle(questionTypesFor(item, mode), random)) {
    const question = BUILDERS[type]({ id: `${item.word}-${type}`, type, item }, item, allWords, random)
    if (question) return question
  }
  return null
}

export function makeQuestions(items, mode, allWords, random = Math.random) {
  return items.map((item) => makeQuestion(item, mode, allWords, random)).filter(Boolean)
}

const chipsText = (question, ids) =>
  ids.map((id) => question.chips.find((chip) => chip.id === id)?.text).join(question.joiner)

// answer: typed text, a picked choice, the chip ids in the order placed, or (matching) { word: meaning }
export function gradeAnswer(question, answer) {
  const { type, item } = question
  if (question.choices) return answer === question.answer
  if (CHIP_TYPES.has(type)) {
    return answer.length === question.solution.length && chipsText(question, answer) === question.solution.join(question.joiner)
  }
  switch (type) {
    case 'meaning':
      return isMeaningCorrect(answer, item.meaning)
    case 'spelling':
    case 'letterBlank':
    case 'clozeTyped':
      return isSpellingCorrect(answer, item.word)
    case 'makeSentence':
      return isOwnSentence(answer, item.word)
    case 'matching':
      return question.pairs.every((p) => answer[p.word] === p.meaning)
    default:
      return false
  }
}

// what to show as "the answer" once a question is done (makeSentence: the saved example as a model)
export function correctAnswerText(question) {
  const { type, item } = question
  if (question.answer !== undefined) return question.answer
  if (CHIP_TYPES.has(type)) return question.solution.join(question.joiner)
  if (type === 'matching') return question.pairs.map((p) => `${p.word} = ${p.meaning}`).join(' / ')
  if (type === 'makeSentence') return item.example
  if (type === 'meaning' || type === 'contextMeaning') return item.meaning
  return item.word
}

// how the user's own answer reads in the feedback
export function answerText(question, answer) {
  if (CHIP_TYPES.has(question.type)) return chipsText(question, answer)
  if (question.type === 'matching') {
    return question.words.map((w) => `${w} = ${answer[w] ?? '?'}`).join(' / ')
  }
  return answer
}
