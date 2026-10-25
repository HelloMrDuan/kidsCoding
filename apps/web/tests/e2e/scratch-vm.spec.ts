import { expect, test } from '@playwright/test'
import {readFile} from 'node:fs/promises'
import {deflateRawSync,inflateRawSync} from 'node:zlib'

// Minimal ZIP reader/writer for one TQ-006 test: it re-packs the checked-in
// sample with a single project.json field changed, without a zip dependency.
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
function unzipSample(zip: Buffer): Array<{name: string; data: Buffer}> {
  const entries: Array<{name: string; data: Buffer}> = []
  let offset = 0
  while (offset + 4 <= zip.length && zip.readUInt32LE(offset) === 0x04034b50) {
    const method = zip.readUInt16LE(offset + 8)
    const compressedSize = zip.readUInt32LE(offset + 18)
    const nameLength = zip.readUInt16LE(offset + 26)
    const extraLength = zip.readUInt16LE(offset + 28)
    const name = zip.subarray(offset + 30, offset + 30 + nameLength).toString('utf8')
    const dataStart = offset + 30 + nameLength + extraLength
    const raw = zip.subarray(dataStart, dataStart + compressedSize)
    entries.push({name, data: method === 8 ? inflateRawSync(raw) : Buffer.from(raw)})
    offset = dataStart + compressedSize
  }
  return entries
}
function zipDeflated(entries: Array<{name: string; data: Buffer}>): Buffer {
  const chunks: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, 'utf8')
    const compressed = deflateRawSync(entry.data)
    const crc = crc32(entry.data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 8)
    local.writeUInt16LE(8, 10)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(entry.data.length, 22)
    local.writeUInt16LE(nameBuffer.length, 26)
    chunks.push(local, nameBuffer, compressed)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(compressed.length, 20)
    central.writeUInt32LE(entry.data.length, 24)
    central.writeUInt16LE(nameBuffer.length, 28)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, nameBuffer)
    offset += local.length + nameBuffer.length + compressed.length
  }
  const centralStart = offset
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralSize, 12)
  end.writeUInt32LE(centralStart, 16)
  return Buffer.concat([...chunks, ...centrals, end])
}

test('loads a real .sb3 using Scratch VM, executes clones and moves them, then stops', async ({ page }) => {
  test.setTimeout(180_000)
  page.on('console',message=>console.log('SCRATCH_CONSOLE',message.type(),message.text().slice(0,800)))
  page.on('pageerror',error=>console.log('SCRATCH_PAGEERROR',error.message.slice(0,1000)))
  page.on('requestfailed',request=>console.log('SCRATCH_REQUEST_FAILED',request.url(),request.failure()?.errorText))
  await page.goto('/learn/catalog/G3-U1-L02')
  await page.getByTestId('scratch-trial-entry').click()
  await expect(page.getByTestId('scratch-vm-status')).toContainText('已加载项目',{timeout:60_000})
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled()
  await page.getByTestId('scratch-green-flag').click()
  await expect(page.getByTestId('scratch-clone-observed')).toHaveText('是',{timeout:30_000})
  await expect(page.getByTestId('scratch-movement-observed')).toHaveText('是',{timeout:30_000})
  await expect(page.getByTestId('scratch-deletion-observed')).toHaveText('是',{timeout:30_000})
  await page.getByTestId('scratch-stop').click()
  await expect(page.getByTestId('scratch-vm-status')).toContainText('停止',{timeout:8_000})
  await expect(page.getByTestId('scratch-live-clones')).toHaveText('0',{timeout:8_000})

  // Exercise a second complete VM lifecycle: no stale clones or observer flags may survive.
  await page.getByTestId('scratch-green-flag').click()
  await expect(page.getByTestId('scratch-clone-observed')).toHaveText('是',{timeout:30_000})
  await expect(page.getByTestId('scratch-movement-observed')).toHaveText('是',{timeout:30_000})
  await expect(page.getByTestId('scratch-deletion-observed')).toHaveText('是',{timeout:30_000})
  await page.getByTestId('scratch-stop').click()
  await expect(page.getByTestId('scratch-live-clones')).toHaveText('0',{timeout:8_000})
})

test('Scratch engine is only exposed as a controlled trial, no published learner grade', async ({ page }) => {
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await expect(page.getByText('不保存正式成绩').first()).toBeVisible()
  await expect(page.getByTestId('scratch-vm-status')).toContainText('已加载项目',{timeout:60_000})
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled()
  await expect(page.getByRole('heading',{name:'流星分身雨'})).toBeVisible()
})

test('Blockly editor changes the number and falling movement of real Scratch VM clones',async({page})=>{
  test.setTimeout(180_000)
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled({timeout:60_000})
  await expect(page.getByTestId('scratch-blockly-mount').locator('.blocklySvg')).toBeVisible()
  await expect(page.getByTestId('scratch-editor-validity')).toContainText('连接正确')
  await page.getByTestId('scratch-edit-spawn-count').fill('2')
  await page.getByTestId('scratch-edit-fall-step').fill('25')
  await expect(page.getByTestId('scratch-green-flag')).toBeDisabled() // no stale execution of unapplied blocks
  await page.getByTestId('scratch-apply-blocks').click()
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('2颗 / 每步25 / 每0.3秒',{timeout:12_000})
  await page.getByTestId('scratch-green-flag').click()
  await expect(page.getByTestId('scratch-created-total')).toHaveText('2',{timeout:18_000})
  await expect(page.getByTestId('scratch-movement-observed')).toHaveText('是',{timeout:18_000})
  await expect(page.getByTestId('scratch-deletion-observed')).toHaveText('是',{timeout:18_000})
  await page.getByTestId('scratch-stop').click()
  await expect(page.getByTestId('scratch-live-clones')).toHaveText('0')
  // A second edited program must affect the VM, not just the React label.
  await page.getByTestId('scratch-edit-spawn-count').fill('5')
  await expect(page.getByTestId('scratch-green-flag')).toBeDisabled()
  await page.getByTestId('scratch-apply-blocks').click()
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('5颗 / 每步25 / 每0.3秒',{timeout:12_000})
  await page.getByTestId('scratch-green-flag').click()
  await expect(page.getByTestId('scratch-created-total')).toHaveText('5',{timeout:18_000})
  await page.getByTestId('scratch-stop').click()
  await expect(page.getByTestId('scratch-live-clones')).toHaveText('0')
})

test('exports a genuine Scratch VM .sb3 and reloads it in a fresh VM to verify edited block values',async({page})=>{
  test.setTimeout(180_000)
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled({timeout:60_000})
  await page.getByTestId('scratch-edit-spawn-count').fill('3')
  await page.getByTestId('scratch-edit-fall-step').fill('20')
  await expect(page.getByTestId('scratch-export-sb3')).toBeDisabled()
  await page.getByTestId('scratch-apply-blocks').click()
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('3颗 / 每步20 / 每0.3秒',{timeout:12_000})
  const downloading = page.waitForEvent('download',{timeout:60_000})
  await page.getByTestId('scratch-export-sb3').click()
  const downloaded=await downloading
  expect(downloaded.suggestedFilename()).toBe('KidsCoding-流星分身雨.sb3')
  const path=await downloaded.path()
  expect(path).not.toBeNull()
  const zip=await readFile(path!)
  expect(zip.byteLength).toBeGreaterThan(500)
  expect(zip[0]).toBe(0x50)
  expect(zip[1]).toBe(0x4b)
  await expect(page.getByTestId('scratch-export-status')).toContainText('独立 VM 重新载入验证：3颗 / 每步20 / 每0.3秒')
  await expect(page.getByTestId('scratch-vm-status')).toContainText('已从真实 Scratch VM 导出')
  // The export must not break the editor or its VM: green flag still runs the edited version.
  await page.getByTestId('scratch-green-flag').click()
  await expect(page.getByTestId('scratch-created-total')).toHaveText('3',{timeout:18_000})
  await page.getByTestId('scratch-stop').click()
  await expect(page.getByTestId('scratch-live-clones')).toHaveText('0')
})

test('exported real Scratch .sb3 reimports and restores Blockly for continued authoring',async({page})=>{
  test.setTimeout(180_000)
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled({timeout:60_000})
  await page.getByTestId('scratch-edit-spawn-count').fill('4')
  await page.getByTestId('scratch-edit-fall-step').fill('18')
  await page.getByTestId('scratch-apply-blocks').click()
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('4颗 / 每步18 / 每0.3秒')
  const downloading=page.waitForEvent('download',{timeout:60_000})
  await page.getByTestId('scratch-export-sb3').click()
  const saved=await downloading
  const localPath=await saved.path()
  expect(localPath).not.toBeNull()
  await page.getByTestId('scratch-edit-spawn-count').fill('2')
  await page.getByTestId('scratch-edit-fall-step').fill('25')
  await page.getByTestId('scratch-apply-blocks').click()
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('2颗 / 每步25 / 每0.3秒')

  await page.getByTestId('scratch-import-sb3').setInputFiles({name:'restored.sb3',mimeType:'application/octet-stream',buffer:await readFile(localPath!)})
  await expect(page.getByTestId('scratch-vm-status')).toContainText('已重新导入作品',{timeout:50_000})
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('4颗 / 每步18 / 每0.3秒')
  await expect(page.getByTestId('scratch-edit-spawn-count')).toHaveValue('4')
  await expect(page.getByTestId('scratch-edit-fall-step')).toHaveValue('18')
  await expect(page.getByTestId('scratch-editor-validity')).toContainText('连接正确')
  await page.getByTestId('scratch-green-flag').click()
  await expect(page.getByTestId('scratch-created-total')).toHaveText('4',{timeout:18_000})
  await page.getByTestId('scratch-stop').click()
  await expect(page.getByTestId('scratch-live-clones')).toHaveText('0')

  // Bad file is refused before loading, and does not overwrite the good VM.
  await page.getByTestId('scratch-import-sb3').setInputFiles({
    name:'invalid.sb3',mimeType:'application/octet-stream',buffer:Buffer.alloc(1024,0x41)
  })
  await expect(page.getByTestId('scratch-vm-status')).toContainText('不是 Scratch ZIP')
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('4颗 / 每步18 / 每0.3秒')
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled()
})

test('Scratch VM genuine sb3 is auto-saved in IndexedDB and restored after browser reload',async({page})=>{
  test.setTimeout(180_000)
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled({timeout:60_000})
  await page.getByTestId('scratch-edit-spawn-count').fill('4')
  await page.getByTestId('scratch-edit-fall-step').fill('19')
  await page.getByTestId('scratch-apply-blocks').click()
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('4颗 / 每步19 / 每0.3秒')
  await expect(page.getByTestId('scratch-local-save-status')).toContainText('已在本机自动保存真实 Scratch .sb3',{timeout:45_000})
  await page.reload()
  await expect(page.getByTestId('scratch-vm-status')).toContainText('已从本机草稿恢复',{timeout:60_000})
  await expect(page.getByTestId('scratch-edit-spawn-count')).toHaveValue('4')
  await expect(page.getByTestId('scratch-edit-fall-step')).toHaveValue('19')
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled()
  await page.getByTestId('scratch-green-flag').click()
  await expect(page.getByTestId('scratch-created-total')).toHaveText('4',{timeout:20_000})
  await page.getByTestId('scratch-stop').click()
  await expect(page.getByTestId('scratch-live-clones')).toHaveText('0')

  await page.getByTestId('scratch-reset-draft').click()
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('10颗 / 每步13 / 每0.3秒',{timeout:40_000})
  await expect(page.getByTestId('scratch-edit-spawn-count')).toHaveValue('10')
  await expect(page.getByTestId('scratch-edit-fall-step')).toHaveValue('13')
  await page.reload()
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled({timeout:60_000})
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('10颗 / 每步13 / 每0.3秒')
})

test('account cloud buttons save an actual Scratch VM sb3 and restore it in a fresh browser context',async({page,browser})=>{
  test.setTimeout(180_000)
  let stored=''
  await page.route('**/api/practice/scratch',async route=>{
    if(route.request().method()==='PUT'){
      const payload=route.request().postDataJSON()
      expect(payload.lessonId).toBe('G3-U1-L02')
      stored=payload.archiveBase64
      expect(stored.length).toBeGreaterThan(400)
      await route.fulfill({status:200,json:{synced:true,verifiedGrade:false}})
      return
    }
    await route.fulfill({status:200,json:{draft:null}})
  })
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled({timeout:60_000})
  await page.getByTestId('scratch-edit-spawn-count').fill('3')
  await page.getByTestId('scratch-edit-fall-step').fill('21')
  await page.getByTestId('scratch-apply-blocks').click()
  await expect(page.getByTestId('scratch-local-save-status')).toContainText('已在本机自动保存',{timeout:40_000})
  await page.getByTestId('scratch-cloud-save').click()
  await expect(page.getByTestId('scratch-cloud-status')).toContainText('已保存到当前登录账号',{timeout:30_000})

  // New isolated browser context deliberately has no IndexedDB draft.
  // Only the HTTP transport is stubbed; both project loads use the real VM.
  const separateDevice=await browser.newContext()
  try{
    await separateDevice.route('**/api/practice/scratch',route=>route.fulfill({status:200,json:{
      draft:{lessonId:'G3-U1-L02',archiveBase64:stored,updatedAt:'2026-10-10T16:00:00Z'},
    }}))
    const other=await separateDevice.newPage()
    await other.goto('/learn/scratch-lab/G3-U1-L02')
    await expect(other.getByTestId('scratch-green-flag')).toBeEnabled({timeout:60_000})
    await expect(other.getByTestId('scratch-edit-spawn-count')).toHaveValue('10')
    await other.getByTestId('scratch-cloud-restore').click()
    await expect(other.getByTestId('scratch-vm-status')).toContainText('已从当前登录账号恢复',{timeout:50_000})
    await expect(other.getByTestId('scratch-applied-program')).toHaveText('3颗 / 每步21 / 每0.3秒')
    await expect(other.getByTestId('scratch-edit-spawn-count')).toHaveValue('3')
    await other.getByTestId('scratch-green-flag').click()
    await expect(other.getByTestId('scratch-created-total')).toHaveText('3',{timeout:18_000})
    await other.getByTestId('scratch-stop').click()
    await expect(other.getByTestId('scratch-live-clones')).toHaveText('0')
  }finally{
    await separateDevice.close()
  }
})

test('TQ-006 spawn interval is a real VM parameter and its limits are labelled',async({page})=>{
  test.setTimeout(180_000)
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled({timeout:60_000})
  await expect(page.getByTestId('scratch-limitations')).toContainText('只能改三个数字')
  await expect(page.getByTestId('scratch-limitations')).toContainText('生成间隔随时间递减')
  await expect(page.getByTestId('scratch-edit-spawn-interval')).toHaveValue('0.3')
  await page.getByTestId('scratch-edit-spawn-interval').fill('1')
  await expect(page.getByTestId('scratch-green-flag')).toBeDisabled() // no stale execution of unapplied blocks
  await page.getByTestId('scratch-apply-blocks').click()
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('10颗 / 每步13 / 每1秒',{timeout:12_000})
  await page.getByTestId('scratch-green-flag').click()
  await expect(page.getByTestId('scratch-created-total')).toHaveText('10',{timeout:30_000})
  await expect(page.getByTestId('scratch-deletion-observed')).toHaveText('是',{timeout:30_000})
  await page.getByTestId('scratch-stop').click()
  await expect(page.getByTestId('scratch-live-clones')).toHaveText('0',{timeout:8_000})
  // Blockly itself normalises an off-step interval to the 0.1s grid, so the
  // field can never hand the VM an off-step value from the number box.
  await page.getByTestId('scratch-edit-spawn-interval').fill('0.35')
  await expect(page.getByTestId('scratch-edit-spawn-interval')).toHaveValue('0.3')
  await expect(page.getByTestId('scratch-editor-validity')).toContainText('连接正确')
  await page.getByTestId('scratch-apply-blocks').click()
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('10颗 / 每步13 / 每0.3秒',{timeout:12_000})
})

test('TQ-006 a failed sample load can be retried without reloading the page',async({page})=>{
  test.setTimeout(180_000)
  let attempts=0
  await page.route('**/scratch-samples/meteor-clones.sb3',async route=>{
    attempts+=1
    if(attempts===1){await route.fulfill({status:500,body:'boom'});return}
    await route.continue()
  })
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await expect(page.getByTestId('scratch-vm-status')).toContainText(/项目加载失败|Scratch VM 下载失败/,{timeout:60_000})
  await expect(page.getByTestId('scratch-retry-load')).toBeVisible()
  await page.getByTestId('scratch-retry-load').click()
  await expect(page.getByTestId('scratch-vm-status')).toContainText('已加载项目',{timeout:60_000})
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled()
  await expect(page.getByTestId('scratch-retry-load')).toHaveCount(0)
  await expect(attempts).toBeGreaterThanOrEqual(2)
})

test('TQ-006 a .sb3 with an off-step spawn interval is refused and the good project survives',async({page})=>{
  test.setTimeout(180_000)
  const sample=await readFile('public/scratch-samples/meteor-clones.sb3')
  const entries=unzipSample(sample)
  const projectEntry=entries.find(entry=>entry.name==='project.json')
  expect(projectEntry).toBeDefined()
  const project=JSON.parse(projectEntry!.data.toString('utf8'))
  project.targets[1].blocks.wait.inputs.DURATION=[1,[4,'0.35']]
  projectEntry!.data=Buffer.from(JSON.stringify(project))
  const bad=zipDeflated(entries)
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled({timeout:60_000})
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('10颗 / 每步13 / 每0.3秒')
  await page.getByTestId('scratch-import-sb3').setInputFiles({name:'bad-interval.sb3',mimeType:'application/octet-stream',buffer:bad})
  await expect(page.getByTestId('scratch-vm-status')).toContainText('导入 Scratch 项目失败',{timeout:50_000})
  await expect(page.getByTestId('scratch-vm-status')).toContainText('数字积木超过允许范围')
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('10颗 / 每步13 / 每0.3秒')
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled()
})
