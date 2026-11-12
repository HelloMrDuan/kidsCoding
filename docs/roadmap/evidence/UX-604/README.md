# UX-604 Python 通用页面 V2 视觉整改 · 三端截图证据

Task-ID: UX-604。PR #517（分支 muse-c/ux-604-python-v2，头 00c0a9d1，基底主线 115980d8）。
本文记录**本地真实 Chrome** 的截图结果。GitHub Actions 的结果以 PR 页面为准，两者不能互相代替。

## 一、截图

| 文件 | 视口 | 课节 | 内容 |
|---|---|---|---|
| ux-604-desktop-1440x900.png | 1440x900 | P0-U1-L02《让程序自我介绍》 | V2 深蓝导航壳、中性 canvas 内容区、科技蓝主操作、深蓝代码编辑器 |
| ux-604-tablet-768x1024.png | 768x1024 | 同上 | 同上，平板布局 |
| ux-604-phone-375x812.png | 375x812 | 同上 | 顶栏 + 白色卡片 + 底部 tab，无横向溢出 |

三端横向溢出均为 0（`document.documentElement.scrollWidth - clientWidth == 0`）。
P0-U1-L02 为主线代表课节（P3-U1-L01 只在 #243 分支，不在本 PR 分支内）。

## 二、运行环境与限制（如实）

- 浏览器：Chrome for Testing 145.0.7632.6（本地 `~/workspace/p3-u1-l01-evidence/cft/`），headless=new，`--no-sandbox`。
- 服务：本地生产构建 `npm run build && npm run start`（127.0.0.1:3100）。
- L06 名片预览（violet 渐变 → 白底 + line 边框）只在全部测试通过后渲染；本地执行需从 CDN 加载 Pyodide，VM 浏览器经认证 egress 代理无法访问外网，故本地无实拍。改动为 class 映射（已逐行核对），视觉验证由 CI 的 python-browser-trial 执行用例覆盖。
- 真实设备、儿童试学、独立人工教研：没有做，不宣称。

## 三、对照（与整改前）

- 整改前：绿渐变背景（#eafbf1→#edf6ff→#fff2dc）、emerald 主操作、sky 反馈面板、violet 渐变预览、amber 提示、slate-950 编辑器。
- 整改后：中性 canvas 底（--kc-canvas #f3f6fb）、科技蓝主操作（--kc-action #2463eb）、中性信息区（canvas + --kc-line 边框）、白底名片预览、--kc-warning 提示、原型深蓝编辑器（#1b2538 / #b2c8e1）。
- 完整映射：`hidden_files/ux-604-v2-mapping-2026-11-12.md`（目标仓库外记录，不在 PR 内）。
