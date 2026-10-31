# R0-U1-L03《按钮控制灯光》证据说明（第一阶段）

- 台账：R0-U1-L03，知识点 执行器，前置 R0-U1-L02，状态 todo→in_review（本 PR），detailAssetPresent=false。
- 依据：仅台账标题、知识点与通用验收；main 上无 R0 详细稿，全部电压、引脚、颜色与次数为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/r0/button_executor.py`
  - `examples/blockly/r0/test_button_executor.py`
  - `docs/roadmap/evidence/R0-U1-L03/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/R0-U1-L03/README.md`
- 本地测试：`python3 -m unittest test_button_executor -v`，11 个测试首跑全部通过（正确控制、练习 B 两对循环、接线前按下失败、重复按下失败、无按下松开失败、按下未松开失败、错按钮引脚失败、错电压失败、拓展三对循环通过、保存重开一致、缺开始事件失败）。
- 模型说明：按住亮、松开灭为实现选择，非详细稿规定；真实性说明：模拟模型，非真实硬件运行，真实接线须断电、由老师或监护人指导。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；无真实硬件运行；R0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
