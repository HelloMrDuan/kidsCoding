import { expect, test } from '@playwright/test'
import {readFile} from 'node:fs/promises'

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
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('2颗 / 每步25',{timeout:12_000})
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
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('5颗 / 每步25',{timeout:12_000})
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
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('3颗 / 每步20',{timeout:12_000})
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
  await expect(page.getByTestId('scratch-export-status')).toContainText('独立 VM 重新载入验证：3颗 / 每步20')
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
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('4颗 / 每步18')
  const downloading=page.waitForEvent('download',{timeout:60_000})
  await page.getByTestId('scratch-export-sb3').click()
  const saved=await downloading
  const localPath=await saved.path()
  expect(localPath).not.toBeNull()
  await page.getByTestId('scratch-edit-spawn-count').fill('2')
  await page.getByTestId('scratch-edit-fall-step').fill('25')
  await page.getByTestId('scratch-apply-blocks').click()
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('2颗 / 每步25')

  await page.getByTestId('scratch-import-sb3').setInputFiles({name:'restored.sb3',mimeType:'application/octet-stream',buffer:await readFile(localPath!)})
  await expect(page.getByTestId('scratch-vm-status')).toContainText('已重新导入作品',{timeout:50_000})
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('4颗 / 每步18')
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
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('4颗 / 每步18')
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled()
})

test('Scratch VM genuine sb3 is auto-saved in IndexedDB and restored after browser reload',async({page})=>{
  test.setTimeout(180_000)
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled({timeout:60_000})
  await page.getByTestId('scratch-edit-spawn-count').fill('4')
  await page.getByTestId('scratch-edit-fall-step').fill('19')
  await page.getByTestId('scratch-apply-blocks').click()
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('4颗 / 每步19')
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
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('10颗 / 每步13',{timeout:40_000})
  await expect(page.getByTestId('scratch-edit-spawn-count')).toHaveValue('10')
  await expect(page.getByTestId('scratch-edit-fall-step')).toHaveValue('13')
  await page.reload()
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled({timeout:60_000})
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('10颗 / 每步13')
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
    await expect(other.getByTestId('scratch-applied-program')).toHaveText('3颗 / 每步21')
    await expect(other.getByTestId('scratch-edit-spawn-count')).toHaveValue('3')
    await other.getByTestId('scratch-green-flag').click()
    await expect(other.getByTestId('scratch-created-total')).toHaveText('3',{timeout:18_000})
    await other.getByTestId('scratch-stop').click()
    await expect(other.getByTestId('scratch-live-clones')).toHaveText('0')
  }finally{
    await separateDevice.close()
  }
})
