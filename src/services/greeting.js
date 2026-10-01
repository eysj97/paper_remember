// Home greeting: the first and last lines follow the time of day, the middle one the study days.
// Lines stay short because the home greeting is one line each at 24px.

const TIMES_OF_DAY = [
  { from: 5, hello: '안녕하세요! 좋은 아침이에요', invite: '오늘도 학습을 이어가 볼까요?' },
  { from: 11, hello: '점심은 맛있게 드셨나요?', invite: '쉬는 시간에 단어 몇 개 볼까요?' },
  { from: 14, hello: '안녕하세요! 나른한 오후예요', invite: '잠깐 복습하고 가볼까요?' },
  { from: 18, hello: '안녕하세요! 좋은 저녁이에요', invite: '오늘 학습을 마무리해 볼까요?' },
  { from: 22, hello: '늦은 시간까지 수고 많아요', invite: '자기 전에 가볍게 복습해요' },
]

export function timeGreeting(now = Date.now()) {
  const hour = new Date(now).getHours()
  // before 5 a.m. still counts as last night
  return [...TIMES_OF_DAY].reverse().find((t) => hour >= t.from) ?? TIMES_OF_DAY[TIMES_OF_DAY.length - 1]
}

const startOfDay = (time) => {
  const d = new Date(time)
  d.setHours(0, 0, 0, 0)
  return d
}

// calendar days since onboarding, the first day being day 1
export function daysSince(startTime, now = Date.now()) {
  if (!startTime) return 1
  const from = startOfDay(startTime)
  const to = startOfDay(now)
  // round, not floor: a DST change makes one day 23 or 25 hours long
  return Math.max(1, Math.round((to - from) / 86_400_000) + 1)
}
