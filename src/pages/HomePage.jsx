import craftBg from '../../imges/craft-page-sm.png'
import checkIcon from '../assets/icons/task-check.svg'
import ringTrack from '../assets/home/ring-track.svg'
import ringProgress from '../assets/home/ring-progress.svg'
import BottomNav from '../components/BottomNav.jsx'
import ModeBadge from '../components/ModeBadge.jsx'
import { buildDailyPlan } from '../services/study.js'
import { dailyNewFor, goalProgress, goalTitle } from '../services/goal.js'
import { dayKey, streakDays, totals } from '../services/studyLog.js'
import { daysSince, timeGreeting } from '../services/greeting.js'
import useNow from '../hooks/useNow.js'
import './HomePage.css'

// today's tasks come from the study rules (new words + reviews due by the forgetting curve);
// the goal sets how many new words (a custom goal asks for reviews only)
function todaysTasks(words, studyMode, goal, now) {
  const plan = buildDailyPlan(words, { mode: studyMode, now, dailyNew: dailyNewFor(goal, words, now) })
  const tasks = []
  if (plan.new.target > 0) {
    tasks.push({ id: 'new', title: `새로운 영어단어 ${plan.new.target}개 외우기`, percent: plan.new.percent })
  }
  if (plan.review.target > 0) {
    tasks.push({ id: 'review', title: `복습할 단어 ${plan.review.target}개 복습하기`, percent: plan.review.percent })
  }
  return tasks
}

// 33 segments exactly fill the 300px bar (8px segment + 1px gap each) — matches
// the Figma 100% reference (node 78:1564), where the bar is fully packed edge to edge.
const SEGMENT_COUNT = 33

function TaskCard({ title, percent }) {
  const filledCount = Math.round((percent / 100) * SEGMENT_COUNT)

  return (
    <div className="home-task">
      <div className="home-task__row">
        <img className="home-task__check" src={checkIcon} alt="" />
        <p className="home-task__title">{title}</p>
      </div>
      <div className="home-task__progress-row">
        <div className="home-task__bar">
          {Array.from({ length: SEGMENT_COUNT }, (_, i) => (
            <span
              key={i}
              className={`home-task__segment${i < filledCount ? ' home-task__segment--filled' : ''}`}
              style={i < filledCount ? { backgroundImage: `url(${craftBg})` } : undefined}
            />
          ))}
        </div>
        <span className="home-task__percent">{percent}%</span>
      </div>
    </div>
  )
}

export default function HomePage({ words = [], profile, studyLog = {}, onNavigate }) {
  const { studyMode, goal } = profile
  // re-rendered every minute so the greeting and day counts follow the clock past noon or midnight
  const now = useNow()
  const tasks = todaysTasks(words, studyMode, goal, now)
  const streak = streakDays(studyLog, now)
  const studiedToday = Boolean(studyLog[dayKey(now)])
  const greeting = timeGreeting(now)
  const progress = goalProgress(goal, { words, streak, accuracy: totals(studyLog).accuracy })

  return (
    <div className="page home-page" data-name="홈">
      <header className="home-header">
        <img className="home-header__bg" src={craftBg} alt="" />
        <ModeBadge studyMode={studyMode} />
        <div className="home-header__content">
          <div className="home-header__ring">
            <img src={ringTrack} alt="" />
            <img src={ringProgress} alt="" />
            {progress && <span className="home-header__ring-text">{progress.percent}%</span>}
          </div>
          <div className="home-header__text">
            <p className="home-header__user">{profile.nickname || '닉네임 없음'}</p>
            <p className="home-header__goal">{goalTitle(goal) || '학습 목표를 정해 주세요'}</p>
          </div>
        </div>
      </header>

      <div className="home-page__greeting">
        <p>{greeting.hello}</p>
        {streak > 0 ? (
          <p>
            <span className="home-page__highlight">{streak}일째</span>{' '}
            {studiedToday ? '연속학습을 이어가고 있어요' : '연속학습, 오늘도 이어가요'}
          </p>
        ) : (
          // no streak yet (or it was broken): count the days since the start instead
          <p>
            종이기억과 함께한 지 <span className="home-page__highlight">{daysSince(profile.onboardedAt, now)}일째</span>예요
          </p>
        )}
        {/* the day onboarding was finished there is nothing to review yet */}
        <p>{profile.onboardedAt && daysSince(profile.onboardedAt, now) === 1 ?'이제 시작해볼까요?' : greeting.invite}</p>
      </div>

      <div className="home-page__section">
        <p className="home-page__section-title">오늘의 학습</p>
        {tasks.map((task) => (
          <TaskCard key={task.id} title={task.title} percent={task.percent} />
        ))}
        {tasks.length === 0 && (
          <p className="home-page__empty">
            학습할 단어가 없어요.
            <br />
            단어를 담으면 오늘의 학습이 만들어져요.
          </p>
        )}
      </div>

      <BottomNav active="home" onNavigate={onNavigate} />
    </div>
  )
}
