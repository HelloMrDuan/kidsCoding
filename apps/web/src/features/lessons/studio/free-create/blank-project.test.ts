import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'

import { buildBlankSb3FromSample, loadBlankProjectSb3 } from './blank-project'

// vitest 的 cwd 是 apps/web。
const SAMPLE_PATH = resolve(process.cwd(), 'public/scratch-samples/meteor-clones.sb3')

async function readSample(): Promise<ArrayBuffer> {
  const bytes = await readFile(SAMPLE_PATH)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

describe('buildBlankSb3FromSample', () => {
  it('只保留舞台，清空脚本与变量，保留舞台背景资产', async () => {
    const blank = await buildBlankSb3FromSample(await readSample())
    const zip = await JSZip.loadAsync(blank)
    const project = JSON.parse(await zip.file('project.json')!.async('string')) as {
      targets: Array<Record<string, unknown>>
    }

    expect(project.targets).toHaveLength(1)
    const stage = project.targets[0]
    expect(stage.isStage).toBe(true)
    expect(stage.blocks).toEqual({})
    expect(stage.variables).toEqual({})
    expect(stage.lists).toEqual({})
    expect(stage.broadcasts).toEqual({})
    expect(stage.comments).toEqual({})

    const costumes = stage.costumes as Array<{ md5ext: string }>
    expect(costumes).toHaveLength(1)
    // 舞台背景的资产真的在包里，而不是只留了 JSON 引用。
    expect(zip.file(costumes[0].md5ext)).not.toBeNull()
    // 角色和它们的资产都不再出现在空白作品里。
    expect(Object.keys(zip.files).filter((name) => name !== 'project.json')).toEqual([
      costumes[0].md5ext,
    ])
  })

  it('缺少 project.json 时给出可读错误', async () => {
    const zip = new JSZip()
    zip.file('readme.txt', 'not a scratch project')
    const bytes = await zip.generateAsync({ type: 'arraybuffer' })
    await expect(buildBlankSb3FromSample(bytes)).rejects.toThrow('缺少 project.json')
  })

  it('不是 zip 时同样失败而不是生成假作品', async () => {
    await expect(buildBlankSb3FromSample(new Uint8Array([1, 2, 3]).buffer)).rejects.toThrow()
  })
})

describe('loadBlankProjectSb3', () => {
  it('读取失败时返回可读的 HTTP 错误', async () => {
    const failing = (async () => new Response('', { status: 503 })) as unknown as typeof fetch
    await expect(loadBlankProjectSb3(failing, '/missing.sb3')).rejects.toThrow('HTTP 503')
  })

  it('网络异常时给出可读错误', async () => {
    const offline = (async () => {
      throw new Error('offline')
    }) as unknown as typeof fetch
    await expect(loadBlankProjectSb3(offline)).rejects.toThrow('网络不可用')
  })

  it('从真实样例读出可加载的空白作品', async () => {
    const sample = await readSample()
    const fetcher = (async () => new Response(sample, { status: 200 })) as unknown as typeof fetch
    const blank = await loadBlankProjectSb3(fetcher, '/sample.sb3')
    const zip = await JSZip.loadAsync(blank)
    expect(zip.file('project.json')).not.toBeNull()
  })
})
