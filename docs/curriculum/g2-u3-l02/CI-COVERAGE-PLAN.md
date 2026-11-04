# G2-U3-L02 的 CI 覆盖审计与最小改造方案

状态：**方案，待首席协调与授权。** 本 PR 没有修改 `.github/workflows/**` 中的任何文件。
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

## 四、需要首席决定

1. **是否授权实施上述补丁，以及用哪种方式落地**：
   - A（我建议）：首席另立 CI 任务 / 独立 PR 应用补丁（符合 AGENTS.md §7 “修改 workflow 必须独立任务、独立 PR”），#470 合入或并行均可；#470 之后每次提交即被真实 CI 覆盖。
   - B：授权我在 #470 内直接应用补丁。这会让 #470 同时改 workflow，违背“独立 PR”原则，仅在首席明确书面授权时才做。
2. 在补丁落地之前，**不要把 #470 现有的 CI 全绿解读为本课测试通过**。#470 的 PR 说明已据此更正。

## 五、没有做的事（如实）

- 没有修改 `.github/workflows/**`。
- 没有删除、跳过或弱化任何测试；用例标题清单与重构前一致（16 个），断言数只增不减（112 → 118），另新增 VM 边界用例 3 项与单测 21 项。
- 没有在 CI 上验证新 Job 的耗时与通过情况（补丁尚未应用）。
