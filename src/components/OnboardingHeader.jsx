import arrowIcon from '../../imges/icon-return.png'
import './OnboardingHeader.css'

// nextLocked: the page still needs an answer, so the next arrow shows but can't be pressed
export default function OnboardingHeader({ title = '종이기억', onBack, onNext, nextLocked = false }) {
  return (
    <div className="onboarding-header">
      <button
        type="button"
        className="onboarding-header__icon-btn"
        onClick={onBack}
        disabled={!onBack}
        aria-label="이전"
      >
        <img src={arrowIcon} alt="" />
      </button>
      <p className="onboarding-header__title">{title}</p>
      <button
        type="button"
        className={`onboarding-header__icon-btn onboarding-header__icon-btn--next${nextLocked ? ' onboarding-header__icon-btn--locked' : ''}`}
        onClick={onNext}
        disabled={!onNext || nextLocked}
        aria-label="다음"
      >
        <img src={arrowIcon} alt="" />
      </button>
    </div>
  )
}
