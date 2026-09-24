import coverBg from '../../imges/cover.png'
import './CoverPage.css'

export default function CoverPage({ onNext }) {
  return (
    <div className="page cover-page" data-name="커버" onClick={onNext} role="button" tabIndex={0}>
      <img className="cover-page__bg" src={coverBg} alt="" />
      <div className="cover-page__title">종이기억</div>
    </div>
  )
}
