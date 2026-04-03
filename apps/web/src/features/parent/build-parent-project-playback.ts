export function buildParentProjectPlayback({
  lessonId,
  updatedAt,
  blocks,
  lessonCatalog,
}: {
  lessonId: string
  updatedAt: string
  blocks: Array<{ type: string }>
  lessonCatalog: Array<{ id: string; title: string; goal: string }>
}) {
  const lesson = lessonCatalog.find((item) => item.id === lessonId)

  return {
    lessonId,
    lessonTitle: lesson?.title ?? lessonId,
    lessonGoal: lesson?.goal ?? '可以回看这个作品的积木结构和动作预览。',
    updatedAt,
    blocks,
  }
}
