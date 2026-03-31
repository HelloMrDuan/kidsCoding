type AudioAssetEditorProps = {
  audioAssets: Array<{
    id: string
    lessonId: string
    usageType: string
    provider: string
  }>
}

export function AudioAssetEditor({ audioAssets }: AudioAssetEditorProps) {
  return (
    <section className="space-y-4 rounded-[2rem] bg-white p-6 shadow-sm">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-500">
          语音资源
        </p>
        <h2 className="text-2xl font-black text-slate-950">课程语音清单</h2>
      </header>
      <div className="grid gap-3">
        {audioAssets.map((asset) => (
          <article
            key={asset.id}
            className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
          >
            <p className="text-sm font-semibold text-slate-500">{asset.lessonId}</p>
            <p className="mt-1 text-lg font-black text-slate-950">
              {asset.usageType}
            </p>
            <p className="mt-1 text-sm text-slate-600">{asset.provider}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
