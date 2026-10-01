// Server (Supabase: login + database). Without the two keys in .env the app runs local-only,
// exactly as before: no login screen, data kept in this browser.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
// Supabase's Connect panel (React + Vite) names it PUBLISHABLE_KEY; older projects call it the anon key
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null
export const serverEnabled = Boolean(supabase)

// "로그인 없이 시작하기" was chosen: keep using the app on this device without an account
const GUEST_KEY = 'warld.guest'

export function loadGuest() {
  try {
    return localStorage.getItem(GUEST_KEY) === '1'
  } catch {
    return false
  }
}

export function saveGuest(guest) {
  try {
    if (guest) localStorage.setItem(GUEST_KEY, '1')
    else localStorage.removeItem(GUEST_KEY)
  } catch {
    // storage blocked: the choice lasts for this session only
  }
}

// Supabase answers in English; these are the ones a person can run into on the login screen
const AUTH_ERRORS = [
  ['Invalid login credentials', '이메일 또는 비밀번호가 맞지 않아요.'],
  ['Email not confirmed', '메일 인증을 먼저 완료해 주세요. 받은 메일의 링크를 눌러 주세요.'],
  ['User already registered', '이미 가입된 이메일이에요. 로그인해 주세요.'],
  ['Password should be at least', '비밀번호는 6자 이상이어야 해요.'],
  ['Unable to validate email address', '이메일 주소를 확인해 주세요.'],
  ['rate limit', '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'],
  ['should be different from the old password', '이전과 다른 비밀번호를 입력해 주세요.'],
  ['Failed to fetch', '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.'],
]

export function authErrorMessage(error) {
  const message = error?.message ?? ''
  const known = AUTH_ERRORS.find(([key]) => message.toLowerCase().includes(key.toLowerCase()))
  return known ? known[1] : `문제가 생겼어요. 잠시 후 다시 시도해 주세요. (${message})`
}
