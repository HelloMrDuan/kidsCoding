# R0-U2-L01《读取光线强度》证据说明（第一阶段）

- 台账：R0-U2-L01，知识点 输入，前置 R0-U1-L06，状态 todo→in_review（本 PR），detailAssetPresent=false。
- 依据：仅台账标题、知识点与通用验收；main 上无 R0 详细稿，全部引脚、读数与分界为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/r0/light_executor.py`
  - `examples/blockly/r0/test_light_executor.py`
  - `docs/roadmap/evidence/R0-U2-L01/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/R0-U2-L01/README.md`
- 本地测试：`python3 -m unittest test_light_executor -v`，11 个测试首跑全部通过（正确读取、练习 B 测分界、读数超范围失败、读数不足失败、报告不一致失败、错引脚失败、缺报告失败、缺供电失败、拓展 4 个读数通过、保存重开一致、缺开始事件失败）。
- 真实性说明：模拟模型，非真实测量；真实传感器工作须断电、由老师或监护人指导。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；无真实硬件运行；无真实测量；R0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
