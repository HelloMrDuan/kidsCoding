# R0-U3-L03《设计交通信号灯》证据说明（第一阶段）

- 台账：R0-U3-L03，知识点 反馈，前置 R0-U3-L02，状态 todo→in_review（本 PR），detailAssetPresent=false。
- 依据：仅台账标题、知识点与通用验收；main 上无 R0 详细稿，全部引脚、步数与规则为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/r0/traffic_executor.py`
  - `examples/blockly/r0/test_traffic_executor.py`
  - `docs/roadmap/evidence/R0-U3-L03/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/R0-U3-L03/README.md`
- 本地测试：`python3 -m unittest test_traffic_executor -v`，12 个测试首跑全部通过（正确信号灯、练习 B 短绿灯、非法变灯失败、有等待绿灯过短失败、无等待绿灯过长失败、步骤不足失败、周期不完整失败、错灯引脚失败、缺灯失败、拓展两个周期通过、保存重开一致、缺开始事件失败）。
- 真实性说明：模拟模型，不点亮真实信号灯，绝不指挥真实交通；路上必须遵守真实信号、听老师或监护人的话。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；无真实硬件运行；R0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
