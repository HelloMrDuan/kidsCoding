# R0-U4-L01《校园节能观察》证据说明（第一阶段）

- 台账：R0-U4-L01，知识点 迭代，前置 R0-U3-L06，状态 todo→in_review（本 PR），detailAssetPresent=false。
- 依据：仅台账标题、知识点与通用验收；main 上无 R0 详细稿，全部地点、亮灯数与用电量为实现选择、课堂举例数字，不是真实校园数据，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/r0/energy_executor.py`
  - `examples/blockly/r0/test_energy_executor.py`
  - `docs/roadmap/evidence/R0-U4-L01/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/R0-U4-L01/README.md`
- 本地测试：`python3 -m unittest test_energy_executor -v`，13 个测试首跑全部通过（正确观察、练习 B 亮灯不变仍省电、用电量上升失败、亮灯数上升失败、无改进失败、总结不匹配失败、亮灯数为负失败、轮数不足失败、缺地点失败、缺总结失败、拓展四轮通过、保存重开一致、缺开始事件失败）。
- 真实性说明：记录模型，举例数字，非真实测量；真实观察只能在老师带领下看和数，绝不碰电气设备。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；无真实测量；无真实校园数据；R0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
