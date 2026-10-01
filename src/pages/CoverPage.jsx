import coverBg from '../../imges/cover.avif'
import './CoverPage.css'

// tapping anywhere starts onboarding; onLogin (server connected, signed out) lets returning users skip it
export default function CoverPage({ onNext, onLogin }) {
  return (
    <div className="page cover-page" data-name="커버" onClick={onNext} role="button" tabIndex={0}>
      <img className="cover-page__bg" src={coverBg} alt="" />
      <div className="cover-page__title">종이기억</div>
      {onLogin && (
        <button
          type="button"
          className="cover-page__login"
          onClick={(e) => {
            e.stopPropagation()
            onLogin()
          }}
        >
          이미 계정이 있어요? <strong>로그인</strong>
        </button>
      )}
    </div>
  )
}
