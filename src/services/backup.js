// Everything the app keeps lives in this browser. A backup file moves it to another device or
// browser (or brings it back after site data was cleared); reset wipes it for a fresh start.
import { loadWordbook, saveWordbook, WORDBOOK_KEY } from './wordbook.js'
import { defaultProfile, loadProfile, saveProfile, PROFILE_KEY } from './profile.js'
import { loadStudyLog, saveStudyLog, STUDY_LOG_KEY } from './studyLog.js'

const APP = 'jongigieok'
const VERSION = 1

export const STORAGE_KEYS = [WORDBOOK_KEY, PROFILE_KEY, STUDY_LOG_KEY]

export function downloadBackup({ wordbook, profile, studyLog }, now = new Date()) {
  const data = { app: APP, version: VERSION, savedAt: now.toISOString(), wordbook, profile, studyLog }
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const pad2 = (n) => String(n).padStart(2, '0')
  const link = document.createElement('a')
  link.href = url
  link.download = `종이기억-백업-${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// reads a backup file and stores it; returns what was loaded so the app can show it right away
export async function restoreBackup(file) {
  let data
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error('백업 파일을 읽지 못했어요.')
  }
  if (data?.app !== APP || !Array.isArray(data.wordbook)) throw new Error('종이기억 백업 파일이 아니에요.')

  saveWordbook(data.wordbook)
  saveProfile({ ...defaultProfile(), ...data.profile })
  saveStudyLog(data.studyLog && typeof data.studyLog === 'object' ? data.studyLog : {})
  // read back through the loaders so the stored shape is normalised the same way as on startup
  return { wordbook: loadWordbook(), profile: loadProfile(), studyLog: loadStudyLog() }
}

export function clearAllData() {
  for (const key of STORAGE_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      // storage blocked: nothing was saved anyway
    }
  }
}

// asks the browser not to evict the saved data under storage pressure (best effort, no prompt in most browsers)
export function requestPersistentStorage() {
  navigator.storage?.persist?.().catch(() => {})
}
