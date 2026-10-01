import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase.js'

// the signed-in user (null when signed out). `ready` turns true once the saved session was checked;
// `recovering` is set when the page was opened from a password-reset mail
export default function useAuth() {
  const [state, setState] = useState({ ready: !supabase, user: null, recovering: false })

  useEffect(() => {
    if (!supabase) return undefined
    supabase.auth.getSession().then(({ data }) => {
      setState((s) => ({ ...s, ready: true, user: data.session?.user ?? null }))
    })
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setState((s) => ({
        ready: true,
        user: session?.user ?? null,
        recovering: event === 'PASSWORD_RECOVERY' ? true : event === 'SIGNED_OUT' ? false : s.recovering,
      }))
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const finishRecovery = () => setState((s) => ({ ...s, recovering: false }))

  return { ...state, finishRecovery }
}
