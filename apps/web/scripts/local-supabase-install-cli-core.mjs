import { execFile } from 'node:child_process'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import { promises as fs } from 'node:fs'

import {
  SUPABASE_CLI_VERSION,
  getSupabaseCliBinaryPath,
  getSupabaseCliTarget,
  getSupabaseCliVersionFile,
} from './local-supabase-cli.mjs'

const execFileAsync = promisify(execFile)

export function buildSupabaseCliDownloadUrl({
  version,
  assetName,
  baseUrl = process.env.SUPABASE_CLI_DOWNLOAD_BASE_URL ??
    'https://github.com/supabase/cli/releases/download',
}) {
  return `${baseUrl.replace(/\/$/, '')}/v${version}/${assetName}`
}

export function getSupabaseCliTempRoot(repoRoot) {
  return join(repoRoot, '.tools', '.tmp')
}

async function defaultExec(command, args) {
  return execFileAsync(command, args)
}

export async function downloadSupabaseCliArchive({
  url,
  archivePath,
  exec = defaultExec,
  platform = process.platform,
}) {
  const curlCommand = platform === 'win32' ? 'curl.exe' : 'curl'

  await exec(curlCommand, [
    '-L',
    '--fail',
    '--silent',
    '--show-error',
    '-o',
    archivePath,
    url,
  ])
}

async function defaultExtract(archivePath, extractDir) {
  await execFileAsync('tar', ['-xzf', archivePath, '-C', extractDir])
}

async function defaultExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function findBinary(rootDir, binaryName) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true })

  for (const entry of entries) {
    const entryPath = join(rootDir, entry.name)

    if (entry.isFile() && entry.name === binaryName) {
      return entryPath
    }

    if (entry.isDirectory()) {
      const nested = await findBinary(entryPath, binaryName)

      if (nested) {
        return nested
      }
    }
  }

  return null
}

export async function installSupabaseCli({
  repoRoot,
  platform = process.platform,
  arch = process.arch,
  exists = defaultExists,
  readText = (filePath) => fs.readFile(filePath, 'utf8'),
  writeText = (filePath, value) => fs.writeFile(filePath, value, 'utf8'),
  ensureDir = (dirPath) => fs.mkdir(dirPath, { recursive: true }),
  copyFile = (source, target) => fs.copyFile(source, target),
  chmod = (filePath, mode) => fs.chmod(filePath, mode),
  remove = (filePath) => fs.rm(filePath, { recursive: true, force: true }),
  download = (url, archivePath) => downloadSupabaseCliArchive({ url, archivePath }),
  extract = defaultExtract,
}) {
  const target = getSupabaseCliTarget(platform, arch)
  const binaryPath = getSupabaseCliBinaryPath(repoRoot, target)
  const versionFile = getSupabaseCliVersionFile(repoRoot, target)
  const installedVersion = await readText(versionFile).catch(() => '')

  if (installedVersion.trim() === SUPABASE_CLI_VERSION && await exists(binaryPath)) {
    return {
      binaryPath,
      skipped: true,
      version: SUPABASE_CLI_VERSION,
    }
  }

  const tempRoot = getSupabaseCliTempRoot(repoRoot)
  await ensureDir(tempRoot)
  const tempDir = await fs.mkdtemp(join(tempRoot, 'kids-coding-supabase-cli-'))
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

    const extractedBinary = await findBinary(extractDir, target.binaryName)

    if (!extractedBinary) {
      throw new Error(`local-supabase-cli-binary-missing:${target.binaryName}`)
    }

    await copyFile(extractedBinary, binaryPath)

    if (target.binaryName === 'supabase') {
      await chmod(binaryPath, 0o755)
    }

    await writeText(versionFile, `${SUPABASE_CLI_VERSION}\n`)

    return {
      binaryPath,
      skipped: false,
      version: SUPABASE_CLI_VERSION,
    }
  } finally {
    await remove(tempDir)
  }
}
