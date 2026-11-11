# R0-U1-L06《制作电子欢迎牌》证据说明（第一阶段）

- 台账：R0-U1-L06，知识点 安全，前置 R0-U1-L05，状态 todo→in_review（本 PR），detailAssetPresent=false。
- 依据：仅台账标题、知识点与通用验收；main 上无 R0 详细稿，全部标题、引脚、音符与安全检查项为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/r0/sign_executor.py`
  - `examples/blockly/r0/test_sign_executor.py`
  - `docs/roadmap/evidence/R0-U1-L06/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/R0-U1-L06/README.md`
- 本地测试：`python3 -m unittest test_sign_executor -v`，11 个测试通过，但非首跑：首跑 4 个报错（安全检查字典与集合直接比较的 bug），已修正为集合比较并重跑通过，详见 LESSON-DESIGN.md；不得说成首跑通过。测试覆盖：正确牌子、练习 B 换牌子、安全项不通过失败、缺安全项失败、缺标题失败、音符不足失败、无按下展示失败、接线前按下失败、拓展两颗 LED 通过、保存重开一致、缺开始事件失败。
- 安全说明：模拟模型，非真实硬件运行，不发声，模拟通过不等于真实电路安全；真实动手须监督、断电接线、手干、规定电压。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；无真实硬件运行；无真实声音；无真实安全认证；R0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
