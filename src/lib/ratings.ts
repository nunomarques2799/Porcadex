import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

/** A minha avaliação (0–5) para a pessoa de um amigo, com submissão. A média
 *  fica em people.rating (recalculada por trigger na BD). */
export function useMyRating(personId: string | undefined): {
  myRating: number
  rate: (stars: number) => Promise<void>
  loading: boolean
} {
  const { user } = useAuth()
  const [myRating, setMyRating] = useState(0)
  const [loading, setLoading] = useState<boolean>(!!personId)

  useEffect(() => {
    if (!supabase || !personId || !user) {
      setMyRating(0)
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
        setMyRating(data ? Number((data as { stars: number }).stars) : 0)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [personId, user])

  const rate = useCallback(
    async (stars: number) => {
      if (!supabase || !personId || !user) return
      setMyRating(stars) // otimista
      await supabase.from('ratings').upsert({ rater: user.id, target: personId, stars })
    },
    [personId, user],
  )

  return { myRating, rate, loading }
}
