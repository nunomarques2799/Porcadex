import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

/** A avaliação (0–5) que EU dei à pessoa de um amigo, com submissão explícita.
 *  A média fica em people.rating (recalculada por trigger na BD). */
export function useMyRating(personId: string | undefined): {
  saved: number
  loading: boolean
  submit: (stars: number) => Promise<{ error?: string }>
} {
  const { user } = useAuth()
  const [saved, setSaved] = useState(0)
  const [loading, setLoading] = useState<boolean>(!!personId)

  useEffect(() => {
    if (!supabase || !personId || !user) {
      setSaved(0)
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    supabase
      .from('ratings')
      .select('stars')
      .eq('target', personId)
      .eq('rater', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        setSaved(data ? Number((data as { stars: number }).stars) : 0)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [personId, user])

  const submit = useCallback(
    async (stars: number): Promise<{ error?: string }> => {
      if (!supabase) return { error: 'Sem ligação' }
      if (!user) return { error: 'Sem sessão' }
      if (!personId) return { error: 'Pessoa inválida' }
      const { error } = await supabase
        .from('ratings')
        .upsert({ rater: user.id, target: personId, stars })
      if (error) return { error: error.message }
      setSaved(stars)
      return {}
    },
    [personId, user],
  )

  return { saved, loading, submit }
}
