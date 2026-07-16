import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

// Guardado por utilizador no dispositivo para não voltar a mostrar num reload
// rápido antes de o Supabase responder — e como fallback se o backend falhar.
const seenKey = (id: string) => `porcadex.tutorial.${id}`

/** Decide se o tutorial de boas-vindas deve aparecer (conta nova) e permite
 *  marcá-lo como visto. A fonte de verdade é `profiles.tutorial_done`; o
 *  `localStorage` é só cache para evitar o flash em contas antigas. */
export function useTutorial(): { show: boolean; dismiss: () => void } {
  const { user } = useAuth()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!supabase || !user) {
      setShow(false)
      return
    }
    // Já sabemos localmente que foi visto: nunca mostrar.
    if (localStorage.getItem(seenKey(user.id))) {
      setShow(false)
      return
    }
    let active = true
    supabase
      .from('profiles')
      .select('tutorial_done')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        const done = (data as { tutorial_done?: boolean } | null)?.tutorial_done
        if (done) {
          localStorage.setItem(seenKey(user.id), '1')
          setShow(false)
        } else {
          // Só mostramos depois de o backend confirmar que é conta nova —
          // assim as contas antigas nunca vêem o tutorial a piscar.
          setShow(true)
        }
      })
    return () => {
      active = false
    }
  }, [user])

  const dismiss = () => {
    setShow(false)
    if (!user) return
    localStorage.setItem(seenKey(user.id), '1')
    if (!supabase) return
    void supabase
      .from('profiles')
      .upsert({ id: user.id, tutorial_done: true })
      .then(() => undefined)
  }

  return { show, dismiss }
}
