/**
 * OPS-057：作品模式（launch-v3-project）单测。
 *
 * 覆盖验收要求里可纯函数验证的部分：
 * - 规格：lesson-01～09 复用 unit-projects 原文；lesson-10～12 的双人可用积木与起始程序。
 * - 草稿：作品信封严格校验、未知积木丢弃、跨课拒绝、旧作品快照兼容（{type} / {type,line}）。
 * - 数据隔离：保存只写作品键与 projectSnapshots，课程草稿键、星星、卡片、已完成课节不变；
 *   owner 之间互不可见。
 * - 运行：作品模式如实播放、不按教学标准答案判分，判定只有“作品运行”一层。
 */
import { beforeEach, describe, expect, it } from 'vitest'

import { draftKeyFor } from '@/features/lessons/workspace/lesson-contract'
import { scopedLessonDraftKey } from '@/features/lessons/scoped-draft-key'
import { defaultGuestProgress, readGuestProgress, writeGuestProgress } from '@/features/progress/local-progress'

import {
  buildLaunchProjectContract,
  buildLaunchProjectStudioLesson,
  coerceLaunchProjectDraft,
  emptyLaunchProjectDraft,
  getLaunchProjectSpec,
  isLaunchProjectLessonId,
  isValidLaunchProjectDraft,
  launchProjectDraftKey,
  launchProjectDraftStore,
  launchProjectRoute,
  launchProjectRunSource,
  loadLaunchProjectDraft,
  removeLaunchProjectDraft,
  saveLaunchProjectDraft,
} from './launch-v3-project'
import { buildLaunchProjectJudgment } from './launch-v3-judging'

const OWNER = 'guest:ops057-a'
const OTHER = 'guest:ops057-b'
const L01 = 'lesson-01-forest-hello'
const L02 = 'lesson-02-forest-greeting'
const L03 = 'lesson-03-forest-story'
const L12 = 'lesson-12-graduation-show'

function draft(lessonId: string, program: Array<{ type: string; line?: string }>) {
  return { version: 1 as const, kind: 'project' as const, lessonId, program }
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('OPS-057 project specs reuse existing curriculum data', () => {
  it('registers lesson-01～12 only and builds the V3 route', () => {
    expect(isLaunchProjectLessonId(L01)).toBe(true)
    expect(isLaunchProjectLessonId(L12)).toBe(true)
    expect(isLaunchProjectLessonId('lesson-99-nope')).toBe(false)
    expect(launchProjectRoute(L02)).toBe('/studio/blockly/project/lesson-02-forest-greeting')
  })

  it('lesson-01/02 use the unit-project title, allowed blocks and starter program', () => {
    const l01 = getLaunchProjectSpec(L01)
    expect(l01?.title).toBe('小狐狸出场')
    expect(l01?.starterProgram[0]?.type).toBe('when_start')
    const l02 = getLaunchProjectSpec(L02)
    expect(l02?.title).toBe('小狐狸打招呼')
    expect(l02?.allowedBlocks).toContain('say_line')
    expect(l02?.starterProgram.map((block) => block.type)).toEqual(['when_start', 'move_right', 'say_line'])
    // starter say blocks open with a real preset, so opening the work is not an edit
    expect(l02?.starterProgram.find((block) => block.type === 'say_line')?.line).toBe('hello')
  })

  it('lesson-10～12 use the old DuoProject blocks; L12 also allows repeat', () => {
    const l10 = getLaunchProjectSpec('lesson-10-second-friend')
    expect(l10?.duoMode).toBe('independent')
    expect(l10?.allowedBlocks).toEqual(['when_start', 'move_right', 'switch_character', 'say_line'])
    const l12 = getLaunchProjectSpec(L12)
    expect(l12?.duoMode).toBe('graduation')
    expect(l12?.allowedBlocks).toContain('repeat_twice')
    expect(l12?.starterProgram.map((block) => block.type)).toEqual([
      'when_start',
      'move_right',
      'switch_character',
      'repeat_twice',
    ])
  })

  it('contract is 开放创作, keeps the shell draftKey valid and adds no teaching gates', () => {
    const contract = buildLaunchProjectContract(L02)
    expect(contract?.judging.scopeLabel).toBe('开放创作')
    expect(contract?.draftKey).toBe(draftKeyFor(L02))
    expect(contract?.activities).toBeUndefined()
    const studio = buildLaunchProjectStudioLesson(L02)
    expect(studio?.backHref).toBe('/learn/portfolio')
    expect(studio?.title).toContain('我的作品')
  })
})

describe('OPS-057 project draft validation and coercion', () => {
  it('accepts its own envelope and rejects foreign lessons / wrong kind', () => {
    const value = draft(L02, [{ type: 'when_start' }, { type: 'move_right' }])
    expect(isValidLaunchProjectDraft(L02, value)).toBe(true)
    expect(isValidLaunchProjectDraft(L03, value)).toBe(false)
    expect(isValidLaunchProjectDraft(L02, { ...value, kind: 'lesson' })).toBe(false)
    expect(isValidLaunchProjectDraft(L02, { ...value, program: [{ type: 'scratch_only' }] })).toBe(false)
  })

  it('drops blocks the work does not offer and falls back to the starter program', () => {
    const coerced = coerceLaunchProjectDraft(L02, draft(L02, [
      { type: 'when_start' },
      { type: 'not-a-block' },
      { type: 'move_right' },
    ]))
    expect(coerced.program.map((block) => block.type)).toEqual(['when_start', 'move_right'])
    expect(coerceLaunchProjectDraft(L02, null).program).toEqual(emptyLaunchProjectDraft(L02).program)
    expect(coerceLaunchProjectDraft(L02, draft(L03, [])).program.length).toBeGreaterThan(0)
  })
})

describe('OPS-057 work data is isolated from lesson drafts, progress and rewards', () => {
  it('saves to its own key, mirrors the project snapshot, and leaves the lesson draft untouched', () => {
    const lessonDraftKey = scopedLessonDraftKey(OWNER, draftKeyFor(L02))
    window.localStorage.setItem(
      lessonDraftKey,
      JSON.stringify({ lessonId: L02, savedAt: '2026-11-01T00:00:00.000Z', version: 1, script: { lesson: 'draft' } }),
    )
    writeGuestProgress(
      {
        ...defaultGuestProgress,
        stars: 7,
        cardIds: ['growth-first-project'],
        completedLessonIds: [L02],
        projectSnapshots: [],
      },
      OWNER,
    )

    const program = [
      { type: 'when_start' },
      { type: 'move_right' },
      { type: 'say_line', line: 'hello' },
    ]
    expect(saveLaunchProjectDraft(L02, draft(L02, program), OWNER)).toEqual({ ok: true })

    // 作品键独立存在
    const saved = window.localStorage.getItem(scopedLessonDraftKey(OWNER, launchProjectDraftKey(L02)))
    expect(saved).not.toBeNull()
    expect(scopedLessonDraftKey(OWNER, launchProjectDraftKey(L02))).toContain('kidscoding-project')
    // 课程草稿一字未改
    expect(JSON.parse(window.localStorage.getItem(lessonDraftKey) ?? '{}').script).toEqual({ lesson: 'draft' })

    const progress = readGuestProgress(OWNER)
    expect(progress.stars).toBe(7)
    expect(progress.cardIds).toEqual(['growth-first-project'])
    expect(progress.completedLessonIds).toEqual([L02])
    expect(progress.projectSnapshots).toHaveLength(1)
    expect(progress.projectSnapshots[0].lessonId).toBe(L02)
    expect(progress.projectSnapshots[0].blocks).toEqual(program)

    // 重新打开与保存时一致
    const reopened = loadLaunchProjectDraft(L02, OWNER)
    expect(reopened.reason).toBeNull()
    expect((reopened.data as { program: unknown }).program).toEqual(program)
  })

  it('keeps owners apart: another owner cannot read this work', () => {
    saveLaunchProjectDraft(L02, draft(L02, [{ type: 'when_start' }, { type: 'move_right' }]), OWNER)
    expect(loadLaunchProjectDraft(L02, OTHER).data).toBeNull()
  })

  it('OPS-057: deletes the work envelope for this owner only, so it cannot reappear from the snapshot', () => {
    const program = [{ type: 'when_start' }, { type: 'move_right' }]
    saveLaunchProjectDraft(L02, draft(L02, program), OWNER)
    saveLaunchProjectDraft(L02, draft(L02, program), OTHER)
    expect(removeLaunchProjectDraft(L02, null).ok).toBe(false)
    expect(removeLaunchProjectDraft(L02, OWNER)).toEqual({ ok: true })
    // 作品中心删除时一并清掉旧快照；两者都删后作品不会再出现。
    const progress = readGuestProgress(OWNER)
    writeGuestProgress(
      { ...progress, projectSnapshots: progress.projectSnapshots.filter((snapshot) => snapshot.lessonId !== L02) },
      OWNER,
    )
    expect(loadLaunchProjectDraft(L02, OWNER).data).toBeNull()
    expect(window.localStorage.getItem(scopedLessonDraftKey(OWNER, launchProjectDraftKey(L02)))).toBeNull()
    // 其他 owner 的作品不受影响。
    expect(loadLaunchProjectDraft(L02, OTHER).data).not.toBeNull()
  })

  it('replaces only this work’s snapshot and keeps other works and fields', () => {
    writeGuestProgress(
      {
        ...defaultGuestProgress,
        stars: 4,
        badgeIds: ['badge-a'],
        projectSnapshots: [
          { lessonId: L03, updatedAt: '2026-10-01T00:00:00.000Z', blocks: [{ type: 'when_start' }, { type: 'move_right' }] },
          { lessonId: L02, updatedAt: '2026-10-02T00:00:00.000Z', blocks: [{ type: 'when_start' }] },
        ],
      },
      OWNER,
    )
    saveLaunchProjectDraft(L02, draft(L02, [{ type: 'when_start' }, { type: 'move_right' }, { type: 'move_right' }]), OWNER)
    const progress = readGuestProgress(OWNER)
    expect(progress.stars).toBe(4)
    expect(progress.badgeIds).toEqual(['badge-a'])
    expect(progress.projectSnapshots.map((snapshot) => snapshot.lessonId)).toEqual([L03, L02])
    expect(progress.projectSnapshots[0].blocks).toEqual([{ type: 'when_start' }, { type: 'move_right' }])
    expect(progress.projectSnapshots[1].blocks).toHaveLength(3)
  })

  it('opens legacy snapshots with and without a chosen line', () => {
    writeGuestProgress(
      {
        ...defaultGuestProgress,
        projectSnapshots: [
          {
            lessonId: L03,
            updatedAt: '2026-10-18T08:00:00.000Z',
            blocks: [{ type: 'when_start' }, { type: 'move_right' }, { type: 'say_line', line: 'hello' }],
          },
        ],
      },
      OWNER,
    )
    const legacy = loadLaunchProjectDraft(L03, OWNER)
    expect((legacy.data as { program: Array<{ type: string; line?: string }> }).program).toEqual([
      { type: 'when_start' },
      { type: 'move_right' },
      { type: 'say_line', line: 'hello' },
    ])

    window.localStorage.clear()
    writeGuestProgress(
      {
        ...defaultGuestProgress,
        projectSnapshots: [
          { lessonId: L03, updatedAt: '2026-10-18T08:00:00.000Z', blocks: [{ type: 'when_start' }, { type: 'move_right' }] },
        ],
      },
      OWNER,
    )
    expect((loadLaunchProjectDraft(L03, OWNER).data as { program: unknown[] }).program).toEqual([
      { type: 'when_start' },
      { type: 'move_right' },
    ])
  })

  it('refuses to save or load without a confirmed owner (fail closed)', () => {
    expect(saveLaunchProjectDraft(L02, draft(L02, []), null).ok).toBe(false)
    expect(loadLaunchProjectDraft(L02, null).data).toBeNull()
    // nothing was written
    expect(Object.keys(window.localStorage).filter((key) => key.includes('kidscoding-project'))).toHaveLength(0)
  })

  it('exposes the same behaviour through the shell draft store', () => {
    expect(launchProjectDraftStore.save(L02, draft(L02, [{ type: 'when_start' }]), OWNER)).toEqual({ ok: true })
    expect((launchProjectDraftStore.load(L02, OWNER).data as { program: unknown[] }).program).toEqual([
      { type: 'when_start' },
    ])
  })
})

describe('OPS-057 project run source plays freely without teaching grading', () => {
  it('runs a single-character work frame by frame and reports only the work layer', () => {
    const source = launchProjectRunSource(L02)
    const value = draft(L02, [{ type: 'when_start' }, { type: 'move_right' }, { type: 'say_line', line: 'hello' }])
    expect(source.validate(value)).toBe(true)
    const data = source.coerce(value)
    const result = source.judge(data, false)
    expect(result.passed).toBe(true)
    expect(result.frames).toHaveLength(2)
    expect(result.giftFound).toBe(false)
    expect(result.designedMistake).toBe(false)

    const judgment = buildLaunchProjectJudgment(result)
    expect(judgment.layers).toHaveLength(1)
    expect(judgment.layers[0].label).toBe('作品运行')
    expect(judgment.methodEvidence).toContain('作品积木')
  })

  it('cannot run a work with no start block, but never turns it into a teaching failure', () => {
    const source = launchProjectRunSource(L02)
    const result = source.judge(source.coerce(draft(L02, [{ type: 'move_right' }])), false)
    expect(result.canRun).toBe(false)
    expect(result.passed).toBe(false)
  })

  it('plays a duo work without the lesson gift condition', () => {
    const source = launchProjectRunSource(L12)
    const value = draft(L12, getLaunchProjectSpec(L12)!.starterProgram)
    const result = source.judge(source.coerce(value), false)
    expect(result.canRun).toBe(true)
    expect(result.passed).toBe(true)
    expect(result.frames.length).toBeGreaterThan(0)
    // 教学目标里的礼物条件不进入作品判定
    expect(result.giftFound).toBe(false)
    expect(result.duoVerdict).toBeNull()
  })

  it('reports the frames that really played, not the lesson verdict’s counts', () => {
    const source = launchProjectRunSource(L12)
    // 先切换再移动：教学判定在这一块失败（fox=0/bear=0），但自由作品结构合法，
    // 实际播放是小熊走了两步。报告必须与实际执行帧一致。
    const program = [
      { type: 'when_start' },
      { type: 'switch_character' },
      { type: 'move_right' },
      { type: 'move_right' },
    ]
    const result = source.judge(source.coerce(draft(L12, program)), false)
    expect(result.canRun).toBe(true)
    expect(result.frames).toHaveLength(3)
    expect(result.final.mainPosition).toBe(0)
    expect(result.final.partnerPosition).toBe(200)
    expect(result.message).toContain('小狐狸走了 0 步')
    expect(result.message).toContain('小熊走了 200 步')
  })
})
