import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { restoreCourseProject } from './course-project-store'
import { sameScratchContents } from './same-scratch-contents'

describe('Scratch course verification', () => {
  const draft = { archive: new ArrayBuffer(3), stepIndex: 4, observed: true, revision: 5 }

  it('restores legacy achievements but requires a new verdict for the archive', () => {
    expect(restoreCourseProject({ ...draft, finished: true })).toEqual({
      ...draft, achievementEarned: true, verified: false,
    })
    expect(restoreCourseProject({ ...draft, finished: false })).toEqual({
      ...draft, achievementEarned: false, verified: false,
    })
    const checked = { ...draft, achievementEarned: true, verified: true }
    expect(restoreCourseProject(checked)).toEqual(checked)
    expect(restoreCourseProject(undefined)).toBeUndefined()
  })

  it('keeps verification across ZIP metadata changes and detects script and asset edits', async () => {
    const bundle = (script: string, sound: string, date: Date) => new JSZip()
      .file('project.json', script, { date })
      .file('chime.wav', sound, { date })
      .generateAsync({ type: 'arraybuffer' })
    const firstDate = new Date('2024-01-01T10:00:00Z')
    const secondDate = new Date('2024-01-02T10:00:00Z')
    const original = await bundle('original', 'chime', firstDate)

    expect(await sameScratchContents(original, await bundle('original', 'chime', secondDate))).toBe(true)
    expect(await sameScratchContents(original, await bundle('changed', 'chime', firstDate))).toBe(false)
    expect(await sameScratchContents(original, await bundle('original', 'quiet', firstDate))).toBe(false)
  })
})
