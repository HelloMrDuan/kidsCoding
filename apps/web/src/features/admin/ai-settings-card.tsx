'use client'

import { useMemo, useState } from 'react'

import type { AiProviderConfig } from '@/features/domain/types'

import { saveAiSettings } from './admin-api'

type AiSettingsCardProps = {
  providers: Array<Pick<AiProviderConfig, 'slot' | 'name' | 'baseUrl' | 'models'>>
  currentSelection: {
    defaultProviderSlot: 'primary' | 'secondary'
    defaultModel: string
  }
  onSave?: typeof saveAiSettings
}

export function AiSettingsCard({
  providers,
  currentSelection,
  onSave = saveAiSettings,
}: AiSettingsCardProps) {
  const [providerSlot, setProviderSlot] = useState(
    currentSelection.defaultProviderSlot,
  )
  const [model, setModel] = useState(currentSelection.defaultModel)
  const [message, setMessage] = useState<string | null>(null)

  const selectedProvider = useMemo(
    () => providers.find((item) => item.slot === providerSlot) ?? providers[0],
    [providers, providerSlot],
  )

  async function handleSave() {
    const result = await onSave({
      defaultProviderSlot: providerSlot,
      defaultModel: model,
    })

    setMessage(result.ok ? 'AI 默认模型已保存' : result.error ?? '保存失败')
  }

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-sm">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
          AI 运行设置
        </p>
        <h2 className="text-2xl font-black text-slate-950">默认提供方与模型</h2>
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {providers.map((provider) => (
          <article
            key={provider.slot}
            className="rounded-[1.5rem] border border-slate-200 p-4"
          >
            <p className="text-sm font-semibold text-slate-500">{provider.slot}</p>
            <h3 className="text-lg font-black text-slate-950">{provider.name}</h3>
            <p className="text-sm text-slate-600">{provider.baseUrl}</p>
            <p className="mt-2 text-sm text-slate-600">
              {provider.models.join('、')}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          <span>默认提供方</span>
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
            data-testid="admin-ai-provider-select"
            value={providerSlot}
            onChange={(event) => {
              const nextSlot = event.target.value as 'primary' | 'secondary'
              const nextProvider =
                providers.find((item) => item.slot === nextSlot) ?? providers[0]

              setProviderSlot(nextSlot)
              setModel(nextProvider?.models[0] ?? '')
            }}
          >
            {providers.map((provider) => (
              <option key={provider.slot} value={provider.slot}>
                {provider.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          <span>默认模型</span>
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
            data-testid="admin-ai-model-select"
            value={model}
            onChange={(event) => setModel(event.target.value)}
          >
            {selectedProvider?.models.map((providerModel) => (
              <option key={providerModel} value={providerModel}>
                {providerModel}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        className="mt-4 rounded-full bg-slate-900 px-5 py-3 font-bold text-white"
        data-testid="admin-ai-settings-save"
        onClick={handleSave}
      >
        保存 AI 设置
      </button>

      {message ? (
        <p
          className="mt-3 text-sm font-semibold text-slate-700"
          data-testid="admin-ai-settings-message"
        >
          {message}
        </p>
      ) : null}
    </section>
  )
}
