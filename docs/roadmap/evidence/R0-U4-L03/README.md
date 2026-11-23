# R0-U4-L03《零件装配与安全》证据说明（第一阶段）

- 台账：R0-U4-L03，知识点 工程，前置 R0-U4-L02，状态 todo→in_review（本 PR），detailAssetPresent=false。
- 依据：仅台账标题、知识点与通用验收；main 上无 R0 详细稿，全部零件、引脚与装配顺序为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/r0/assembly_executor.py`
  - `examples/blockly/r0/test_assembly_executor.py`
  - `docs/roadmap/evidence/R0-U4-L03/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/R0-U4-L03/README.md`
- 本地测试：`python3 -m unittest test_assembly_executor -v`，13 个测试首跑全部通过（正确装配、练习 B 读数不同、检查前通电失败、零件顺序乱失败、零件缺失失败、安全项不通过失败、检查不通过失败、电压不对失败、读数超范围失败、缺测试失败、拓展加蜂鸣器通过、保存重开一致、缺开始事件失败）。
- 真实性说明：模拟模型，不装真实零件、不通真实电；真实装配须断电、由老师或监护人指导，松动、发热、有异味立刻停下。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；无真实硬件运行；R0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
