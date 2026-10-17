// Illustrated stage characters and scenes in the frozen V2 style
// (docs/design/kidscoding-v2/prototype.html `.scene-player` / `.stage-scene`).
// Standing rule: characters are always real illustrations, never plain
// coloured circles standing in for them.

export type CharacterId = 'fox' | 'rabbit' | 'bird' | 'butterfly' | 'frog' | 'bear'
export type SceneId = 'forest' | 'meadow' | 'garden'

// Chibi proportions: big head, small round body, stubby feet, glossy eyes.
const shadow = <ellipse cx="50" cy="104" rx="30" ry="5" fill="#305a43" opacity=".22" />

function Eyes({ y = 46, dx = 12, color = '#1a2739' }: { y?: number; dx?: number; color?: string }) {
  return (
    <g>
      <ellipse cx={50 - dx} cy={y} rx="5.6" ry="6.8" fill={color} />
      <ellipse cx={50 + dx} cy={y} rx="5.6" ry="6.8" fill={color} />
      <circle cx={50 - dx + 1.8} cy={y - 2.6} r="2.2" fill="#fff" />
      <circle cx={50 + dx + 1.8} cy={y - 2.6} r="2.2" fill="#fff" />
      <circle cx={50 - dx - 1.6} cy={y + 2.4} r="1" fill="#fff" opacity=".8" />
      <circle cx={50 + dx - 1.6} cy={y + 2.4} r="1" fill="#fff" opacity=".8" />
    </g>
  )
}

function Blush({ y = 58, dx = 21 }: { y?: number; dx?: number }) {
  return (
    <g fill="#ff8fa3" opacity=".55">
      <ellipse cx={50 - dx} cy={y} rx="6" ry="3.6" />
      <ellipse cx={50 + dx} cy={y} rx="6" ry="3.6" />
    </g>
  )
}

function Smile({ y = 62 }: { y?: number }) {
  return <path d={`M43 ${y} Q50 ${y + 7} 57 ${y}`} fill="#e86a5a" stroke="#5b2f22" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
}

function Fox() {
  const o = '#ff9a3c', line = '#a04a1c', cream = '#fff3df'
  return (
    <>
      {shadow}
      <path d="M70 86 Q96 84 92 58 Q84 72 70 74Z" fill={o} stroke={line} strokeWidth="3" strokeLinejoin="round" />
      <path d="M86 64 Q92 58 92 58 Q94 72 84 78Z" fill={cream} />
      <ellipse cx="50" cy="84" rx="20" ry="17" fill={o} stroke={line} strokeWidth="3" />
      <ellipse cx="50" cy="87" rx="11" ry="10" fill={cream} />
      <ellipse cx="39" cy="100" rx="8" ry="5" fill="#7a3a17" />
      <ellipse cx="61" cy="100" rx="8" ry="5" fill="#7a3a17" />
      <path d="M18 40 L20 4 44 26Z" fill={o} stroke={line} strokeWidth="3" strokeLinejoin="round" />
      <path d="M82 40 L80 4 56 26Z" fill={o} stroke={line} strokeWidth="3" strokeLinejoin="round" />
      <path d="M24 30 L25 14 36 26Z M76 30 L75 14 64 26Z" fill="#5a2a14" opacity=".55" />
      <ellipse cx="50" cy="48" rx="34" ry="31" fill={o} stroke={line} strokeWidth="3" />
      <path d="M17 52 Q32 50 50 70 Q68 50 83 52 Q80 78 50 79 Q20 78 17 52Z" fill={cream} />
      <Eyes y={45} dx={13} />
      <Blush y={58} dx={24} />
      <ellipse cx="50" cy="58" rx="4.6" ry="3.4" fill="#3a2016" />
      <Smile y={63} />
    </>
  )
}

function Rabbit() {
  const w = '#fffaf5', line = '#9b8fb0'
  return (
    <>
      {shadow}
      <ellipse cx="50" cy="86" rx="19" ry="16" fill={w} stroke={line} strokeWidth="3" />
      <circle cx="70" cy="92" r="6" fill="#fff" stroke={line} strokeWidth="2.5" />
      <ellipse cx="40" cy="100" rx="8" ry="5" fill="#f3d6e0" stroke={line} strokeWidth="2" />
      <ellipse cx="60" cy="100" rx="8" ry="5" fill="#f3d6e0" stroke={line} strokeWidth="2" />
      <rect x="27" y="0" width="15" height="40" rx="7.5" fill={w} stroke={line} strokeWidth="3" transform="rotate(-8 34 20)" />
      <rect x="58" y="0" width="15" height="40" rx="7.5" fill={w} stroke={line} strokeWidth="3" transform="rotate(8 66 20)" />
      <rect x="31.5" y="6" width="6" height="28" rx="3" fill="#ffb7c9" transform="rotate(-8 34 20)" />
      <rect x="62.5" y="6" width="6" height="28" rx="3" fill="#ffb7c9" transform="rotate(8 66 20)" />
      <ellipse cx="50" cy="52" rx="31" ry="28" fill={w} stroke={line} strokeWidth="3" />
      <Eyes y={49} dx={12} />
      <Blush y={60} dx={21} />
      <path d="M46 57 L54 57 L50 61Z" fill="#ff7d98" />
      <path d="M50 61 V64 M44 65 Q47 68 50 64 Q53 68 56 65" fill="none" stroke="#6b5560" strokeWidth="2" strokeLinecap="round" />
    </>
  )
}

function Bird() {
  const b = '#4fb0ff', line = '#1f66b3'
  return (
    <>
      {shadow}
      <path d="M78 66 L96 56 L92 76Z" fill="#2f8ce6" stroke={line} strokeWidth="2.5" strokeLinejoin="round" />
      <ellipse cx="50" cy="62" rx="36" ry="36" fill={b} stroke={line} strokeWidth="3" />
      <path d="M26 72 Q50 104 74 72 Q68 92 50 94 Q32 92 26 72Z" fill="#fff4d2" />
      <path d="M58 64 Q76 58 84 72 Q72 84 60 76Z" fill="#2f8ce6" stroke={line} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M44 28 Q48 12 56 24 M52 26 Q60 14 64 28" fill="none" stroke={line} strokeWidth="3.5" strokeLinecap="round" />
      <Eyes y={52} dx={13} />
      <Blush y={64} dx={23} />
      <path d="M43 62 L57 62 L50 72Z" fill="#ffb636" stroke="#c27b14" strokeWidth="2" strokeLinejoin="round" />
      <path d="M42 96 V103 M58 96 V103" stroke="#d4891b" strokeWidth="3.5" strokeLinecap="round" />
    </>
  )
}

function Butterfly() {
  return (
    <>
      <ellipse cx="50" cy="104" rx="18" ry="4" fill="#305a43" opacity=".18" />
      <path d="M46 46 Q16 6 6 32 Q2 56 44 54Z" fill="#b48cff" stroke="#6a45c2" strokeWidth="3" strokeLinejoin="round" />
      <path d="M54 46 Q84 6 94 32 Q98 56 56 54Z" fill="#b48cff" stroke="#6a45c2" strokeWidth="3" strokeLinejoin="round" />
      <path d="M45 58 Q12 60 18 82 Q28 94 46 64Z" fill="#ff9cc8" stroke="#c4528a" strokeWidth="3" strokeLinejoin="round" />
      <path d="M55 58 Q88 60 82 82 Q72 94 54 64Z" fill="#ff9cc8" stroke="#c4528a" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="22" cy="32" r="6" fill="#fff" opacity=".75" /><circle cx="78" cy="32" r="6" fill="#fff" opacity=".75" />
      <circle cx="28" cy="76" r="4" fill="#fff6a8" /><circle cx="72" cy="76" r="4" fill="#fff6a8" />
      <rect x="44" y="44" width="12" height="44" rx="6" fill="#4a3a78" />
      <circle cx="50" cy="36" r="13" fill="#5a4790" />
      <path d="M45 25 Q40 10 33 10 M55 25 Q60 10 67 10" fill="none" stroke="#4a3a78" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="33" cy="10" r="3" fill="#ffd34d" /><circle cx="67" cy="10" r="3" fill="#ffd34d" />
      <Eyes y={35} dx={5} color="#fff" />
      <path d="M46 42 Q50 45 54 42" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </>
  )
}

function Frog() {
  const g = '#6fd36a', line = '#2c8a3a'
  return (
    <>
      {shadow}
      <ellipse cx="50" cy="86" rx="22" ry="16" fill={g} stroke={line} strokeWidth="3" />
      <ellipse cx="50" cy="89" rx="13" ry="10" fill="#e3f7cf" />
      <ellipse cx="34" cy="100" rx="10" ry="5" fill={g} stroke={line} strokeWidth="2.5" />
      <ellipse cx="66" cy="100" rx="10" ry="5" fill={g} stroke={line} strokeWidth="2.5" />
      <ellipse cx="50" cy="56" rx="36" ry="26" fill={g} stroke={line} strokeWidth="3" />
      <circle cx="32" cy="32" r="14" fill={g} stroke={line} strokeWidth="3" />
      <circle cx="68" cy="32" r="14" fill={g} stroke={line} strokeWidth="3" />
      <circle cx="32" cy="32" r="9" fill="#fff" /><circle cx="68" cy="32" r="9" fill="#fff" />
      <circle cx="33" cy="33" r="5.5" fill="#1a2739" /><circle cx="67" cy="33" r="5.5" fill="#1a2739" />
      <circle cx="35" cy="30.5" r="2" fill="#fff" /><circle cx="69" cy="30.5" r="2" fill="#fff" />
      <Blush y={60} dx={25} />
      <path d="M32 58 Q50 74 68 58" fill="#e86a5a" stroke={line} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  )
}

function Bear() {
  const br = '#c4885a', line = '#7a4b2c'
  return (
    <>
      {shadow}
      <ellipse cx="50" cy="86" rx="21" ry="17" fill={br} stroke={line} strokeWidth="3" />
      <ellipse cx="50" cy="89" rx="12" ry="10" fill="#f3dcc0" />
      <ellipse cx="38" cy="100" rx="9" ry="5" fill="#8b5a36" />
      <ellipse cx="62" cy="100" rx="9" ry="5" fill="#8b5a36" />
      <circle cx="22" cy="22" r="13" fill={br} stroke={line} strokeWidth="3" />
      <circle cx="78" cy="22" r="13" fill={br} stroke={line} strokeWidth="3" />
      <circle cx="22" cy="22" r="6" fill="#f3c9a4" /><circle cx="78" cy="22" r="6" fill="#f3c9a4" />
      <ellipse cx="50" cy="50" rx="34" ry="31" fill={br} stroke={line} strokeWidth="3" />
      <ellipse cx="50" cy="62" rx="15" ry="12" fill="#f6e0c6" />
      <Eyes y={45} dx={14} />
      <Blush y={58} dx={25} />
      <ellipse cx="50" cy="57" rx="6" ry="4.2" fill="#3a2016" />
      <path d="M44 65 Q50 70 56 65" fill="none" stroke="#3a2016" strokeWidth="2.4" strokeLinecap="round" />
    </>
  )
}

const ART: Record<CharacterId, () => React.JSX.Element> = {
  fox: Fox,
  rabbit: Rabbit,
  bird: Bird,
  butterfly: Butterfly,
  frog: Frog,
  bear: Bear,
}

export function CharacterArt({ id, className }: { id?: string; className?: string }) {
  const Art = ART[(id as CharacterId) ?? 'fox'] ?? Fox
  return (
    <svg viewBox="0 0 100 110" className={className} aria-hidden="true" focusable="false" data-character-art={id ?? 'fox'}>
      <Art />
    </svg>
  )
}

/** V2 stage backdrop: sky, soft hills/trees and a striped ground strip. */
export function SceneBackdrop({ scene }: { scene: SceneId }) {
  const palette = {
    forest: { sky: ['#bcdcf7', '#e7f5fd'], hill: '#8ebba6', ground: ['#5d916e', '#649d78'], tree: '#4f8a66' },
    meadow: { sky: ['#c6e8ff', '#f2fbef'], hill: '#a8d39a', ground: ['#7cb26a', '#86bb73'], tree: '#69a35d' },
    garden: { sky: ['#f6e3f4', '#fdf6ec'], hill: '#c2dcb0', ground: ['#78ad74', '#82b67e'], tree: '#6aa069' },
  }[scene]
  return (
    <svg className="kc-scene-backdrop" viewBox="0 0 400 240" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`kc-sky-${scene}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.sky[0]} />
          <stop offset="1" stopColor={palette.sky[1]} />
        </linearGradient>
        <pattern id={`kc-ground-${scene}`} width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <rect width="20" height="40" fill={palette.ground[0]} />
          <rect x="20" width="20" height="40" fill={palette.ground[1]} />
        </pattern>
      </defs>
      <rect width="400" height="240" fill={`url(#kc-sky-${scene})`} />
      <ellipse cx="96" cy="40" rx="38" ry="9" fill="#fff" opacity=".7" />
      <ellipse cx="300" cy="28" rx="30" ry="7" fill="#fff" opacity=".6" />
      <path d="M20 170 L70 100 L105 140 L150 70 L200 135 L235 95 L280 170Z" fill={palette.hill} opacity=".7" />
      <path d="M300 170 Q330 120 360 130 Q390 140 400 120 V170Z" fill={palette.hill} opacity=".55" />
      <g fill={palette.tree}>
        <path d="M330 168 L345 118 L360 168Z" />
        <path d="M352 168 L370 108 L388 168Z" />
        <path d="M24 168 L38 128 L52 168Z" />
      </g>
      {scene === 'garden' ? (
        <g>
          <circle cx="60" cy="186" r="5" fill="#f59ac0" /><circle cx="120" cy="196" r="4" fill="#ffd36b" />
          <circle cx="250" cy="190" r="5" fill="#f59ac0" /><circle cx="330" cy="198" r="4" fill="#ffd36b" />
        </g>
      ) : null}
      <rect y="168" width="400" height="72" fill="#9ac59b" />
      <rect y="204" width="400" height="36" fill={`url(#kc-ground-${scene})`} />
    </svg>
  )
}
