# R0-U2-L06《制作桌面气象站》证据说明（第一阶段）

- 台账：R0-U2-L06，知识点 校准，前置 R0-U2-L05，状态 todo→in_review（本 PR），detailAssetPresent=false，R0-U2 单元收官课。
- 依据：仅台账标题、知识点与通用验收；main 上无 R0 详细稿，全部引脚、标准值、测量值与显示格式为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/r0/station_executor.py`
  - `examples/blockly/r0/test_station_executor.py`
  - `docs/roadmap/evidence/R0-U2-L06/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/R0-U2-L06/README.md`
- 本地测试：`python3 -m unittest test_station_executor -v`，12 个测试首跑全部通过（正确气象站、练习 B 偏移显示、测量超范围失败、测量不足失败、比较不匹配失败、校准不匹配失败、显示不匹配失败、错引脚失败、缺显示失败、拓展 3 组测量通过、保存重开一致、缺开始事件失败）。
- 真实性说明：模拟模型，非真实测量，不校准真实硬件，不预报真实天气；真实传感器工作须断电、由老师或监护人指导。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；无真实硬件运行；无真实测量；无真实天气预报；R0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
