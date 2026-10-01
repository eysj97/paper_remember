import OnboardingHeader from '../components/OnboardingHeader.jsx'
import craftBg from '../../imges/craft-page-sm.avif'
import './Onboarding3.css'

const OPTIONS = [
  {
    id: 'exam',
    title: '시험대비',
    description: (
      <>
        뜻 맞히기와 스펠링 위주로,
        <br />
        정확한 단어암기에 집중해요
      </>
    ),
  },
  {
    id: 'conversation',
    title: '회화',
    description: (
      <>
        예문 속 빈칸으로,
        <br />
        문장안에서 자연스럽게 익혀요
      </>
    ),
  },
]

// the chosen purpose lives in App, so later screens can show the matching study mode
export default function Onboarding3({ onBack, onNext, canNext = true, studyMode, onStudyModeChange }) {
  const selected = studyMode

  return (
    <div className="page onboarding3" data-name="온보딩 3">
      <OnboardingHeader onBack={onBack} onNext={onNext} nextLocked={!canNext} />
      <div className="onboarding3__content">
        <div className="onboarding3__text">
          <h1 className="onboarding3__title">어떤 목적으로 공부를 하시나요?</h1>
          <p className="onboarding3__body">
            목적에 따라 문제의 유형이 달라져요.
            <br />
            언제든 바꿀 수 있으니 편하게 선택해 주세요!
          </p>
        </div>
        <div className="onboarding3__options">
          {OPTIONS.map((option) => {
            const isSelected = selected === option.id
            return (
              <button
                type="button"
                key={option.id}
                className={`onboarding3__option${isSelected ? ' onboarding3__option--selected' : ''}`}
                onClick={() => onStudyModeChange?.(option.id)}
                aria-pressed={isSelected}
              >
                {isSelected && <img className="onboarding3__option-bg" src={craftBg} alt="" />}
                <span className="onboarding3__option-inner">
                  <span className="onboarding3__option-title">{option.title}</span>
                  <span className="onboarding3__option-desc">{option.description}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
