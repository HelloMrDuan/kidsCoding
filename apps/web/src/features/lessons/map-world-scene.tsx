'use client'

import { CharacterArt, type CharacterId } from './playable-stage/character-art'

/**
 * UX-106 kid-friendly cartoon world for the learning map cover.
 * Owner direction (2026-10-17): the map is for children, so it must be
 * cartoon, colourful and cute, with real illustrated characters (never
 * plain circles). One themed world per foundation unit.
 */

export type MapWorldTheme = 'forest' | 'meadow' | 'garden' | 'show'

type Palette = {
  sky: [string, string]
  far: string
  near: string
  ground: string
  path: string
  accent: string
}

const PALETTES: Record<MapWorldTheme, Palette> = {
  forest: { sky: ['#9fd8ff', '#e6f7ff'], far: '#9ad3a6', near: '#6cc07f', ground: '#57b06e', path: '#ffe7a8', accent: '#ff8fb1' },
  meadow: { sky: ['#a8e0ff', '#fff6d8'], far: '#b9e39a', near: '#8fd36f', ground: '#79c45c', path: '#ffe0a3', accent: '#ffcf3f' },
  garden: { sky: ['#ffd6ee', '#fff4e3'], far: '#bfe6a8', near: '#93d488', ground: '#7cc77a', path: '#ffeab8', accent: '#c58cff' },
  show: { sky: ['#c9c2ff', '#ffe9f3'], far: '#a9dcc0', near: '#7fcf9b', ground: '#69c28a', path: '#fff0b8', accent: '#ff7a7a' },
}

const CAST: Record<MapWorldTheme, CharacterId[]> = {
  forest: ['fox', 'rabbit'],
  meadow: ['rabbit', 'bird', 'frog'],
  garden: ['butterfly', 'fox', 'bear'],
  show: ['fox', 'bear', 'frog', 'rabbit'],
}

export const MAP_WORLD_THEMES: MapWorldTheme[] = ['forest', 'meadow', 'garden', 'show']

function Tree({ x, y, s = 1, color }: { x: number; y: number; s?: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-5" y="-6" width="10" height="26" rx="4" fill="#b07a4a" />
      <circle cx="0" cy="-22" r="20" fill={color} />
      <circle cx="-14" cy="-10" r="13" fill={color} />
      <circle cx="14" cy="-10" r="13" fill={color} />
      <circle cx="-6" cy="-28" r="6" fill="#ffffff" opacity="0.35" />
    </g>
  )
}

function Flower({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-1" y="0" width="2" height="9" fill="#4f9a55" />
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 4} cy={Math.sin((a * Math.PI) / 180) * 4} r="3.2" fill={color} />
      ))}
      <circle r="2.6" fill="#ffd84a" />
    </g>
  )
}

function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#ffffff">
      <ellipse cx="0" cy="0" rx="26" ry="13" />
      <circle cx="-12" cy="-8" r="11" />
      <circle cx="8" cy="-12" r="14" />
    </g>
  )
}

export function MapWorldScene({ theme, label }: { theme: MapWorldTheme; label: string }) {
  const p = PALETTES[theme]
  const cast = CAST[theme]
  const id = `kc-world-${theme}`
  return (
    <div className="kc-map-world" role="img" aria-label={label} data-testid="map-world-scene" data-theme={theme}>
      <svg className="kc-map-world-bg" viewBox="0 0 800 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={p.sky[0]} />
            <stop offset="1" stopColor={p.sky[1]} />
          </linearGradient>
        </defs>
        <rect width="800" height="240" fill={`url(#${id}-sky)`} />
        {/* smiling sun */}
        <g transform="translate(700 52)">
          <circle r="34" fill="#ffd84a" opacity="0.35" />
          <circle r="24" fill="#ffd23f" />
          <circle cx="-8" cy="-3" r="2.6" fill="#7a4b12" />
          <circle cx="8" cy="-3" r="2.6" fill="#7a4b12" />
          <path d="M-8 7 Q0 14 8 7" stroke="#7a4b12" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <circle cx="-14" cy="5" r="3.5" fill="#ff9d7a" opacity="0.7" />
          <circle cx="14" cy="5" r="3.5" fill="#ff9d7a" opacity="0.7" />
        </g>
        <Cloud x={130} y={48} />
        <Cloud x={430} y={34} s={0.8} />
        <Cloud x={590} y={78} s={0.6} />
        {theme === 'show' ? (
          <g>
            <path d="M0 0 H800 V22 Q760 40 720 22 Q680 40 640 22 Q600 40 560 22 Q520 40 480 22 Q440 40 400 22 Q360 40 320 22 Q280 40 240 22 Q200 40 160 22 Q120 40 80 22 Q40 40 0 22 Z" fill="#ff7a8a" />
            {[60, 180, 300, 420, 540, 660, 780].map((x, i) => (
              <path key={x} d={`M${x - 14} 24 L${x} 46 L${x + 14} 24 Z`} fill={['#ffd23f', '#4c97ff', '#3fbf6a', '#9966ff'][i % 4]} />
            ))}
          </g>
        ) : null}
        <path d="M0 150 Q120 95 250 140 T520 130 T800 120 V240 H0 Z" fill={p.far} />
        <path d="M0 180 Q160 140 330 175 T640 165 T800 160 V240 H0 Z" fill={p.near} />
        <rect y="205" width="800" height="35" fill={p.ground} />
        {/* winding dotted adventure path */}
        <path d="M40 232 C170 200 210 225 330 205 S540 175 640 195 S760 185 790 178" stroke={p.path} strokeWidth="16" fill="none" strokeLinecap="round" />
        <path d="M40 232 C170 200 210 225 330 205 S540 175 640 195 S760 185 790 178" stroke="#ffffff" strokeWidth="3" strokeDasharray="2 14" fill="none" strokeLinecap="round" />
        <Tree x={70} y={170} color="#4fae63" />
        <Tree x={115} y={180} s={0.75} color="#62bf73" />
        <Tree x={760} y={160} s={0.9} color="#4fae63" />
        {theme === 'forest' ? <><Tree x={470} y={150} s={0.6} color="#5cb86d" /><Tree x={505} y={156} s={0.5} color="#6fc77e" /></> : null}
        {theme === 'meadow' ? (
          <g transform="translate(560 150)">
            <rect x="-24" y="-8" width="48" height="34" rx="4" fill="#fff3d6" />
            <path d="M-30 -6 L0 -32 L30 -6 Z" fill="#ff8a65" />
            <rect x="-6" y="8" width="12" height="18" rx="3" fill="#b07a4a" />
          </g>
        ) : null}
        {[[200, 215, p.accent], [260, 222, '#ffffff'], [420, 210, p.accent], [600, 214, '#ffd84a'], [700, 205, '#ffffff'], [160, 228, '#ffd84a']].map(
          ([x, y, c]) => <Flower key={`${x}-${y}`} x={x as number} y={y as number} color={c as string} />,
        )}
        {/* finish flag */}
        <g transform="translate(735 140)">
          <rect x="0" y="0" width="4" height="44" rx="2" fill="#7a5a3a" />
          <path d="M4 2 L32 10 L4 18 Z" fill={p.accent} />
        </g>
      </svg>
      <div className="kc-map-world-cast" aria-hidden="true">
        {cast.map((c, i) => (
          <CharacterArt key={`${c}-${i}`} id={c} className={`kc-map-world-char kc-map-world-char-${i}`} />
        ))}
      </div>
    </div>
  )
}
