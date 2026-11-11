# G2-U3-L04 方案 A 可行性验证（spike）：scratch-render + 真实 VM 的 touching

状态：**spike 结论为可行（有条件）**，尚未接正式课程。分支 `kiro/p0-g2-u3-l04`，独立于 #494。
首席裁定（方案 A）：保留「碰到篮子才得分」，用真实 `sensing_touchingobject` + `control_if`；不改成坐标算法，不模拟 VM 的碰撞返回值；先做最小可复现验证，不修改 L02 / L03 沙箱，不把渲染器全局推广。

## 一、结论

在**受限 iframe 沙箱**里，用**本地、固定版本**的 `scratch-render@2.2.84`，通过真实 Scratch VM 的 `attachRenderer`，真实的 `sensing_touchingobject` 可以正确判定：角色相交时返回 `true`，分离时返回 `false`；「碰到才加分」「同一目标不重复计分」都在真实 VM 里成立。没有外部网络依赖，沙箱权限比 L02 沙箱只多一条 `img-src data:`。

**但有两个硬性前提**，不满足时 touching 会静默地判错（不报错）：

1. **必须等造型就绪再点绿旗。** SVG 造型在渲染器里是异步转成位图的。转完之前角色的包围盒是占位值（比真实尺寸大 1 像素，且偏在左上象限），此时 touching 判不到。本 spike 的 `waitForSkins()` 用「包围盒宽高等于造型真实尺寸」做判据（与位置无关），带 2 秒超时，超时就报错而不是静默继续。实测就绪用时 13～14ms。
2. **必须设置 `vm.runtime.currentStepTime` 再 `_step()`。** 否则线程调度器一个线程都不前进（线程活着、积木一次都不被调用）。L02 / L03 沙箱本来就这样做；spike 第一版漏了它，表现为 `touchingDirect=true` 但得分 0、线程 12 步不结束。

## 二、验证项与结果（真实 Chromium，本地）

`apps/web/tests/e2e/g2-u3-l04-renderer-spike.spec.ts`：共 18 个实例，18 通过 / 0 失败 / 0 跳过（JUnit 核对）：1 个版本守卫 + 10 个相交 / 分离用例 + 4 个安全与释放用例 + 1 个「三端一致」用例在 3 个视口各跑一次。

| 首席要求的验证项 | 做法 | 结果 |
|---|---|---|
| 通过 `attachRenderer` 使用真实渲染器 | 沙箱里 `new ScratchRender(canvas)` + `vm.attachRenderer(renderer)`，断言 `vm.runtime.renderer` 存在 | 通过 |
| 对照：为什么需要渲染器 | 同一工程不挂渲染器，两个角色完全重叠 | 真实积木被调用 1 次，返回 `false`，得分 0（与上一轮探针一致） |
| 相交 → `touching=true` | 完全重叠；球与篮子重叠 1 像素 | 真实积木返回 `true`，得分 1，脚本自然结束 |
| 分离 → `touching=false` | 球在篮子右、左、上、下各 100 像素以外 | 四个方向都 `false`，得分 0 |
| 「碰到才加分」 | 同一程序只改位置：相交得 1 分，分离得 0 分 | 通过 |
| 「同一目标不重复计分」 | 球脚本循环检测 3 次：不隐藏 → 3 分（目录里的失败情形）；得分后 `looks_hide` → 1 分，且球不可见 | 通过 |
| 无外部网络依赖 | 沙箱内主动发起 `fetch` / `XMLHttpRequest` / `Image` / `WebSocket` 到外部地址 | 四种全部被 CSP 拒绝 |
| 运行时没有多余请求 | 宿主服务器记录所有请求 | 只有 `host.html`、沙箱页、`scratch-vm.js`、`scratch-storage.min.js`、`scratch-render.js` 五个路径 |
| 沙箱权限不扩大 | iframe `sandbox="allow-scripts"`（无 same-origin）；CSP 与 L02 逐字比较 | 与 L02 的 CSP **只差 `img-src data:`**；沙箱内读 `localStorage` 抛 `SecurityError`；CSP 不含 `http(s):`、`blob:`、通配 |
| 资源正确释放 | `dispose()` 后检查 | 引用清空；WebGL 上下文确实丢失（`isContextLost()` 为 `true`）；`<canvas>` 全部移除；连续运行 12 次不累积 canvas |
| 三端兼容 | 1440 / 768（触摸）/ 375（触摸、移动）视口 | 三端结果一致 |
| 真实 WebGL | 渲染器在 Chromium 里创建上下文并绘制 | 通过；上下文是 **WebGL1**，不是 WebGL2 |

## 三、测试自身的可信度（变异检验）

为证明这些断言不是「怎么都过」，对 spike 沙箱页做了 12 个有效变异，**12 / 12 被测试发现**：不设 `currentStepTime`、不等造型就绪、dispose 不丢 WebGL 上下文、dispose 不移除 canvas、dispose 不清引用、不 `attachRenderer`、球脚本忽略 touching、collect 不隐藏，以及 CSP 的四种放宽（`connect-src`、`img-src`、`default-src`、`script-src` 放到 `https:`）。

过程中如实记录两个我自己的失误（均已修正，没有放宽任何断言）：
- 第一版就绪判据写成「包围盒跨过 x=0」，只对中心在原点的角色成立，导致其余位置全部超时。超时报错的设计让它立刻暴露；改为与位置无关的「宽高等于造型尺寸」。
- 资源释放测试发现 `dispose` 后仍有 1 个 `<canvas>`，原因是页面里遗留了一个静态 `<canvas>`。删掉遗留物，而不是放宽断言。
- 变异脚本里最初有 2 个 CSP 变异「存活」，原因是脚本替换命中了页面头部注释里的同名字符串，并没有真的改到 CSP。手工复现确认测试能发现真实的 CSP 变异，之后把变异改为精确命中 `<meta>`。

## 四、真实行为记录（课程设计必须以此为准）

- **相切也算碰到。** 球的左边缘恰好等于篮子的右边缘（相差 0 像素）时 touching 为 `true`。原因：渲染器的包围盒做了 `snapToInt`（向外取整），边界像素也参与逐像素检测。正式课程的边界案例和判定不能想当然地认为「刚好挨着不算碰到」。
- touching 是 **CPU 端逐像素**检测（读 skin 的轮廓遮罩），不是 GPU 读像素。所以与 WebGL 驱动无关，但依赖 skin 已就绪。
- 渲染器创建的是 WebGL1 上下文。

## 五、代价与风险（决定要不要接正式课程）

| 项 | 事实 |
|---|---|
| 新增资源 | `scratch-render.js` 约 3.0MB，gzip 后约 0.96MB（VM 本身 7.4MB / gzip 3.1MB）。**只有 L04 沙箱页会加载它**，其他课程不受影响。 |
| 依赖 | `scratch-render@2.2.84` 已在 `package-lock.json` 中固定，是 `scratch-vm` 的传递依赖（`^2.0.0`），**不是** `package.json` 的直接依赖。spike 的复制脚本会核对安装版本和锁文件版本都等于 2.2.84，不符就失败。接正式课程时建议在 `package.json` 里显式固定为直接依赖。 |
| 许可证 | AGPL-3.0-only，与已使用的 scratch-vm、scratch-storage 一致。 |
| 提供方式 | spike 的测试宿主**直接从 `node_modules/scratch-render/dist/web/` 提供** `scratch-render.js`，不经过 `public/`，也**没有改**共享的 `copy-scratch-vm.mjs`。测试里有版本守卫：安装版本与锁文件版本都必须等于 2.2.84，否则失败。 |
| CSP | 比 L02 只多 `img-src data:`。正式沙箱建议保持同样的最小集合，不开放 `blob:` / 外部来源。 |
| 内存 | 每次运行新建渲染器与 WebGL 上下文，运行结束必须 `dispose`（含 `WEBGL_lose_context`）。已验证连续 12 次运行不累积，但**没有测量过内存峰值**。 |

## 六、没有验证的（不能宣称）

- **真实 Chrome 稳定版**：本地是 npm 的 Chromium。WebGL 在 CI 的 Chrome（无头、软件光栅）上是否稳定**还没有验证**，需要在 CI 里跑过才算数。这是进入正式课程前必须补的一项。
- **真实设备**（手机、平板的 GPU / 触摸）：没有。视口是 Playwright 模拟。
- **Safari / Firefox**：没有。
- **多角色、克隆体、更大舞台**下 touching 的性能：只测了 2 个角色。L04 正式课程若有「多个小球」需要补。
- **内存峰值与低端设备**：没有测。
- 本 spike 只证明**机制可行**，没有做 L04 的教学方案、四关、判定、UI，也没有接共享壳。

## 七、复现

```
cd apps/web
node scripts/copy-scratch-vm.mjs              # 既有脚本：复制 scratch-vm / scratch-storage
npx playwright test tests/e2e/g2-u3-l04-renderer-spike.spec.ts --project=desktop
node ../../docs/curriculum/g2-u3-l04/probe-touch-without-renderer.cjs   # 无渲染器对照探针（Node）
```

## 八、建议的下一步（待首席确认，我不擅自推进）

1. 让 spike 在 **CI 的真实 Chrome** 上跑一次（独立 Job，不影响现有 Job）。这是接正式课程前最关键的缺口。
2. CI 通过后，才进入 L04 教学方案与正式沙箱：沙箱内保留本文第一节的两个硬性前提，并各有守护测试。
3. 在 `package.json` 里把 `scratch-render` 固定为直接依赖。**接正式课程时不能把 `scratch-render.js` 放进 `public/scratch-vm/` 后指望它留着**：见第九节。

## 九、CI 上踩到的坑：共享 prebuild 会清空 `public/scratch-vm/`（接正式课程时必须处理）

第一版 spike 的 CI Job 在真实 Chrome 上失败，18 个用例全部是同一个错误 `ENOENT: public/scratch-vm/scratch-render.js`。**这不是渲染器或 WebGL 的结论**，是我的配置问题：

- 我在 CI 里先跑 `copy-scratch-vm.mjs`、再把 `scratch-render.js` 复制进 `public/scratch-vm/`。
- 但 `playwright.config.ts` 的 webServer 命令是 `npm run build && npm run start`，`npm run build` 会触发 `prebuild`，而 `prebuild` 里的 `copy-scratch-vm.mjs` 结尾是 `rmSync(target, {recursive: true})`——**把整个 `public/scratch-vm/` 清空后只复制它自己的两个文件**，我复制进去的 `scratch-render.js` 被删了。
- 本地没发现，是因为我本地的 Playwright 配置直接 `next start`，不跑 build。**本地通过掩盖了一个 CI 才会出现的问题**，这也是首席坚持要在真实 Chrome 的 CI 上验证的原因。

处理：spike 的测试宿主改为直接从 `node_modules` 提供 `scratch-render.js`，彻底与 `prebuild` 无关，且删除了 `public/scratch-vm/scratch-render.js` 之后本地仍然通过（证明修复是真的）。

**对正式课程的含义**：正式 L04 页面要从应用自己的源站加载渲染器，必须让产物在 `prebuild` 之后仍然存在。可选做法：① 正式时由首席裁定把 scratch-render 并入共享的 `copy-scratch-vm.mjs`（即「推广」，当前未获批）；② 给 L04 自己的复制脚本，并保证它在 `copy-scratch-vm.mjs` 之后运行（改 `prebuild` 的串联，也属于共享文件改动）；③ 不放在 `public/`，改由 Next 的路由处理器从 `node_modules` 提供。这三种都会触及共享文件，所以留给首席裁定，我没有擅自选。
