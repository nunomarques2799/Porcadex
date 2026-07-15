// Animação do golpe, por tipo: água manda uma onda, elétrico um raio, etc.
//
// Desenhado em SVG por cima do alvo. Cada família tem a sua forma; a cor vem
// sempre do tipo (data/pokeTypes), por isso Poison e Psychic partilham a forma
// mas nunca se confundem. As 18 famílias reais são 11 — tipos com a mesma
// leitura visual (rock/ground → pedras) reaproveitam a mesma.

import { getType } from '../data/pokeTypes'

type FxKind =
  | 'wave'
  | 'bolt'
  | 'flame'
  | 'leaves'
  | 'ice'
  | 'rocks'
  | 'impact'
  | 'orb'
  | 'bubbles'
  | 'wind'
  | 'gleam'

const TYPE_FX: Record<string, FxKind> = {
  water: 'wave',
  electric: 'bolt',
  fire: 'flame',
  dragon: 'flame',
  grass: 'leaves',
  bug: 'leaves',
  ice: 'ice',
  rock: 'rocks',
  ground: 'rocks',
  fighting: 'impact',
  normal: 'impact',
  psychic: 'orb',
  ghost: 'orb',
  fairy: 'orb',
  dark: 'orb',
  poison: 'bubbles',
  flying: 'wind',
  steel: 'gleam',
}

/** Um golpe a acertar. `fxKey` deve mudar a cada acerto para reiniciar a
 *  animação (usa-o como `key` do React). */
export function MoveFx({ type }: { type: string }) {
  const t = getType(type)
  const kind = TYPE_FX[t.key] ?? 'impact'
  return (
    <span className={'mfx mfx--' + kind} style={{ ['--fx' as string]: t.color }} aria-hidden="true">
      {render(kind)}
    </span>
  )
}

function render(kind: FxKind) {
  switch (kind) {
    // Onda a varrer o alvo, com espuma.
    case 'wave':
      return (
        <svg viewBox="0 0 100 100">
          <path className="mfx__wave1" d="M-40 62 q 14 -13 28 0 t 28 0 t 28 0 t 28 0 t 28 0 V101 H-40 Z" />
          <path className="mfx__wave2" d="M-40 72 q 12 -11 24 0 t 24 0 t 24 0 t 24 0 t 24 0 V101 H-40 Z" />
          <g className="mfx__drops">
            <circle cx="30" cy="42" r="3.5" />
            <circle cx="52" cy="30" r="2.5" />
            <circle cx="70" cy="45" r="3" />
            <circle cx="44" cy="52" r="2" />
          </g>
        </svg>
      )

    // Raio em ziguezague + clarão.
    case 'bolt':
      return (
        <svg viewBox="0 0 100 100">
          <path className="mfx__bolt" d="M58 -4 L34 44 h18 L40 104 L74 42 H54 Z" />
          <path className="mfx__bolt mfx__bolt--b" d="M28 6 L12 40 h11 L16 82 L40 38 H26 Z" />
          <circle className="mfx__flash" cx="50" cy="50" r="46" />
        </svg>
      )

    // Labaredas a subir.
    case 'flame':
      return (
        <svg viewBox="0 0 100 100">
          <path className="mfx__fire1" d="M50 96 C24 78 30 56 44 42 c2 10 8 14 12 10 C50 34 58 12 50 2 c22 14 34 36 30 56 -3 18 -14 30 -30 38 Z" />
          <path className="mfx__fire2" d="M50 92 C36 80 38 64 48 54 c1 7 5 10 8 7 -4 -12 1 -26 -4 -33 14 10 22 24 19 38 -2 12 -9 20 -21 26 Z" />
        </svg>
      )

    // Folhas a rodopiar.
    case 'leaves':
      return (
        <svg viewBox="0 0 100 100">
          {[
            { c: 'a', x: 24, y: 30 },
            { c: 'b', x: 66, y: 24 },
            { c: 'c', x: 40, y: 66 },
            { c: 'd', x: 74, y: 60 },
          ].map((l) => (
            <path
              key={l.c}
              className={'mfx__leaf mfx__leaf--' + l.c}
              transform={`translate(${l.x} ${l.y})`}
              d="M0 0 C 14 -10 26 -4 26 10 C 26 22 12 26 0 18 C -6 12 -6 6 0 0 Z"
            />
          ))}
        </svg>
      )

    // Estilhaços de gelo a cravar.
    case 'ice':
      return (
        <svg viewBox="0 0 100 100">
          {[
            { c: 'a', r: 0 },
            { c: 'b', r: 72 },
            { c: 'c', r: 144 },
            { c: 'd', r: 216 },
            { c: 'e', r: 288 },
          ].map((s) => (
            <path
              key={s.c}
              className={'mfx__shard mfx__shard--' + s.c}
              transform={`rotate(${s.r} 50 50)`}
              d="M50 4 L58 34 L50 46 L42 34 Z"
            />
          ))}
          <circle className="mfx__frost" cx="50" cy="50" r="30" />
        </svg>
      )

    // Pedras a cair + poeira.
    case 'rocks':
      return (
        <svg viewBox="0 0 100 100">
          <ellipse className="mfx__dust" cx="50" cy="80" rx="42" ry="12" />
          {[
            { c: 'a', d: 'M0 0 l14 5 l4 14 l-12 8 l-13 -6 Z', x: 26, y: 22 },
            { c: 'b', d: 'M0 0 l11 3 l3 11 l-9 6 l-10 -5 Z', x: 62, y: 14 },
            { c: 'c', d: 'M0 0 l9 4 l1 9 l-8 5 l-8 -6 Z', x: 46, y: 40 },
          ].map((r) => (
            <path key={r.c} className={'mfx__rock mfx__rock--' + r.c} transform={`translate(${r.x} ${r.y})`} d={r.d} />
          ))}
        </svg>
      )

    // Estrelão de impacto.
    case 'impact':
      return (
        <svg viewBox="0 0 100 100">
          <path
            className="mfx__star"
            d="M50 0 L60 32 L92 14 L70 44 L100 50 L70 56 L92 86 L60 68 L50 100 L40 68 L8 86 L30 56 L0 50 L30 44 L8 14 L40 32 Z"
          />
          <circle className="mfx__ring" cx="50" cy="50" r="30" />
        </svg>
      )

    // Orbes e anéis concêntricos.
    case 'orb':
      return (
        <svg viewBox="0 0 100 100">
          <circle className="mfx__orb" cx="50" cy="50" r="26" />
          <circle className="mfx__halo mfx__halo--a" cx="50" cy="50" r="30" />
          <circle className="mfx__halo mfx__halo--b" cx="50" cy="50" r="30" />
          <circle className="mfx__halo mfx__halo--c" cx="50" cy="50" r="30" />
        </svg>
      )

    // Bolhas a subir.
    case 'bubbles':
      return (
        <svg viewBox="0 0 100 100">
          {[
            { c: 'a', x: 30, r: 9 },
            { c: 'b', x: 52, r: 13 },
            { c: 'c', x: 70, r: 7 },
            { c: 'd', x: 42, r: 6 },
            { c: 'e', x: 62, r: 10 },
          ].map((b) => (
            <circle key={b.c} className={'mfx__bub mfx__bub--' + b.c} cx={b.x} cy="86" r={b.r} />
          ))}
        </svg>
      )

    // Lâminas de vento.
    case 'wind':
      return (
        <svg viewBox="0 0 100 100">
          {['a', 'b', 'c'].map((c, i) => (
            <path
              key={c}
              className={'mfx__gust mfx__gust--' + c}
              d={`M-10 ${28 + i * 20} q 40 -14 80 0 q -40 8 -80 0 Z`}
            />
          ))}
        </svg>
      )

    // Brilho metálico a cruzar.
    case 'gleam':
      return (
        <svg viewBox="0 0 100 100">
          <path className="mfx__shine mfx__shine--a" d="M-20 60 L40 -20 L56 -20 L-4 60 Z" />
          <path className="mfx__shine mfx__shine--b" d="M10 90 L70 10 L80 10 L20 90 Z" />
          <circle className="mfx__spark" cx="50" cy="50" r="4" />
        </svg>
      )
  }
}
