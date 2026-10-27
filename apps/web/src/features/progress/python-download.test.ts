import { describe, expect, it } from 'vitest'
import { buildPythonFileName } from './python-download'

describe('UX-302 Python .py download filename', () => {
  it('contains the lesson id, ends with .py and has no colon', () => {
    const name = buildPythonFileName('P0-U1-L03', new Date('2026-10-27T10:20:30.000Z'))
    expect(name).toBe('KidsCoding-P0-U1-L03-2026-10-27T10-20-30.py')
    expect(name).not.toContain(':')
  })

  it('differs across seconds so repeated downloads do not silently collide', () => {
    const a = buildPythonFileName('P0-U1-L02', new Date('2026-10-27T10:20:30.000Z'))
    const b = buildPythonFileName('P0-U1-L02', new Date('2026-10-27T10:20:31.000Z'))
    expect(a).not.toBe(b)
  })
})
