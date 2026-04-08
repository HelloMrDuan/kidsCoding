import type { FoundationRemedialMicroScript } from '@/features/domain/types'

type RemedialLinkCardProps = {
  copy: string
  remedialLessonId?: string
  remedialMicroScript?: FoundationRemedialMicroScript
  onStartRemedial: (remedialId: string) => void
}

export function RemedialLinkCard({
  copy,
  remedialLessonId,
  remedialMicroScript,
  onStartRemedial,
}: RemedialLinkCardProps) {
  return (
    <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4">
      <p className="text-sm font-semibold leading-7 text-amber-800">{copy}</p>

      {remedialMicroScript ? (
        <div className="mt-3 rounded-[1.25rem] bg-white/80 px-4 py-3">
          <p className="text-sm font-bold text-amber-900">{remedialMicroScript.title}</p>
          <div className="mt-2 space-y-2 text-sm leading-7 text-amber-900">
            {remedialMicroScript.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <p className="mt-3 text-sm font-semibold leading-7 text-amber-800">
            示意动作：{remedialMicroScript.demo}
          </p>
        </div>
      ) : null}

      {remedialLessonId && !remedialMicroScript ? (
        <button
          className="mt-3 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-400"
          onClick={() => onStartRemedial(remedialLessonId)}
          type="button"
        >
          先去补这一小节
        </button>
      ) : null}
    </div>
  )
}
