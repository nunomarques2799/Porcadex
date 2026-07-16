import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ChevronLeft,
  Plus,
  X,
  Swords,
  RotateCcw,
  Trophy,
  Bot,
  Users,
  Volume2,
  VolumeX,
  Repeat,
  Send,
} from 'lucide-react'
import { usePeople } from '../store/people'
import { useFriends } from '../lib/friends'
import { useFriendPeople } from '../lib/friendPeople'
import { challengeFriend } from '../lib/battles'
import { playMusic, stopMusic, playSfx, preloadSfx, useAudio, MUSIC, SFX } from '../lib/audio'
import type { Person, PublicPerson } from '../types'
import { typeTheme } from '../data/pokeTypes'
import {
  buildTeam,
  aiChooseAction,
  resolveMove,
  moveMaxPp,
  effectivenessNote,
  battleStatTotal,
  personBattleStats,
  applyBattleResult,
  activeOf,
  isAlive,
  teamAlive,
  benchOptions,
  MAX_TEAM,
  STRUGGLE,
  type TeamState,
  type TurnAction,
  type FighterSource,
} from '../data/battle'
import { Avatar } from '../components/Avatar'
import { TypeBadge } from '../components/TypeBadge'
import { InfoBox, MoveMenu, SwitchMenu, hpDrainMs } from '../components/BattleUI'
import { MoveFx } from '../components/MoveFx'
import { TeamPicker, type TeamSource } from '../components/TeamPicker'

type Mode = 'cpu' | 'friend'
/** `forced` = o meu lutador caiu e tenho de mandar outro. */
type Phase = 'busy' | 'choose' | 'switching' | 'forced' | 'over'
type AnyPerson = Person | PublicPerson

/** Ritmo do combate, em ms. Sobe estes números para abrandar ainda mais.
 *  O tempo da barra de HP não está aqui: é proporcional ao dano
 *  (ver `hpDrainMs` em components/BattleUI). */
const PACE = {
  /** Quanto tempo fica cada mensagem no ecrã. */
  say: 1400,
  intro: 1050,
  /** Espera até ao momento do impacto da investida antes de aplicar o dano. */
  impact: 240,
  /** Respiro depois de a barra assentar. */
  settle: 650,
  /** Pausa dramática entre o ataque de um e o contra-ataque do outro. */
  between: 900,
  faint: 1350,
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const first = (n: string) => n.split(' ')[0]

export function BattleScreen() {
  const { people, updatePerson } = usePeople()
  const { friends } = useFriends()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { muted, toggleMute } = useAudio()

  // --- Setup -----------------------------------------------------------
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'friend' ? 'friend' : 'cpu')
  const [size, setSize] = useState(1)
  const [myIds, setMyIds] = useState<string[]>([])
  const [foeSource, setFoeSource] = useState<TeamSource>('me')
  const [foeIds, setFoeIds] = useState<string[]>([])
  const [friendId, setFriendId] = useState<string>(params.get('friend') ?? '')
  const [picking, setPicking] = useState<null | 'mine' | 'foe'>(null)
  const [sending, setSending] = useState(false)
  const [sendErr, setSendErr] = useState('')

  const foeFriendId = foeSource === 'me' ? undefined : foeSource
  const foeFriend = useFriendPeople(foeFriendId)

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people])
  const myTeam = useMemo(
    () => myIds.map((id) => byId.get(id)).filter((p): p is Person => !!p),
    [myIds, byId],
  )
  const foePool: AnyPerson[] = foeFriendId ? foeFriend.people : people
  const foeTeam = useMemo(() => {
    const m = new Map(foePool.map((p) => [p.id, p]))
    return foeIds.map((id) => m.get(id)).filter((p): p is AnyPerson => !!p)
  }, [foeIds, foePool])

  // Só há XP em jogo quando o adversário é de outro utilizador.
  const crossUser = mode === 'friend' || foeSource !== 'me'
  const myReady = myTeam.length === size
  const canFight = myReady && foeTeam.length === size
  const canChallenge = myReady && !!friendId

  // Encolher a equipa se o tamanho baixar.
  useEffect(() => {
    setMyIds((prev) => (prev.length > size ? prev.slice(0, size) : prev))
    setFoeIds((prev) => (prev.length > size ? prev.slice(0, size) : prev))
  }, [size])

  // --- Estado do combate (vs CPU) ---------------------------------------
  const [started, setStarted] = useState(false)
  const tA = useRef<TeamState | null>(null)
  const tB = useRef<TeamState | null>(null)
  /** PP por lutador, por ataque. Só o lado do jogador o gasta. */
  const ppA = useRef<number[][]>([])
  const runId = useRef(0)
  const [, setTick] = useState(0)
  const bump = () => setTick((t) => t + 1)

  const [phase, setPhase] = useState<Phase>('choose')
  const [message, setMessage] = useState('')
  const [rewardMsg, setRewardMsg] = useState<string[]>([])
  const [hover, setHover] = useState(0)
  const [hit, setHit] = useState<'a' | 'b' | null>(null)
  const [striking, setStriking] = useState<'a' | 'b' | null>(null)
  const [fx, setFx] = useState<{ side: 'a' | 'b'; type: string; key: number } | null>(null)
  const [dmgPop, setDmgPop] = useState<{ side: 'a' | 'b'; amount: number; key: number } | null>(null)

  // Parar a música ao sair do ecrã.
  useEffect(() => {
    return () => {
      runId.current++
      stopMusic()
    }
  }, [])

  const say = async (text: string, my: number, ms = PACE.say) => {
    setMessage(text)
    await sleep(ms)
    return runId.current === my
  }

  const activePP = () => ppA.current[tA.current!.active] ?? []

  const runIntro = async (my: number) => {
    setPhase('busy')
    const foeName = first(activeOf(tB.current!).name)
    const myName = first(activeOf(tA.current!).name)
    if (
      !(await say(`${foeName} quer combater!`, my, PACE.intro)) ||
      !(await say(`Vai, ${myName}!`, my, PACE.intro))
    )
      return
    setPhase('choose')
    setMessage(`O que vai ${first(activeOf(tA.current!).name)} fazer?`)
  }

  const startBattle = () => {
    if (!canFight) return
    runId.current++
    const my = runId.current
    tA.current = buildTeam(myTeam as FighterSource[])
    tB.current = buildTeam(foeTeam as FighterSource[])
    ppA.current = tA.current.fighters.map((f) => f.moves.map(moveMaxPp))
    setRewardMsg([])
    setHover(0)
    setHit(null)
    setStriking(null)
    setFx(null)
    setDmgPop(null)
    setStarted(true)
    preloadSfx() // sem isto o primeiro golpe de cada tipo soa tarde
    void playMusic(MUSIC.battle)
    void runIntro(my)
  }

  const leaveBattle = () => {
    runId.current++
    stopMusic()
    setStarted(false)
    setPhase('choose')
    setRewardMsg([])
    setMessage('')
    setHit(null)
    setStriking(null)
    setFx(null)
    setDmgPop(null)
  }

  /** Fecha a batalha: aplica XP a TODA a minha equipa se for cross-user. */
  const finish = (winnerSide: 'a' | 'b') => {
    const iWon = winnerSide === 'a'
    setPhase('over')
    setMessage(iWon ? 'Ganhaste o combate!' : 'Perdeste o combate.')
    void playMusic(iWon ? MUSIC.victory : MUSIC.defeat, { loop: false })

    if (!crossUser) {
      setRewardMsg(['Treino entre as tuas — não conta para XP.'])
      return
    }
    const foes = tB.current!.fighters
    const foeLevel = Math.round(foes.reduce((s, f) => s + f.level, 0) / foes.length)
    const lines: string[] = []
    for (const p of myTeam) {
      const { battle, reward } = applyBattleResult(p.battle, iWon, foeLevel)
      void updatePerson(p.id, { battle })
      if (iWon) {
        lines.push(
          reward.leveledTo
            ? `${first(p.name)} +${reward.xpGain} XP → nível ${reward.leveledTo}! 🎉`
            : `${first(p.name)} +${reward.xpGain} XP`,
        )
      }
    }
    if (iWon && lines.some((l) => l.includes('nível'))) playSfx(SFX.levelUp)
    setRewardMsg(iWon ? lines : ['Não foi desta — mais sorte na revanche.'])
  }

  /** Anima um ataque e devolve `false` se o ecrã já mudou entretanto. */
  const strike = async (who: 'a' | 'b', my: number): Promise<boolean> => {
    const A = tA.current!
    const B = tB.current!
    const atkTeam = who === 'a' ? A : B
    const defTeam = who === 'a' ? B : A
    const atk = activeOf(atkTeam)
    const def = activeOf(defTeam)
    if (!isAlive(atk) || !isAlive(def)) return true

    let mv
    if (who === 'a') {
      const pp = activePP()
      const allOut = pp.every((v) => v <= 0)
      mv = allOut ? STRUGGLE : atk.moves[pendingMove.current]
    } else {
      const act = foeAct.current
      mv = act.kind === 'move' ? atk.moves[act.index] ?? STRUGGLE : STRUGGLE
    }

    if (!(await say(`${first(atk.name)} usou ${mv.name}!`, my))) return false

    // A investida arranca primeiro e o golpe só entra no momento do impacto —
    // aplicar o dano ao mesmo tempo que a animação começava fazia a vida cair
    // antes de o lutador lá chegar.
    setStriking(who)
    setTimeout(() => setStriking((s) => (s === who ? null : s)), 380)
    await sleep(PACE.impact)
    if (runId.current !== my) return false

    const res = resolveMove(atk, def, mv)
    bump()

    if (mv.category !== 'estatuto' && res.damage > 0) {
      const defSide: 'a' | 'b' = who === 'a' ? 'b' : 'a'
      setHit(defSide)
      setFx({ side: defSide, type: mv.type, key: Date.now() })
      setDmgPop({ side: defSide, amount: res.damage, key: Date.now() })
      playSfx(res.effectiveness >= 2 ? SFX.super : res.effectiveness < 1 ? SFX.weak : SFX.hit)
      setTimeout(() => setHit((h) => (h === defSide ? null : h)), 450)
    }

    // O som de KO toca quando a barra CHEGA a zero, não quando o dano é
    // calculado: estava a soar só depois da espera da barra e ainda da
    // mensagem de eficácia, ou seja, segundos depois de a vida acabar.
    const drain = hpDrainMs(res.damage || res.heal)
    if (res.fainted) {
      const at = my
      setTimeout(() => {
        if (runId.current === at) playSfx(SFX.faint)
      }, drain)
    }

    // Esperar que a barra acabe de escorrer antes de seguir para a próxima
    // mensagem — senão o texto passava por cima da vida ainda a descer.
    await sleep(drain + PACE.settle)
    if (runId.current !== my) return false

    if (mv.category === 'estatuto') {
      if (!(await say(`${first(atk.name)} recompôs-se! (+${res.heal} HP)`, my))) return false
    } else {
      const note = effectivenessNote(res.effectiveness).text
      if (note && !(await say(note, my))) return false
    }

    if (res.fainted) {
      if (!(await say(`${first(def.name)} foi derrotado/a!`, my, PACE.faint))) return false
      if (!teamAlive(defTeam)) {
        finish(who)
        return false
      }
      // A equipa ainda tem gente, mas quem entra só o faz no turno seguinte —
      // substituir já dava-lhe um ataque de borla ainda neste turno. A IA
      // trata disso via aiChooseAction; o jogador, via fase 'forced'.
    }
    return true
  }

  const pendingMove = useRef(0)
  const foeAct = useRef<TurnAction>({ kind: 'move', index: 0 })

  const takeTurn = async (myAct: TurnAction) => {
    if (!tA.current || !tB.current) return
    const A = tA.current
    const B = tB.current
    const my = runId.current
    setPhase('busy')

    foeAct.current = aiChooseAction(B, A)

    // 1) Trocas resolvem-se antes dos ataques — quem troca perde o ataque.
    if (myAct.kind === 'switch' && isAlive(A.fighters[myAct.to])) {
      A.active = myAct.to
      bump()
      playSfx(SFX.swap)
      if (!(await say(`Vai, ${first(activeOf(A).name)}!`, my))) return
    }
    const fAct = foeAct.current
    if (fAct.kind === 'switch' && isAlive(B.fighters[fAct.to])) {
      B.active = fAct.to
      bump()
      if (!(await say(`O adversário mandou ${first(activeOf(B).name)}!`, my))) return
    }

    // 2) Ataques, por velocidade de quem está em campo.
    if (myAct.kind === 'move') pendingMove.current = myAct.index
    const fa = activeOf(A)
    const fb = activeOf(B)
    const aFirst = fa.spe > fb.spe || (fa.spe === fb.spe && Math.random() < 0.5)
    const order: ('a' | 'b')[] = aFirst ? ['a', 'b'] : ['b', 'a']

    for (let i = 0; i < order.length; i++) {
      const who = order[i]
      const act = who === 'a' ? myAct : foeAct.current
      if (act.kind !== 'move') continue
      // Respiro dramático antes do contra-ataque — só se ambos continuam de pé
      // (se o 1º golpe já derrubou alguém, não há segundo ataque a esperar).
      if (i > 0 && isAlive(activeOf(A)) && isAlive(activeOf(B))) {
        await sleep(PACE.between)
        if (runId.current !== my) return
      }
      if (!(await strike(who, my))) return
    }

    // 3) Próximo estado: se o meu caiu, sou obrigado a trocar.
    if (!isAlive(activeOf(A))) {
      setPhase('forced')
      setMessage(`${first(activeOf(A).name)} não aguenta mais. Quem entra?`)
    } else {
      setPhase('choose')
      setMessage(`O que vai ${first(activeOf(A).name)} fazer?`)
    }
  }

  const playerMove = (i: number) => {
    if (phase !== 'choose' || !tA.current) return
    const pp = activePP()
    const allOut = pp.every((v) => v <= 0)
    if (pp[i] <= 0 && !allOut) return
    if (!allOut) {
      pp[i] = Math.max(0, pp[i] - 1)
      bump()
    }
    playSfx(SFX.select)
    void takeTurn({ kind: 'move', index: i })
  }

  const playerSwitch = (to: number) => {
    if (phase !== 'choose' && phase !== 'switching' && phase !== 'forced') return
    void takeTurn({ kind: 'switch', to })
  }

  const onChallenge = async () => {
    if (!canChallenge || sending) return
    setSending(true)
    setSendErr('')
    const r = await challengeFriend(myTeam, friendId)
    setSending(false)
    if (r.id) navigate(`/battle/live/${r.id}`)
    else setSendErr(r.error ?? 'Não foi possível enviar o desafio.')
  }

  // ---------------------------------------------------------------------
  // SETUP
  // ---------------------------------------------------------------------
  if (!started) {
    return (
      <div className="screen battle">
        <header className="edit__bar">
          <button className="iconbtn" onClick={() => navigate(-1)} aria-label="Voltar">
            <ChevronLeft size={24} />
          </button>
          <h1 className="edit__title">
            <Swords size={18} /> Combate
          </h1>
          <button className="iconbtn" onClick={toggleMute} aria-label={muted ? 'Ligar som' : 'Desligar som'}>
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </header>

        {/* Modo */}
        <div className="mode-picker">
          <button
            className={'mode-card' + (mode === 'cpu' ? ' is-active' : '')}
            onClick={() => setMode('cpu')}
          >
            <Bot size={22} />
            <b>Tu vs CPU</b>
            <small>Combate já, contra quem escolheres</small>
          </button>
          <button
            className={'mode-card' + (mode === 'friend' ? ' is-active' : '')}
            onClick={() => setMode('friend')}
          >
            <Users size={22} />
            <b>Tu vs Amigo</b>
            <small>Desafio ao vivo, por turnos</small>
          </button>
        </div>

        {/* Tamanho da equipa */}
        <div className="field">
          <label>Quantas porcas por lado</label>
          <div className="size-picker">
            {Array.from({ length: MAX_TEAM }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                className={'size-pick' + (size === n ? ' is-active' : '')}
                onClick={() => setSize(n)}
                disabled={n > people.length}
                title={n > people.length ? 'Não tens pessoas suficientes' : undefined}
              >
                {n}v{n}
              </button>
            ))}
          </div>
        </div>

        {/* Amigo a desafiar */}
        {mode === 'friend' && (
          <div className="field">
            <label htmlFor="foe-friend">Quem desafiar</label>
            {friends.length === 0 ? (
              <p className="muted-block">Ainda não tens amigos. Adiciona um pelo código.</p>
            ) : (
              <select
                id="foe-friend"
                className="input"
                value={friendId}
                onChange={(e) => setFriendId(e.target.value)}
              >
                <option value="">— Escolher amigo —</option>
                {friends.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Equipas */}
        <div className="team-setup">
          <TeamSlot
            label="A tua equipa"
            size={size}
            team={myTeam}
            onPick={() => setPicking('mine')}
          />
          {mode === 'cpu' ? (
            <TeamSlot
              label="Adversário"
              size={size}
              team={foeTeam}
              ownerId={foeFriendId}
              onPick={() => setPicking('foe')}
            />
          ) : (
            <div className="team-slot team-slot--waiting">
              <span className="team-slot__label">Adversário</span>
              <p className="dex-hint">
                {friendId
                  ? `${friends.find((f) => f.id === friendId)?.name.split(' ')[0]} escolhe a equipa ao aceitar.`
                  : 'Escolhe um amigo acima.'}
              </p>
            </div>
          )}
        </div>

        {/* Ação */}
        <div className="battle-controls">
          {mode === 'cpu' ? (
            <button className="btn btn--primary btn--fight" onClick={startBattle} disabled={!canFight}>
              <Swords size={18} /> Lutar!
            </button>
          ) : (
            <button
              className="btn btn--primary btn--fight"
              onClick={() => void onChallenge()}
              disabled={!canChallenge || sending}
            >
              <Send size={18} /> {sending ? 'A enviar…' : 'Enviar desafio'}
            </button>
          )}
        </div>
        {sendErr && <p className="friend-rating__msg friend-rating__msg--err">{sendErr}</p>}
        <p className="dex-hint" style={{ textAlign: 'center' }}>
          {mode === 'friend'
            ? 'Combate ao vivo — ganhas XP se venceres.'
            : crossUser
              ? 'Adversário de um amigo — a tua equipa ganha XP se vencer.'
              : 'Treino entre as tuas — não conta para XP. Escolhe a equipa de um amigo para ganhar XP.'}
        </p>

        {picking === 'mine' && (
          <TeamPicker
            title="A tua equipa"
            size={size}
            myPeople={people}
            friends={[]}
            source="me"
            selected={myIds}
            excludeIds={foeSource === 'me' ? foeIds : []}
            onClose={() => setPicking(null)}
            onConfirm={(_, ids) => {
              setMyIds(ids)
              setPicking(null)
            }}
          />
        )}
        {picking === 'foe' && (
          <TeamPicker
            title="Equipa adversária"
            size={size}
            myPeople={people}
            friends={friends}
            source={foeSource}
            selected={foeIds}
            excludeIds={myIds}
            onClose={() => setPicking(null)}
            onConfirm={(src, ids) => {
              setFoeSource(src)
              setFoeIds(ids)
              setPicking(null)
            }}
          />
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------
  // COMBATE
  // ---------------------------------------------------------------------
  const A = tA.current!
  const B = tB.current!
  const fa = activeOf(A)
  const fb = activeOf(B)
  const bench = benchOptions(A)
  const foePerson = foeTeam[B.active]

  return (
    <div className="screen battle">
      <header className="edit__bar">
        <button className="iconbtn" onClick={leaveBattle} aria-label="Sair do combate">
          <ChevronLeft size={24} />
        </button>
        <h1 className="edit__title">
          <Swords size={18} /> {size}v{size}
        </h1>
        <button className="iconbtn" onClick={toggleMute} aria-label={muted ? 'Ligar som' : 'Desligar som'}>
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </header>

      <div className="pkmn">
        <div className="pkmn__scene">
          <InfoBox className="pkmn__info pkmn__info--foe" f={fb} team={B} showNumbers />
          <div
            className={
              'pkmn__mon pkmn__mon--foe' +
              (fb.hp <= 0 ? ' is-fainted' : '') +
              (hit === 'b' ? ' is-hit' : '') +
              (striking === 'b' ? ' is-striking' : '')
            }
          >
            <div className="pkmn__platform" />
            <Avatar
              name={fb.name}
              type={fb.types[0]}
              avatarId={foePerson?.avatarId}
              ownerId={foeFriendId}
              size={96}
              ring
            />
            {fx?.side === 'b' && <MoveFx key={fx.key} type={fx.type} />}
            {dmgPop?.side === 'b' && (
              <span className="dmg-pop" key={dmgPop.key}>-{dmgPop.amount}</span>
            )}
          </div>

          <div
            className={
              'pkmn__mon pkmn__mon--ally' +
              (fa.hp <= 0 ? ' is-fainted' : '') +
              (hit === 'a' ? ' is-hit' : '') +
              (striking === 'a' ? ' is-striking' : '')
            }
          >
            <div className="pkmn__platform" />
            <Avatar
              name={fa.name}
              type={fa.types[0]}
              avatarId={myTeam[A.active]?.avatarId}
              size={112}
              ring
            />
            {fx?.side === 'a' && <MoveFx key={fx.key} type={fx.type} />}
            {dmgPop?.side === 'a' && (
              <span className="dmg-pop" key={dmgPop.key}>-{dmgPop.amount}</span>
            )}
          </div>
          <InfoBox className="pkmn__info pkmn__info--ally" f={fa} team={A} showNumbers />
        </div>

        <div className="pkmn__ui">
          {phase === 'choose' && (
            <>
              <MoveMenu
                f={fa}
                pp={activePP()}
                hover={hover}
                onHover={setHover}
                onPick={playerMove}
              />
              {bench.length > 0 && (
                <button className="switch-cta" onClick={() => setPhase('switching')}>
                  <Repeat size={15} /> Trocar de lutador
                </button>
              )}
            </>
          )}
          {(phase === 'switching' || phase === 'forced') && (
            <SwitchMenu
              team={A}
              options={bench}
              forced={phase === 'forced'}
              onPick={playerSwitch}
              onCancel={phase === 'switching' ? () => setPhase('choose') : undefined}
            />
          )}
          {(phase === 'busy' || phase === 'over') && (
            <div className="pkmn__msg">
              <span>{message}</span>
              {phase === 'busy' && <span className="pkmn__msg-caret">▼</span>}
            </div>
          )}
        </div>
      </div>

      {phase === 'over' && (
        <>
          {rewardMsg.length > 0 && (
            <div className="battle-reward">
              <Trophy size={18} />
              <div className="battle-reward__lines">
                {rewardMsg.map((l, i) => (
                  <span key={i}>{l}</span>
                ))}
              </div>
            </div>
          )}
          <div className="battle-controls battle-controls--over">
            <button className="btn btn--ghost" onClick={leaveBattle}>
              <X size={16} /> Trocar
            </button>
            <button className="btn btn--primary" onClick={startBattle}>
              <RotateCcw size={16} /> Revanche
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** Uma equipa no ecrã de setup: avatares escolhidos + lugares por preencher. */
function TeamSlot({
  label,
  size,
  team,
  ownerId,
  onPick,
}: {
  label: string
  size: number
  team: AnyPerson[]
  ownerId?: string
  onPick: () => void
}) {
  const empty = Math.max(0, size - team.length)
  const lead = team[0]
  const accent = typeTheme(lead?.types[0]).accent
  const bst = team.reduce((s, p) => s + battleStatTotal(personBattleStats(p)), 0)

  return (
    <button className="team-slot" onClick={onPick}>
      <span className="team-slot__label">{label}</span>
      <span className="team-slot__row">
        {team.map((p) => (
          <Avatar
            key={p.id}
            name={p.name}
            type={p.types[0]}
            avatarId={p.avatarId}
            ownerId={ownerId}
            size={team.length > 3 ? 40 : 52}
            ring
          />
        ))}
        {Array.from({ length: empty }, (_, i) => (
          <span key={i} className="team-slot__empty" style={{ width: team.length > 3 ? 40 : 52, height: team.length > 3 ? 40 : 52 }}>
            <Plus size={18} />
          </span>
        ))}
      </span>
      {team.length > 0 ? (
        <>
          <span className="team-slot__names">{team.map((p) => first(p.name)).join(' · ')}</span>
          <span className="team-slot__meta" style={{ color: accent }}>
            {bst} pts
          </span>
          {team.length === 1 && (
            <span className="team-slot__types">
              {lead.types.map((t) => (
                <TypeBadge key={t} type={t} size="sm" />
              ))}
            </span>
          )}
        </>
      ) : (
        <span className="team-slot__meta">Toca para escolher</span>
      )}
    </button>
  )
}
