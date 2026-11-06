import A1U3L03Lab from '@/features/ai-python/a1-u3-l03-lab'

/**
 * A1-U3-L03 课堂路由：只放行本课 lessonId，其他 lessonId 不渲染课堂。
 * 与 A1-U3-L02 路由同构；U3 本地试点页只放行试点课，不与本课共用路由。
 */
export default async function Page({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params
  if (lessonId !== 'A1-U3-L03') {
    return (
      <main className="min-h-screen bg-[#f3f6fb] p-4 text-[#18243a]">
        <p className="text-sm">本课暂未开放。</p>
      </main>
    )
  }
  return <A1U3L03Lab />
}
