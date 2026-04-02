# Portable Supabase CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `apps/web` 增加一套可移植的 `Supabase CLI` 安装与解析机制，让本地 Supabase 联调优先使用仓库 `.tools` 下的固定版本 CLI，缺失时再回退系统 `PATH`。

**Architecture:** 新增一个共享的 CLI 解析层，集中处理平台映射、仓库内 `.tools` 路径、版本文件和系统命令回退；新增独立安装命令负责下载、解压并落盘固定版本 CLI；现有 `local:supabase:setup` 只升级为调用解析层，不在 setup 阶段自动下载。整个实现沿用现有 Node `.mjs` 脚本模式，并通过 Vitest 对平台映射、安装幂等和 setup 集成做 TDD。

**Tech Stack:** Next.js, Node `.mjs` scripts, Vitest, npm scripts, `tar` dev dependency, Supabase CLI, Docker Desktop

---

## File Structure

- `D:\pyprograms\kidsCoding\.gitignore`
  - 忽略仓库根目录 `.tools/`，避免下载的 CLI 二进制进入 git 历史。
- `D:\pyprograms\kidsCoding\apps\web\package.json`
  - 增加 `local:supabase:install-cli`，补 `tar` 依赖后的脚本入口。
- `D:\pyprograms\kidsCoding\apps\web\package-lock.json`
  - 锁定 `tar` 依赖。
- `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-cli.mjs`
  - 共享解析层，负责平台映射、仓库 `.tools` 路径、版本文件路径和 CLI 解析顺序。
- `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-cli.test.ts`
  - 共享解析层测试。
- `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-install-cli-core.mjs`
  - 下载、解压、写入 `.tools` 和版本文件的核心逻辑。
- `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-install-cli-core.test.ts`
  - 安装脚本的幂等和下载源覆盖测试。
- `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-install-cli.mjs`
  - CLI 安装命令入口。
- `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-setup-core.mjs`
  - 改为调用共享解析层，优先使用 `.tools` 下的 CLI。
- `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-setup-core.test.ts`
  - 补“优先使用仓库 CLI”和“缺失时回退系统命令”的测试。
- `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-setup.mjs`
  - 升级缺失 CLI 的报错文案，优先建议执行安装命令。
- `D:\pyprograms\kidsCoding\apps\web\README.md`
  - 将本地 Supabase 文档改成“先安装 CLI，再执行 setup”的两段式流程。

### Task 1: 共享 CLI 解析层

**Files:**
- Create: `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-cli.mjs`
- Create: `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-cli.test.ts`

- [ ] **Step 1: 先写平台映射和路径解析的失败测试**

```ts
import { describe, expect, it, vi } from 'vitest'

import {
  SUPABASE_CLI_VERSION,
  getSupabaseCliBinaryPath,
  getSupabaseCliTarget,
  getSupabaseCliVersionFile,
  resolveSupabaseCliExecutable,
} from './local-supabase-cli.mjs'

describe('getSupabaseCliTarget', () => {
  it('maps win32 x64 to the windows release asset', () => {
    expect(getSupabaseCliTarget('win32', 'x64')).toEqual({
      assetName: `supabase_windows_amd64.tar.gz`,
      binaryName: 'supabase.exe',
      directoryName: 'windows-x64',
      systemCommand: 'supabase.exe',
    })
  })

  it('maps darwin arm64 to the arm64 release asset', () => {
    expect(getSupabaseCliTarget('darwin', 'arm64')).toEqual({
      assetName: `supabase_darwin_arm64.tar.gz`,
      binaryName: 'supabase',
      directoryName: 'darwin-arm64',
      systemCommand: 'supabase',
    })
  })
})

describe('resolveSupabaseCliExecutable', () => {
  it('prefers the repository .tools binary when present', async () => {
    const exists = vi.fn().mockResolvedValue(true)

    await expect(
      resolveSupabaseCliExecutable({
        repoRoot: 'D:/pyprograms/kidsCoding',
        platform: 'linux',
        arch: 'x64',
        exists,
      }),
    ).resolves.toEqual({
      file: 'D:\\pyprograms\\kidsCoding\\.tools\\supabase\\linux-x64\\supabase',
      source: 'repo-tools',
      version: SUPABASE_CLI_VERSION,
    })
  })

  it('falls back to the system command when .tools is missing', async () => {
    const exists = vi.fn().mockResolvedValue(false)

    await expect(
      resolveSupabaseCliExecutable({
        repoRoot: 'D:/pyprograms/kidsCoding',
        platform: 'linux',
        arch: 'x64',
        exists,
      }),
    ).resolves.toEqual({
      file: 'supabase',
      source: 'system-path',
      version: SUPABASE_CLI_VERSION,
    })
  })
})

describe('getSupabaseCliVersionFile', () => {
  it('stores the version marker beside the extracted binary', () => {
    expect(
      getSupabaseCliVersionFile('D:/pyprograms/kidsCoding', getSupabaseCliTarget('win32', 'x64')),
    ).toBe('D:\\pyprograms\\kidsCoding\\.tools\\supabase\\windows-x64\\.version')
  })
})
```

- [ ] **Step 2: 运行测试，确认当前失败**

Run: `npm run test:run -- scripts/local-supabase-cli.test.ts --maxWorkers=1`  
Expected: FAIL，提示 `Cannot find module './local-supabase-cli.mjs'`

- [ ] **Step 3: 实现共享 CLI 解析层**

```js
import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join } from 'node:path'

export const SUPABASE_CLI_VERSION = '2.84.6'

const TARGETS = {
  'win32:x64': {
    assetName: 'supabase_windows_amd64.tar.gz',
    binaryName: 'supabase.exe',
    directoryName: 'windows-x64',
    systemCommand: 'supabase.exe',
  },
  'darwin:x64': {
    assetName: 'supabase_darwin_amd64.tar.gz',
    binaryName: 'supabase',
    directoryName: 'darwin-x64',
    systemCommand: 'supabase',
  },
  'darwin:arm64': {
    assetName: 'supabase_darwin_arm64.tar.gz',
    binaryName: 'supabase',
    directoryName: 'darwin-arm64',
    systemCommand: 'supabase',
  },
  'linux:x64': {
    assetName: 'supabase_linux_amd64.tar.gz',
    binaryName: 'supabase',
    directoryName: 'linux-x64',
    systemCommand: 'supabase',
  },
}

async function fileExists(filePath) {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

export function getSupabaseCliTarget(
  platform = process.platform,
  arch = process.arch,
) {
  const target = TARGETS[`${platform}:${arch}`]

  if (!target) {
    throw new Error(`local-supabase-cli-unsupported-platform:${platform}:${arch}`)
  }

  return target
}

export function getSupabaseCliBinaryPath(repoRoot, target) {
  return join(repoRoot, '.tools', 'supabase', target.directoryName, target.binaryName)
}

export function getSupabaseCliVersionFile(repoRoot, target) {
  return join(repoRoot, '.tools', 'supabase', target.directoryName, '.version')
}

export async function resolveSupabaseCliExecutable({
  repoRoot,
  platform = process.platform,
  arch = process.arch,
  exists = fileExists,
}) {
  const target = getSupabaseCliTarget(platform, arch)
  const localBinary = getSupabaseCliBinaryPath(repoRoot, target)

  if (await exists(localBinary)) {
    return {
      file: localBinary,
      source: 'repo-tools',
      version: SUPABASE_CLI_VERSION,
    }
  }

  return {
    file: target.systemCommand,
    source: 'system-path',
    version: SUPABASE_CLI_VERSION,
  }
}
```

- [ ] **Step 4: 重新运行测试，确认共享解析层通过**

Run: `npm run test:run -- scripts/local-supabase-cli.test.ts --maxWorkers=1`  
Expected: PASS

- [ ] **Step 5: 提交这一批**

```bash
git add apps/web/scripts/local-supabase-cli.mjs apps/web/scripts/local-supabase-cli.test.ts
git commit -m "refactor: add local supabase cli resolver"
```

### Task 2: CLI 安装脚本和固定版本落盘

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\package.json`
- Modify: `D:\pyprograms\kidsCoding\apps\web\package-lock.json`
- Create: `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-install-cli-core.mjs`
- Create: `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-install-cli-core.test.ts`
- Create: `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-install-cli.mjs`

- [ ] **Step 1: 安装解压依赖并更新 lock 文件**

Run: `npm install --save-dev tar`  
Expected: `package.json` 和 `package-lock.json` 更新，新增 `tar`

- [ ] **Step 2: 先写安装脚本的失败测试**

```ts
import { describe, expect, it, vi } from 'vitest'

import {
  buildSupabaseCliDownloadUrl,
  installSupabaseCli,
} from './local-supabase-install-cli-core.mjs'

describe('buildSupabaseCliDownloadUrl', () => {
  it('uses GitHub releases by default', () => {
    expect(
      buildSupabaseCliDownloadUrl({
        version: '2.84.6',
        assetName: 'supabase_windows_amd64.tar.gz',
      }),
    ).toBe(
      'https://github.com/supabase/cli/releases/download/v2.84.6/supabase_windows_amd64.tar.gz',
    )
  })

  it('uses the override base url when configured', () => {
    expect(
      buildSupabaseCliDownloadUrl({
        version: '2.84.6',
        assetName: 'supabase_windows_amd64.tar.gz',
        baseUrl: 'https://mirror.example.com/supabase/cli/releases/download',
      }),
    ).toBe(
      'https://mirror.example.com/supabase/cli/releases/download/v2.84.6/supabase_windows_amd64.tar.gz',
    )
  })
})

describe('installSupabaseCli', () => {
  it('skips download when the requested version is already installed', async () => {
    const ensureDir = vi.fn()
    const download = vi.fn()
    const extract = vi.fn()
    const readText = vi.fn().mockResolvedValue('2.84.6')
    const exists = vi
      .fn()
      .mockImplementation(async (filePath) => filePath.endsWith('supabase.exe'))

    await expect(
      installSupabaseCli({
        repoRoot: 'D:/pyprograms/kidsCoding',
        platform: 'win32',
        arch: 'x64',
        exists,
        readText,
        ensureDir,
        download,
        extract,
      }),
    ).resolves.toEqual({
      binaryPath: 'D:\\pyprograms\\kidsCoding\\.tools\\supabase\\windows-x64\\supabase.exe',
      skipped: true,
      version: '2.84.6',
    })

    expect(download).not.toHaveBeenCalled()
    expect(extract).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: 运行测试，确认当前失败**

Run: `npm run test:run -- scripts/local-supabase-install-cli-core.test.ts --maxWorkers=1`  
Expected: FAIL，提示 `Cannot find module './local-supabase-install-cli-core.mjs'`

- [ ] **Step 4: 实现安装脚本核心逻辑和命令入口**

```js
import { createWriteStream, promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import tar from 'tar'

import {
  SUPABASE_CLI_VERSION,
  getSupabaseCliBinaryPath,
  getSupabaseCliTarget,
  getSupabaseCliVersionFile,
} from './local-supabase-cli.mjs'

export function buildSupabaseCliDownloadUrl({
  version,
  assetName,
  baseUrl = process.env.SUPABASE_CLI_DOWNLOAD_BASE_URL ??
    'https://github.com/supabase/cli/releases/download',
}) {
  return `${baseUrl.replace(/\/$/, '')}/v${version}/${assetName}`
}

async function downloadArchive(url, archivePath) {
  const response = await fetch(url)

  if (!response.ok || !response.body) {
    throw new Error(`local-supabase-cli-download-failed:${url}`)
  }

  await pipeline(Readable.fromWeb(response.body), createWriteStream(archivePath))
}

async function extractArchive(archivePath, extractDir) {
  await tar.x({
    file: archivePath,
    cwd: extractDir,
  })
}

export async function installSupabaseCli({
  repoRoot,
  platform = process.platform,
  arch = process.arch,
  exists,
  readText = (filePath) => fs.readFile(filePath, 'utf8'),
  writeText = (filePath, value) => fs.writeFile(filePath, value, 'utf8'),
  ensureDir = (dirPath) => fs.mkdir(dirPath, { recursive: true }),
  copyFile = fs.copyFile,
  remove = (filePath) => fs.rm(filePath, { recursive: true, force: true }),
  download = downloadArchive,
  extract = extractArchive,
}) {
  const target = getSupabaseCliTarget(platform, arch)
  const binaryPath = getSupabaseCliBinaryPath(repoRoot, target)
  const versionFile = getSupabaseCliVersionFile(repoRoot, target)
  const fileExists =
    exists ?? (async (filePath) => fs.access(filePath).then(() => true).catch(() => false))

  const installedVersion = await readText(versionFile).catch(() => '')

  if (installedVersion.trim() === SUPABASE_CLI_VERSION && (await fileExists(binaryPath))) {
    return { binaryPath, skipped: true, version: SUPABASE_CLI_VERSION }
  }

  const tempDir = await fs.mkdtemp(join(tmpdir(), 'kids-coding-supabase-cli-'))
  const archivePath = join(tempDir, target.assetName)
  const extractDir = join(tempDir, 'extract')
  const downloadUrl = buildSupabaseCliDownloadUrl({
    version: SUPABASE_CLI_VERSION,
    assetName: target.assetName,
  })

  try {
    await ensureDir(dirname(binaryPath))
    await ensureDir(extractDir)
    await download(downloadUrl, archivePath)
    await extract(archivePath, extractDir)
    await copyFile(join(extractDir, target.binaryName), binaryPath)
    await writeText(versionFile, `${SUPABASE_CLI_VERSION}\n`)

    return { binaryPath, skipped: false, version: SUPABASE_CLI_VERSION }
  } finally {
    await remove(tempDir)
  }
}
```

```js
import { join } from 'node:path'

import { installSupabaseCli } from './local-supabase-install-cli-core.mjs'

installSupabaseCli({
  repoRoot: join(process.cwd(), '..', '..'),
}).catch((error) => {
  console.error('[local:supabase:install-cli] failed')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
```

```json
{
  "scripts": {
    "local:supabase:install-cli": "node ./scripts/local-supabase-install-cli.mjs"
  }
}
```

- [ ] **Step 5: 重新运行安装脚本测试**

Run: `npm run test:run -- scripts/local-supabase-install-cli-core.test.ts --maxWorkers=1`  
Expected: PASS

- [ ] **Step 6: 提交这一批**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/scripts/local-supabase-install-cli-core.mjs apps/web/scripts/local-supabase-install-cli-core.test.ts apps/web/scripts/local-supabase-install-cli.mjs
git commit -m "feat: add portable supabase cli installer"
```

### Task 3: 把 setup 接到共享解析层并补文档

**Files:**
- Modify: `D:\pyprograms\kidsCoding\.gitignore`
- Modify: `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-setup-core.mjs`
- Modify: `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-setup-core.test.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\scripts\local-supabase-setup.mjs`
- Modify: `D:\pyprograms\kidsCoding\apps\web\README.md`

- [ ] **Step 1: 先写 setup 优先使用 `.tools` 的失败测试**

```ts
import { describe, expect, it, vi } from 'vitest'

import { runLocalSupabaseSetup } from './local-supabase-setup-core.mjs'

describe('runLocalSupabaseSetup', () => {
  it('prefers the repository cli binary before the system PATH command', async () => {
    const exec = vi
      .fn()
      .mockResolvedValueOnce({ stdout: '' })
      .mockResolvedValueOnce({
        stdout: `API_URL=http://127.0.0.1:54321
ANON_KEY=anon-local-key
SERVICE_ROLE_KEY=service-local-key
`,
      })
      .mockResolvedValueOnce({ stdout: '' })
      .mockResolvedValueOnce({ stdout: '' })

    const resolveCli = vi.fn().mockResolvedValue({
      file: 'D:\\pyprograms\\kidsCoding\\.tools\\supabase\\windows-x64\\supabase.exe',
      source: 'repo-tools',
      version: '2.84.6',
    })

    await runLocalSupabaseSetup({
      exec,
      resolveCli,
      writeEnv: vi.fn().mockResolvedValue(undefined),
      projectDir: 'D:/pyprograms/kidsCoding/apps/web',
    })

    expect(resolveCli).toHaveBeenCalledWith({
      repoRoot: 'D:\\pyprograms\\kidsCoding',
    })
    expect(exec.mock.calls[0]).toEqual([
      'D:\\pyprograms\\kidsCoding\\.tools\\supabase\\windows-x64\\supabase.exe',
      ['start'],
      'D:/pyprograms/kidsCoding/apps/web',
    ])
  })
})
```

- [ ] **Step 2: 运行测试，确认当前失败**

Run: `npm run test:run -- scripts/local-supabase-setup-core.test.ts --maxWorkers=1`  
Expected: FAIL，提示 `resolveCli` 未被调用或仍然直接使用 `supabase.exe`

- [ ] **Step 3: 实现 setup 集成、报错升级和 `.tools` 忽略规则**

```js
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { resolveSupabaseCliExecutable } from './local-supabase-cli.mjs'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))

async function defaultExec(command, args, cwd) {
  const invocation = { file: command, args }

  try {
    return await execFileAsync(invocation.file, invocation.args, { cwd })
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error('local-supabase-cli-missing')
    }

    throw error
  }
}

export async function runLocalSupabaseSetup({
  exec = defaultExec,
  projectDir,
  resolveCli = resolveSupabaseCliExecutable,
  writeEnv = defaultWriteEnv,
}) {
  const repoRoot = join(projectDir, '..', '..')
  const cli = await resolveCli({ repoRoot })

  await exec(cli.file, ['start'], projectDir)
  const status = await exec(cli.file, ['status', '-o', 'env'], projectDir)
  const values = buildLocalSupabaseValues(parseSupabaseStatusEnv(status.stdout))
  const envPath = join(projectDir, '.env.local')

  await writeEnv(envPath, values)
  await exec(cli.file, ['db', 'reset', '--yes'], projectDir)
  await exec('node', [join(SCRIPT_DIR, 'seed-local-admin.mjs')], projectDir)
}
```

```js
import { runLocalSupabaseSetup } from './local-supabase-setup-core.mjs'

runLocalSupabaseSetup({ projectDir: process.cwd() }).catch((error) => {
  console.error('[local:supabase:setup] failed')

  if (error instanceof Error && error.message === 'local-supabase-cli-missing') {
    console.error(
      '未找到 Supabase CLI。请先执行 npm run local:supabase:install-cli，或自行安装系统级 Supabase CLI。',
    )
    process.exit(1)
  }

  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
```

```gitignore
.tools/
```

````md
## 本地 Supabase Docker 联调

### 第一步：安装本地 Supabase CLI

在 `apps/web` 目录下执行：

```bash
npm run local:supabase:install-cli
```

如果需要覆盖默认下载源，可先设置：

```bash
SUPABASE_CLI_DOWNLOAD_BASE_URL=https://your-mirror.example.com/supabase/cli/releases/download
```

### 第二步：初始化本地 Supabase

```bash
npm run local:supabase:setup
```

这条命令会优先使用仓库 `.tools` 里的 CLI；如果仓库内没有，再回退系统 `PATH`。
````

- [ ] **Step 4: 跑自动化回归**

Run: `npm run lint`  
Expected: PASS

Run: `npm run test:run -- --maxWorkers=1`  
Expected: PASS

Run: `npm run build`  
Expected: PASS

- [ ] **Step 5: 做一次本地 CLI 流程验证**

Run: `npm run local:supabase:install-cli`  
Expected: `.tools/supabase/<platform>/` 下出现对应 CLI 和 `.version`

Run: `npm run local:supabase:setup`  
Expected: setup 优先使用 `.tools` 下的 CLI，`.env.local` 更新成功，本地管理员 seed 成功

- [ ] **Step 6: 提交这一批**

```bash
git add .gitignore apps/web/scripts/local-supabase-setup-core.mjs apps/web/scripts/local-supabase-setup-core.test.ts apps/web/scripts/local-supabase-setup.mjs apps/web/README.md
git commit -m "feat: use portable supabase cli in local setup"
```

## Self-Review Checklist

- 规格覆盖：
  - 固定版本、多平台、`.tools` 优先、系统 PATH 回退、下载源覆盖、README 和错误提示，都在 Task 1-3 中有落点。
- 占位检查：
  - 没有 `TODO`、`TBD` 或“类似 Task N”。
- 类型一致性：
  - 统一使用 `resolveSupabaseCliExecutable`、`installSupabaseCli`、`SUPABASE_CLI_VERSION` 这组命名。
