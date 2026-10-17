// Illustrated stage characters and scenes in the frozen V2 style
// (docs/design/kidscoding-v2/prototype.html `.scene-player` / `.stage-scene`).
// Standing rule: characters are always real illustrations, never plain
// coloured circles standing in for them.

export type CharacterId = 'fox' | 'rabbit' | 'bird' | 'butterfly' | 'frog' | 'bear'
export type SceneId = 'forest' | 'meadow' | 'garden'

const shadow = <ellipse cx="40" cy="74" rx="26" ry="5" fill="#305a43" opacity=".22" />

function Fox() {
  return (
    <>
      {shadow}
      <path d="M58 60 Q76 58 72 40 Q66 50 56 50Z" fill="#ec9a49" stroke="#a65326" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M68 44 Q72 40 72 40 Q74 50 66 54Z" fill="#fff0d8" />
      <path d="M16 34 L18 6 36 24Z" fill="#f1a35a" stroke="#a75328" strokeWidth="3" strokeLinejoin="round" />
      <path d="M64 34 L62 6 44 24Z" fill="#f1a35a" stroke="#a75328" strokeWidth="3" strokeLinejoin="round" />
      <path d="M21 26 L22 14 30 22Z M59 26 L58 14 50 22Z" fill="#3a2a22" opacity=".55" />
      <ellipse cx="40" cy="42" rx="27" ry="27" fill="#ec9a49" stroke="#a65326" strokeWidth="3" />
      <path d="M15 46 Q28 46 40 62 Q52 46 65 46 Q62 68 40 69 Q18 68 15 46Z" fill="#fff0d8" />
      <ellipse cx="30" cy="39" rx="3.4" ry="4.5" fill="#1a2739" />
      <ellipse cx="50" cy="39" rx="3.4" ry="4.5" fill="#1a2739" />
      <circle cx="31" cy="37.5" r="1.1" fill="#fff" />
      <circle cx="51" cy="37.5" r="1.1" fill="#fff" />
      <path d="M36 52 Q40 49 44 52 L40 56Z" fill="#3a2a22" />
      <path d="M35 59 Q40 62 45 59" fill="none" stroke="#593622" strokeWidth="2" strokeLinecap="round" />
    </>
  )
}

function Rabbit() {
  return (
    <>
      {shadow}
      <rect x="22" y="2" width="12" height="34" rx="6" fill="#f8f4ef" stroke="#8f8a9e" strokeWidth="2.5" />
      <rect x="46" y="2" width="12" height="34" rx="6" fill="#f8f4ef" stroke="#8f8a9e" strokeWidth="2.5" />
      <rect x="25.5" y="7" width="5" height="24" rx="2.5" fill="#f6b8c8" />
      <rect x="49.5" y="7" width="5" height="24" rx="2.5" fill="#f6b8c8" />
      <ellipse cx="40" cy="48" rx="25" ry="23" fill="#f8f4ef" stroke="#8f8a9e" strokeWidth="3" />
      <ellipse cx="31" cy="45" rx="3.2" ry="4.2" fill="#1a2739" />
      <ellipse cx="49" cy="45" rx="3.2" ry="4.2" fill="#1a2739" />
      <circle cx="32" cy="43.5" r="1" fill="#fff" />
      <circle cx="50" cy="43.5" r="1" fill="#fff" />
      <ellipse cx="24" cy="54" rx="4" ry="2.5" fill="#f6b8c8" opacity=".8" />
      <ellipse cx="56" cy="54" rx="4" ry="2.5" fill="#f6b8c8" opacity=".8" />
      <path d="M37 52 L43 52 L40 55Z" fill="#e3798f" />
      <path d="M40 55 V58 M36 59 Q38 61 40 58 Q42 61 44 59" fill="none" stroke="#6b5560" strokeWidth="1.8" strokeLinecap="round" />
    </>
  )
}

function Bird() {
  return (
    <>
      {shadow}
      <path d="M58 46 L74 38 L70 52Z" fill="#3e8fd8" stroke="#245f99" strokeWidth="2" strokeLinejoin="round" />
      <ellipse cx="40" cy="46" rx="25" ry="23" fill="#5aa9ec" stroke="#245f99" strokeWidth="3" />
      <path d="M22 54 Q40 74 58 54 Q52 66 40 67 Q28 66 22 54Z" fill="#fff3d6" />
      <path d="M32 46 Q44 40 56 50 Q46 60 34 54Z" fill="#3e8fd8" stroke="#245f99" strokeWidth="2" strokeLinejoin="round" />
      <path d="M36 24 Q40 14 46 22" fill="none" stroke="#245f99" strokeWidth="3" strokeLinecap="round" />
      <circle cx="30" cy="40" r="3.8" fill="#1a2739" />
      <circle cx="31" cy="38.6" r="1.1" fill="#fff" />
      <path d="M14 43 L22 40 L22 47Z" fill="#f5b53d" stroke="#b9791c" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M34 68 V74 M44 68 V74" stroke="#b9791c" strokeWidth="2.5" strokeLinecap="round" />
    </>
  )
}

function Butterfly() {
  return (
    <>
      <ellipse cx="40" cy="74" rx="16" ry="4" fill="#305a43" opacity=".18" />
      <path d="M38 34 Q14 6 8 26 Q4 44 36 42Z" fill="#9b7bf0" stroke="#5b3fb0" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M42 34 Q66 6 72 26 Q76 44 44 42Z" fill="#9b7bf0" stroke="#5b3fb0" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M37 44 Q12 46 16 62 Q24 70 38 50Z" fill="#f59ac0" stroke="#b44f80" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M43 44 Q68 46 64 62 Q56 70 42 50Z" fill="#f59ac0" stroke="#b44f80" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="20" cy="26" r="4" fill="#fff" opacity=".7" />
      <circle cx="60" cy="26" r="4" fill="#fff" opacity=".7" />
      <rect x="36" y="28" width="8" height="34" rx="4" fill="#3b2f5c" />
      <circle cx="40" cy="26" r="6" fill="#3b2f5c" />
      <path d="M38 21 Q34 10 30 10 M42 21 Q46 10 50 10" fill="none" stroke="#3b2f5c" strokeWidth="2" strokeLinecap="round" />
      <circle cx="38" cy="25" r="1.1" fill="#fff" />
      <circle cx="42" cy="25" r="1.1" fill="#fff" />
    </>
  )
}

function Frog() {
  return (
    <>
      {shadow}
      <circle cx="27" cy="26" r="11" fill="#6cc46a" stroke="#2f7a3c" strokeWidth="3" />
      <circle cx="53" cy="26" r="11" fill="#6cc46a" stroke="#2f7a3c" strokeWidth="3" />
      <circle cx="27" cy="26" r="6" fill="#fff" />
      <circle cx="53" cy="26" r="6" fill="#fff" />
      <circle cx="28" cy="27" r="3.4" fill="#1a2739" />
      <circle cx="52" cy="27" r="3.4" fill="#1a2739" />
      <ellipse cx="40" cy="50" rx="29" ry="22" fill="#6cc46a" stroke="#2f7a3c" strokeWidth="3" />
      <ellipse cx="40" cy="58" rx="17" ry="11" fill="#d9f2c4" />
      <path d="M26 46 Q40 56 54 46" fill="none" stroke="#2f7a3c" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="22" cy="50" rx="4" ry="2.5" fill="#f4a2a2" opacity=".7" />
      <ellipse cx="58" cy="50" rx="4" ry="2.5" fill="#f4a2a2" opacity=".7" />
    </>
  )
}

function Bear() {
  return (
    <>
      {shadow}
      <circle cx="20" cy="22" r="12" fill="#b47b51" stroke="#7a4b2c" strokeWidth="3" />
      <circle cx="60" cy="22" r="12" fill="#b47b51" stroke="#7a4b2c" strokeWidth="3" />
      <circle cx="20" cy="22" r="5.5" fill="#e8c29f" />
      <circle cx="60" cy="22" r="5.5" fill="#e8c29f" />
      <ellipse cx="40" cy="45" rx="28" ry="27" fill="#b47b51" stroke="#7a4b2c" strokeWidth="3" />
      <ellipse cx="40" cy="55" rx="14" ry="11" fill="#f1d7b8" />
      <ellipse cx="30" cy="41" rx="3.2" ry="4.2" fill="#1a2739" />
      <ellipse cx="50" cy="41" rx="3.2" ry="4.2" fill="#1a2739" />
      <circle cx="31" cy="39.5" r="1" fill="#fff" />
      <circle cx="51" cy="39.5" r="1" fill="#fff" />
      <ellipse cx="40" cy="51" rx="4.5" ry="3.2" fill="#3a2a22" />
      <path d="M35 58 Q40 62 45 58" fill="none" stroke="#3a2a22" strokeWidth="2" strokeLinecap="round" />
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
    <svg viewBox="0 0 80 80" className={className} aria-hidden="true" focusable="false" data-character-art={id ?? 'fox'}>
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
