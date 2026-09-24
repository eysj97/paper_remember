import craftBg from '../../imges/craft-page-sm.png'
import checkIcon from '../assets/icons/task-check.svg'
import ringTrack from '../assets/home/ring-track.svg'
import ringProgress from '../assets/home/ring-progress.svg'
import BottomNav from '../components/BottomNav.jsx'
import ModeBadge from '../components/ModeBadge.jsx'
import { buildDailyPlan } from '../services/study.js'
import './HomePage.css'

const USER_NAME = 'user name'
const GOAL_TITLE = '100일간 연속으로 학습하기'
const GOAL_PERCENT = 3
const STREAK_DAYS = 3

// today's tasks come from the study rules (new words + reviews due by the forgetting curve)
function todaysTasks(words, studyMode) {
  const plan = buildDailyPlan(words, { mode: studyMode })
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

export default function HomePage({ words = [], studyMode, onNavigate }) {
  const tasks = todaysTasks(words, studyMode)

  return (
    <div className="page home-page" data-name="홈">
      <header className="home-header">
        <img className="home-header__bg" src={craftBg} alt="" />
        <ModeBadge studyMode={studyMode} />
        <div className="home-header__content">
          <div className="home-header__ring">
            <img src={ringTrack} alt="" />
            <img src={ringProgress} alt="" />
            <span className="home-header__ring-text">{GOAL_PERCENT}%</span>
          </div>
          <div className="home-header__text">
            <p className="home-header__user">{USER_NAME}</p>
            <p className="home-header__goal">{GOAL_TITLE}</p>
          </div>
        </div>
      </header>

      <div className="home-page__greeting">
        <p>안녕하세요! 좋은 아침이예요</p>
        <p>
          <span className="home-page__highlight">{STREAK_DAYS}일째</span> 연속학습을 이어가고 있어요
        </p>
        <p>오늘도 학습을 이어가 볼까요?</p>
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
