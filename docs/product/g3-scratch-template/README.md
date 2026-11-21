# Golden Lessons · G3 Scratch 高阶课堂样板

`G3-U1-L02`《克隆流星雨》以原生 Scratch GUI 编辑星球防卫站的流星发生器。由课程目录进入 `/learn/scratch-lab/G3-U1-L02/golden`。历史试验入口和草稿保留。

## 教学与判定

1. 调整生成循环，使绿旗启动后约每 0.3 秒生成一颗，共十颗。
2. 预测停机后的舞台。实际运行未清理的初始程序，观察留在地面的分身。
3. 把“删除此克隆体”拖到正确的脚本位置，核对每颗流星先落到底部再删除。
4. 把下落循环封装成自制积木，由每个分身实际调用。孩子可用其他有效的事件或控制结构达成同样结果。

`meteor-runtime.ts` 加载孩子当前的 .sb3，在真实 VM 上跟踪各分身的出现时间、移动、高度、可见性及删除。自制积木必须驱动每颗流星的实际下降。仅有空的调用，或把分身过早删除，都无法通过。运行时间和分身数量有限制，失败时保留可编辑作品。

## 如何复用

- 复用 G2 的 `ScratchCourseEditor`、来源受控的 GUI 桥、完整 .sb3 及账号和课节隔离的本机保存。把任务、预测、提示、初始工程、作品成就传入课程壳。
- 本课在手机启用 Scratch 宿主的窄屏适配。以 375×812 实测，原来 361 px 的宿主视口内编辑器占 451 px，导致原生缩放按钮在边界以外。适配给本课启用 100% 宿主宽度，触控用例会点击原生缩小按钮，再拖入退场积木。
- 原创星空和流星来自 `examples/scratch/g3`。运行 `python examples/scratch/g3/build_golden_project.py` 生成含故障的起始舞台，便于孩子修复。用户作品保留可编辑的原生格式。
- 其他课必须定义自己的可观测行为，逐步检查预期、失败和边界。分身轨迹检测适用于同类项目。变量、广播、角色协作和其他主题各自新增验证，沿用保存与判定接线。
- 复制课程进入流程时，逐课开独立 ID、路由、成熟度证据、正反执行样例和复测，保存成功才推进下一关。下一课回到正式目录入口。
- 批量接手时从 [逐课台账](../../roadmap/lesson-task-register.json) 筛选 G0–G3 的 96 行，核对各行的教学目标、任务状态和证据。四条路线分别沿用 [G0 网格](https://github.com/HelloMrDuan/kidsCoding/tree/5edfc635e273025116ed8279049ac3e65ecd4628/docs/product/g0-grid-template)、[G1 故事](https://github.com/HelloMrDuan/kidsCoding/tree/a02e1e9f0790bd5a9ce4ba483a8e6b45eb3807be/docs/product/g1-story-template)、[G2 原生 Scratch 基础](../g2-scratch-template/README.md) 和本课的执行结构。逐课完成独立的练习设计、反例、可重开作品与四视口验收。

## 验收与回滚

- 设计目标：[桌面原型](evidence/reference-desktop.png)。实际生产构建：[1440×900](evidence/1440x900.png) · [1366×768](evidence/1366x768.png) · [768×1024](evidence/768x1024.png) · [375×812](evidence/375x812.png) · [完成与保存](evidence/completed.png)。
- 生产构建、TypeScript 和改动范围 ESLint 通过，46 项单测通过。Chrome 通过 5 项 Golden 用例和 10 项旧实验回归。覆盖四视口原生拖放、实际脚本不相交、手机缩放、分身退场、创建并接上自制积木、.sb3 重开。[手机缩放及连线](evidence/375x812-code.png)。
- 同 G2 使用不同的 Web 与 Scratch 宿主源，分别配置 `SCRATCH_CREATE_GUI_URL` 和 `SCRATCH_PARENT_ORIGIN`。[G2 宿主及复用文档](../g2-scratch-template/README.md)。运行 `npx playwright test -c playwright.scratch-create.config.ts g3-golden-meteor.spec.ts`。
- 当前为 L3 真实试玩。本机学习状态和作品能重开。正式成绩、平台奖励、设备实测、儿童试学、许可与最终产品复核另有发布门禁。
- 回滚将课程目录恢复旧试验入口并保留隔离存储。当前 Golden 工程可通过 .sb3 导出备份再迁移。
