// Shared helpers for the G2 Scratch VM lab specs (scratch-g2-*.spec.ts).
import {readFileSync} from 'node:fs'
import {deflateRawSync, inflateRawSync} from 'node:zlib'
import {expect, type BrowserContext, type Page} from '@playwright/test'

// Local-only CDN workaround, identical to the existing Scratch specs: when
// SCRATCH_VM_LOCAL_CDN=1 the pinned scratch-vm@5.0.300 script is served from a
// local copy (scratch-storage@4.0.0 likewise). CI never sets it and always loads the real jsDelivr script.
export async function routeLocalScratchVm(target: Page | BrowserContext) {
  if (process.env.SCRATCH_VM_LOCAL_CDN !== '1') return
  const vmCode = readFileSync(process.env.SCRATCH_VM_LOCAL_FILE ?? '/tmp/scratch-local/scratch-vm.min.js')
  const storageCode = readFileSync(process.env.SCRATCH_STORAGE_LOCAL_FILE ?? '/tmp/scratch-local/scratch-storage.min.js')
  await target.route('https://cdn.jsdelivr.net/**', route => route.fulfill({
    body: route.request().url().includes('/scratch-storage@') ? storageCode : vmCode,
    contentType: 'application/javascript',
  }))
}

const CRC_TABLE = (() => {
  const table: number[] = []
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table.push(c >>> 0)
  }
  return table
})()
function crc32(data: Buffer): number {
  let crc = 0xffffffff
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
export type ZipEntry = {name: string; data: Buffer}
export function unzip(zip: Buffer): ZipEntry[] {
  const entries: ZipEntry[] = []
  let offset = 0
  while (offset + 4 <= zip.length && zip.readUInt32LE(offset) === 0x04034b50) {
    const flags = zip.readUInt16LE(offset + 6)
    const method = zip.readUInt16LE(offset + 8)
    let compressedSize = zip.readUInt32LE(offset + 18)
    const nameLength = zip.readUInt16LE(offset + 26)
    const extraLength = zip.readUInt16LE(offset + 28)
    const name = zip.subarray(offset + 30, offset + 30 + nameLength).toString('utf8')
    const dataStart = offset + 30 + nameLength + extraLength
    if (flags & 0x08) {
      // Sizes live in the central directory when a data descriptor is used.
      const cd = findCentral(zip, name)
      compressedSize = cd.compressedSize
    }
    const raw = zip.subarray(dataStart, dataStart + compressedSize)
    entries.push({name, data: method === 8 ? inflateRawSync(raw) : Buffer.from(raw)})
    offset = dataStart + compressedSize + (flags & 0x08 ? (zip.readUInt32LE(dataStart + compressedSize) === 0x08074b50 ? 16 : 12) : 0)
  }
  return entries
}
function findCentral(zip: Buffer, name: string) {
  for (let i = zip.length - 22; i >= 0; i -= 1) {
    if (zip.readUInt32LE(i) !== 0x06054b50) continue
    let offset = zip.readUInt32LE(i + 16)
    const total = zip.readUInt16LE(i + 10)
    for (let n = 0; n < total; n += 1) {
      const nameLength = zip.readUInt16LE(offset + 28)
      const entryName = zip.subarray(offset + 46, offset + 46 + nameLength).toString('utf8')
      if (entryName === name) return {compressedSize: zip.readUInt32LE(offset + 20)}
      offset += 46 + nameLength + zip.readUInt16LE(offset + 30) + zip.readUInt16LE(offset + 32)
    }
  }
  throw new Error('central directory entry not found: ' + name)
}
export function zip(entries: ZipEntry[]): Buffer {
  const chunks: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, 'utf8')
    const compressed = deflateRawSync(entry.data)
    const crc = crc32(entry.data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8)
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(entry.data.length, 22)
    local.writeUInt16LE(nameBuffer.length, 26)
    chunks.push(local, nameBuffer, compressed)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(8, 10)
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(entry.data.length, 24)
    central.writeUInt16LE(nameBuffer.length, 28); central.writeUInt32LE(offset, 42)
    centrals.push(central, nameBuffer)
    offset += local.length + nameBuffer.length + compressed.length
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...chunks, ...centrals, end])
}

type Project = {targets: Array<Record<string, unknown> & {name: string; blocks: Record<string, Record<string, unknown>>}>}
/** Re-pack a checked-in .sb3 with project.json changed by `mutate`. */
export function mutateSb3(sample: Buffer, mutate: (project: Project) => void): Buffer {
  const entries = unzip(sample)
  const projectEntry = entries.find(entry => entry.name === 'project.json')!
  const project = JSON.parse(projectEntry.data.toString('utf8')) as Project
  mutate(project)
  projectEntry.data = Buffer.from(JSON.stringify(project))
  return zip(entries)
}

export async function openG2Lab(page: Page, lessonId: string) {
  await page.goto(`/learn/scratch-lab/${lessonId}`)
  await expect(page.getByTestId('g2-vm-status')).toContainText(/已加载项目|已从本机草稿恢复/, {timeout: 60_000})
  await expect(page.getByTestId('g2-green-flag')).toBeEnabled()
}

export async function selectTarget(page: Page, name: string) {
  await page.locator(`[data-testid="g2-select-target"][data-name="${name}"]`).click()
  await expect(page.locator(`[data-testid="g2-target-card"][data-name="${name}"]`)).toContainText('当前选中')
}

export function stageSprite(page: Page, name: string) {
  return page.locator(`[data-testid="g2-stage-sprite"][data-name="${name}"]`)
}
export function spriteState(page: Page, name: string) {
  return page.locator(`[data-testid="g2-sprite-state"][data-name="${name}"]`)
}
