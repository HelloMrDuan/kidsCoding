# R0-U2-L05《传感器误差比较》证据说明（第一阶段）

- 台账：R0-U2-L05，知识点 校准，前置 R0-U2-L04，状态 todo→in_review（本 PR），detailAssetPresent=false。
- 依据：仅台账标题、知识点与通用验收；main 上无 R0 详细稿，全部引脚、标准值、测量值与规则为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/r0/calibrate_executor.py`
  - `examples/blockly/r0/test_calibrate_executor.py`
  - `docs/roadmap/evidence/R0-U2-L05/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/R0-U2-L05/README.md`
- 本地测试：`python3 -m unittest test_calibrate_executor -v`，13 个测试首跑全部通过（正确校准、练习 B 偏移校准、错引脚失败、未声明传感器测量失败、测量不足失败、比较结果不匹配失败、比较误差不匹配失败、偏移不匹配失败、校准更差传感器失败、缺比较失败、拓展平局校准通过、保存重开一致、缺开始事件失败）。
- 真实性说明：模拟模型，非真实测量，不校准真实硬件；真实校准工作须断电、由老师或监护人指导。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；无真实硬件运行；无真实测量；R0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
