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
const NPX_BIN = process.platform === 'win32' ? 'npx.cmd' : 'npx'

async function defaultExec(command, args, cwd) {
  if (command === 'supabase') {
    return execFileAsync(NPX_BIN, ['supabase', ...args], { cwd })
  }

  return execFileAsync(command, args, { cwd })
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
}
