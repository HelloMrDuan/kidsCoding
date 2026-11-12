# UX-604 Python 通用页面 V2 视觉整改 · 三端截图证据

Task-ID: UX-604。PR #517（分支 muse-c/ux-604-python-v2，头 00c0a9d1，基底主线 115980d8）。
本文记录**本地真实 Chrome** 的截图结果。GitHub Actions 的结果以 PR 页面为准，两者不能互相代替。

## 一、截图

| 文件 | 视口 | 课节 | 内容 |
|---|---|---|---|
| ux-604-desktop-1440x900.png | 1440x900 | P0-U1-L02《让程序自我介绍》 | V2 深蓝导航壳、中性 canvas 内容区、科技蓝主操作、深蓝代码编辑器 |
| ux-604-tablet-768x1024.png | 768x1024 | 同上 | 同上，平板布局 |
| ux-604-phone-375x812.png | 375x812 | 同上 | 顶栏 + 白色卡片 + 底部 tab，无横向溢出 |
| p3-u1-l02-desktop-1440.png | 1440x900 | P3-U1-L02《制作CSV记账表》 | 同一套 V2 外壳与组件：白底卡片、深蓝编辑器、科技蓝主操作，横向溢出 0 |
| p3-u1-l03-desktop-1440.png | 1440x900 | P3-U1-L03《JSON通讯录》 | 同上，横向溢出 0 |
| p3-u2-l02-desktop-1440.png | 1440x900 | P3-U2-L02《天气数据折线图》 | 同上，横向溢出 0 |

三端横向溢出均为 0（`document.documentElement.scrollWidth - clientWidth == 0`）。
P0-U1-L02 为主线代表课节（P3-U1-L01 只在 #243 分支，不在本 PR 分支内）。
P3 三张为 2026-11-12 补拍：此前 python-browser-trial 的 11 个用例只覆盖 P0 课节（见下节），三节 P3 课无浏览器回归证据；现补 3 个 E2E 用例（见 `tests/e2e/python-multi.spec.ts` 新增部分）+ 本地加载/编辑/布局实测与截图。

## 二、P3 回归覆盖（2026-11-12 补，回应主 Muse 指正）

- 旧口径错误：正文曾写“主线 8 课回归全过（11 用例）”与“python-browser-trial（16 用例）”。事实：`python-multi.spec.ts` 原有 7 个用例只访问 P0-U1-L02/L03/L04/L05/L06；`python-lab.spec.ts` 的 4 个用例只访问 P0-U1-L01（单题实验室页，不走本次改动的共用多题页）。三节 P3 课（P3-U1-L02、P3-U1-L03、P3-U2-L02）此前零浏览器 E2E 覆盖；16 是 #243 分支的用例数，不是本 PR 的。
- 补齐：`python-multi.spec.ts` 新增 3 个用例（与 P0 用例同一模式：加载 → 先跑初始代码得 0/N → 填入正确解法 → 运行得 N/N → 核对一条真实输出 → 确认本地保存文案）。解法已用本地 Python 按 `gradeMultiCases` 的精确字符串比较逐条核对全部用例（P3-U1-L02 4/4、P3-U1-L03 4/4、P3-U2-L02 5/5）。
- 本地实测（生产构建 + Chrome for Testing 145，1440x900）：三页标题正常渲染、运行按钮存在（本地 Pyodide 无法加载故为禁用态，属已知环境限制，执行证据以 CI 为准）、编辑器可填入、横向溢出均为 0；截图见上表。
- CI 证据：新头 python-browser-trial 应为 14 个用例（原 11 + 新增 3），以作业日志为准，不再沿用 11/16 旧数。

## 二、运行环境与限制（如实）

- 浏览器：Chrome for Testing 145.0.7632.6（本地 `~/workspace/p3-u1-l01-evidence/cft/`），headless=new，`--no-sandbox`。
- 服务：本地生产构建 `npm run build && npm run start`（127.0.0.1:3100）。
- L06 名片预览（violet 渐变 → 白底 + line 边框）只在全部测试通过后渲染；本地执行需从 CDN 加载 Pyodide，VM 浏览器经认证 egress 代理无法访问外网，故本地无实拍。改动为 class 映射（已逐行核对），视觉验证由 CI 的 python-browser-trial 执行用例覆盖。
- 真实设备、儿童试学、独立人工教研：没有做，不宣称。

## 三、对照（与整改前）

- 整改前：绿渐变背景（#eafbf1→#edf6ff→#fff2dc）、emerald 主操作、sky 反馈面板、violet 渐变预览、amber 提示、slate-950 编辑器。
- 整改后：中性 canvas 底（--kc-canvas #f3f6fb）、科技蓝主操作（--kc-action #2463eb）、中性信息区（canvas + --kc-line 边框）、白底名片预览、--kc-warning 提示、原型深蓝编辑器（#1b2538 / #b2c8e1）。
- 完整映射：`hidden_files/ux-604-v2-mapping-2026-11-12.md`（目标仓库外记录，不在 PR 内）。
