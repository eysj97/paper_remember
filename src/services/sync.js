// Server copy of a user's data: one row per account in `user_data` (see supabase/schema.sql)
// holding the same three pieces the browser keeps — wordbook, profile, study log.
// The browser copy stays the working copy; the server copy follows it and is pulled on login.
import { supabase } from './supabase.js'
import { normalizeProfile } from './profile.js'
import { lastStudiedAt } from './study.js'

const TABLE = 'user_data'

// which account the browser copy belongs to, the server time it was last in step with,
// and whether it has changes the server hasn't got yet
const META_KEY = 'warld.syncMeta'

export function loadMeta() {
  try {
    return JSON.parse(localStorage.getItem(META_KEY)) ?? {}
  } catch {
    return {}
  }
}

export function saveMeta(meta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta))
  } catch {
    // storage blocked: the next start simply syncs again
  }
}

export function clearMeta() {
  try {
    localStorage.removeItem(META_KEY)
  } catch {
    // nothing stored
  }
}

export async function fetchRemote(userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('wordbook, profile, study_log, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    data: {
      wordbook: Array.isArray(data.wordbook) ? data.wordbook : [],
      profile: normalizeProfile(data.profile),
      studyLog: data.study_log && typeof data.study_log === 'object' ? data.study_log : {},
    },
    updatedAt: data.updated_at,
  }
}

// returns the server's updated_at (set by a trigger, so device clocks don't matter)
export async function pushRemote(userId, { wordbook, profile, studyLog }) {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert({ user_id: userId, wordbook, profile, study_log: studyLog })
    .select('updated_at')
    .single()
  if (error) throw error
  return data.updated_at
}

export const hasData = ({ wordbook, profile, studyLog }) =>
  wordbook.length > 0 || Boolean(profile.onboardedAt) || Object.keys(studyLog).length > 0

const wordTime = (w) => Math.max(lastStudiedAt(w), w.addedAt ?? 0)

// guest data meeting an existing account: keep both, preferring the more recently touched copy
export function mergeData(local, remote) {
  const byWord = new Map()
  for (const w of [...remote.wordbook, ...local.wordbook]) {
    const key = w.word.toLowerCase()
    const seen = byWord.get(key)
    if (!seen || wordTime(w) > wordTime(seen)) byWord.set(key, w)
  }

  const studyLog = { ...remote.studyLog }
  for (const [day, counts] of Object.entries(local.studyLog)) {
    if (!studyLog[day] || counts.answered > studyLog[day].answered) studyLog[day] = counts
  }

  // the account's settings win; blanks are filled from what was set up on this device
  const r = remote.profile
  const l = local.profile
  const starts = [r.onboardedAt, l.onboardedAt].filter(Boolean)
  const profile = {
    ...r,
    nickname: r.nickname || l.nickname,
    avatar: r.avatar ?? l.avatar,
    studyMode: r.studyMode ?? l.studyMode,
    goal: r.goal?.type ? r.goal : l.goal,
    onboardedAt: starts.length > 0 ? Math.min(...starts) : null,
  }

  return { wordbook: [...byWord.values()], profile, studyLog }
}
