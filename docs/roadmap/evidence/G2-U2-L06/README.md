# G2-U2-L06 音乐动画短片 — 三断点 Chrome 截图（Hark B）

Task-ID：`G2-U2-L06`。路由 `/learn/scratch-lab/G2-U2-L06`，页面为课程初始作品（含本课故意的 bug：小橘猫结尾用“停止 这个脚本”；另外猫换帧等待 0.3 秒、鼓等待 0.5 秒，音画不同步），点绿旗约 11.5 秒后截图：此时 VM 已依次广播“开头”“中段”“结尾”（2 秒 + 6 秒），背景已换成“谢幕”，小橘猫说完“谢谢观看！”并执行了“停止 这个脚本”，但猫的换帧循环和小鼓的鼓点循环仍在 VM 里运行（观察区显示结尾后还换了 4 帧、响了 2 下鼓）。

## 采集方式（2026-10-29，本地 sandbox）

- 浏览器：Playwright 1.58 chromium-headless-shell（arm64 sandbox 无 Google Chrome 品牌版；与 CI 的 Chromium 内核相同），`deviceScaleFactor 1`，`locale zh-CN`。
- 服务：本地 `next build && next start`（L06 本地分支树）。scratch-vm@5.0.300 / scratch-storage@4.0.0 用与 jsDelivr 相同版本的本地副本（E2E 的 `SCRATCH_VM_LOCAL_CDN` 同款路由）。
- 字体：sandbox 默认无中文字体，手动装入 Noto Sans CJK 后截图。
- JPEG 内嵌到同名 `.svg`（与 `evidence/G2-U2-L03`～`L05` 相同约定）。

| 文件 | 视口 | 横向溢出 | pageerror |
|---|---|---|---|
| `lab-1440.svg` | 1440×900（首屏，绿旗后自动滚到舞台） | 0 | 无 |
| `lab-768.svg` | 768×1024 | 0 | 无 |
| `lab-375.svg` | 375×812 | 0 | 无 |
| `lab-375-full.svg` | 375 宽整页（6102 px 高；整页拼接时固定顶栏/底栏会出现在中间，属截图方式所致） | 0 | 无 |

## 观察（AI 自查，不等于视觉验收）

- 舞台、按钮组、VM 实时观察（含“短片”观察行：三幕时长、中段帧数/鼓点数/踩点帧数、结尾后是否仍有循环）、任务卡、提示、角色区、积木区、复盘在三断点均可见，无横向滚动。
- 375 宽时按钮组折成多行，与 L01～L05 相同。
- 实验室沿用现有 G2 Scratch 实验室配色，本课未改视觉；是否符合 V2 VISUAL-LOCK 的 Scratch 实验室靛紫体系，需 Muse / 视觉审核按 V2 核查，本截图仅为证据，不构成视觉验收。
