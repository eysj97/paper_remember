import { useRef } from 'react'
import OnboardingHeader from '../components/OnboardingHeader.jsx'
import avatarPlaceholder from '../../imges/icon-user.png'
import plusIcon from '../../imges/icon-plus.png'
import { readAvatar } from '../services/profile.js'
import './Onboarding5.css'

// nickname and picture live in App (profile) so the home header and mypage can show them
export default function Onboarding5({ onBack, onNext, profile, onProfileChange }) {
  const { nickname } = profile
  const setNickname = (value) => onProfileChange?.({ nickname: value })
  const avatarSrc = profile.avatar ?? avatarPlaceholder
  const fileInputRef = useRef(null)

  const handlePickImage = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    readAvatar(file)
      .then((avatar) => onProfileChange?.({ avatar }))
      .catch(() => {})
  }

  return (
    <div className="page onboarding5" data-name="온보딩 5">
      <OnboardingHeader onBack={onBack} />
      <div className="onboarding5__content">
        <div className="onboarding5__text">
          <h1 className="onboarding5__title">프로필을 입력해 주세요</h1>
          <p className="onboarding5__subtitle">원하는 닉네임과 , 이미지를 입력해주세요</p>
        </div>

        <div className="onboarding5__avatar">
          <img className="onboarding5__avatar-img" src={avatarSrc} alt="프로필 이미지" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="onboarding5__file-input"
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="onboarding5__avatar-add"
            aria-label="프로필 이미지 추가"
            onClick={handlePickImage}
          >
            <img src={plusIcon} alt="" />
          </button>
        </div>

        <div className="onboarding5__field">
          <div className="onboarding5__input-wrap">
            <input
              type="text"
              className="onboarding5__input"
              value={nickname}
              maxLength={10}
              placeholder="예: 종이토끼"
              onChange={(e) => setNickname(e.target.value)}
            />
            {nickname && (
              <button
                type="button"
                className="onboarding5__clear"
                onClick={() => setNickname('')}
                aria-label="닉네임 지우기"
              >
                ×
              </button>
            )}
          </div>
          <p className="onboarding5__hint">* 닉네임은 10글자를 넘어가면 안되요</p>
        </div>
      </div>

      <div className="onboarding5__footer">
        <button type="button" className="onboarding5__start" onClick={onNext}>
          시작하기
        </button>
      </div>
    </div>
  )
}
