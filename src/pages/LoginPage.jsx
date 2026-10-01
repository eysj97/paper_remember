import { useState } from 'react'
import craftBg from '../../imges/craft-page-sm.png'
import { authErrorMessage, supabase } from '../services/supabase.js'
import './LoginPage.css'

const TITLES = {
  login: { title: '로그인', body: '단어장과 학습 기록을 어느 기기에서든 이어가요' },
  signup: { title: '회원가입', body: '이메일로 가입하면 단어장이 안전하게 저장돼요' },
  reset: { title: '비밀번호 찾기', body: '가입한 이메일로 비밀번호 재설정 링크를 보내 드려요' },
  recover: { title: '새 비밀번호', body: '앞으로 사용할 비밀번호를 입력해 주세요' },
}

// shown while the saved session / the server copy is being loaded
export function LoadingPage({ text = '불러오는 중이에요…' }) {
  return (
    <div className="page login-page login-page--loading" data-name="불러오는 중">
      <p className="login-page__logo">종이기억</p>
      <p className="login-page__loading-text">{text}</p>
    </div>
  )
}

// mode 'recover' is opened from the password-reset mail; onRecovered closes it
export default function LoginPage({ initialMode = 'login', onGuest, onRecovered }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordCheck, setPasswordCheck] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const switchMode = (next) => {
    setMode(next)
    setError('')
    setNotice('')
    setPassword('')
    setPasswordCheck('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')

    const trimmed = email.trim()
    if (mode !== 'recover' && !trimmed) return setError('이메일을 입력해 주세요.')
    if (mode !== 'reset' && password.length < 6) return setError('비밀번호는 6자 이상이어야 해요.')
    if ((mode === 'signup' || mode === 'recover') && password !== passwordCheck) {
      return setError('비밀번호가 서로 달라요.')
    }

    setBusy(true)
    try {
      const redirectTo = window.location.origin + window.location.pathname
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: trimmed, password })
        if (err) throw err
        // signed in: App moves on by itself (auth state change)
      } else if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email: trimmed,
          password,
          options: { emailRedirectTo: redirectTo },
        })
        if (err) throw err
        if (!data.session) {
          // the project asks for e-mail confirmation first
          switchMode('login')
          setNotice(`${trimmed} 로 인증 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.`)
        }
      } else if (mode === 'reset') {
        const { error: err } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo })
        if (err) throw err
        switchMode('login')
        setNotice('비밀번호 재설정 메일을 보냈어요. 메일의 링크를 눌러 주세요.')
      } else if (mode === 'recover') {
        const { error: err } = await supabase.auth.updateUser({ password })
        if (err) throw err
        onRecovered?.()
      }
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const { title, body } = TITLES[mode]
  const submitLabel = { login: '로그인', signup: '가입하기', reset: '메일 보내기', recover: '비밀번호 바꾸기' }[mode]

  return (
    <div className="page login-page" data-name="로그인">
      <header className="login-page__header">
        <img className="login-page__header-bg" src={craftBg} alt="" />
        <p className="login-page__logo login-page__logo--header">종이기억</p>
      </header>

      <form className="login-page__form" onSubmit={submit} noValidate>
        <div className="login-page__text">
          <h1 className="login-page__title">{title}</h1>
          <p className="login-page__body">{body}</p>
        </div>

        {mode !== 'recover' && (
          <label className="login-page__field">
            <span className="login-page__label">이메일</span>
            <input
              type="email"
              className="login-page__input"
              autoComplete="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        )}

        {mode !== 'reset' && (
          <label className="login-page__field">
            <span className="login-page__label">비밀번호</span>
            <input
              type="password"
              className="login-page__input"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="6자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}

        {(mode === 'signup' || mode === 'recover') && (
          <label className="login-page__field">
            <span className="login-page__label">비밀번호 확인</span>
            <input
              type="password"
              className="login-page__input"
              autoComplete="new-password"
              value={passwordCheck}
              onChange={(e) => setPasswordCheck(e.target.value)}
            />
          </label>
        )}

        {error && (
          <p className="login-page__message login-page__message--error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="login-page__message" role="status">
            {notice}
          </p>
        )}

        <button type="submit" className="login-page__submit" disabled={busy}>
          {busy ? '잠시만요…' : submitLabel}
        </button>

        <div className="login-page__links">
          {mode === 'login' && (
            <>
              <button type="button" onClick={() => switchMode('signup')}>
                회원가입
              </button>
              <span aria-hidden="true">·</span>
              <button type="button" onClick={() => switchMode('reset')}>
                비밀번호 찾기
              </button>
            </>
          )}
          {(mode === 'signup' || mode === 'reset') && (
            <button type="button" onClick={() => switchMode('login')}>
              로그인으로 돌아가기
            </button>
          )}
        </div>
      </form>

      {mode !== 'recover' && onGuest && (
        <button type="button" className="login-page__guest" onClick={onGuest}>
          <span className="login-page__guest-main">로그인 없이 시작하기</span>
          <span className="login-page__guest-sub">단어장은 이 기기에만 저장돼요</span>
        </button>
      )}
    </div>
  )
}
