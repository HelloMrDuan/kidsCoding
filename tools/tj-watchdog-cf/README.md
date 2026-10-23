# Tianji watchdog — tj-core-01

New Cloudflare Worker **tj-watchdog**, independent of the existing **instabox-watchdog** for KidsCoding.
This reuses the existing src/api.mjs and lifecycle state/retry/orchestration behaviour. No action is taken against the old machine.

## Prerequisites
* Set `MACHINE_ID` in wrangler.toml to the actual **tj-core-01** ID returned by InstaBox (`m_...`). The machine name is NOT its ID.
* Create a **new** Workers KV namespace and set its ID in wrangler.toml (do NOT reuse KidsCoding WATCHDOG_KV).
* Cloudflare **tj-watchdog** already has an `INSTABOX_API_KEY` production secret. Do NOT commit or reenter it. Verify after deploying.
* Initially `TIANJI_DEPLOYED="false"`: checks machine lifecycle only; `running` -> APP_PENDING; suspended -> bounded Resume -> APP_PENDING. No app health is claimed. When Tianji is actually deployed, set `TIANJI_DEPLOYED="true"` and redeploy.

## Deploy (PowerShell)
```powershell
Set-Location "D:\\programs\\kidsCoding-cf-deploy"
git pull --ff-only
Set-Location ".\\tools\\tj-watchdog-cf"
npm install
npm test
npx wrangler kv namespace create WATCHDOG_KV
# Paste the NEW namespace ID and the ACTUAL tj-core-01 Machine ID in wrangler.toml:
notepad .\\wrangler.toml
npx wrangler deploy
```

The existing Cloudflare Worker `tj-watchdog` is updated in place. Existing `INSTABOX_API_KEY` secret is retained, unless you explicitly remove it. Cron: `5,15,25,35,45,55 * * * *` UTC (every 10 min, staggered from KidsCoding).

## Safety
- Only `suspended` is resumed. `stopped` is never resumed.
- Resume attempts are limited to 2 per suspended episode; auth/capacity/operation errors are explicit.
- KV persistence is *not a distributed atomic lock*. Cross-run overlap may still occur; the InstaBox operation conflict response is part of collision handling. Never describe the KV check as a strong lock.
- Anonymous `POST /run` is forbidden; without `RUN_TOKEN` it returns 403. The public `GET /status` contains coarse monitoring history; monitor exposure before adding sensitive data.
- Cloudflare errors go into logs/status; a log is not itself a delivered alert. The Muse backup task must separately check `/status` and notify the owner.
- Natural `suspended -> resume` remains UNTESTED until a real event is observed.
- Set `WATCHDOG_HOLD="true"` during planned maintenance to prevent wakeups; remember this is not a secret.

## Verification
1. `npm test` must pass (including no old machine ID/no KidsCoding, APP_PENDING, stopped, resuming, auth failure, capacity).
2. Inspect the Cloudflare binding and machine ID; `/status` may say "no runs recorded yet" before the first cron event.
3. Confirm `/status` shows advancing `lastRunAt`, with `lastVerdict=APP_PENDING` and `lastMachineState=running` before app migration; check logs for `trigger=cron`. Do not count manual runs as cron evidence.
4. After Tianji deployment, switch `TIANJI_DEPLOYED=true` and require 8080/health + API/Web containers Up + consistent version tokens before accepting OK.
5. Keep existing Cloudflare `instabox-watchdog` and Muse KidsCoding backup unchanged.
