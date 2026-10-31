# R0-U4-L02《设计智慧浇水机》证据说明（第一阶段）

- 台账：R0-U4-L02，知识点 迭代，前置 R0-U4-L01，状态 todo→in_review（本 PR），detailAssetPresent=false。
- 依据：仅台账标题、知识点与通用验收；main 上无 R0 详细稿，全部引脚、阈值与读数为实现选择、课堂举例数字，不是真实植物数据，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/r0/watering_executor.py`
  - `examples/blockly/r0/test_watering_executor.py`
  - `docs/roadmap/evidence/R0-U4-L02/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/R0-U4-L02/README.md`
- 本地测试：`python3 -m unittest test_watering_executor -v`，13 个测试首跑全部通过（正确浇水机、练习 B 两版完成、阈值超范围失败、读数超范围失败、版本不足失败、阈值重复失败、正确数下降失败、最后一版未全对失败、结果不匹配失败、缺结果失败、拓展四版通过、保存重开一致、缺开始事件失败）。
- 真实性说明：模拟模型，不浇真实植物；真实植物只能在老师或监护人带领下浇水，电气零件绝不能进水。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；无真实硬件运行；无真实植物数据；R0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
