type RemedialLinkCardProps = {
  copy: string
  remedialLessonId: string
  onStartRemedial: (remedialId: string) => void
}

export function RemedialLinkCard({
  copy,
  remedialLessonId,
  onStartRemedial,
}: RemedialLinkCardProps) {
  return (
    <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4">
      <p className="text-sm font-semibold leading-7 text-amber-800">
        还是有点卡住？先花 3 分钟补一下这个关键小技能，再回来继续当前任务。
      </p>
      <p className="mt-2 text-sm leading-7 text-amber-700">{copy}</p>
      <button
        className="mt-3 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-400"
        onClick={() => onStartRemedial(remedialLessonId)}
        type="button"
      >
        先去补这节小课
      </button>
    </div>
  )
}
