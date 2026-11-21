import JSZip from 'jszip'

/**
 * 自由创作“新建作品”的空白工程。
 *
 * 我们不手写 Scratch 的资产 md5，也不伪造一个空壳工程：空白工程由仓库
 * 内已经验证可加载的官方样例 `public/scratch-samples/meteor-clones.sb3`
 * 派生——只保留舞台，清掉所有角色、脚本、变量、消息和注释，舞台背景
 * 与资产原样保留。这样空白工程一定能被真实 Scratch GUI / VM 打开，
 * 孩子新建后看到的是一个干净的舞台，而不是一个下载失败的空文件。
 *
 * 网格/缩放在这里不做：空白工程的舞台尺寸、坐标系由 Scratch 自身决定。
 */

export const BLANK_SAMPLE_URL = '/scratch-samples/meteor-clones.sb3'

type SampleTarget = {
  isStage?: boolean
  costumes?: Array<{ md5ext?: string; assetId?: string; dataFormat?: string }>
  sounds?: Array<{ md5ext?: string; assetId?: string; dataFormat?: string }>
  [key: string]: unknown
}

type SampleProject = {
  targets?: SampleTarget[]
  meta?: Record<string, unknown>
  [key: string]: unknown
}

function assetNames(target: SampleTarget): string[] {
  const names: string[] = []
  for (const asset of [...(target.costumes ?? []), ...(target.sounds ?? [])]) {
    if (typeof asset.md5ext === 'string' && asset.md5ext.length > 0) {
      names.push(asset.md5ext)
    } else if (typeof asset.assetId === 'string' && typeof asset.dataFormat === 'string') {
      names.push(`${asset.assetId}.${asset.dataFormat}`)
    }
  }
  return names
}

/** 纯函数：从任意已打开的 .sb3 派生出只有舞台的空白工程。 */
export async function buildBlankSb3FromSample(sample: ArrayBuffer): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(sample)
  const projectFile = zip.file('project.json')
  if (!projectFile) throw new Error('样例工程缺少 project.json，无法生成空白作品')
  let parsed: SampleProject
  try {
    parsed = JSON.parse(await projectFile.async('string')) as SampleProject
  } catch {
    throw new Error('样例工程的 project.json 不是有效 JSON，无法生成空白作品')
  }
  const stage = parsed.targets?.find((target) => target.isStage === true)
  if (!stage) throw new Error('样例工程没有舞台，无法生成空白作品')

  const cleanStage: SampleTarget = {
    ...stage,
    blocks: {},
    variables: {},
    lists: {},
    broadcasts: {},
    comments: {},
    currentCostume: 0,
  }
  const keptAssets = new Set(assetNames(cleanStage))

  const out = new JSZip()
  out.file(
    'project.json',
    JSON.stringify({
      targets: [cleanStage],
      meta: {
        semver: typeof parsed.meta?.semver === 'string' ? parsed.meta.semver : '3.0.0',
        vm: typeof parsed.meta?.vm === 'string' ? parsed.meta.vm : '0.2.0',
        agent: 'Kidscoding free create',
      },
    }),
  )
  for (const name of Object.keys(zip.files)) {
    if (name === 'project.json' || !keptAssets.has(name)) continue
    const file = zip.file(name)
    if (file) out.file(name, await file.async('uint8array'))
  }
  return out.generateAsync({ type: 'arraybuffer' })
}

/**
 * 从站点静态资源读取样例并生成空白作品。读取失败时抛出可读错误，
 * 页面如实提示，不生成假作品。
 */
export async function loadBlankProjectSb3(
  fetcher: typeof fetch = fetch,
  url: string = BLANK_SAMPLE_URL,
): Promise<ArrayBuffer> {
  let response: Response
  try {
    response = await fetcher(url)
  } catch {
    throw new Error('读取空白作品素材失败：网络不可用')
  }
  if (!response.ok) {
    throw new Error(`读取空白作品素材失败：HTTP ${response.status}`)
  }
  return buildBlankSb3FromSample(await response.arrayBuffer())
}
