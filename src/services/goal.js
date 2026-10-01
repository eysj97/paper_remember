// The study goal (spec 4): 목적 (free text, mypage only) -> 목표 (type + value + period) -> 세부목표
// (today's amount, worked out by the app). Dates are kept as { year, month, day } like the pickers.
import { DEFAULT_DAILY_NEW } from './study.js'

const DAY = 24 * 3_600_000

// labels follow the spec's noun forms; the order keeps 정답률 near the bottom (harder for beginners)
export const GOAL_TYPES = [
  { id: 'streak', label: '연속 학습', suffix: '일 연속학습하기', inputType: 'number', placeholder: '7' },
  { id: 'book', label: '한 권 끝내기', suffix: ' 한권 끝내기', inputType: 'text', placeholder: '예: Harry Potter' },
  { id: 'words', label: '단어 수', suffix: '단어 외우기', inputType: 'number', placeholder: '100' },
  { id: 'accuracy', label: '정답률', suffix: '% 정답률 달성하기', inputType: 'number', placeholder: '90' },
  { id: 'custom', label: '직접 입력', inputType: 'text', placeholder: '나만의 목표를 입력해보세요' },
]

export const goalType = (goal) => GOAL_TYPES.find((t) => t.id === goal?.type) ?? null

// a custom goal is a pledge: no progress bar, and the daily plan hands out reviews only
export const isTrackable = (goal) => Boolean(goalType(goal)) && goal.type !== 'custom'

// "100단어 외우기" / the custom sentence; empty until a type and value are both filled in
export function goalTitle(goal) {
  const type = goalType(goal)
  const value = String(goal?.value ?? '').trim()
  if (!type || !value) return ''
  return type.id === 'custom' ? value : `${value}${type.suffix}`
}

// 연속 학습 N일: the period is worked out, today through the N-th day (today counts as day 1)
export const isAutoPeriod = (goal) => goal?.type === 'streak'
export const autoPeriodDays = (goal) => Math.floor(Number(goal?.value))

export function withAutoPeriod(goal, now = Date.now()) {
  const days = autoPeriodDays(goal)
  if (!isAutoPeriod(goal) || !(days > 0)) return goal
  const end = new Date(now)
  end.setDate(end.getDate() + days - 1)
  return { ...goal, startDate: timeToDate(now), endDate: timeToDate(end.getTime()) }
}

// applies a change to the goal; picking 연속 학습 or changing its days restarts the period from today
export function changeGoal(goal, patch, now = Date.now()) {
  const next = { ...goal, ...patch }
  return 'type' in patch || 'value' in patch ? withAutoPeriod(next, now) : next
}

const startOfDay = (time) => {
  const d = new Date(time)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export const dateToTime = ({ year, month, day }) => new Date(year, month - 1, day).getTime()
export function timeToDate(time) {
  const d = new Date(time)
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }
}

// days left in the period, today included (at least 1 so the daily amount never divides by zero)
export function daysLeft(endDate, now = Date.now()) {
  if (!endDate) return 1
  return Math.max(1, Math.round((dateToTime(endDate) - startOfDay(now)) / DAY) + 1)
}

const sameTitle = (tag, title) => tag.replace(/^#+/, '').trim().toLowerCase() === title.trim().toLowerCase()
const bookWords = (words, title) => words.filter((w) => (w.tags ?? []).some((tag) => sameTitle(tag, title)))

// where a trackable goal stands; null for a custom or unfinished goal
//   streak   : consecutive study days      words : words learned so far
//   accuracy : overall correct answers %   book  : learned share of the words tagged with that book
export function goalProgress(goal, { words = [], streak = 0, accuracy = 0 } = {}) {
  if (!isTrackable(goal) || !goalTitle(goal)) return null

  let current = 0
  let target = Number(goal.value) || 0
  if (goal.type === 'streak') current = streak
  else if (goal.type === 'words') current = words.filter((w) => w.learned).length
  else if (goal.type === 'accuracy') current = accuracy
  else if (goal.type === 'book') {
    const list = bookWords(words, String(goal.value))
    current = list.filter((w) => w.learned).length
    target = list.length
  }

  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  return { current, target, percent }
}

// 세부목표: how many new words today. Goals that count words spread what is left over the days
// left (counted from the start of today, so the amount holds steady while today's words are learned);
// the other trackable goals use the default pace, and a custom goal asks for reviews only.
export function dailyNewFor(goal, words = [], now = Date.now()) {
  if (!goalTitle(goal)) return DEFAULT_DAILY_NEW
  if (goal.type === 'custom') return 0

  const learnedBeforeToday = (w) => w.learned && (w.learnedAt ?? 0) < startOfDay(now)
  const days = daysLeft(goal.endDate, now)
  if (goal.type === 'words') {
    const left = (Number(goal.value) || 0) - words.filter(learnedBeforeToday).length
    return Math.ceil(Math.max(0, left) / days)
  }
  if (goal.type === 'book') {
    const list = bookWords(words, String(goal.value))
    if (list.length === 0) return DEFAULT_DAILY_NEW
    return Math.ceil(list.filter((w) => !learnedBeforeToday(w)).length / days)
  }
  return DEFAULT_DAILY_NEW
}
