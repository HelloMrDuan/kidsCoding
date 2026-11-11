# R0-U2-L02《温湿度显示》证据说明（第一阶段）

- 台账：R0-U2-L02，知识点 输入，前置 R0-U2-L01，状态 todo→in_review（本 PR），detailAssetPresent=false。
- 依据：仅台账标题、知识点与通用验收；main 上无 R0 详细稿，全部引脚、数值与显示格式为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/r0/climate_executor.py`
  - `examples/blockly/r0/test_climate_executor.py`
  - `docs/roadmap/evidence/R0-U2-L02/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/R0-U2-L02/README.md`
- 本地测试：`python3 -m unittest test_climate_executor -v`，11 个测试首跑全部通过（正确显示、练习 B 三组读数、温度超范围失败、湿度超范围失败、读数不足失败、显示不一致失败、错引脚失败、缺显示失败、拓展 4 组读数通过、保存重开一致、缺开始事件失败）。
- 真实性说明：模拟模型，非真实测量；真实传感器工作须断电、由老师或监护人指导。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；无真实硬件运行；无真实测量；R0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
