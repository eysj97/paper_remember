import { useState } from 'react'
import OnboardingHeader from '../components/OnboardingHeader.jsx'
import GoalDropdown from '../components/GoalDropdown.jsx'
import DateWheelPicker from '../components/DateWheelPicker.jsx'
import arrowDownIcon from '../../imges/icon-downarrow.png'
import './Onboarding4.css'

const pad2 = (n) => String(n).padStart(2, '0')
const formatDate = ({ year, month, day }) => `${String(year).slice(2)}/${pad2(month)}/${pad2(day)}`

export default function Onboarding4({ onBack, onNext }) {
  const [goal, setGoal] = useState('')
  const [startDate, setStartDate] = useState({ year: 2026, month: 4, day: 16 })
  const [endDate, setEndDate] = useState({ year: 2026, month: 5, day: 16 })
  const [openPicker, setOpenPicker] = useState(null) // null | 'start' | 'end'

  return (
    <div className="page onboarding4" data-name="온보딩 4">
      <OnboardingHeader onBack={onBack} onNext={onNext} />
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
            />
            <p className="onboarding4__hint">* 영어를 왜 배우는지, 큰 방향을 정해요.</p>
          </div>

          <div className="onboarding4__field">
            <p className="onboarding4__label">목표</p>
            <GoalDropdown onChange={setGoal} />

            <p className="onboarding4__label">기간</p>
            <div className="onboarding4__dates">
              <button
                type="button"
                className="onboarding4__select onboarding4__select--date"
                onClick={() => setOpenPicker((p) => (p === 'start' ? null : 'start'))}
              >
                <span>{formatDate(startDate)}</span>
                <img
                  className={openPicker === 'start' ? 'onboarding4__arrow onboarding4__arrow--open' : 'onboarding4__arrow'}
                  src={arrowDownIcon}
                  alt=""
                />
              </button>
              <span className="onboarding4__tilde">~</span>
              <button
                type="button"
                className="onboarding4__select onboarding4__select--date"
                onClick={() => setOpenPicker((p) => (p === 'end' ? null : 'end'))}
              >
                <span>{formatDate(endDate)}</span>
                <img
                  className={openPicker === 'end' ? 'onboarding4__arrow onboarding4__arrow--open' : 'onboarding4__arrow'}
                  src={arrowDownIcon}
                  alt=""
                />
              </button>
            </div>

            {openPicker === 'start' && (
              <DateWheelPicker value={startDate} onChange={setStartDate} onConfirm={() => setOpenPicker(null)} />
            )}
            {openPicker === 'end' && (
              <DateWheelPicker value={endDate} onChange={setEndDate} onConfirm={() => setOpenPicker(null)} />
            )}
          </div>
          <p className="onboarding4__hint">* 언제까지 얼마나 외울지, 눈에 보이는 결과를 정해요.</p>
        </div>
      </div>
    </div>
  )
}
