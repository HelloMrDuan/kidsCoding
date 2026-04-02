import { promises as fs } from 'node:fs'
import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { promisify } from 'node:util'

import {
  buildLocalSupabaseValues,
  parseSupabaseStatusEnv,
  upsertLocalSupabaseBlock,
} from './local-supabase-env.mjs'

const execFileAsync = promisify(execFile)

export function resolveExecInvocation(
  command,
  args,
  platform = process.platform,
) {
  if (command === 'supabase') {
    return {
      file: platform === 'win32' ? 'supabase.exe' : 'supabase',
      args,
    }
  }

  return {
    file: command,
    args,
  }
}

async function defaultExec(command, args, cwd) {
  const invocation = resolveExecInvocation(command, args)

  try {
    return await execFileAsync(invocation.file, invocation.args, { cwd })
  } catch (error) {
    if (command === 'supabase' && error instanceof Error && 'code' in error) {
      if (error.code === 'ENOENT') {
        throw new Error('local-supabase-cli-missing')
      }
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
  writeEnv = defaultWriteEnv,
}) {
  await exec('supabase', ['start'], projectDir)

  const status = await exec('supabase', ['status', '-o', 'env'], projectDir)
  const values = buildLocalSupabaseValues(parseSupabaseStatusEnv(status.stdout))
  const envPath = join(projectDir, '.env.local')

  await writeEnv(envPath, values)
  await exec('supabase', ['db', 'reset', '--yes'], projectDir)
  await exec('node', ['./scripts/seed-local-admin.mjs'], projectDir)
}
