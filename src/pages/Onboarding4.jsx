import OnboardingHeader from '../components/OnboardingHeader.jsx'
import GoalDropdown from '../components/GoalDropdown.jsx'
import DateRangeField from '../components/DateRangeField.jsx'
import { autoPeriodDays, changeGoal, dateToTime, isAutoPeriod } from '../services/goal.js'
import './Onboarding4.css'

// the goal lives in App (profile.goal) so mypage can show and change it later
export default function Onboarding4({ onBack, onNext, canNext = true, goal, onGoalChange }) {
  const update = (patch) => onGoalChange?.(changeGoal(goal, patch))
  const autoPeriod = isAutoPeriod(goal) && autoPeriodDays(goal) > 0
  const datesReversed = dateToTime(goal.endDate) < dateToTime(goal.startDate)

  return (
    <div className="page onboarding4" data-name="온보딩 4">
      <OnboardingHeader onBack={onBack} onNext={onNext} nextLocked={!canNext} />
      <div className="onboarding4__content">
        <div className="onboarding4__text">
          <h1 className="onboarding4__title">학습목적는 어떻게 되나요?</h1>
          <p className="onboarding4__body">
            꾸준한 학습을 위해 어떠한 동기로
            <br />
            영어를 공부하게 되었는지 작성해봐요.
          </p>
        </div>

        <div className="onboarding4__form">
          <div className="onboarding4__field">
            <p className="onboarding4__label">목적</p>
            <input
              type="text"
              className="onboarding4__input"
              placeholder="공부하는 이유 (예 : 여행할때 사용하기 위해서)"
              value={goal.aim}
              onChange={(e) => update({ aim: e.target.value })}
            />
            <p className="onboarding4__hint">* 영어를 왜 배우는지, 큰 방향을 정해요.</p>
          </div>

          <div className="onboarding4__field">
            <p className="onboarding4__label">목표</p>
            <GoalDropdown value={goal} onChange={update} />

            <p className="onboarding4__label">기간</p>
            <DateRangeField
              startDate={goal.startDate}
              endDate={goal.endDate}
              onStartChange={(startDate) => update({ startDate })}
              onEndChange={(endDate) => update({ endDate })}
              locked={autoPeriod}
            />
          </div>
          <p className="onboarding4__hint">* 언제까지 얼마나 외울지, 눈에 보이는 결과를 정해요.</p>
          {datesReversed && (
            <p className="onboarding4__hint onboarding4__hint--todo">끝나는 날짜가 시작 날짜보다 빠를 수 없어요.</p>
          )}
        </div>
      </div>
    </div>
  )
}
