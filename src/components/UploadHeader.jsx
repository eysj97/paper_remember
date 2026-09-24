import ModeBadge from './ModeBadge.jsx'
import craftBg from '../../imges/craft-page-sm.png'
import './UploadHeader.css'

// the kraft-paper page header used by the upload flow and the library
export default function UploadHeader({
  studyMode,
  title = '단어 추가하기',
  subtitle = '외우고 싶은 단어를 단어장에 담아요',
  fitBox = false,
}) {
  return (
    <header className="upload-header">
      <img className="upload-header__bg" src={craftBg} alt="" />
      <ModeBadge studyMode={studyMode} />
      <div className={`upload-header__text${fitBox ? ' upload-header__text--fit' : ''}`}>
        <p className="upload-header__title">{title}</p>
        <p className="upload-header__subtitle">{subtitle}</p>
      </div>
    </header>
  )
}
