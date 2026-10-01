import { useRef, useState } from 'react'
import craftBg from '../../imges/craft-page-sm.png'
import avatarPlaceholder from '../../imges/icon-user.png'
import plusIcon from '../../imges/icon-plus.png'
import arrowIcon from '../../imges/icon-return.png'
import BottomNav from '../components/BottomNav.jsx'
import ModeBadge from '../components/ModeBadge.jsx'
import GoalDropdown from '../components/GoalDropdown.jsx'
import DateRangeField from '../components/DateRangeField.jsx'
import { buildDailyPlan, isEligible } from '../services/study.js'
import {
  autoPeriodDays,
  changeGoal,
  dailyNewFor,
  daysLeft,
  goalProgress,
  goalTitle,
  isAutoPeriod,
  isTrackable,
} from '../services/goal.js'
import { streakDays, totals, weekDays } from '../services/studyLog.js'
import { readAvatar } from '../services/profile.js'
import { downloadBackup, restoreBackup } from '../services/backup.js'
import './MyPage.css'

const MODES = [
  {
    id: 'exam',
    title: '시험대비',
    description: '단어를 보고 답해요',
    questions: ['뜻 직접 쓰기', '스펠링 직접 쓰기'],
  },
  {
    id: 'conversation',
    title: '회화',
    description: '문장을 보고 답해요',
    questions: ['예문 빈칸 채우기', '뜻 떠올리기', '한국어 보고 영어 조합하기'],
  },
]

const GOAL_UNITS = { streak: '일', words: '개', accuracy: '%', book: '개' }

const pad2 = (n) => String(n).padStart(2, '0')
// same "26/10/01" form as the date pickers
const formatDate = ({ year, month, day }) => `${String(year).slice(2)}/${pad2(month)}/${pad2(day)}`

// the four mypage menus, in the order of the design frames
const MENUS = [
  { id: 'goal', title: '학습목표 설정', subtitle: '목적 · 목표 · 세부목표를 정해요' },
  { id: 'account', title: '계정/기타 설정', subtitle: '계정 · 프로필 · 알림 · 데이터를 관리해요' },
  { id: 'trend', title: '학습추이', subtitle: '지금까지의 학습을 돌아봐요' },
  { id: 'mode', title: '학습목적 변경', subtitle: '시험대비와 회화 중에 골라요' },
]

function ProgressBar({ percent }) {
  return (
    <div className="mypage-bar">
      <span className="mypage-bar__fill" style={{ width: `${percent}%`, backgroundImage: `url(${craftBg})` }} />
    </div>
  )
}

// ---------- 학습목표 설정: 목적 -> 목표 -> 세부목표 ----------
function GoalSection({ words, profile, studyLog, onProfileChange }) {
  const { goal, studyMode } = profile
  const update = (patch) => onProfileChange({ goal: changeGoal(goal, patch) })
  const autoPeriod = isAutoPeriod(goal) && autoPeriodDays(goal) > 0
  const [editingGoal, setEditingGoal] = useState(false)

  const title = goalTitle(goal)
  const progress = goalProgress(goal, { words, streak: streakDays(studyLog), accuracy: totals(studyLog).accuracy })
  const plan = buildDailyPlan(words, { mode: studyMode, dailyNew: dailyNewFor(goal, words) })
  const reviewOnly = goal.type === 'custom'

  return (
    <>
      <section className="mypage-section">
        <h2 className="mypage-section__title">목적</h2>
        <input
          type="text"
          className="mypage-input"
          placeholder="공부하는 이유 (예 : 여행할때 사용하기 위해서)"
          value={goal.aim}
          onChange={(e) => update({ aim: e.target.value })}
        />
        <p className="mypage-hint">* 영어를 왜 배우는지, 큰 방향을 정해요.</p>
      </section>

      <section className="mypage-section">
        <div className="mypage-section__head">
          <h2 className="mypage-section__title">목표</h2>
          <button
            type="button"
            className="mypage-section__action"
            aria-expanded={editingGoal}
            onClick={() => setEditingGoal((open) => !open)}
          >
            {editingGoal ? '완료' : '변경'}
          </button>
        </div>

        {/* the goal type / value / period inputs only open from 변경 */}
        {editingGoal && (
          <>
            <GoalDropdown value={goal} onChange={update} />
            <h3 className="mypage-section__label">기간</h3>
            <DateRangeField
              startDate={goal.startDate}
              endDate={goal.endDate}
              onStartChange={(startDate) => update({ startDate })}
              onEndChange={(endDate) => update({ endDate })}
              locked={autoPeriod}
            />
            <p className="mypage-hint">* 언제까지 얼마나 외울지, 눈에 보이는 결과를 정해요.</p>
          </>
        )}

        {!editingGoal && !title && (
          <div className="mypage-card">
            <p className="mypage-card__meta">아직 목표를 정하지 않았어요. 변경을 눌러 목표를 정해 주세요.</p>
          </div>
        )}

        {!editingGoal && title && (
          <div className="mypage-card">
            <div className="mypage-card__row">
              <p className="mypage-card__title">{title}</p>
              <span className="mypage-card__meta">D-{daysLeft(goal.endDate)}</span>
            </div>
            <p className="mypage-card__meta">
              {formatDate(goal.startDate)} ~ {formatDate(goal.endDate)}
            </p>
            {progress ? (
              <>
                <ProgressBar percent={progress.percent} />
                <p className="mypage-card__meta">
                  {progress.current}
                  {GOAL_UNITS[goal.type]} / {progress.target}
                  {GOAL_UNITS[goal.type]} · {progress.percent}%
                </p>
              </>
            ) : (
              !isTrackable(goal) && <p className="mypage-card__meta">진행도 대신 다짐으로 기록돼요.</p>
            )}
          </div>
        )}
      </section>

      <section className="mypage-section">
        <h2 className="mypage-section__title">세부목표</h2>
        <div className="mypage-card">
          <p className="mypage-card__meta">오늘 할 분량은 앱이 정해 드려요.</p>
          <div className="mypage-daily">
            {!reviewOnly && (
              <div className="mypage-daily__item">
                <span className="mypage-daily__count">{plan.new.target}</span>
                <span className="mypage-daily__label">새 단어</span>
              </div>
            )}
            <div className="mypage-daily__item">
              <span className="mypage-daily__count">{plan.review.target}</span>
              <span className="mypage-daily__label">복습</span>
            </div>
          </div>
        </div>
        <p className="mypage-hint">
          {reviewOnly
            ? '* 직접 입력한 목표는 복습 분량만 제시해요.'
            : '* 목표를 남은 기간으로 나눈 새 단어와, 복습할 때가 된 단어예요.'}
        </p>
      </section>
    </>
  )
}

// ---------- 계정/기타 설정: profile + reminder + saved data ----------
const SYNC_LABELS = {
  loading: '불러오는 중',
  syncing: '저장 중',
  synced: '서버에 저장됨',
  error: '서버에 연결하지 못했어요 · 연결되면 다시 저장해요',
}

// 계정: signed-in account and its sync state, or the way in for guests
function AccountBlock({ account }) {
  const [busy, setBusy] = useState(false)
  if (!account?.serverEnabled) {
    return (
      <section className="mypage-section">
        <h2 className="mypage-section__title">계정</h2>
        <p className="mypage-hint">* 서버가 연결되지 않아 이 기기에만 저장돼요.</p>
      </section>
    )
  }

  if (!account.email) {
    return (
      <section className="mypage-section">
        <h2 className="mypage-section__title">계정</h2>
        <div className="mypage-card">
          <p className="mypage-card__title">로그인하지 않았어요</p>
          <p className="mypage-card__meta">
            로그인하면 지금 단어장이 계정에 저장되고, 다른 기기에서도 이어서 학습할 수 있어요.
          </p>
          <button type="button" className="mypage-button" onClick={account.onSignIn}>
            로그인 / 회원가입
          </button>
        </div>
      </section>
    )
  }

  const signOut = async () => {
    if (!window.confirm('로그아웃하면 이 기기에서는 단어장이 보이지 않아요. 다시 로그인하면 그대로 불러와요. 로그아웃할까요?')) {
      return
    }
    setBusy(true)
    try {
      await account.onSignOut()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mypage-section">
      <h2 className="mypage-section__title">계정</h2>
      <div className="mypage-row">
        <span className="mypage-row__label">이메일</span>
        <span className="mypage-row__value">{account.email}</span>
      </div>
      <div className="mypage-row">
        <span className="mypage-row__label">저장 상태</span>
        <span className="mypage-row__value">{SYNC_LABELS[account.syncStatus] ?? '-'}</span>
      </div>
      <button type="button" className="mypage-link" onClick={signOut} disabled={busy}>
        {busy ? '로그아웃하는 중…' : '로그아웃'}
      </button>
    </section>
  )
}

function AccountSection({ words, profile, studyLog, account, onProfileChange, onRestore, onReset }) {
  const fileInputRef = useRef(null)
  const backupInputRef = useRef(null)
  const [notice, setNotice] = useState('')
  const [dataNotice, setDataNotice] = useState('')
  const { reminder } = profile
  const updateReminder = (patch) => onProfileChange({ reminder: { ...reminder, ...patch } })

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    readAvatar(file)
      .then((avatar) => {
        onProfileChange({ avatar })
        setNotice('')
      })
      .catch((err) => setNotice(err.message))
  }

  const handleBackupFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!window.confirm('지금 기기의 단어장과 기록이 백업 파일의 내용으로 바뀌어요. 불러올까요?')) return
    restoreBackup(file)
      .then((data) => {
        onRestore?.(data)
        setDataNotice(`백업을 불러왔어요. (단어 ${data.wordbook.length}개)`)
      })
      .catch((err) => setDataNotice(err.message))
  }

  const handleReset = () => {
    const where = account?.email ? '이 기기와 서버에서 ' : ''
    if (!window.confirm(`단어장, 학습 기록, 프로필이 ${where}모두 지워지고 처음 화면으로 돌아가요. 지울까요?`)) return
    onReset?.()
  }

  return (
    <>
      <AccountBlock account={account} />

      <section className="mypage-section">
        <h2 className="mypage-section__title">프로필</h2>
        <div className="mypage-profile">
          <div className="mypage-profile__avatar">
            <img className="mypage-profile__avatar-img" src={profile.avatar ?? avatarPlaceholder} alt="프로필 이미지" />
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
            <button
              type="button"
              className="mypage-profile__avatar-add"
              aria-label="프로필 이미지 바꾸기"
              onClick={() => fileInputRef.current?.click()}
            >
              <img src={plusIcon} alt="" />
            </button>
          </div>
          {profile.avatar && (
            <button type="button" className="mypage-link" onClick={() => onProfileChange({ avatar: null })}>
              기본 이미지로
            </button>
          )}
        </div>
        {notice && <p className="mypage-hint">{notice}</p>}

        <h3 className="mypage-section__label">닉네임</h3>
        <input
          type="text"
          className="mypage-input"
          value={profile.nickname}
          maxLength={10}
          placeholder="예: 종이토끼"
          onChange={(e) => onProfileChange({ nickname: e.target.value })}
        />
        <p className="mypage-hint">* 닉네임은 10글자까지 쓸 수 있어요</p>
      </section>

      <section className="mypage-section">
        <h2 className="mypage-section__title">알림</h2>
        <div className="mypage-row">
          <span className="mypage-row__label">학습 알림</span>
          <button
            type="button"
            role="switch"
            aria-checked={reminder.enabled}
            aria-label="학습 알림"
            className={`mypage-switch${reminder.enabled ? ' mypage-switch--on' : ''}`}
            onClick={() => updateReminder({ enabled: !reminder.enabled })}
          >
            <span className="mypage-switch__knob" />
          </button>
        </div>
        {reminder.enabled && (
          <div className="mypage-row">
            <span className="mypage-row__label">알림 시간</span>
            <input
              type="time"
              className="mypage-time"
              value={reminder.time}
              onChange={(e) => updateReminder({ time: e.target.value })}
            />
          </div>
        )}
        <p className="mypage-hint">* 알림은 앱 버전에서 받을 수 있어요. 지금은 설정만 저장돼요.</p>
      </section>

      <section className="mypage-section">
        <h2 className="mypage-section__title">데이터</h2>
        <div className="mypage-row">
          <span className="mypage-row__label">저장된 단어</span>
          <span className="mypage-row__value">{words.length}개 · 자동 저장 중</span>
        </div>
        <div className="mypage-buttons">
          <button
            type="button"
            className="mypage-button"
            onClick={() => {
              downloadBackup({ wordbook: words, profile, studyLog })
              setDataNotice('백업 파일을 내려받았어요.')
            }}
          >
            백업 파일 저장
          </button>
          <input ref={backupInputRef} type="file" accept="application/json,.json" hidden onChange={handleBackupFile} />
          <button type="button" className="mypage-button" onClick={() => backupInputRef.current?.click()}>
            백업 불러오기
          </button>
        </div>
        {dataNotice && <p className="mypage-hint" role="status">{dataNotice}</p>}
        <p className="mypage-hint">
          * 단어장과 기록은 이 기기의 브라우저에 자동으로 저장돼요. 다른 기기로 옮기거나 브라우저 데이터를 지우기 전에는 백업
          파일을 저장해 두세요.
        </p>
        <button type="button" className="mypage-link mypage-link--danger" onClick={handleReset}>
          모든 데이터 지우기
        </button>
      </section>

      <section className="mypage-section">
        <h2 className="mypage-section__title">기타</h2>
        <div className="mypage-row">
          <span className="mypage-row__label">앱 버전</span>
          <span className="mypage-row__value">0.0.1</span>
        </div>
      </section>
    </>
  )
}

// ---------- 학습추이: totals + this week ----------
function TrendSection({ words, studyLog }) {
  const streak = streakDays(studyLog)
  const { answered, accuracy } = totals(studyLog)
  const learned = words.filter((w) => w.learned).length
  const wrong = words.filter((w) => w.wrongCount > 0).length
  const week = weekDays(studyLog)

  const stats = [
    { label: '연속 학습', value: `${streak}일` },
    { label: '정답률', value: answered > 0 ? `${accuracy}%` : '-' },
    { label: '외운 단어', value: `${learned}/${words.length}` },
    { label: '오답 단어', value: `${wrong}개` },
  ]

  return (
    <>
      <section className="mypage-section">
        <h2 className="mypage-section__title">한눈에 보기</h2>
        <div className="mypage-stats">
          {stats.map((s) => (
            <div key={s.label} className="mypage-stat">
              <span className="mypage-stat__value">{s.value}</span>
              <span className="mypage-stat__label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 주간학습현황 (Figma 80:30): Mon–Sun, days with at least one answer get the kraft fill */}
      <section className="mypage-section">
        <h2 className="mypage-week__title">주간학습현황</h2>
        <div className="mypage-week">
          {week.map((d) => {
            const studied = d.answered > 0
            return (
              <span
                key={d.key}
                className={`mypage-week__day${studied ? ' mypage-week__day--studied' : ''}`}
                style={studied ? { backgroundImage: `url(${craftBg})` } : undefined}
                aria-label={`${d.label}요일 ${studied ? `${d.answered}문제 학습` : '학습 안 함'}`}
              >
                {d.label}
              </span>
            )
          })}
        </div>
      </section>
    </>
  )
}

// ---------- 학습목적 변경: exam / conversation ----------
function ModeSection({ words, profile, onProfileChange }) {
  return (
    <section className="mypage-section">
      <h2 className="mypage-section__title">어떤 목적으로 공부하나요?</h2>
      <p className="mypage-hint">* 목적에 따라 학습 문제 유형만 달라져요. 단어장은 그대로 함께 써요.</p>
      <div className="mypage-modes">
        {MODES.map((mode) => {
          const selected = profile.studyMode === mode.id
          return (
            <button
              type="button"
              key={mode.id}
              className={`mypage-mode${selected ? ' mypage-mode--selected' : ''}`}
              aria-pressed={selected}
              onClick={() => onProfileChange({ studyMode: mode.id })}
            >
              {selected && <img className="mypage-mode__bg" src={craftBg} alt="" />}
              <span className="mypage-mode__inner">
                <span className="mypage-mode__title">{mode.title}</span>
                <span className="mypage-mode__desc">{mode.description}</span>
              </span>
            </button>
          )
        })}
      </div>

      {MODES.filter((mode) => mode.id === (profile.studyMode ?? 'exam')).map((mode) => (
        <div key={mode.id} className="mypage-card">
          <p className="mypage-card__title">{mode.title} 문제 유형</p>
          <ul className="mypage-card__list">
            {mode.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <p className="mypage-card__meta">
            지금 단어장에서 {words.filter((w) => isEligible(w, mode.id)).length}개 단어를 이 유형으로 학습할 수 있어요.
            {mode.id === 'conversation' && ' 예문이 없는 단어는 회화 문제에서 빠져요.'}
          </p>
        </div>
      ))}
    </section>
  )
}

const MODE_NAMES = { exam: '시험대비', conversation: '회화' }

export default function MyPage({
  words = [],
  profile,
  studyLog = {},
  account,
  onProfileChange,
  onRestore,
  onReset,
  onNavigate,
}) {
  const [menu, setMenu] = useState(null) // null = menu list | 'goal' | 'account' | 'trend' | 'mode'
  const current = MENUS.find((m) => m.id === menu)

  const summaries = {
    goal: goalTitle(profile.goal) || '아직 목표를 정하지 않았어요',
    account: `${account?.email || profile.nickname || '닉네임 없음'} · 알림 ${profile.reminder.enabled ? profile.reminder.time : '꺼짐'}`,
    trend: `${streakDays(studyLog)}일 연속 · 정답률 ${totals(studyLog).accuracy}%`,
    mode: MODE_NAMES[profile.studyMode] ?? '아직 고르지 않았어요',
  }

  return (
    <div className="page mypage" data-name="마이페이지">
      <div className="mypage__scroll">
        <div className="mypage__inner">
          <header className="mypage-header">
            <img className="mypage-header__bg" src={craftBg} alt="" />
            <ModeBadge studyMode={profile.studyMode} />
            {current ? (
              <>
                <button type="button" className="mypage-header__back" aria-label="마이페이지로" onClick={() => setMenu(null)}>
                  <img src={arrowIcon} alt="" />
                </button>
                <div className="mypage-header__content">
                  <div className="mypage-header__text">
                    <p className="mypage-header__title">{current.title}</p>
                    <p className="mypage-header__sub">{current.subtitle}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="mypage-header__content">
                <img className="mypage-header__avatar" src={profile.avatar ?? avatarPlaceholder} alt="" />
                <div className="mypage-header__text">
                  <p className="mypage-header__sub">{profile.nickname || '닉네임 없음'}</p>
                  <p className="mypage-header__title">{profile.goal.aim || '마이페이지'}</p>
                </div>
              </div>
            )}
          </header>

          {!current && (
            <nav className="mypage-menu" aria-label="마이페이지 메뉴">
              {MENUS.map((m) => (
                <button key={m.id} type="button" className="mypage-menu__item" onClick={() => setMenu(m.id)}>
                  <span className="mypage-menu__text">
                    <span className="mypage-menu__title">{m.title}</span>
                    <span className="mypage-menu__summary">{summaries[m.id]}</span>
                  </span>
                  <img className="mypage-menu__arrow" src={arrowIcon} alt="" />
                </button>
              ))}
            </nav>
          )}

          {menu === 'goal' && (
            <GoalSection words={words} profile={profile} studyLog={studyLog} onProfileChange={onProfileChange} />
          )}
          {menu === 'account' && (
            <AccountSection
              words={words}
              profile={profile}
              studyLog={studyLog}
              onProfileChange={onProfileChange}
              onRestore={onRestore}
              onReset={onReset}
              account={account}
            />
          )}
          {menu === 'trend' && <TrendSection words={words} studyLog={studyLog} />}
          {menu === 'mode' && <ModeSection words={words} profile={profile} onProfileChange={onProfileChange} />}
        </div>
      </div>

      <BottomNav active="user" onNavigate={onNavigate} />
    </div>
  )
}
