# G2-U3-L02 的 CI 覆盖审计与最小改造方案

状态：**方案已按 A 落地为 #471（Draft），首席 2026-11-04 已裁定合并顺序，见第四节。** 本课程分支（#470）没有修改 `.github/workflows/**` 中的任何文件。
审计对象：`.github/workflows/curriculum-content.yml`（main `754f7f43`，628 行，23 个 Job）。
依据规范：`docs/engineering/CI-EXECUTION-STANDARD.md`（SYS-108）。
审计时的 PR #470 head：`e6c25688`，对应 GitHub 运行：

| 运行 | 结论 |
|---|---|
| mandatory task accountability `41601966985` | success |
| deploy-pipeline `41601967006` | success |
| curriculum content checks `41601967049` | success（23 个 Job 全部 success） |

## 一、结论：这三个 success 对本课没有证明力

**G2-U3-L02 的 66 项单元测试和 2 个 E2E 规格（VM 矩阵、三端课堂）在上述 CI 里一次都没有被执行。**
工作流被触发，只是因为 PR 改动命中了宽泛的路径（`apps/web/src/features/lessons/**`、`apps/web/public/**`），而不是因为有 Job 去运行本课测试。

## 二、逐项审计

| 审计项 | 现状 | 对本课的影响 |
|---|---|---|
| **Vitest 任务清单** | `curriculum-web` 里全部是**显式文件清单**，`src/features/lessons/` 下只列了 `adventure-map.test.tsx`、`map-view.test.tsx`。`vitest.config.mts` 的 `include` 虽是 `src/**/*.test.ts`，但 CI 不用裸 `vitest run`。 | 66 项单测不执行。 |
| **`g2-u3-browser-trial` 的 spec 清单** | 只跑 `scratch-g2-u3.spec.ts`（L01）。 | `g2-u3-l02-vm.spec.ts`、`g2-u3-l02-classroom.spec.ts` 不执行。 |
| **`on.pull_request.paths` 过滤** | 已命中：`apps/web/src/features/lessons/**`、`apps/web/public/**`（含 `scratch-g2-u3-l02-sandbox.html`）。**未命中**：两个新 spec、`apps/web/src/app/learn/g2-u3-l02/**`。 | 只改 spec 或路由的提交不会触发工作流。 |
| **Job 超时** | 全部显式 `timeout-minutes`（10 / 12 / 15）。`g2-u3-browser-trial`、`g2-u1-viewport-trial` 为 12。 | 新 Job 应为 12（SYS-108 §1）。 |
| **Playwright 浏览器安装** | 每个浏览器 Job 自己 `npx playwright install chrome --with-deps`（真实 Chrome）。`playwright.config.ts` 只有 `desktop`（Desktop Chrome, `channel: 'chrome'`）与 `mobile`（Pixel 7）两个 project，**没有 768 平板**。CI 的 Job 统一用 `--project=desktop`。 | 本课 spec 已在文件内自设三个视口（1440 / 768 / 375），所以在 `--project=desktop` 下也能覆盖三端，不依赖新增 project。 |
| **Scratch VM 加载方式** | `apps/web/package.json` 里没有 `scratch-vm`。沙箱 HTML 从 jsDelivr 固定版本加载（`scratch-vm@5.0.300`、`scratch-storage@4.0.0`）。CI **不**设置 `SCRATCH_VM_LOCAL_CDN`，即走真实 CDN。 | 本课沙箱同样走真实 CDN；本地环境的 CDN 被屏蔽，只在本地用同版本 npm 包覆盖（见证据文档）。CI 的结果是真实 jsDelivr + 真实 Chrome。 |
| **中文字体** | `playwright install --with-deps` 在 Ubuntu 上会装中文字体（既有中文课程 E2E 依赖它）。本课 spec 只在设置了 `L02_CJK_FONT_FILE` 时才注入字体，CI 不设置。 | 无需改动。 |
| **报告上传** | 同类三视口 Job 用 `actions/upload-artifact@v4` + `if: always()`（SYS-108 §5）。 | 新 Job 照做。 |
| **并行 / worker** | 浏览器 Job 默认 `--workers=2`（SYS-108 §3）。 | 新 Job 用 `--workers=2`。 |

## 三、最小改造方案（不改任何现有 Job 的行为）

补丁：`docs/curriculum/g2-u3-l02/ci-coverage.proposed.patch`（52 行）。**已验证**：`git apply --check` 与 `patch -p1` 都能干净应用到当前 main 的 workflow；应用后用 `js-yaml` 解析成功；Job 数 23 → 24；除 `curriculum-web` 多一个步骤外，其余 22 个原有 Job 零改动。

### 改动 1：`paths` 增加 3 行

```yaml
      - 'apps/web/tests/e2e/g2-u3-l02-vm.spec.ts'
      - 'apps/web/tests/e2e/g2-u3-l02-classroom.spec.ts'
      - 'apps/web/src/app/learn/g2-u3-l02/**'
```

### 改动 2：`curriculum-web` 增加 1 个步骤（单元测试）

```yaml
      - name: G2-U3-L02 unit tests (contract, judging, params boundaries, draft, sandbox/TS parity)
        run: npx vitest run src/features/lessons/g2-u3-l02
```

该 Job 当前实测 1 分 43 秒（run `41601967049`），这一步约几百毫秒到 1 秒，不影响预算。

### 改动 3：新增一个并行 Job `g2-u3-l02-browser-trial`

沿用 `g2-u1-viewport-trial` 的惯例（独立 Job、`timeout-minutes: 12`、`--project=desktop --workers=2`、`--output`、`if: always()` 上传证据）：

```yaml
      - run: npx playwright test tests/e2e/g2-u3-l02-vm.spec.ts tests/e2e/g2-u3-l02-classroom.spec.ts --project=desktop --workers=2 --output=test-results/g2-u3-l02
```

**为什么是新 Job，不是塞进 `g2-u3-browser-trial`**：SYS-108 §2.4 要求分片是并行 Job，不把多个套件串行塞进同一个 Job；L01 的 Job 已是 70 秒级的独立单元，混在一起会让 L01 和 L02 互相拖累、失败难定位。

### 预算依据（估算，不是实测）

同类 Job 的真实步骤耗时（run `41601967049`）：

| Job | checkout + node | `npm ci` | 装 Chrome | spec（含 `next build` + 启动） |
|---|---|---|---|---|
| `g2-u1-viewport-trial` | 4 s | 7 s | 22 s | 84 s |
| `g2-u3-browser-trial` | 7 s | 12 s | 27 s | 70 s |

本地同样两个 spec 在 `--workers=2` 下约 3 分钟（本地构建另算）。**估算** CI 总耗时约 5～6 分钟，低于 SYS-108 的 12 分钟目标并留有 ≥3 分钟余量。
**这是估算。** 按 SYS-108，预算必须以实测为准：补丁应用后第一次真实运行，需要把各步骤耗时回填到本文件，若接近 12 分钟立即拆分。

### 新增测试的计数登记（SYS-108 §8）

| 套件 | 数量（以本地实际运行报告为准） |
|---|---|
| Vitest `g2-u3-l02.test.ts` | 66 |
| Playwright `g2-u3-l02-vm.spec.ts` | 21（desktop project 下 1 倍） |
| Playwright `g2-u3-l02-classroom.spec.ts` | 16 个用例标题 × 3 视口 = 48 个实例，其中 5 个按设计跳过（拖放仅桌面 2 个 + 证据截图 3 个）→ 43 个执行 |

## 四、首席裁定（2026-11-04）与合并顺序

**状态更新：补丁已按方案 A 落地为独立 PR #471（SYS-122，Stacked on #470，Draft），并在 GitHub Actions 上完成验证。** 本文件早先的“待首席授权”表述已过期。

### 裁定

- #470 只负责 G2-U3-L02；#471 只负责 SYS-122；两个 PR 保持独立。
- **不授权 #471 合入 #470 的开发分支；不在 #470 正文额外声明 SYS-122；不为绕过任务门禁修改既有校验逻辑。**
- 三个 PR（#469 / #470 / #471）均保持 Draft。
- SYS-122 的 `mergeCommit`：仅在 #471 真正合入 main 之后，使用它实际的合并 SHA；`evidence.pr` 保留 #471；**不预填，不提前标 completed**。
- **#470 正式合并前，必须具备有效的课程 CI 覆盖，不能让没有执行本课测试的通用工作流充当完整验收依据。** 候选代码的 CI 证据可继续使用 #471 的 Stacked 运行；若届时需要变更合并顺序，必须重新提交门禁兼容方案，不得擅自合并。

### ⚠ 更正我早先文档里一句不准确的话

早先写过“#470 之后每次提交即被真实 CI 覆盖”。**在 Stacked 模式下这并不成立：** #470 的 base 是 main，main 的 workflow 不含本课测试，所以 #470 自己的 CI（例如 `21dbf83` 的 23 个 Job 全绿）**不会执行本课测试**。本课测试证据只存在于 #471 的运行里。

### 合并顺序的实测结论（本地模拟，未执行任何合并）

1. **#471 不能在 #470 之前单独合入 main。** 在不含课程文件的 main 检出上运行 #471 新增的两条命令：`npx vitest run src/features/lessons/g2-u3-l02` 以 exit 1 失败（`No test files found`），`npx playwright test tests/e2e/g2-u3-l02-*.spec.ts` 以 exit 1 失败（`Error: No tests found`）。合入会使 main 立刻变红。**不得用“文件不存在就跳过”的条件规避**（那是弱化覆盖）。
2. 因此顺序只能是：**候选证据（#471 Stacked 运行）→ #470 合入 main → #471 改基到 main 并合入**。
3. **#470 合入 main 的方式决定 #471 改基时是否需要改写历史**（模拟 4 个课程提交 + #471 的 3 个提交）：

| #470 合入方式 | #471 直接改基到 main | 做法 |
|---|---|---|
| merge commit（保留祖先） | ✅ 门禁通过，diff 只剩 workflow + 台账 | 直接 retarget |
| squash | ❌ `unknown task ID SYS-122`（merge-base 退回旧 main，三点 diff 34 个文件） | 把 #471 的 3 个提交 cherry-pick 到新 main（实测无冲突、门禁通过、diff 只剩 2 个文件）。这等于改写 #471 分支历史（需要强制推送），**或**另开新分支 + 新 PR（base=main），关闭 #471。**强制推送需首席明确授权。** |
| rebase-merge | ❌ 同上 | 同上 |

4. **刷新规程**（让 #471 的 CI 证据对应 #470 的最新候选 HEAD）：每当 #470 前进（尤其是可执行代码变化），把课程分支**普通 merge** 进 CI 分支（不强推）。实测干净：#471 相对课程分支的 diff 仍是 2 个文件 / +64，门禁通过，workflow 内容不变。**当前状态**：#470 在 `21dbf83`（仅比 #471 的基线多一个纯文档提交），#471 在 `add3161`；差异不含可执行代码，已有的 CI 证据仍然有效，但**#470 最终合并前必须刷新一次**，使证据对应最终 HEAD。
5. 注意：`pull_request` 的 `paths` 过滤看的是 **PR 整体 diff**，不是单个提交。#470 整体 diff 的 32 个文件中有 28 个命中 paths，所以 #470 的任何新提交（包括纯文档提交）都会触发整个工作流；但触发不等于覆盖——触发的是不含本课 Job 的 main 版 workflow。

## 五、没有做的事（如实）

- 没有修改 `.github/workflows/**`。
- 没有删除、跳过或弱化任何测试；用例标题清单与重构前一致（16 个），断言数只增不减（112 → 118），另新增 VM 边界用例 3 项与单测 21 项。
- 没有在 CI 上验证新 Job 的耗时与通过情况（补丁尚未应用）。
