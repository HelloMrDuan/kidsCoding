import { notFound } from 'next/navigation'

import { launchLessons } from '@/content/curriculum/launch-lessons'
import { buildLaunchMap } from '@/features/curriculum/build-launch-map'
import { LessonCard } from '@/features/ui/lesson-card'
import { ProgressTrack } from '@/features/ui/progress-track'
import { StoryDialog } from '@/features/ui/story-dialog'

export const dynamic = 'force-dynamic'

/**
 * UX-003 test fixture. NOT a product page: it is absent from all
 * navigation, returns 404 unless UX003_FIXTURE_ENABLED=1 (set only by the
 * Playwright webServer env), and never reads or writes real user progress.
 *
 * The lesson definitions are the real curriculum (launchLessons). The
 * progress state is a CONTROLLED test value (first 2 lessons completed,
 * 3rd current) so E2E is deterministic. locked / unreleased and the
 * dialogue lines are display-only test data, labelled as such — they are
 * not real business data.
 */
export default function Ux003FixturePage() {
  if (process.env.UX003_FIXTURE_ENABLED !== '1') {
    notFound()
  }

  const { allLessons } = buildLaunchMap(launchLessons)
  const completedIds = new Set(allLessons.slice(0, 2).map((lesson) => lesson.id))
  const currentLesson = allLessons[2]
  const currentLessonId = currentLesson.id
  const completedStepIds = currentLesson.steps.slice(0, 2).map((step) => step.id)
  const currentStepId = currentLesson.steps[2].id

  return (
    <main className="mx-auto max-w-5xl space-y-10 p-6">
      <header>
        <h1 className="text-2xl font-bold">UX-003 测试夹具（仅测试使用）</h1>
        <p className="mt-2 text-sm text-slate-600">
          真实课程定义 + 受控测试进度。生产环境默认返回 404。
        </p>
      </header>

      <section data-testid="lesson-card-grid">
        <h2 className="mb-4 text-lg font-bold">真实课程 · 任务卡</h2>
        <div className="grid grid-cols-3 gap-3">
          {allLessons.map((lesson) => {
            const state = completedIds.has(lesson.id)
              ? 'completed'
              : lesson.id === currentLessonId
                ? 'current'
                : 'available'
            return (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                state={state}
                href={`/learn/lesson/${lesson.id}`}
              />
            )
          })}
        </div>
      </section>

      <section data-testid="lesson-card-display-only">
        <h2 className="mb-4 text-lg font-bold">状态展示（测试数据，非真实业务）</h2>
        <div className="grid grid-cols-3 gap-3">
          <LessonCard
            lesson={{ id: 'test-locked-01', title: '锁定态展示', sortOrder: 13 }}
            state="locked"
          />
          <LessonCard
            lesson={{ id: 'test-unreleased-01', title: '未开放展示', sortOrder: 14 }}
            state="unreleased"
          />
        </div>
      </section>

      <section data-testid="progress-track-real">
        <h2 className="mb-4 text-lg font-bold">真实课程 · 进度（当前课：第 3 节，步骤 3 / 5，已完成 2 步）</h2>
        <ProgressTrack
          steps={currentLesson.steps}
          currentStepId={currentStepId}
          completedStepIds={completedStepIds}
        />
      </section>

      <section data-testid="progress-track-variants">
        <h2 className="mb-4 text-lg font-bold">进度变体（受控测试状态）</h2>
        <div className="space-y-4">
          <div data-testid="progress-track-empty">
            <ProgressTrack steps={[]} currentStepId={null} completedStepIds={[]} />
          </div>
          <div data-testid="progress-track-error">
            <ProgressTrack
              steps={currentLesson.steps}
              currentStepId={currentStepId}
              completedStepIds={completedStepIds}
              error="无法读取进度"
            />
          </div>
          <div data-testid="progress-track-full">
            <ProgressTrack
              steps={currentLesson.steps}
              currentStepId={currentLesson.steps[4].id}
              completedStepIds={currentLesson.steps.map((step) => step.id)}
            />
          </div>
          <div data-testid="progress-track-not-started">
            <ProgressTrack steps={currentLesson.steps} currentStepId={null} completedStepIds={[]} />
          </div>
        </div>
      </section>

      <section data-testid="story-dialog-real">
        <h2 className="mb-4 text-lg font-bold">真实课程 · 故事引导</h2>
        <StoryDialog
          title={currentLesson.title}
          stepLabel="STEP 03"
          paragraphs={[currentLesson.goal]}
          objectives={currentLesson.steps.map((step) => ({
            text: step.title,
            done: completedStepIds.includes(step.id),
          }))}
        />
      </section>

      <section data-testid="story-dialog-dialogue">
        <h2 className="mb-4 text-lg font-bold">对话展示（测试数据）</h2>
        <StoryDialog
          title="如何让两个角色依次说话？"
          stepLabel="STEP 03"
          paragraphs={['你已经能让第一个角色移动。现在请给第二个角色添加对白。']}
          dialogue={[
            { speaker: '小熊', text: '你好！' },
            { speaker: '小兔', text: '你好呀，一起玩吧！' },
          ]}
          objectives={[
            { text: '第一个角色向右移动', done: true },
            { text: '第二个角色说出“你好！”', done: false },
          ]}
        />
      </section>
    </main>
  )
}
