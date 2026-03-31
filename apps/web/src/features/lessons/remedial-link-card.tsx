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
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
      <p className="text-sm font-semibold leading-6 text-amber-800">{copy}</p>
      <button
        className="mt-3 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white"
        onClick={() => onStartRemedial(remedialLessonId)}
        type="button"
      >
        先学这个小课
      </button>
    </div>
  )
}
