import { readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(scriptDir, '..', 'supabase', 'migrations')

describe('supabase migrations', () => {
  it('uses unique numeric versions before the first underscore', async () => {
    const entries = (await readdir(migrationsDir))
      .filter((entry) => entry.endsWith('.sql'))
      .sort()

    const versions = entries.map((entry) => {
      const match = entry.match(/^(\d+)_/)

      expect(match, `${entry} must start with a numeric version prefix`).toBeTruthy()

      return match![1]
    })

    expect(new Set(versions).size).toBe(versions.length)
  })
})
