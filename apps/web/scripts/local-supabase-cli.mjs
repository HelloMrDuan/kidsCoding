import { constants } from 'node:fs'
import { access } from 'node:fs/promises'
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
