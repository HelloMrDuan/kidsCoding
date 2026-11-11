# G2-U3-L04《判断碰撞得分》测试证据

范围标注：**教学定向**。教学参数状态：**proposed**（尚无首席裁定，见 `docs/curriculum/g2-u3-l04/TEACHING-PLAN.md`）。**不代表儿童教学效果已验证**，课程不得标 completed。
本文记录**本地真实运行**的结果。GitHub Actions 的结果以 PR 页面为准，两者不能互相代替（见第六节）。

## 一、运行环境与限制（如实）

| 项 | 实际情况 |
|---|---|
| Scratch VM | 真实 `scratch-vm@5.0.300` + `scratch-storage@4.0.0`，由应用自己的源站提供（`public/scratch-vm/`），不走 CDN。 |
| 渲染器 | 真实 `scratch-render@2.2.84`（首席批准的方案①：`package.json` 直接依赖并锁版本，`apps/web/scripts/copy-scratch-vm.mjs` 在同一次清理+复制里复制到 `public/scratch-vm/`，版本不一致时脚本直接失败）。只有 L04 的沙箱加载它。**碰撞由真实 `sensing_touchingobject` + 真实渲染器判定，不是页面里自己算的。** |
| 沙箱 CSP | 与 L02 的沙箱相比只多 `img-src data:`（渲染器加载 SVG 造型需要），`connect-src 'none'`。 |
| 浏览器 | Chromium（来自 npm `@sparticuz/chromium`），headless，WebGL1。**不是 Chrome 稳定版**，CI 用 `channel: 'chrome'`，本地下载不了。 |
| 中文字体 | 本地 Chromium 无 CJK 字体，用 `L02_CJK_FONT_FILE` 在测试里注入；产品代码不含。 |
| 真实设备 | **没有**。1440 / 768 / 375 是 Playwright 视口（手机 `isMobile + hasTouch`）。真实指针拖放只在桌面视口；手机、平板走触摸点按。 |
| 儿童试学 / 独立教研 | **没有做**，不宣称。 |

## 二、命令与结果（本地，`apps/web`）

```
npx vitest --run src/features/lessons/g2-u3-l04
npx playwright test tests/e2e/g2-u3-l04-vm.spec.ts tests/e2e/g2-u3-l04-classroom.spec.ts \
  tests/e2e/g2-u3-l04-shell-gap-a.spec.ts tests/e2e/g2-u3-l04-renderer-spike.spec.ts --project=desktop --workers=2
```

- Vitest（`src/features/lessons/g2-u3-l04`）：**129 通过**（核心 65 + 会话 35 + 适配器 29）。整个 `src/features/lessons` 一起跑：63 个文件 737 通过 + 2 个预期失败（共享壳既有缺陷的 `it.fails`，本 PR 未改动）。
- Playwright 四个文件合计 211 个实例（#494 的 L03 合并进主线之前，本地一次完整运行 324 秒：203 通过 / 8 跳过 / 0 失败；合并之后 VM + Gap A + spike 三个文件本地重跑 124 / 124 通过、0 跳过）：
  - `g2-u3-l04-vm.spec.ts`：92 个实例。“与 L03 沙箱 CSP 对比”那一条在 L03 沙箱不在分支里时按设计跳过；#494 合并并同步主线之后它真的执行并通过，所以现在 0 跳过。
  - `g2-u3-l04-classroom.spec.ts`：87 个实例（三视口），80 通过 / 7 跳过。7 个跳过是设计决定：证据截图 3（需要 `L04_SHOT_DIR`，只生成图片）、手机首屏用例在桌面 / 平板 2、真实指针拖放在平板 / 手机 2。
  - `g2-u3-l04-shell-gap-a.spec.ts`：14 个实例（7 场景 × 桌面 / 手机），全部通过。
  - `g2-u3-l04-renderer-spike.spec.ts`：18 个，全部通过（#499 保留的机制证据，从 `node_modules` 提供渲染器，与正式课程用的是同一个固定版本）。
- ESLint：本课文件 0 error 0 warning。整个仓库 `eslint .` 在本地构建之后有 124 个 error，**全部在被 gitignore 的构建产物 `public/scratch-vm/*.js` 里**（`git ls-files` 为 0 个），CI 在构建之前跑 lint，不会碰到它们；本课源码和 spec 没有 error。
- `tsc --noEmit`：本课文件 0 错误。仓库里其他 spec（如 `scratch-cloud-delete-restore-cloud104.spec.ts`）有既有类型错误，不属于本 PR。

## 三、真实 VM + 真实渲染器：测了什么

课程没有随机数，球的下落和碰撞是确定的，所以断言的是具体的得分。实测值（桌面 Chromium）：球速 10 时球第 21 帧第一次碰到篮子，连续碰到 8 帧（21～28）；球速 5 时第 41 帧第一次碰到。

- **判定矩阵**（每行跑 2 遍，结论必须一致）：标准做法；没有“如果”；没有“隐藏”（红球被加 8 次）；次数 20 / 21（边界）；迁移 A 加 2 分、不用“如果”总分碰巧对（舞台通过、任务不通过）；迁移 B 球更慢（重复 30 / 40 得 0，50 通过）；“如果”套在不该套的地方；散积木不运行；两条脚本；等等。
- **碰撞是真的**：没有渲染器时 `isTouchingSprite` 恒为 false（`probe-touch-without-renderer.cjs`、`BLOCKER-TOUCHING.md`）；有渲染器后，红球只在落到篮子上的那几帧为 true，蓝球（落在篮子旁边的地上，水平距离大于 100）一次都不是 true；这一条逐帧断言，不是只看总分。
- **两个球、同一份脚本**：学生的脚本被复制到红球和蓝球上，沙箱逐块比较两份脚本必须一致，否则拒绝（变异检验里发现并补上的漏洞）。
- **沙箱安全**：CSP 逐项断言；无任何网络请求；本站之外的请求为 0；拒绝 39 种越界工程（每种一个用例），每一种断言**因预期的原因被拒绝**；被拒绝后沙箱仍可用。
- **资源释放**：每次运行结束释放 WebGL 上下文并移除 canvas；空释放不覆盖上一次真实释放的记录；连续运行 12 次不累积。
- **构建不会删掉渲染器**：`npm run build` 的 prebuild 先清空 `public/scratch-vm/` 再复制三个固定版本文件，构建之后用真实 Chrome 跑课堂用例，页面真的从本站加载 `/scratch-vm/scratch-render.js`（测试断言请求列表里有它，且 3 个文件的大小都在预期范围内）。
- **三层判定**：舞台结果（最终得分 = 本关要求）、任务结果（逐球核算：红球恰好一次且加的是本关分数，蓝球零次）、知识证据（每一次加分的同一帧、同一个球都有一次返回 true 的“碰到 篮子？”检查）。三层的关系和两个等价变异体（总体判定忽略知识证据 / 忽略舞台结果，在真实两球结构里不可区分）写在教学方案里，没有隐瞒。

## 四、变异检验

把判定、编译、帧数、校验器、沙箱各处 33 处逻辑故意改错并重新跑测试（改动在检验后用 `git checkout --` 还原）：

- 被发现（KILLED）：30 处。其中判定 / 编译 / 沙箱 / CSP / 释放的 27 处由真实 VM 的 spec 发现，校验器的 3 处（得分增量上限不检查、允许重复套重复、允许如果套如果）由单元测试发现。
- **未被发现、已说明的 3 处**：
  - 总体判定忽略知识证据；总体判定忽略舞台结果：在真实的两球结构里，任务通过必然推出另外两层通过，所以这两处改动没有可观察的差别（等价变异体，记录在教学方案第十节）。
  - 沙箱“不等 SVG 造型就绪”：在 L04 的几何下造型很快就绪，行为不可区分；等造型就绪这一前提的证明在 spike 里（不等就得到错误的 touching）。
- 检验中发现并修复的真实缺陷：沙箱原先不比较两个球的脚本是否一致；校验器遇到 `null` 积木时抛 `TypeError` 而不是拒绝（单元测试写的时候发现）。

## 五、过程中发现并修复的真实问题

1. **没有渲染器就没有碰撞**：真实 VM 在没有渲染器时 `sensing_touchingobject` 恒为 false，课程没法教“判断碰撞”。因此做了 spike、得到首席批准后才接渲染器。
2. **几何三次改动**：篮子放在 -130 会让球停在篮子里，“连加”的分数取决于循环剩余次数（不稳定）；下落距离 330 会让球被舞台下沿切掉一半。最终篮子在 -90、下落距离 310，两个球最终球心都是 -160，整个球都在舞台里、不压着篮子（测试按几何量，不是只看 DOM 属性）。
3. **“更快的球”不能当迁移关**：实测更快的球需要的检查次数更少，照抄上一关的程序不会失败；改成更慢的球（照抄上一关得 0 分）。
4. 舞台尺寸：壳给舞台一个固定高度的框并裁切，舞台用容器查询取“框宽”和“框高 × 4/3”里较小者，三档缩放、运行前后，篮子、两个球、得分与要求说明都在框里，比例 4:3。

## 六、没有做到 / 还不能宣称的

- **CI 覆盖**：`curriculum-content.yml` 新增两个并行 Job，都在真实 Chrome 上运行，Job 末尾用 JUnit 核对数量，所以不会靠 skip 或缩水变绿；没有 `continue-on-error`。
  - `g2-u3-l04-vm-trial`：VM 矩阵 + Gap A + spike，124 个实例（有 L03 沙箱文件时要求 0 跳过，否则恰好 1 个）。
  - `g2-u3-l04-browser-trial`：三视口课堂，按视口分成 desktop / tablet / phone 三个并行分片（`--grep "\[viewport\]"`，不是 playwright 的 `--shard`），每片 29 个实例，核对 总数 29、跳过 2 / 3 / 2（按设计的跳过）。
  - **为什么拆**：第一版把四个文件放在一个 Job 里，CI 实测构建约 67 秒 + 测试超过 7 分钟，211 个里 193 个通过（0 失败）时被 8 分钟的步骤上限截断；第二版把课堂单独放一个 Job，87 个实例仍然超出 7 分钟的步骤上限。所以按视口再分片，**没有放宽任何预算**。
  - **超时预算按 SYS-108**：每个 Job `timeout-minutes: 15`（硬限制，不是目标），各步自带上限（Chrome 安装 4、测试 7、核对 1），Chrome 安装每次限时 100 秒、最多 2 次。原 spike 专用 Job 并入 `g2-u3-l04-vm-trial`。
  - **runner**：两个 Job 固定 `ubuntu-24.04`。`ubuntu-latest` 迁移到 ubuntu-26.04 后 Playwright 不支持（`does not support ffmpeg on ubuntu26.04-x64`），当时所有安装 Chrome 的 Job 都在安装步失败；这个问题由 OPS-029（#505，已合并）统一把受影响的 Job 固定到 `ubuntu-24.04`，本 PR 的两个 Job 在 #505 之前就已自行固定，与之一致。
  - **本地数字不能代替 CI，CI 结果见 PR 页面的最新运行。**
- **控制台 CSP 噪音**：本课没有放宽 CSP；测试只允许 `font-src` 这一类噪音（渲染器内部的字体尝试），任何其他 CSP 违规都会让用例失败。
- **参数仍是 proposed**：球速、分数、重复次数范围等未经首席裁定；教学提示 transferPoints 的第 2 条略微解释了为什么需要“如果”，待教研判断。
- **“脚本复制到两个球上”与“只提供隐藏、不提供‘已收集’标志变量”是为了让五种积木就够用的简化**，待首席确认。
- 没有独立教研、没有儿童试学、没有真实设备、没有内存 / 多角色性能的专门测试；目录仍是 `outline_not_playable`，本课未发布。
- 共享 `workspace/`、L02 与 L03 的沙箱和行为未修改；workflow 只**新增**了 L04 自己的两个 Job、单测步骤和触发路径（相对主线 0 行删除）；`.github` 之外对共享文件的改动只有 `package.json` / `package-lock.json` 各 1 行（`scratch-render@2.2.84`）和 `scripts/copy-scratch-vm.mjs`（复制第三个固定版本文件并校验版本）。
- 此前误提交过 `apps/web/tsconfig.tsbuildinfo`（主线里没有这个文件），已从仓库移出；`public/scratch-vm/` 是被 gitignore 的构建产物，仓库里 0 个文件，清空后跑复制脚本会重新生成三个文件，`scratch-render.js` 的哈希与 `node_modules` 一致。

## 七、截图

本目录下 PNG：桌面 1440 / 平板 768 / 手机 375 各 4 张（首次进入、第一关演示、第二关失败、第二关通过），另有手机第二关首屏 1 张（`phone-4-solve-first-screen.png`）。均为本地 Chromium 生成，中文字体为测试注入。
