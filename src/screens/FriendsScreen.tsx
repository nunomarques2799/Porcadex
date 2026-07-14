import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, Copy, UserPlus, Check, X, Users } from 'lucide-react'
import { useFriends } from '../lib/friends'
import { Avatar } from '../components/Avatar'

export function FriendsScreen() {
  const navigate = useNavigate()
  const {
    loading,
    friends,
    incoming,
    outgoing,
    myCode,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend,
  } = useFriends()

  const [code, setCode] = useState('')
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)

  const copyCode = async () => {
    if (!myCode) return
    try {
      await navigator.clipboard.writeText(myCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked */
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setStatus(null)
    const res = await sendRequest(code)
    setSending(false)
    if (res.error) {
      setStatus({ kind: 'err', msg: res.error })
    } else {
      setStatus({ kind: 'ok', msg: 'Pedido enviado.' })
      setCode('')
    }
  }

  return (
    <div className="screen friends">
      <header className="edit__bar">
        <button className="iconbtn" onClick={() => navigate(-1)} aria-label="Voltar">
          <ChevronLeft size={24} />
        </button>
        <h1 className="edit__title">Amigos</h1>
        <span style={{ width: 42 }} />
      </header>

      <div className="me__body">
        {/* My code */}
        <section className="stats-card">
          <div className="stats-card__head">
            <h2>O meu código</h2>
          </div>
          <div className="friend-code">
            <span className="friend-code__value">{myCode ?? '—'}</span>
            <button
              type="button"
              className="btn btn--ghost friend-code__copy"
              onClick={copyCode}
              disabled={!myCode}
            >
              <Copy size={15} /> {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <p className="hint">Partilha este código com quem queres adicionar.</p>
        </section>

        {/* Add by code */}
        <section className="stats-card">
          <div className="stats-card__head">
            <h2><UserPlus size={16} style={{ verticalAlign: '-3px' }} /> Adicionar amigo</h2>
          </div>
          <form onSubmit={submit} className="friend-add">
            <input
              className="input"
              placeholder="ex: k7w9-h3fp"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="btn btn--primary" disabled={sending || !code.trim()}>
              Enviar pedido
            </button>
          </form>
          {status && (
            <p className={'friend-status' + (status.kind === 'err' ? ' is-err' : '')}>
              {status.msg}
            </p>
          )}
        </section>

        {/* Incoming */}
        {incoming.length > 0 && (
          <section className="stats-card">
            <div className="stats-card__head">
              <h2>Pedidos recebidos</h2>
            </div>
            <ul className="req-list">
              {incoming.map((r) => (
                <li key={r.otherId} className="req-row">
                  <Avatar name={r.otherName} size={40} />
                  <div className="req-row__text">
                    <span className="req-row__name">{r.otherName}</span>
                    <span className="req-row__code">{r.otherCode}</span>
                  </div>
                  <button
                    className="iconbtn iconbtn--ok"
                    aria-label="Aceitar"
                    onClick={() => void acceptRequest(r.otherId)}
                  >
                    <Check size={18} />
                  </button>
                  <button
                    className="iconbtn iconbtn--no"
                    aria-label="Recusar"
                    onClick={() => void declineRequest(r.otherId)}
                  >
                    <X size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Outgoing */}
        {outgoing.length > 0 && (
          <section className="stats-card">
            <div className="stats-card__head">
              <h2>Pedidos enviados</h2>
            </div>
            <ul className="req-list">
              {outgoing.map((r) => (
                <li key={r.otherId} className="req-row">
                  <Avatar name={r.otherName} size={40} />
                  <div className="req-row__text">
                    <span className="req-row__name">{r.otherName}</span>
                    <span className="req-row__code">{r.otherCode}</span>
                  </div>
                  <button
                    className="btn btn--ghost"
                    onClick={() => void cancelRequest(r.otherId)}
                  >
                    Cancelar
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Friends list */}
        <section className="stats-card">
          <div className="stats-card__head">
            <h2><Users size={16} style={{ verticalAlign: '-3px' }} /> Amigos ({friends.length})</h2>
          </div>
          {loading && friends.length === 0 ? (
            <p className="muted-block">A carregar…</p>
          ) : friends.length === 0 ? (
            <p className="muted-block">Ainda não tens amigos. Envia um código.</p>
          ) : (
            <ul className="top-list">
              {friends.map((f) => (
                <li key={f.id}>
                  <div className="top-row top-row--friend">
                    <Link to={`/friends/${f.id}`} className="top-row__link">
                      <Avatar name={f.name} size={40} ownerId={f.id} />
                      <div className="top-row__text">
                        <span className="top-row__name">{f.name}</span>
                        <span className="top-row__sub">{f.friendCode}</span>
                      </div>
                    </Link>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => {
                        if (confirm(`Remover ${f.name}?`)) void removeFriend(f.id)
                      }}
                    >
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
