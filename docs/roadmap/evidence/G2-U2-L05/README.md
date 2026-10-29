# G2-U2-L05 两只精灵同步表演 — 三断点 Chrome 截图（Hark B）

Task-ID：`G2-U2-L05`。路由 `/learn/scratch-lab/G2-U2-L05`，页面为课程初始作品（含本课故意的 bug：小白兔在听“谢幕”，舞台广播的是“开演”），点绿旗约 1.2 秒后截图，此时 VM 正在运行：舞台已广播“开演”、开演铃播放 1 次、小狐狸已上台（x -60）并说“我是小狐狸！”，小白兔留在右侧后台（x 200）。

## 采集方式（2026-10-29，本地 sandbox）

- 浏览器：Playwright 1.58 chromium-headless-shell（arm64 sandbox 无 Google Chrome 品牌版；与 CI 的 Chromium 内核相同），`deviceScaleFactor 1`，`locale zh-CN`。
- 服务：本地 `next build && next start`（L05 本地分支树）。scratch-vm@5.0.300 / scratch-storage@4.0.0 用与 jsDelivr 相同版本的本地副本（E2E 的 `SCRATCH_VM_LOCAL_CDN` 同款路由）。
- 字体：sandbox 默认无中文字体，手动装入 Noto Sans CJK 后截图。
- JPEG 内嵌到同名 `.svg`（与 `evidence/G2-U2-L03`、`evidence/G2-U2-L04` 相同约定）。

| 文件 | 视口 | 横向溢出 | pageerror |
|---|---|---|---|
| `lab-1440.svg` | 1440×900（首屏，绿旗后自动滚到舞台） | 0 | 无 |
| `lab-768.svg` | 768×1024 | 0 | 无 |
| `lab-375.svg` | 375×812 | 0 | 无 |
| `lab-375-full.svg` | 375 宽整页（5520 px 高；整页拼接时固定顶栏/底栏会出现在中间，属截图方式所致） | 0 | 无 |

## 观察（AI 自查，不等于视觉验收）

- 舞台、按钮组、VM 实时观察、任务卡、提示、角色区、积木区、复盘在三断点均可见，无横向滚动。
- 截图时广播仍在进行中，“同步表演”观察行要等本次绿旗全部脚本结束才更新，所以仍显示“还没有点绿旗”；广播行已显示“开演”与已开口的小狐狸。
- 小白兔后台位置（x 200）靠近舞台右侧幕布，图形部分压在幕布上。
- 实验室沿用现有 G2 Scratch 实验室配色，本课未改视觉；是否符合 V2 VISUAL-LOCK 的 Scratch 实验室靛紫体系，需 Muse / 视觉审核按 V2 核查，本截图仅为证据，不构成视觉验收。
