import OnboardingHeader from '../components/OnboardingHeader.jsx'
import heroImg from '../../imges/onbording1.avif'
import './Onboarding2.css'

export default function Onboarding2({ onBack, onNext }) {
  return (
    <div className="page onboarding2" data-name="온보딩 2">
      <OnboardingHeader onBack={onBack} onNext={onNext} />
      <div className="onboarding2__content">
        <img className="onboarding2__hero" src={heroImg} alt="단어 카드 뭉치" />
        <div className="onboarding2__text">
          <h1 className="onboarding2__title">
            넘겨 보던 단어장을,
            <br />
            기억을 남기다.
          </h1>
          <p className="onboarding2__body">
            외우고 싶은 단어를 넣으면 뜻·예문·발음을
            <br />
            갖춘 카드로 만들고, 잊어버릴 때쯤
            <br />
            다시 꺼내 볼 수 있게 알려줘요.
          </p>
        </div>
      </div>
    </div>
  )
}
