// Study rules: what to review when (forgetting curve), what today's plan contains, and in which
// order each study button hands out questions. Pure functions over the saved word list, so the
// quiz screens, home and library all read from the same rules.
import { containsWord, dialogueTurns, splitSentences } from './text.js'

// The two modes share one wordbook but keep their own study progress, so a word learned in exam
// mode is still new in conversation mode (spec: the same word can be studied in both modes).
// word.progress = { exam: {...}, conversation: {...} }, each holding
//   learned, learnedAt, reviewStage, reviewDueAt, lastReviewedAt, reviewCount, wrongCount, lastWrongAt
const PROGRESS_FIELDS = ['learned', 'learnedAt', 'reviewStage', 'reviewDueAt', 'lastReviewedAt', 'reviewCount', 'wrongCount', 'lastWrongAt']
const modeKey = (mode) => (mode === 'conversation' ? 'conversation' : 'exam')

// words saved before progress was split by mode kept it on the word itself; exam was the default mode then
function legacyProgress(word) {
  const old = {}
  for (const field of PROGRESS_FIELDS) if (word[field] !== undefined) old[field] = word[field]
  return Object.keys(old).length > 0 ? { exam: old } : {}
}

const allProgress = (word) => word.progress ?? legacyProgress(word)

// this word's study progress in one mode ({} when it was never studied there)
export const progressOf = (word, mode) => allProgress(word)[modeKey(mode)] ?? {}

// learned in either mode (goals count a word once, whichever mode it was learned in)
export const isLearnedInAnyMode = (word) => Object.values(allProgress(word)).some((p) => p.learned)

// the latest time the word was studied in any mode (used to pick the newer copy when syncing)
export const lastStudiedAt = (word) => Math.max(0, ...Object.values(allProgress(word)).map((p) => p.lastReviewedAt ?? 0))

const HOUR = 3_600_000
const DAY = 24 * HOUR

// ---------------------------------------------------------------------------------------------
// 1. Forgetting curve -> review schedule
//    Ebbinghaus: memory drops fastest right after learning, and every successful recall flattens
//    the curve. So each correct answer pushes the next review further out: 1, 3, 7, 14, then 30
//    days (kept at 30 once reached). A wrong answer resets the word to stage 0 and brings it
//    back a few hours later the same day. These numbers are tunable parameters, not fixed.
// ---------------------------------------------------------------------------------------------
export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30]
export const RETRY_AFTER_WRONG_HOURS = 4

// ---------------------------------------------------------------------------------------------
// 2. Today's plan (home): new words + reviews that are due
// ---------------------------------------------------------------------------------------------
export const DEFAULT_DAILY_NEW = 10

// ---------------------------------------------------------------------------------------------
// 3. Study buttons in the library
//      새로운 단어 암기 -> random order among words not learned yet
//      복습하기         -> due words, the longest-overdue first
//      오답노트         -> words answered wrong, the most-missed first
// ---------------------------------------------------------------------------------------------
export const SESSION_SIZE = 10

const startOfDay = (time) => {
  const d = new Date(time)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
const endOfDay = (time) => startOfDay(time) + DAY - 1
const isSameDay = (a, b) => startOfDay(a) === startOfDay(b)

const MAX_ARRANGE_WORDS = 8

// a single plain word, short enough to spell out letter by letter
const SPELLABLE = /^[a-z]{3,14}$/i

// which question types a word can be asked with in the chosen mode (no mode chosen yet = exam).
// Types that also need other saved words (wrong choices, matching pairs) are listed here and
// dropped later by the quiz when there aren't enough of them.
//   exam         : everything built on the Korean meaning; letterBlank / anagram need a single
//                  plain word; synonym needs the word's synonyms
//   conversation : built from the example sentence. cloze / clozeTyped / contextMeaning need the word
//                  in the sentence as-is; arrange needs a short sentence with its Korean line;
//                  sentenceOrder and dialogue need an example of two or more sentences
export function questionTypesFor(word, mode) {
  if (mode !== 'conversation') {
    const types = []
    if (word.meaning) {
      types.push('meaning', 'spelling', 'meaningChoice', 'wordChoice', 'matching')
      if (SPELLABLE.test(word.word)) types.push('letterBlank', 'anagram')
    }
    if (word.synonyms?.length > 0) types.push('synonym')
    return types
  }

  const example = word.example?.trim()
  if (!example) return []

  const types = ['makeSentence']
  if (containsWord(example, word.word)) {
    types.push('cloze', 'clozeTyped')
    if (word.meaning) types.push('contextMeaning')
  }
  if (word.exampleKo) {
    types.push('translation')
    if (example.split(/\s+/).length <= MAX_ARRANGE_WORDS) types.push('arrange')
  }
  if (splitSentences(example).length >= 2) types.push('sentenceOrder')
  if (dialogueTurns(example)?.some((turn) => containsWord(turn.text, word.word))) types.push('dialogue')
  return types
}

// a word without any usable question type is left out of that mode (conversation asks about
// example sentences, so words without one are only studied in exam mode)
export function isEligible(word, mode) {
  return questionTypesFor(word, mode).length > 0
}

// records one answer in the given mode and returns the word with that mode's new schedule
export function applyAnswer(word, correct, mode, now = Date.now()) {
  const p = progressOf(word, mode)
  const stage = correct ? (p.reviewStage ?? 0) + 1 : 0
  const nextDue = correct
    ? now + REVIEW_INTERVAL_DAYS[Math.min(stage, REVIEW_INTERVAL_DAYS.length) - 1] * DAY
    : now + RETRY_AFTER_WRONG_HOURS * HOUR

  const next = {
    learned: true,
    learnedAt: p.learnedAt ?? now,
    reviewStage: stage,
    reviewDueAt: nextDue,
    lastReviewedAt: now,
    reviewCount: (p.reviewCount ?? 0) + 1,
    wrongCount: (p.wrongCount ?? 0) + (correct ? 0 : 1),
    lastWrongAt: correct ? p.lastWrongAt : now,
  }
  // the old per-word fields move into progress.exam the first time the word is answered again
  const rest = { ...word }
  for (const field of PROGRESS_FIELDS) delete rest[field]
  return { ...rest, progress: { ...allProgress(word), [modeKey(mode)]: next } }
}

function shuffle(list, random) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// the words a study button will hand out, in the order the questions are asked
export function buildQueue(kind, words, { mode = null, now = Date.now(), limit = SESSION_SIZE, random = Math.random } = {}) {
  const eligible = words.filter((w) => isEligible(w, mode))
  const p = (w) => progressOf(w, mode)

  let queue = []
  if (kind === 'new') {
    queue = shuffle(eligible.filter((w) => !p(w).learned), random)
  } else if (kind === 'review') {
    queue = eligible
      .filter((w) => p(w).learned && p(w).reviewDueAt && p(w).reviewDueAt <= now)
      .sort((a, b) => p(a).reviewDueAt - p(b).reviewDueAt || (p(a).lastReviewedAt ?? 0) - (p(b).lastReviewedAt ?? 0))
  } else if (kind === 'wrong') {
    queue = eligible
      .filter((w) => p(w).wrongCount > 0)
      .sort((a, b) => p(b).wrongCount - p(a).wrongCount || (p(b).lastWrongAt ?? 0) - (p(a).lastWrongAt ?? 0))
  }
  return queue.slice(0, limit)
}

// how many words each study button has waiting
export function studyCounts(words, mode = null, now = Date.now()) {
  const all = { mode, now, limit: Infinity }
  return {
    fresh: buildQueue('new', words, all).length,
    review: buildQueue('review', words, all).length,
    wrong: buildQueue('wrong', words, all).length,
  }
}

// Today's plan. `done` counts what was already finished today, so the progress bar keeps its
// meaning through the day; the targets shrink when fewer words exist than the daily amount.
//   new words : up to `dailyNew` per day (a goal can raise/lower it later)
//   reviews   : every word whose review falls due by the end of today, overdue ones included
export function buildDailyPlan(words, { mode = null, now = Date.now(), dailyNew = DEFAULT_DAILY_NEW } = {}) {
  const progress = words.filter((w) => isEligible(w, mode)).map((w) => progressOf(w, mode))
  const today = (time) => Boolean(time) && isSameDay(time, now)

  const newDone = progress.filter((p) => today(p.learnedAt)).length
  const newLeft = progress.filter((p) => !p.learned).length
  const newTarget = Math.min(dailyNew, newDone + newLeft)

  const reviewLeft = progress.filter((p) => p.learned && p.reviewDueAt && p.reviewDueAt <= endOfDay(now)).length
  // reviewed today (not a first-time learn) and pushed beyond today = finished for today
  const reviewDone = progress.filter(
    (p) => today(p.lastReviewedAt) && !today(p.learnedAt) && p.reviewDueAt > endOfDay(now),
  ).length

  const percent = (done, target) => (target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0)
  return {
    new: { target: newTarget, done: Math.min(newDone, newTarget), percent: percent(newDone, newTarget) },
    review: {
      target: reviewDone + reviewLeft,
      done: reviewDone,
      percent: percent(reviewDone, reviewDone + reviewLeft),
    },
  }
}
