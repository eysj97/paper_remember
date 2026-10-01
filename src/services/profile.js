// Profile + settings gathered in onboarding and edited in mypage, kept in the browser like the wordbook.
import { timeToDate } from './goal.js'

export const PROFILE_KEY = 'warld.profile'
const DEFAULT_PERIOD_DAYS = 30

export function defaultProfile(now = Date.now()) {
  return {
    nickname: '',
    avatar: null, // data URL of the resized picture; null shows the placeholder
    studyMode: null, // 'exam' | 'conversation'
    onboardedAt: null, // when onboarding was finished: returning visits skip it, and home counts days from it
    goal: {
      aim: '', // 목적: free text, shown in mypage only
      type: null,
      value: '',
      startDate: timeToDate(now),
      endDate: timeToDate(now + DEFAULT_PERIOD_DAYS * 24 * 3_600_000),
    },
    reminder: { enabled: false, time: '21:00' },
  }
}

// fills in fields missing from a stored (or server) profile
export function normalizeProfile(saved) {
  const base = defaultProfile()
  if (!saved || typeof saved !== 'object') return base
  return {
    ...base,
    ...saved,
    goal: { ...base.goal, ...saved.goal },
    reminder: { ...base.reminder, ...saved.reminder },
  }
}

export function loadProfile() {
  try {
    return normalizeProfile(JSON.parse(localStorage.getItem(PROFILE_KEY)))
  } catch {
    return defaultProfile()
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } catch {
    // most likely the picture does not fit: keep everything else
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profile, avatar: null }))
    } catch {
      // storage blocked: the in-memory profile still works for this session
    }
  }
}

// crops the picked image to a square and shrinks it, so it can be stored as a small data URL
export function readAvatar(file, size = 160) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const side = Math.min(img.width, img.height)
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      canvas
        .getContext('2d')
        .drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('이미지를 읽지 못했어요'))
    }
    img.src = url
  })
}
