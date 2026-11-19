# V3 Blockly 课堂接入与维护

**样板**：《小狐狸出场》，路由 `/studio/blockly/lesson-01-forest-hello`。设计依据为 `review/kitten-forest-v3-reference` 的 `PROTOTYPE-FOREST-v3.html` 和视觉契约。产品状态由用户在预发布实机上裁定。

## 接入一节课

1. 按现有模式将真实 `StudioLesson`、草稿读写、课程 `SlotRunAdapter` 和 `EditorSlot` 交给 `StudioShell` / `LessonWorkspace`。选择 `StudioShell.layout="blockly-v3"` 与 `LessonWorkspace.studioLayout="blockly-v3"`。学习准入、课程完成与奖励沿用正式接口。
2. 在编辑插槽使用 `BlocklyWorkspace`，传递本关的 `allowedBlocks`、已验证的初始程序/草稿以及稳定的 `onSnapshotChange`。加上 `docked={{ stepKey, preferredBlock }}`。优先积木由课程传入，可省略。分类及材料都从 `allowedBlocks` 推导，切换分类不改变脚本。
3. 需要改关卡程序时，在既有工作区内更新积木及其连接。首个挂载的 `blocks` 作为恢复输入，之后的正常编辑由 Blockly 向插槽上报。样板的 `rebuildForestProgram` 示范怎样同步课程草稿，该助手只面向第一课的块类型；有对白、循环或多个栈的课应沿用自己的字段/连接恢复逻辑。
4. 使用 `BlocklyStudioMission` 将当前进度、关卡目标、下一步和实际完成操作放进任务带。共享类 `kc-v3-task`、`kc-v3-step-index`、`kc-v3-task-copy` 与 `kc-v3-slot-editor` 提供样板排版。三级提示仍由 `StudioShell` 读取课程契约。完成门槛由课程控制。
5. 通过 `stageSlot` 渲染实际舞台，通过 `rolesSlot` 提供真实角色和背景。舞台插槽把 `sceneActions` 放在场景后、额外教学活动前。只读角色用普通内容表达。适配器实现 `reset()` 时显示舞台重来，运行和停止由原有控制器驱动，反馈使用适配器的原始三层判定。
6. 在实际 Chrome 验证本课的允许积木、原生拖拽/连接、键盘和触摸、参数（本课提供时）、运行、失败与恢复，再按单一任务走审查。第 2 课正式迁移由 Muse 在第一课产品确认后执行。

## 共享边界

`blockly-workspace.tsx` 仍是唯一的 Blockly 编辑器。V3 使用 Blockly 的简单工具箱和同一工作区实例拥有的 `VerticalFlyout`。主题、固定素材宽度和响应布局以选项启用。分类通过公开的 `flyout.show()` API 更新真实 Zelos 积木。编辑器的拖放、连接、删除、撤销和快照均来自原 Blockly 实例，尺寸变化只调用 `svgResize`。

课程作者负责自己课节的 allowedBlocks、步骤和判断、角色、背景、初始脚本、保存及进度接线。共享壳、编辑器、主题和 Studio 组件由主 Muse 按一个 Task-ID 串行协调。改动上述共享文件时先检查主号/2 号的未合并分支和现有 PR。4 号独立复核，主号集成和部署。Scratch GUI 使用自己的真实编辑器。

当前样板仅狐狸有可编辑脚本，兔子和森林为课堂固定内容。运动积木为课程规定的 100 步，样板不新增可编辑参数。课程未提供角色增删、角色脚本切换、背景编辑、造型编辑。第一关从空草稿开始，素材区只开放「开始时」，其余关按既有课程数据解锁。

## 复现视觉取证

启动候选生产构建，再运行 `node apps/web/scripts/capture-v3-blockly-workspace.mjs <输出目录>`。默认本地服务 3100，可通过 `KC_VISUAL_ORIGIN` 指向候选服务。默认本地远程跟踪分支为 `origin/review/kitten-forest-v3-reference`，可通过 `KC_V3_DESIGN_REF` 锁定参考提交。脚本实际进入第 2 关，用桌面鼠标或平板/手机原生 Chrome 触控事件拖动运动积木。它在松手前拍摄拖拽，检查吸附后快照和 100 步执行，再保存四种尺寸的第 2 关原型/产品对照以及区域边界、拖拽距离。

平板在上排安排真实舞台、运行、角色信息，素材和脚本在下排共享同一 Blockly 实例。手机把舞台放到脚本上方，素材和脚本紧邻，场景与两只角色的步数常显。迁移下一课时，改用该课角色和状态数据，确认标签在实际执行前后都与角色不重叠，并在两个窄屏视口重复触控吸附和文件菜单验证。

手机缩放按钮位于画布外的脚本工具栏，调用同一 Blockly 工作区的缩放方法。平板和桌面使用原生画布控件。检查手机分类、缩放、撤销、适合画面及顶栏的 44px 触控区，用积木实际矩形验证拖拽前、按住时及连接后均与缩放按钮分离。

## 第二课复用验证

隔离工作区取《小狐狸打招呼》PR #554 的 `86a3a58d`。只在第二课本地装配启用布局、角色槽位、舞台操作和常驻素材，继续使用它自己的教学、对白、保存及运行器。Chrome 实测拖入紫色「说一句话」并吸附在移动积木后，快照保存所选对白，舞台先移动 100 步再显示气泡，判定通过，刷新恢复积木与对白字段。结果见 [复用记录](evidence/OPS-049/reuse.json)。隔离验证不改变 #554 或正式第二课路由。
