'use client'

import { useEffect, useState } from 'react'

import type { LaunchCurriculum } from '@/features/domain/types'

import { createSeedLaunchCurriculum } from './seed-launch-curriculum'

export function useLaunchCurriculum() {
  const [curriculum, setCurriculum] = useState<LaunchCurriculum>(() =>
    createSeedLaunchCurriculum(),
  )

  useEffect(() => {
    let isActive = true

    fetch('/api/curriculum/launch', {
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('curriculum-unavailable')
        }

        return (await response.json()) as LaunchCurriculum
      })
      .then((payload) => {
        if (isActive) {
          setCurriculum(payload)
        }
      })
      .catch(() => {})

    return () => {
      isActive = false
    }
  }, [])

  return curriculum
}
