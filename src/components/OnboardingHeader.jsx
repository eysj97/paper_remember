import arrowIcon from '../../imges/icon-return.png'
import './OnboardingHeader.css'

export default function OnboardingHeader({ title = '종이기억', onBack, onNext }) {
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
        className="onboarding-header__icon-btn onboarding-header__icon-btn--next"
        onClick={onNext}
        disabled={!onNext}
        aria-label="다음"
      >
        <img src={arrowIcon} alt="" />
      </button>
    </div>
  )
}
