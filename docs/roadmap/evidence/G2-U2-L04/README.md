# G2-U2-L04 循环飞舞的蝴蝶 — 三断点 Chrome 截图（Hark B）

Task-ID：`G2-U2-L04`。路由 `/learn/scratch-lab/G2-U2-L04`，页面为课程初始作品（含本课故意的 bug：重复 6 次 × 右转 45 度 = 270 度，不满一圈），点绿旗约 4.2 秒后截图，此时 VM 已跑完：观察区显示“一共右转 270 度（0.75 圈，不是整圈），扇了 6 下翅膀；最后在 x -88 · y -8，离起点 74 步，面向 0 度。没有回到起点”。

## 采集方式（2026-10-29，本地 sandbox）

- 浏览器：Playwright 1.58 chromium-headless-shell（arm64 sandbox 无 Google Chrome 品牌版；与 CI 的 Chromium 内核相同），`deviceScaleFactor 1`，`locale zh-CN`。
- 服务：本地 `next build && next start`（L04 分支树）。scratch-vm@5.0.300 / scratch-storage@4.0.0 用与 jsDelivr 相同版本的本地副本（E2E 的 `SCRATCH_VM_LOCAL_CDN` 同款路由）。
- 字体：sandbox 默认无中文字体，手动装入 Noto Sans CJK 后截图。
- JPEG 内嵌到同名 `.svg`（与 `evidence/G0-U2-L05`、`evidence/G2-U2-L03` 相同约定）。

| 文件 | 视口 | 横向溢出 | pageerror |
|---|---|---|---|
| `lab-1440.svg` | 1440×900（首屏，绿旗后自动滚到舞台） | 0 | 无 |
| `lab-768.svg` | 768×1024 | 0 | 无 |
| `lab-375.svg` | 375×812 | 0 | 无 |
| `lab-375-full.svg` | 375 宽整页（5572 px 高；整页拼接时固定顶栏/底栏会出现在中间，属截图方式所致） | 0 | 无 |

## 观察（AI 自查，不等于视觉验收）

- 舞台、按钮组、VM 实时观察、任务卡、提示、角色区、积木区、复盘在三断点均可见，无横向滚动。
- 蝴蝶停在半路时“我飞回花朵啦！”气泡与装饰花朵部分重叠（气泡位置跟随 VM 坐标，属本课 bug 状态下的画面）。
- 375 宽时 Blockly 积木区较窄，积木需横向拖动查看；按钮换行。
- 实验室沿用现有 G2 Scratch 实验室配色，本 PR 未改视觉；是否符合 V2 VISUAL-LOCK 的 Scratch 实验室靛紫体系，需 Muse / 视觉审核按 V2 核查，本截图仅为证据，不构成视觉验收。
