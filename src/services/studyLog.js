// 학습 기록: answers counted per calendar day ({ 'YYYY-MM-DD': { answered, correct } }).
// Streaks and accuracy come from here, since a word only remembers its own last review.
export const STUDY_LOG_KEY = 'warld.studyLog'

const pad2 = (n) => String(n).padStart(2, '0')
export function dayKey(time = Date.now()) {
  const d = new Date(time)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

// the same time of day, `offset` calendar days away (setDate keeps DST changes out of the way)
const shiftDays = (time, offset) => {
  const d = new Date(time)
  d.setDate(d.getDate() + offset)
  return d.getTime()
}

export function loadStudyLog() {
  try {
    const log = JSON.parse(localStorage.getItem(STUDY_LOG_KEY))
    return log && typeof log === 'object' && !Array.isArray(log) ? log : {}
  } catch {
    return {}
  }
}

export function saveStudyLog(log) {
  try {
    localStorage.setItem(STUDY_LOG_KEY, JSON.stringify(log))
  } catch {
    // storage full or blocked: the in-memory log still works for this session
  }
}

export function logAnswer(log, correct, now = Date.now()) {
  const key = dayKey(now)
  const day = log[key] ?? { answered: 0, correct: 0 }
  return { ...log, [key]: { answered: day.answered + 1, correct: day.correct + (correct ? 1 : 0) } }
}

// consecutive days with at least one answer; today not studied yet keeps yesterday's streak alive
export function streakDays(log, now = Date.now()) {
  let time = log[dayKey(now)] ? now : shiftDays(now, -1)
  let days = 0
  while (log[dayKey(time)]) {
    days += 1
    time = shiftDays(time, -1)
  }
  return days
}

export function totals(log) {
  let answered = 0
  let correct = 0
  for (const day of Object.values(log)) {
    answered += day.answered
    correct += day.correct
  }
  return { answered, correct, accuracy: answered > 0 ? Math.round((correct / answered) * 100) : 0 }
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// this week, Monday through Sunday, for the weekly study row (future days simply have no answers)
export function weekDays(log, now = Date.now()) {
  const sinceMonday = (new Date(now).getDay() + 6) % 7
  return Array.from({ length: 7 }, (_, i) => {
    const time = shiftDays(now, i - sinceMonday)
    const day = log[dayKey(time)] ?? { answered: 0, correct: 0 }
    return { key: dayKey(time), label: WEEKDAYS[new Date(time).getDay()], ...day }
  })
}
