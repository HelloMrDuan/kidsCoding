import nextEnv from '@next/env'

import { createEnvCheckReport, printEnvCheckReport } from './env-check-core.mjs'

const { loadEnvConfig } = nextEnv

const modeArg = process.argv.find((arg) => arg.startsWith('--mode=')) ?? ''
const mode = modeArg === '--mode=production' ? 'production' : 'development'

loadEnvConfig(process.cwd())

const report = createEnvCheckReport({
  env: process.env,
  mode,
})

printEnvCheckReport(report)

if (mode === 'production' && report.summary.failCount > 0) {
  process.exit(1)
}
