'use client'

import { useEffect, useState } from 'react'

/**
 * EDU-105: 5–7 year olds read slowly, so every instruction, prediction,
 * diagnosis and hint can be read aloud with the browser's own Chinese voice.
 * Nothing is recorded or uploaded; unsupported browsers simply hide the button.
 */
export function canReadAloud(): boolean {
  return typeof window !== 'undefined' && !!window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function'
}

/** Strip emoji and layer labels so the voice reads only the words a child needs. */
export function speakableText(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/（第\s*\d\s*层）/g, '')
    .replace(/→/g, '，然后')
    .replace(/\s+/g, ' ')
    .trim()
}

export function readAloud(text: string, onEnd?: () => void): boolean {
  if (!canReadAloud()) return false
  const synth = window.speechSynthesis
  synth.cancel()
  const utterance = new window.SpeechSynthesisUtterance(speakableText(text))
  utterance.lang = 'zh-CN'
  utterance.rate = 0.85
  utterance.pitch = 1.1
  const voice = synth.getVoices?.().find(v => v.lang?.toLowerCase().startsWith('zh'))
  if (voice) utterance.voice = voice
  utterance.onend = () => onEnd?.()
  utterance.onerror = () => onEnd?.()
  synth.speak(utterance)
  return true
}

export function ReadAloudButton({ text, testId, label = '听一听' }: { text: string; testId: string; label?: string }) {
  const [supported, setSupported] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setSupported(canReadAloud()), 0)
    return () => {
      clearTimeout(timer)
      if (canReadAloud()) window.speechSynthesis.cancel()
    }
  }, [])
  if (!supported || !text) return null
  return (
    <button
      type="button"
      className="kc-read-aloud"
      data-testid={testId}
      data-speaking={speaking ? 'true' : 'false'}
      aria-label={`${label}：把这段话读出来`}
      onClick={() => {
        if (speaking) {
          window.speechSynthesis.cancel()
          setSpeaking(false)
          return
        }
        if (readAloud(text, () => setSpeaking(false))) setSpeaking(true)
      }}
    >
      {speaking ? '⏹ 停一停' : `🔊 ${label}`}
    </button>
  )
}
