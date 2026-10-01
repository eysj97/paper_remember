import homeBlack from '../assets/nav/home-black.svg'
import homeWhite from '../assets/nav/home-white.svg'
import uploadBlack from '../assets/nav/upload-black.svg'
import uploadWhite from '../assets/nav/upload-white.svg'
import bookIcon from '../assets/nav/book.svg'
import bookBlack from '../assets/nav/book-black.svg'
import userIcon from '../assets/nav/user.svg'
import userBlack from '../assets/nav/user-black.svg'
import './BottomNav.css'

const ITEMS = [
  { id: 'home', label: '홈', text: 'home', icon: homeWhite, activeIcon: homeBlack },
  // upload-white.svg is exported with its 58px button box around the glyph, so it's sized as a whole box
  { id: 'upload', label: '업로드', text: 'upload', icon: uploadWhite, activeIcon: uploadBlack, boxedIcon: true },
  { id: 'book', label: '라이브러리', text: 'library', icon: bookIcon, activeIcon: bookBlack },
  { id: 'user', label: '마이페이지', text: 'my', icon: userIcon, activeIcon: userBlack },
]

export default function BottomNav({ active, onNavigate }) {
  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => {
        const isActive = item.id === active
        return (
          <button
            key={item.id}
            type="button"
            className={`bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onNavigate?.(item.id)}
          >
            <img
              className={!isActive && item.boxedIcon ? 'bottom-nav__icon--boxed' : undefined}
              src={isActive ? item.activeIcon : item.icon}
              alt=""
            />
            {isActive && <span>{item.text}</span>}
          </button>
        )
      })}
    </nav>
  )
}
