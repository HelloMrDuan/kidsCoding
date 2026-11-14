# G3-U1-L01 网页课堂接入（PR #260 四件门禁之课堂接入）

## 结论

G3-U1-L01 从课堂可达可试玩：课程介绍页出现实验入口，点入后在真实
Scratch VM 里运行本课主项目、画出 6 颗星。成熟度为 L3（实验可试玩），
不是正式发布，不保存正式成绩。独立教研、儿童试学、三端截图仍缺，
不得标 completed。

## 接入链（缺一环即不可达）

- 路由：`apps/web/src/app/learn/scratch-lab/[lessonId]/page.tsx` 对
  `G3-U1-L01` 返回 `ScratchPenLab`，其他课节行为不变（L02 仍走
  `ScratchVMTrial`，G2 仍走 `ScratchG2Lab`，其余仍 `notFound()`）。
- 成熟度登记：`lesson-maturity.ts` 新增
  `G3-U1-L01: { engine: 'scratch-vm', route: '/learn/scratch-lab/G3-U1-L01', e2eSpec: 'tests/e2e/scratch-pen-u1-l01.spec.ts' }`。
  课程介绍页据此在 L3 显示实验入口；介绍页文案为本课单独写，不复用
  L02 的流星文案（L02 文案段已加 `lesson.id !== 'G3-U1-L01'` 排除）。
- 试玩实现：`apps/web/src/features/scratch-pen/scratch-pen-lab.tsx` +
  `apps/web/public/scratch-pen-sandbox.html`。沙箱从 CDN 加载
  scratch-vm@5.0.300 与 scratch-storage@4.0.0（与 G2 沙箱同版本），
  以记录式渲染桩承接 VM 画笔调用，父页面把 VM 自己的 penLine 输出画
  成舞台 SVG 线段。舞台上的星是 VM 画笔数据，不是截图。
- 样本：`apps/web/public/scratch-samples/g3-u1-l01-star-flags.sb3`，
  与分支主项目文件逐字节一致
  （sha256 `89abf8af1c7f11ed6421cd7ba900e41854d64c16d597554b5917a9676b71451d`），
  授权登记见 `asset-licenses-v1.json`（original，本项目原创）。
- 正反例登记：`apps/web/src/content/curriculum/g3-pen-lessons.ts` 两关，
  均是已验证的真实运行（主项目 30 段画线；找错项目等大无递增；
  旧死 opcode 项目 0 段画线）。SYS-105 模式 gate 要求新试玩必须有
  正反例且欠账名单不能新增，故不用欠账名单，改走新登记；
  `lesson-schema` 计数随之更新（试玩 35→36，关卡 80→82）。
- E2E：`apps/web/tests/e2e/scratch-pen-u1-l01.spec.ts`（路由加载、
  绿旗跑出 30 段画线与终点 x=160、恢复后再跑一次、介绍页可达、
  不宣称正式成绩）。CI 分片：S4 命令新增本文件（同一 Job、不改
  timeout 与 workers、不缩测试范围；工作流改动请首席复核）。
- 发布证据台账：`release-evidence-v1.json` 新增 G3-U1-L01 一条，
  七道门禁全部 unchecked（独立教研、三端验收、新头 CI、素材生产、
  进度验证、隐私审核、人审均未完成），故成熟度停在 L3，不可发布。

## 沙箱 fail-closed 规则

沙箱只接受本课主项目本身的结构，其他项目一律拒绝且不覆盖已加载项目：

- ZIP 结构检查（条目数、条目名、解包体积上限、含 project.json），
  与流星沙箱同口径。
- 载入临时 VM 后校验：舞台 + 1 个角色；积木 opcode 集合恰好等于主项目
  的 17 个 opcode（含 `pen_penDown`/`pen_penUp`/`pen_clear`、
  `procedures_definition`/`procedures_call`、`control_repeat`）；
  自制积木定义恰好 1 个。校验失败则丢弃临时 VM 并报 ERROR。
- 样本是唯一加载来源：页面不提供任意 .sb3 导入入口。

## 诚实边界（本项不冒充的部分）

- 课堂内暂不提供画笔积木编辑：绿旗运行、停止、恢复初始项目、下载
  .sb3 是全部交互。练习 A、练习 B、找错与创作需下载 .sb3 到兼容
  Scratch 编辑器完成，页面与介绍页文案均已明言。
- 试玩只覆盖主项目，不覆盖练习 A/B 与找错变体（变体文件仍在
  `examples/scratch/g3/`，编辑器目视证据见 VM-RUN.md）。
- 仍缺：独立教研（须独立人工）、儿童试学（须真实儿童 + 监护人同意）、
  三端截图（随可玩课节来）。四件齐后报首席复核，首席合并，不标 completed。

## 本地验证方法

- 单测：`npx vitest run src/features/scratch-pen/pen-segments.test.ts
  src/features/curriculum/lesson-maturity.test.ts
  src/features/curriculum/lesson-schema.test.ts`
- E2E（本地 CDN 拦截）：`SCRATCH_VM_LOCAL_CDN=1 npx playwright test
  tests/e2e/scratch-pen-u1-l01.spec.ts --project=desktop`
- Node VM 复核（与沙箱同原理）：`node run_l01.js`（笔段 30、终点
  x=160、size=140，见 VM-RUN.md）。
