# R0-U3-L04《检测并避开障碍》证据说明（第一阶段）

- 台账：R0-U3-L04，知识点 反馈，前置 R0-U3-L03，状态 todo→in_review（本 PR），detailAssetPresent=false。
- 依据：仅台账标题、知识点与通用验收；main 上无 R0 详细稿，全部引脚、距离与规则为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/r0/avoid_executor.py`
  - `examples/blockly/r0/test_avoid_executor.py`
  - `docs/roadmap/evidence/R0-U3-L04/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/R0-U3-L04/README.md`
- 本地测试：`python3 -m unittest test_avoid_executor -v`，13 个测试首跑全部通过（正确避障、练习 B 两个障碍、撞向障碍失败、空路转向失败、检测超范围失败、组数不足失败、缺结束失败、错传感器引脚失败、错电机引脚失败、连续检测失败、拓展五组通过、保存重开一致、缺开始事件失败）。
- 真实性说明：模拟模型，不驱动真实机器人；真实机器人工作须断电、由老师或监护人指导，在空旷地方运行，出问题立刻停下。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；无真实硬件运行；无真实测量；R0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
