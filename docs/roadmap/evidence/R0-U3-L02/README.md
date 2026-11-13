# R0-U3-L02《电机速度调节》证据说明（第一阶段）

- 台账：R0-U3-L02，知识点 状态，前置 R0-U3-L01，状态 todo→in_review（本 PR），detailAssetPresent=false。
- 依据：仅台账标题、知识点与通用验收；main 上无 R0 详细稿，全部引脚、速度档位与命令为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/r0/motor_executor.py`
  - `examples/blockly/r0/test_motor_executor.py`
  - `docs/roadmap/evidence/R0-U3-L02/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/R0-U3-L02/README.md`
- 本地测试：`python3 -m unittest test_motor_executor -v`，11 个测试首跑全部通过（正确调节、练习 B 到顶限幅、非法命令失败、命令不足失败、速度不匹配失败、错引脚失败、缺电机失败、缺速度失败、拓展到底限幅通过、保存重开一致、缺开始事件失败）。
- 真实性说明：模拟模型，不驱动真实电机；真实电机工作须断电、由老师或监护人指导，远离转动部分。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；无真实硬件运行；R0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
