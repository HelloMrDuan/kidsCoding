# R0-U1-L05《理解电路安全》证据说明（第一阶段）

- 台账：R0-U1-L05，知识点 安全，前置 R0-U1-L04，状态 todo→in_review（本 PR），detailAssetPresent=false。
- 依据：仅台账标题、知识点与通用验收；main 上无 R0 详细稿，全部检查项为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/r0/safety_executor.py`
  - `examples/blockly/r0/test_safety_executor.py`
  - `docs/roadmap/evidence/R0-U1-L05/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/R0-U1-L05/README.md`
- 本地测试：`python3 -m unittest test_safety_executor -v`，10 个测试首跑全部通过（正确清单、练习 B 换顺序、一项不通过失败、缺项失败、重复项失败、未知项失败、缺开始记录失败、拓展第 6 项通过、保存重开一致、缺开始事件失败）。
- 安全说明：课堂教具，模拟通过不等于真实电路安全，绝不代替老师或监护人；真实动手须监督、断电接线、手干、规定电压，任何真实检查不通过都要停下来问大人。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；无真实硬件运行；无真实安全认证；R0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
