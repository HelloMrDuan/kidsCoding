# OPS-043 Python StudioShell 适配评估（最终结论，基底 main 40d0ae84）

## 结论总览
- **基底**：main **40d0ae84**（#539 已合并，StudioShell 在主线）。Python 文件在 0ea26fd3..40d0ae84 间**零改动**，前期核查（评估 + 深化）全部有效，不重复从头检查。
- **决定性接口事实**：已合并的 `studio-lesson.ts` 中 `toLessonContract()` 对 `engine='python'` **显式 throw**（LessonWorkspace 无 python 引擎分支）。因此 **Python 不走 LessonWorkspace**，而是作为 StudioShell 的**直接 children**（纯 React 组件 + 隐藏执行 iframe）挂载。这是本轮最终结论与前期“editorSlot + runAdapter”设想的根本区别——前期设想已被真实接口否定，以本结论为准。
- **只读评估**：不改 Python 引擎、不改 StudioShell、不改 LessonWorkspace、不改沙箱、不改 grader。实施改造须主号分配正式 Task-ID（另行 PR）。
- **兼容性**：沙箱、grader、草稿键、草稿格式全部不变；现有 `/learn/python-lab` 路由在迁移前保持工作；StudioShell 与 LessonWorkspace 无需为 Python 改代码。

## 1. 真实组件边界（对已合并 main 的接口核查）

### 1.1 StudioShell 的 Python 契约（已在主线）
- `StudioLesson = Omit<LessonContract,'engine'> & { engine: StudioEngine, backHref: string, help?: StudioHelp }`，其中 `StudioEngine = WorkspaceEngine | 'python'`。
- `validateStudioLesson()` 接受 `engine='python'`（共享校验内以 `'slot'` 代入，引擎值本身另行校验）；`backHref` 必填；`help` 可选。
- `toLessonContract()` 对 python 显式 throw，中文错误信息明示“LessonWorkspace 暂无 python 引擎分支，Python 课须走 React 编辑器 + 隐藏执行 iframe 的挂载方式”。
- 注释明示：“Python's mount semantics differ from Blockly/Scratch: the editor is a plain React component and execution runs in a hidden sandbox iframe (Pyodide in a Web Worker), as in the existing python labs — NOT via EngineAdapter.mount(el). This module only defines the contract and its validation; the Python adapter arrives with a real Python lesson, never as a stub here.”

### 1.2 进入方式：StudioShell 直接 children（不是 LessonWorkspace）
- 路由模式照抄已合并的 `/studio/demo/[lessonId]/page.tsx` 接线：client 页持有 `saveState` / `saveMessage` / `shellControl` 三个 state，传回调给 Python 组件，传值给 StudioShell。
- 结构：
  ```tsx
  <StudioShell lesson={studioLesson} saveState={saveState} saveMessage={saveMessage} shellControl={shellControl}>
    <PythonStudioLab lessonId={lessonId} onSaveStateChange={...} onShellControl={...} />
  </StudioShell>
  ```
- `PythonStudioLab` 是从 `PythonMultiLab` 拆出的 studio 形态（见 §3），不是 LessonWorkspace 的 editorSlot，也不是 EngineAdapter。**不写 stub**：Python 适配器随真实 Python 课接入。

### 1.3 组件归属表（PythonMultiLab 217 行 → 拆分）
| 现有部位 | 去向 | 说明 |
|---|---|---|
| `<main min-h-screen px-4 py-7>` + `max-w-6xl` 包裹 | **删除** | 见 §3（100dvh 高度） |
| 顶部链接行（返回课程介绍 / 查看本机作品夹） | **移交/保留** | 返回课程介绍 → StudioShell `backHref`；查看本机作品夹 → 保留在编辑区（见 §3） |
| header（kc-panel：标题/prompt/警告） | **移交** | 标题/prompt → StudioLesson `title`/`brief`/`step`；警告 → `scopeGap` + 反馈区注脚（见 §3） |
| textarea 编辑器（`python-multi-source`） | **保留在 Python 组件内** | 编辑器本体，不动 |
| 运行按钮（`python-multi-run`）、恢复初始代码、下载 .py | **保留在 Python 组件内** | 运行只在 Python 组件内；StudioShell 不设运行按钮 |
| 反馈区（`python-multi-feedback`、逐用例卡 `python-case-{i}`、通过数、三层错因提示 `python-error-hints`、P0-U1-L06 名片预览） | **保留在 Python 组件内** | 完整保留，不进 LessonWorkspace 的通用反馈卡 |
| 练习 B（自选参数 `python-custom-arg-{i}`、运行、结果、practiceB 横幅） | **保留在 Python 组件内** | 不评分，见 §7 |
| 隐藏 iframe（`/python-lab-sandbox.html`，`sandbox="allow-scripts"`） | **保留在 Python 组件内** | 见 §2、§4 |
| 草稿读写（`kids-python-local-practice-v1:`） | **保留，不变** | 见 §5 |
| 判定（`gradeMultiCases`）与错因提示（`python-error-hints.ts`） | **保留，不变** | 见 §2 |

### 1.4 不需要的改动
- **StudioShell 不改**：`studio-shell.tsx` 已接受 `children` 为任意 React 节点；Python 不需要 StudioShell 加新 prop。
- **LessonWorkspace 不改**：Python 不走它；`chrome='studio'` 的 flex 高度规则只约束 `.ws-studio` 作用域，与 Python 组件无关。
- **workspace-slots.ts 不改**：`ShellControl` / `SaveState` 类型已存在，Python 组件复用同一类型上报（见 §1.2）。
- **studio-lesson.ts 不改**：`engine='python'` 已存在；`toLessonContract()` 的 throw 是正确行为（防静默降级），不是缺口。

## 2. 保留的部分（Pyodide Worker、沙箱、超时、输入输出、异常反馈、判题）
以下全部在 lab/沙箱/grader 内，**一字不动**（前期深化已实读，基底未变）：
- **执行**：Blob Worker + Pyodide v0.27.7（CDN）、CSP `default-src 'none'`、iframe `sandbox="allow-scripts"`、origin `'null'` 校验、全新命名空间、每次运行新建 Worker。
- **限额与超时**：源码 ≤5000、输出 ≤4000、错误 ≤800；引擎加载 35s、LOADED 后执行 8s；超时发 STOP。
- **输入输出**：RUN_TESTS / RUN_CUSTOM 协议（FRAME_READY/LOADED/RESULT，300ms PING 探针）；参数长度校验（默认 40，P3-U1-L01 arg0=1000、P3-U1-L03 arg0=200、P3-U2-L02 arg0=1000）；测试组数 2–6。
- **异常反馈**：异常映射 `ERROR:<TypeName>`；三层错因提示（`python-error-hints.ts`，按 syntax/indentation/name/type/value/timeout/wrong-output/engine/unknown 给 [现象, 可能原因, 动手修复]）。
- **判题**：`gradeMultiCases` 精确字符串比较（`outputs[index] === expected`），错误/长度不符 fail-closed；`isCustomArgsDifferentFromCases`（TQ-005）。
- **沙箱文件**：`public/python-lab-sandbox.html` 不动；`python-multi-grade.ts` 的 9 节课 36 组用例不动（P3-U1-L04 不在 main 的 grader 与沙箱中，因 #529 未合并——实施时以当时主线为准）。

## 3. 重复顶栏移除与 100dvh 主区高度

### 3.1 重复顶栏移除（逐项）
- **删除**：`PythonMultiLab` 的顶部链接行与 header（kc-panel）。StudioShell 的 52px 顶栏（已合并，E2E 断言 48–56px）是唯一顶栏。
- **返回课程介绍**：现有链接去 `/learn/catalog/{lessonId}`（课程介绍）。迁移后改为 StudioShell 的 `backHref`，**目的地不变**（仍为 `/learn/catalog/{lessonId}`，不是 demo 页的 `/learn/map`）。这是回目录链接，不可丢。
- **查看本机作品夹**：现有链接去 `/learn/portfolio`。这是真实功能入口，**必须保留**。推荐放在编辑区内、下载 .py 按钮旁（动作类入口，不进指引抽屉）。不推荐塞进 StudioLesson 的 help（help 是教学帮助，不是功能入口）。
- **标题/prompt**：进 StudioLesson 契约（`title` / `brief` / `step`），由 StudioShell 顶栏与指引抽屉渲染。
- **警告文案**（“真正执行 Python 函数并测试 N 组不同参数。结果保存在当前浏览器，不是可信的正式考核成绩，也不代表课程已发布。”）：**教学诚信声明，必须保留**。推荐两处：一是 StudioLesson 的 `scopeGap`（抽屉内可见），二是反馈区顶部的注脚（运行前可见）。不得在迁移中丢失。

### 3.2 100dvh 主区高度（已合并的壳行为）
- StudioShell 根：`height: 100dvh`，flex column，`overflow: hidden`。`.studio-main`：`flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column`。`.studio-main > *`：`flex: 1 1 auto; min-height: 0`。
- 因此 Python 组件作为 `.studio-main` 的直接子节点，**自动获得 flex:1 1 auto + min-height:0**。Python 组件根须为 flex column、高度 100%（或依赖父级 flex），内部区域各自滚动：
  - 编辑器 textarea：现为 `min-h-64` 固定高。studio 形态须改为 flex 填满（参照已合并的 `.ws-studio .ws-blockly-mount { flex: 1 1 0; height: auto; min-height: 0 }`），手机端设 360px 底线（参照 `.ws-studio .ws-blockly-mount { min-height: 360px }`）。
  - 反馈区（逐用例卡 + 错因提示）：为内部滚动区（`overflow-y: auto; min-height: 0`），不得让 `.studio-main` 变成第二个滚动区（E2E 已断言 `mainScrollHeight <= mainClientHeight`，Python 路由须同样断言）。
  - 练习 B：置于编辑器/反馈下方，随主区内部滚动（或作为可折叠区）；不得另设全页滚动。
- **不得**在 Python 组件内再写 `<main>` 或 `min-h-screen`（嵌套滚动）；**不得**用 `max-w-6xl` 限宽（主区宽度由壳定）。

## 4. 编辑器实例稳定挂载（打开指引不重置代码）
- **壳保证**：StudioShell 的抽屉是 shell 根内 absolute 浮层，与 `children` 为兄弟节点；开关只改浮层可见性，编辑器子树始终挂载。已合并 E2E 已用同节点探针证明（Blockly 同 SVG 节点、Scratch 同 iframe 节点）。
- **Python 侧**：隐藏 sandbox iframe 渲染在 Python 组件 JSX 树内（现为末尾 hidden iframe，ref 用于 postMessage）。只要 Python 组件本身不被重挂载，iframe 不重载，Pyodide 实例不重建（省 35s 重加载）。
- **实施约束（须写进实施任务验收）**：
  1. 路由页的 Python 组件**每课只挂载一次**，key 只能是 `lessonId`；不得以抽屉开关、保存状态、反馈更新为 key，不得在每次渲染时重建组件。
  2. 传给 StudioShell 的 `lesson`（StudioLesson 对象）须 `useMemo` 稳定（照抄 demo 页做法），避免父级重渲染连带重挂载 children。
  3. Python 组件内的 message 监听依赖 `[lesson.cases, lessonId]`（现状）：监听重注册不重建 iframe，可保留；但不得把 iframe 的 `src` 或 `key` 绑到任何会变的状态上。
  4. E2E 须加同节点探针：打开/关闭指引抽屉前后，iframe 为同一节点，且 `FRAME_READY` 后 `ready` 状态不丢失、编辑器内代码不变（照抄 studio-shell.spec.ts 的 Blockly/Scratch 探针模式）。

## 5. 草稿键与迁移（不改变旧草稿键和已有保存数据；可回滚）
- **不改变旧草稿键**：继续用 `kids-python-local-practice-v1:` + lessonId。**不迁移**。现有保存数据（source/passed/practiceB/savedAt）继续有效。
- **回滚**：因键与格式都不变，回滚 = 回退路由改动；草稿仍在原键下，无数据丢失。**无需写迁移脚本，无需双读逻辑**。
- **若未来确需改键/改格式**（本次不做）：策略为“先读旧键、写新键、保留旧键作回退读，成功读写后再删旧键”；且须 chief 批准、另立任务。不得在本轮擅自改键。

## 6. passed 状态（代码变化时立即清零；未来加指纹）
- **现状（已验证，基底未变）**：`passed` 在改代码的**同一事件内同步清零**——textarea `onChange` 内 `setSource(新代码); setPassed(false)`；`run()` 开始时清零；“恢复初始代码”时清零。自动保存 effect（依赖 `[lessonId, source, passed, practiceB, hydrated]`）随即写回 `{source: 新代码, passed: false}`；刷新后读草稿恢复为 false。**旧成绩永不在改代码后复活**。`passed` 唯一变真路径是真实运行完成后的 `gradeMultiCases` 判定。
- **未来实施改造时增加 grader/用例集版本指纹**（本次评估定方案，不实施）：
  1. 草稿信封加 `fingerprint` 字段：对当前课的用例集取指纹。推荐复用已合并的 `workspace-slots.ts` 的 `stableFingerprint()`（对象键排序，同一用例集总是指纹相同），输入为 `{ function, cases: [{args, expected}], graderVersion }`（`graderVersion` 为 `python-multi-grade.ts` 内常量，grader 逻辑变时手动 bump）。
  2. 水合（hydration）时比对：草稿 `fingerprint` 与当前指纹一致才恢复 `passed`；**不一致（或缺失）时 `passed` 强制为 false，但必须保留 `source`**（源码照常恢复，编辑器可用；只丢成绩，不丢代码）。
  3. `practiceB` 不参与指纹比对（见 §7）。
  4. 指纹函数与信封变更须随实施任务落地，并加单测（用例集变 → 旧草稿 passed 不恢复、源码保留；用例集不变 → 旧草稿 passed 恢复）。

## 7. practiceB（探索标记，不代表判题通过，不作为发布成绩）
- **现状**：`practiceB` 只在“用固定用例以外的一组参数真实跑通过一次”时置 true（`isCustomArgsDifferentFromCases` 为真且 custom 运行无 `ERROR:`）。`onChange` **不清**它（只有 `passed` 被清）。
- **定性**：它是“你试过一次自选参数”的**弱探索标记**，不是成绩。它不产生通过横幅、不产生通过数、不进入判定、不进 `gradeMultiCases`。**不得**把它说成判题通过，**不得**作为发布成绩。
- **迁移时**：`practiceB` 随草稿照常保存/恢复（现状行为），不绑定指纹、不参与 §6 的比对。若 chief 要求把它也绑定到代码指纹，另行裁定（本次不做）。

## 8. 最小改动文件清单（实施任务用，须 chief 分配 Task-ID）
| # | 文件 | 改动 | 说明 |
|---|---|---|---|
| 1 | `apps/web/src/features/python-lab/python-studio-lab.tsx`（新增） | 新增 | 从 `PythonMultiLab` 拆出的 studio 形态：去 `<main>`/max-w-6xl/顶链/header，根为 flex column 填满 `.studio-main`；复用同一 iframe/grader/草稿逻辑；新增 `onSaveStateChange` / `onShellControl` 上报（复用 `SaveState` / `ShellControl` 类型）。**不改** `python-multi-lab.tsx` 本体（旧路由继续用），避免迁移中途断掉现有课。 |
| 2 | `apps/web/src/app/studio/python/[lessonId]/page.tsx`（新增） | 新增 | Studio 路由：client 页，构造 `StudioLesson`（`engine='python'`，`backHref=/learn/catalog/{lessonId}`），持有 saveState/saveMessage/shellControl，`<StudioShell>` 包裹 `<PythonStudioLab>`。未知课 `notFound()`；非 Python 课不进此路由。 |
| 3 | `apps/web/src/features/python-lab/python-multi-grade.ts` | 加指纹 | 新增 `casesFingerprint(lessonId)`（复用 `stableFingerprint`）与 `graderVersion` 常量；**不改**现有 9 节课用例与判定逻辑。 |
| 4 | `apps/web/src/features/python-lab/python-multi-lab.tsx` | 加指纹读写 | 仅草稿信封加 `fingerprint` 字段 + 水合时比对（§6）；**不改**其他逻辑。 |
| 5 | `apps/web/src/features/python-lab/python-studio-lab.test.ts`（新增） | 新增 | 单测：顶栏/header 不在组件内、指纹不一致时 passed 不恢复但源码保留、指纹一致时恢复、practiceB 不参与比对。 |
| 6 | `apps/web/tests/e2e/python-studio.spec.ts`（新增） | 新增 | E2E：五视口（无 AppShell、无外层滚动、顶栏 52px、编辑器填满）、抽屉开关不重建 iframe（同节点探针）、运行/保存/失败提示回归、草稿恢复。 |
| 7 | `docs/roadmap/task-register.json` | 加实施任务行 | 须 chief 分配新 Task-ID（不得自编）；仅加实施行，不动其他行。 |
| — | `docs/roadmap/task-register.json`（OPS-043 本行） | 回填 | 本评估 PR 回填 OPS-043 行的 evidence（见 §10）。 |

**明确不改**：`public/python-lab-sandbox.html`、`python-error-hints.ts`、`python-trial-lab.tsx`、`studio-shell.tsx`、`studio-lesson.ts`、`lesson-workspace.tsx`、`workspace-slots.ts`、workflow、V2 token、`python-multi.spec.ts`（旧路由 E2E 保持）。

## 9. 兼容性结论
- **沙箱/执行**：零改动；Pyodide Worker、iframe 隔离、超时、限额、错误映射全部沿用，执行类 E2E 的权威证据仍是 CI 的 python-browser-trial。
- **判题**：零改动；`gradeMultiCases` 精确字符串比较不变；9 节课 36 组用例不变（#529 未合，L04 不在内）。
- **草稿**：键不变、格式仅加可选 `fingerprint` 字段（旧草稿缺字段时按 §6 处理：passed 不恢复、源码保留）；现有保存数据不丢失；回滚无数据风险。
- **路由**：旧 `/learn/python-lab/[lessonId]` 在迁移前保持工作；新 `/studio/python/[lessonId]` 与旧路由可并存过渡（由实施任务决定切换时点，不得在评估 PR 里切路由）。
- **StudioShell/LessonWorkspace**：零改动；Python 不走 LessonWorkspace，`toLessonContract()` 的 throw 是正确防线。
- **V2**：Python 组件去 `<main>`/max-w-6xl 后由壳承载；颜色、圆角、按钮样式沿用现有 V2 token（kc-panel、kc-action-surface 等），不另建视觉系统。

## 10. 后续实施建议（供主号/首席排期）
1. **实施任务**：按 §8 清单立项，须 chief 分配 Task-ID；一次只做一节 Python 课的 studio 接入试点（建议先 P3-U1-L01，已有最完整证据），试点通过后再逐课推广。
2. **指纹先行**：§6 的指纹信封应在首个 studio 试点前落地（否则试点课的旧草稿仍有“课节更新后旧成绩复活”的缺口）。
3. **超限提示单串**：现状为硬编码单串（“自选参数每项最多40字，日记 CSV 文本最多1000字……”），未按课映射；实施时按课映射，属同一任务内的顺带修复（不得扩大范围）。
4. **E2E CI 接线**：新 `python-studio.spec.ts` 须进 CI（专属 Job 或并入 python-browser-trial），须 chief 分配 OPS Task-ID（同 #531 的 L06 缺口先例）；本地执行类 E2E 仍受 Pyodide CDN 限制，权威证据以 CI 为准。
5. **验收**：试点课须有五视口真实 Chrome 截图 + E2E + 草稿恢复正反测试 + 独立人工教研 + 儿童试学（与课程门禁一致）；V2 视觉对齐须首席裁定范围（Python 页现有渐变背景与 V2 token 不同，是 main 已有实现，不在本任务内改）。

## 附：前期核查成果（保留，不重复）
- 评估：`hidden_files/ops-043-python-fullscreen-assessment-2026-11-15.md`（基底 0ea26fd3；Python 文件在 0ea26fd3..40d0ae84 间零改动，结论仍有效）。
- 深化：`hidden_files/ops-043-python-deepening-2026-11-15.md`（grader 9 节 36 组用例、沙箱、草稿键、passed 同步清零机制、practiceB 定性）。
- 复核：`hidden_files/ops-039-539-review-2026-11-15.md`（StudioShell 非作者 PASS，头 0f331f93；已合并 40d0ae84）。
