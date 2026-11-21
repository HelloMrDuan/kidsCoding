# Golden Lessons · G2 Scratch 基础课堂样板

`G2-U1-L03`《设置背景和声音》在原生 Scratch GUI 编辑原创森林音乐会。课堂以 `/learn/scratch-lab/G2-U1-L03/golden` 为入口，原受限实验保留原链接和本机存储。

## 孩子的课堂流程

1. 把绿旗下的舞台背景换成绿色草地。
2. 在小鸟的点击脚本里，把歌声改成“啾啾”。
3. 预测开幕铃次数，检查实际响了几次，再对照自己的预测。
4. 让铃只响一次，保留切换背景的动作。
5. 为猫写一段新的开场词。检查通过后获得本机成就，可前往下一课或继续修改作品。

任务指引可收起，保留完整代码、造型、声音、角色、素材和舞台操作。平板与手机沿用独立宿主的舞台在上、编辑器在下布局。舞台支持原生绿旗和停止。手机滚动进入脚本，课内操作条和底部站点导航按实际页面布局保留。

## 实现和复用

| 课程资产 | 本课实现与接法 |
| --- | --- |
| 课程入口 | 服务端使用 `currentCreateOwner`，为本课传入已审核的宿主地址。地址缺失则明确显示不可用。 |
| 任务与帮助 | `forest-concert-course.tsx` 定义教学故事、三级提示、可选的预测题、完成状态与接续课程。 |
| 编辑器 | `ScratchCourseEditor` 使用 OPS-050 的固定版本原生宿主和 `ScratchBridgeClient`。保留来源、窗口、版本、超时与大小校验。 |
| 判定 | `observeForestConcert` 加载 GUI 当前导出的完整 .sb3，用真实 Scratch VM 执行绿旗、鸟和猫的事件。在执行中记录背景切换、播放请求、重复次数和对白。GUI 自己播放对应音频，判定器独立监听 VM 播放指令。 |
| 草稿和进度 | `course-project-store.ts` 按账号与课程 ID 保存一份完整 .sb3、已通过步骤及本机成就。并发保存检查版本，冲突可以导出当前作品保底。课内草稿与自由作品分开。 |
| 接入边界 | 每节课更换初始作品、独立任务和运行观察器。保留原课程草稿，再逐课接入作品管理与正式进度。 |

## 测试与发布

- `concert-runtime.test.ts` 使用真实 Scratch VM 运行错误初始稿和已修改的 .sb3。
- `g2-golden-concert.spec.ts` 通过原生控件修正背景、歌曲、铃声和对白。验证一份保存的 .sb3 重开仍含脚本、背景和声音。四个视口均拖入并连接真实积木，平板和手机使用 Chrome 触控协议。
- 与原型对照：[桌面设计目标](evidence/reference-desktop.png) · [1440×900](evidence/1440x900.png) · [1366×768](evidence/1366x768.png) · [768×1024](evidence/768x1024.png) · [375×812](evidence/375x812.png)。平板和手机在宿主内滚动，测试验证脚本区可拖放、舞台无水平溢出。
- 生产构建、TypeScript、范围内 ESLint 和 66 项单测通过。真实 Chrome 验证 7 项 Golden 测试及 11 项旧音乐会实验和 Scratch 创作中心回归。未保存时，测试验证浏览器后退、站内导航和刷新均触发离开确认，并在保存后通过历史记录重开。[手机脚本](evidence/375x812-code.png) · [通关并保存](evidence/completed.png)。
- 本课接入的背景、角色和声音来自仓库既有原创森林音乐会作品。宿主版本和对应源码分发沿用 OPS-050 门禁，预发布前仍需完成许可和产品审核。
- 当前是 L3 真实试玩，保存和成就在当前浏览器。正式成绩、云同步、平台奖励、实体设备和儿童试学等待相应验收。
- 回滚时恢复课程目录中的旧试验入口，旧实验稿保持原存储。Golden 用户可在回滚前导出 .sb3。无需清理 IndexedDB。

复跑时使用生产 Web 构建和 OPS-050 的固定版宿主。Web 设置 `SCRATCH_CREATE_GUI_URL`，Scratch 宿主设置 `SCRATCH_PARENT_ORIGIN`，两者使用不同源。Web 与宿主启动后，在 `apps/web` 运行 `npx playwright test -c playwright.scratch-create.config.ts g2-golden-concert.spec.ts`。如果 Web 端口不同，设置 `KC_SCRATCH_E2E_ORIGIN`。课程 CI 另行运行真 Scratch VM 单测。

### 复核后的验收与历史成就

IndexedDB 在同一事务存储完整 .sb3、关卡、历史成就和当前作品的检查结果。编辑会立即撤销当前通过；仅真实 Scratch VM 检查通过后恢复。保存未改作品时按实际 ZIP 条目比较，ZIP 时间戳不影响检查结果。旧记录的 finished 仅恢复历史成就，当前作品须重新检查。Chrome 用原生 Scratch 修改主持词、保存、重开、检查失败、修复并再次通过。
