# R0-U2-L03《测距报警》证据说明（第一阶段）

- 台账：R0-U2-L03，知识点 采样，前置 R0-U2-L02，状态 todo→in_review（本 PR），detailAssetPresent=false。
- 依据：仅台账标题、知识点与通用验收；main 上无 R0 详细稿，全部引脚、范围、阈值与采样值为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/r0/distance_executor.py`
  - `examples/blockly/r0/test_distance_executor.py`
  - `docs/roadmap/evidence/R0-U2-L03/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/R0-U2-L03/README.md`
- 本地测试：`python3 -m unittest test_distance_executor -v`，12 个测试首跑全部通过（正确报警、练习 B 单个低值不报警、采样超范围失败、采样不足失败、报真不匹配失败、报假不匹配失败、错引脚失败、缺报警失败、缺供电失败、拓展 5 个采样通过、保存重开一致、缺开始事件失败）。
- 真实性说明：模拟模型，非真实测量，不发真实报警；真实传感器工作须断电、由老师或监护人指导。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；无真实硬件运行；无真实测量；R0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
