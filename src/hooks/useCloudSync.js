import { useCallback, useEffect, useRef, useState } from 'react'
import { serverEnabled } from '../services/supabase.js'
import { fetchRemote, hasData, loadMeta, mergeData, pushRemote, saveMeta } from '../services/sync.js'

const PUSH_DELAY_MS = 1500

// Keeps the signed-in user's server row in step with the app's data.
//   on sign-in : server copy is pulled (merged with guest data on this device, if any)
//   on change  : pushed a moment later (changes in a burst go up together)
//   on return  : when the tab comes back, newer server data (from another device) is pulled
// status: 'off' (no server) | 'local' (signed out) | 'loading' | 'syncing' | 'synced' | 'error'
export default function useCloudSync({ user, data, onRemote }) {
  const userId = user?.id ?? null
  const [status, setStatus] = useState(!serverEnabled ? 'off' : userId ? 'loading' : 'local')
  // JSON of what the server holds; null until the first sync of this sign-in finished
  const syncedJson = useRef(null)
  const timer = useRef(null)
  const dataRef = useRef(data)
  dataRef.current = data
  const onRemoteRef = useRef(onRemote)
  onRemoteRef.current = onRemote

  const apply = (next, updatedAt) => {
    syncedJson.current = JSON.stringify(next)
    saveMeta({ userId, syncedAt: updatedAt, dirty: false })
    onRemoteRef.current(next)
  }

  const push = useCallback(
    async (snapshot = dataRef.current) => {
      if (!userId) return
      clearTimeout(timer.current)
      timer.current = null
      const json = JSON.stringify(snapshot)
      setStatus('syncing')
      try {
        const updatedAt = await pushRemote(userId, snapshot)
        syncedJson.current = json
        saveMeta({ userId, syncedAt: updatedAt, dirty: false })
        setStatus('synced')
      } catch {
        saveMeta({ ...loadMeta(), userId, dirty: true })
        setStatus('error')
      }
    },
    [userId],
  )

  // first sync after sign-in (or after opening the app already signed in). Until it succeeds nothing
  // is pushed, so a failed download can never be followed by an upload that overwrites the server copy.
  const attempt = useRef(0)
  const initialSync = useCallback(async () => {
    const run = ++attempt.current
    const stale = () => run !== attempt.current
    setStatus('loading')
    try {
      const meta = loadMeta()
      const remote = await fetchRemote(userId)
      if (stale()) return
      const local = dataRef.current

      if (!remote) {
        // a new account: what was set up on this device becomes its first server copy
        await push(local)
      } else if (meta.userId === userId && !meta.dirty) {
        apply(remote.data, remote.updatedAt)
        setStatus('synced')
      } else if (meta.userId === userId && Date.parse(remote.updatedAt) <= Date.parse(meta.syncedAt ?? 0)) {
        // unsent changes from last time, and nothing newer on the server: send them
        await push(local)
      } else if (meta.userId === userId || hasData(local)) {
        // both sides changed, or guest data meets an existing account: keep both
        const merged = mergeData(local, remote.data)
        apply(merged, remote.updatedAt)
        await push(merged)
      } else {
        apply(remote.data, remote.updatedAt)
        setStatus('synced')
      }
    } catch {
      // offline or server trouble: keep working on the browser copy; retried when back online / in view
      if (!stale()) setStatus('error')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, push])

  useEffect(() => {
    syncedJson.current = null
    if (!userId) {
      attempt.current += 1
      setStatus(serverEnabled ? 'local' : 'off')
      return undefined
    }
    initialSync()
    return () => {
      attempt.current += 1
    }
  }, [userId, initialSync])

  // every change after that goes up a moment later
  const json = JSON.stringify(data)
  useEffect(() => {
    if (!userId || syncedJson.current === null || json === syncedJson.current) return
    saveMeta({ ...loadMeta(), userId, dirty: true })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => push(), PUSH_DELAY_MS)
  }, [json, userId, status, push])

  // leaving the tab sends what's pending; coming back pulls what another device saved meanwhile
  useEffect(() => {
    if (!userId) return undefined
    const onVisibility = async () => {
      if (syncedJson.current === null) {
        if (document.visibilityState === 'visible') initialSync()
        return
      }
      if (document.visibilityState === 'hidden') {
        if (timer.current) push()
        return
      }
      const meta = loadMeta()
      if (meta.dirty) {
        push()
        return
      }
      try {
        const remote = await fetchRemote(userId)
        if (remote && Date.parse(remote.updatedAt) > Date.parse(meta.syncedAt ?? 0)) {
          apply(remote.data, remote.updatedAt)
          setStatus('synced')
        }
      } catch {
        // offline: try again next time
      }
    }
    const onOnline = () => {
      if (syncedJson.current === null) initialSync()
      else if (loadMeta().dirty) push()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, push, initialSync])

  // sends anything still waiting (used before signing out)
  const flush = useCallback(async () => {
    if (userId && (timer.current || loadMeta().dirty)) await push()
  }, [userId, push])

  return { status, flush }
}
