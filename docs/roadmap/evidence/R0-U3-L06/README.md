# R0-U3-L06《制作迷你巡线车》证据说明（第一阶段）

- 台账：R0-U3-L06，知识点 PWM，前置 R0-U3-L05，状态 todo→in_review（本 PR），detailAssetPresent=false，R0-U3 单元收官课。
- 依据：仅台账标题、知识点与通用验收；main 上无 R0 详细稿，全部引脚、传感器值与占空比为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/r0/linefollower_executor.py`
  - `examples/blockly/r0/test_linefollower_executor.py`
  - `docs/roadmap/evidence/R0-U3-L06/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/R0-U3-L06/README.md`
- 本地测试：`python3 -m unittest test_linefollower_executor -v`，13 个测试首跑全部通过（正确巡线车、练习 B 丢线停下再找回、传感器值非法失败、步骤不足失败、占空比不匹配失败、无直行失败、无转向失败、错电机引脚失败、错传感器引脚失败、缺占空比失败、拓展全部情况通过、保存重开一致、缺开始事件失败）。
- 真实性说明：模拟模型，不驱动真实小车；真实小车工作须断电、由老师或监护人指导，在空旷地方运行，出问题立刻停下。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；无真实硬件运行；R0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
