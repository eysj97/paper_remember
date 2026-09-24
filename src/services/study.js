// Study rules: what to review when (forgetting curve), what today's plan contains, and in which
// order each study button hands out questions. Pure functions over the saved word list, so the
// quiz screens, home and library all read from the same rules.
import { containsWord } from './text.js'

// A word carries (see the Word data model in the spec):
//   learned, learnedAt, reviewStage, reviewDueAt, lastReviewedAt, reviewCount, wrongCount, lastWrongAt

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

// which question types a word can be asked with in the chosen mode (no mode chosen yet = exam).
//   exam         : meaning / spelling, both need the Korean meaning to ask or grade with
//   conversation : built from the example sentence. cloze and contextMeaning need the word to
//                  appear in the sentence as-is; arrange needs a short sentence with its Korean line
export function questionTypesFor(word, mode) {
  if (mode !== 'conversation') return word.meaning ? ['meaning', 'spelling'] : []

  const example = word.example?.trim()
  if (!example) return []

  const types = []
  if (containsWord(example, word.word)) {
    types.push('cloze')
    if (word.meaning) types.push('contextMeaning')
  }
  if (word.exampleKo && example.split(/\s+/).length <= MAX_ARRANGE_WORDS) types.push('arrange')
  return types
}

// a word without any usable question type is left out of that mode (conversation asks about
// example sentences, so words without one are only studied in exam mode)
export function isEligible(word, mode) {
  return questionTypesFor(word, mode).length > 0
}

// records one answer and returns the word with its new schedule
export function applyAnswer(word, correct, now = Date.now()) {
  const stage = correct ? (word.reviewStage ?? 0) + 1 : 0
  const nextDue = correct
    ? now + REVIEW_INTERVAL_DAYS[Math.min(stage, REVIEW_INTERVAL_DAYS.length) - 1] * DAY
    : now + RETRY_AFTER_WRONG_HOURS * HOUR

  return {
    ...word,
    learned: true,
    learnedAt: word.learnedAt ?? now,
    reviewStage: stage,
    reviewDueAt: nextDue,
    lastReviewedAt: now,
    reviewCount: (word.reviewCount ?? 0) + 1,
    wrongCount: (word.wrongCount ?? 0) + (correct ? 0 : 1),
    lastWrongAt: correct ? word.lastWrongAt : now,
  }
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

  let queue = []
  if (kind === 'new') {
    queue = shuffle(eligible.filter((w) => !w.learned), random)
  } else if (kind === 'review') {
    queue = eligible
      .filter((w) => w.learned && w.reviewDueAt && w.reviewDueAt <= now)
      .sort((a, b) => a.reviewDueAt - b.reviewDueAt || (a.lastReviewedAt ?? 0) - (b.lastReviewedAt ?? 0))
  } else if (kind === 'wrong') {
    queue = eligible
      .filter((w) => w.wrongCount > 0)
      .sort((a, b) => b.wrongCount - a.wrongCount || (b.lastWrongAt ?? 0) - (a.lastWrongAt ?? 0))
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
  const eligible = words.filter((w) => isEligible(w, mode))
  const today = (time) => Boolean(time) && isSameDay(time, now)

  const newDone = eligible.filter((w) => today(w.learnedAt)).length
  const newLeft = eligible.filter((w) => !w.learned).length
  const newTarget = Math.min(dailyNew, newDone + newLeft)

  const reviewLeft = eligible.filter((w) => w.learned && w.reviewDueAt && w.reviewDueAt <= endOfDay(now)).length
  // reviewed today (not a first-time learn) and pushed beyond today = finished for today
  const reviewDone = eligible.filter(
    (w) => today(w.lastReviewedAt) && !today(w.learnedAt) && w.reviewDueAt > endOfDay(now),
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
