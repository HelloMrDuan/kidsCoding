import JSZip from 'jszip'
import { MAX_PROJECT_BYTES } from './project-store'

// JSZip exposes internalStream in browsers. Its bundled declarations only
// expose the buffering async API and the Node stream.
interface BrowserZipStream {
  on(event: 'data', callback: (chunk: Uint8Array) => void): this
  on(event: 'error', callback: (error: Error) => void): this
  on(event: 'end', callback: () => void): this
  pause(): this
  resume(): this
}

// Bound the number of archive entries and the decompressed size before passing
// a user file to the VM. Feed only the original archive to the editor.
export async function readScratchImport(file: File) {
  if (!/\.sb3$/i.test(file.name) || file.size === 0 || file.size > MAX_PROJECT_BYTES) {
    throw new Error('请选择约 3.75 MB 以内的 .sb3 作品。')
  }
  const bytes = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(bytes).catch((cause) => {
    throw new Error('打不开这个 .sb3 文件。文件可能已损坏。', { cause })
  })
  const files = Object.values(zip.files).filter((entry) => !entry.dir)
  if (files.length > 600 || !zip.file('project.json') || files.some((entry) =>
    (entry.unsafeOriginalName && entry.unsafeOriginalName !== entry.name) ||
    (entry.name !== 'project.json' && !/^[a-z0-9_-]+\.(svg|png|jpg|jpeg|bmp|gif|wav|mp3)$/i.test(entry.name)),
  )) throw new Error('此文件不是受支持的 Scratch 3 项目。')

  let expanded = 0
  let projectJson = ''
  for (const entry of files) {
    await new Promise<void>((resolve, reject) => {
      const stream = (entry as unknown as { internalStream(type: 'uint8array'): BrowserZipStream }).internalStream('uint8array')
      const isProject = entry.name === 'project.json'
      const decoder = isProject ? new TextDecoder() : null
      let entrySize = 0
      stream.on('data', (chunk: Uint8Array) => {
        expanded += chunk.byteLength
        entrySize += chunk.byteLength
        if (expanded > 32 * 1024 * 1024 || (isProject && entrySize > 1024 * 1024)) {
          stream.pause()
          reject(new Error('作品解压后超过大小限制。'))
          return
        }
        if (decoder) projectJson += decoder.decode(chunk, { stream: true })
      })
      stream.on('error', reject).on('end', () => {
        if (decoder) projectJson += decoder.decode()
        resolve()
      }).resume()
    })
  }
  const project: unknown = JSON.parse(projectJson)
  if (!project || typeof project !== 'object' || !('targets' in project) ||
      !Array.isArray(project.targets) || project.targets.filter((target) => target?.isStage === true).length !== 1 ||
      ('extensionURLs' in project && Object.keys(project.extensionURLs ?? {}).length > 0)) {
    throw new Error('此文件缺少有效舞台或包含不支持的外部扩展。')
  }
  return bytes
}
