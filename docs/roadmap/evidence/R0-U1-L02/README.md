# R0-U1-L02《点亮第一颗LED》证据说明（第一阶段）

- 台账：R0-U1-L02，知识点 传感器，前置 R0-U1-L01，状态 todo→in_review（本 PR），detailAssetPresent=false。
- 依据：仅台账标题、知识点与通用验收；main 上无 R0 详细稿，全部电压、引脚、颜色与读数为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/r0/led_executor.py`
  - `examples/blockly/r0/test_led_executor.py`
  - `docs/roadmap/evidence/R0-U1-L02/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/R0-U1-L02/README.md`
- 本地测试：`python3 -m unittest test_led_executor -v`，11 个测试首跑全部通过（正确点灯、练习 B 绿灯、低电压失败、高电压失败、错引脚失败、读数不上升失败、读数超范围失败、缺供电失败、拓展两颗灯通过、保存重开一致、缺开始事件失败）。
- 真实性说明：模拟模型，非真实硬件运行；真实接线须断电、由老师或监护人指导、只用规定电压。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；无真实硬件运行；R0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
