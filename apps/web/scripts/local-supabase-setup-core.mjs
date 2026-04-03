import { promises as fs } from 'node:fs'
import { execFile } from 'node:child_process'
import { basename, join } from 'node:path'
import { promisify } from 'node:util'

import {
  buildLocalSupabaseValues,
  parseSupabaseStatusEnv,
  upsertLocalSupabaseBlock,
} from './local-supabase-env.mjs'
import { resolveSupabaseCliExecutable } from './local-supabase-cli.mjs'

const execFileAsync = promisify(execFile)
const LOCAL_NO_PROXY_HOSTS = ['127.0.0.1', 'localhost']

export function buildLocalSupabaseExecEnv(baseEnv = process.env) {
  const mergedEntries = [...LOCAL_NO_PROXY_HOSTS]
  const existing = `${baseEnv.NO_PROXY ?? ''},${baseEnv.no_proxy ?? ''}`
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

  for (const entry of existing) {
    if (!mergedEntries.includes(entry)) {
      mergedEntries.push(entry)
    }
  }

  const noProxy = mergedEntries.join(',')

  return {
    ...baseEnv,
    NO_PROXY: noProxy,
    no_proxy: noProxy,
  }
}

export function getLocalSupabaseKongContainerName(projectDir) {
  return `supabase_kong_${basename(projectDir)}`
}

export function isLocalSupabaseStorageRestartTimeout(error) {
  if (!(error instanceof Error)) {
    return false
  }

  return error.message.includes('storage/v1/bucket') && (
    error.message.includes('Client.Timeout exceeded while awaiting headers') ||
    error.message.includes('request canceled')
  )
}

async function sleep(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function fetchWithTimeout(fetchImpl, url, init, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetchImpl(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

export async function waitForLocalStorageApi({
  values,
  fetchImpl = fetch,
  attempts = 30,
  requestTimeoutMs = 3_000,
  sleepImpl = sleep,
}) {
  const url = `${values.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/bucket`
  let lastError = null

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(fetchImpl, url, {
        headers: {
          apikey: values.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${values.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }, requestTimeoutMs)

      if (response.ok) {
        return
      }

      lastError = new Error(`local-supabase-storage-status:${response.status}`)
    } catch (error) {
      lastError = error
    }

    await sleepImpl(1_000)
  }

  throw lastError ?? new Error('local-supabase-storage-timeout')
}

export async function recoverLocalSupabaseAfterDbReset({
  exec = defaultExec,
  projectDir,
  values,
  waitForStorage = waitForLocalStorageApi,
}) {
  await exec('docker', ['restart', getLocalSupabaseKongContainerName(projectDir)], projectDir)
  await waitForStorage({ values })
}

async function defaultExec(command, args, cwd, options = {}) {
  try {
    return await execFileAsync(command, args, {
      cwd,
      env: options.env ?? buildLocalSupabaseExecEnv(),
    })
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error('local-supabase-cli-missing')
    }

    throw error
  }
}

async function defaultWriteEnv(envPath, values) {
  const current = await fs.readFile(envPath, 'utf8').catch(() => '')

  await fs.writeFile(envPath, upsertLocalSupabaseBlock(current, values), 'utf8')
}

export async function runLocalSupabaseSetup({
  exec = defaultExec,
  projectDir,
  recoverAfterDbResetFailure = recoverLocalSupabaseAfterDbReset,
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
  try {
    await exec(cli.file, ['db', 'reset', '--yes'], projectDir)
  } catch (error) {
    if (!isLocalSupabaseStorageRestartTimeout(error)) {
      throw error
    }

    await recoverAfterDbResetFailure({
      exec,
      projectDir,
      values,
    })
  }

  await exec('node', ['./scripts/seed-local-admin.mjs'], projectDir, {
    env: {
      ...buildLocalSupabaseExecEnv(),
      ...values,
    },
  })
}
