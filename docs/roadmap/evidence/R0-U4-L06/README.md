# R0-U4-L06《创客作品答辩》证据说明（第一阶段）

- 台账：R0-U4-L06，知识点 展示，前置 R0-U4-L05，状态 todo→in_review（本 PR），detailAssetPresent=false，R0-U4 单元收官课、R0 轨道收官课。
- 依据：仅台账标题、知识点与通用验收；main 上无 R0 详细稿，全部作品、陈述、问题与回答为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/r0/defense_executor.py`
  - `examples/blockly/r0/test_defense_executor.py`
  - `docs/roadmap/evidence/R0-U4-L06/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/R0-U4-L06/README.md`
- 本地测试：`python3 -m unittest test_defense_executor -v`，13 个测试首跑全部通过（正确答辩、练习 B 另一件作品、陈述不足失败、问题不足失败、无失败类问题失败、回答数不匹配失败、陈述无证据失败、回答为空失败、反思提前失败、缺反思失败、拓展三轮通过、保存重开一致、缺开始事件失败）。
- 真实性说明：答辩脚本模型，不进行真实答辩、不给任何人打分；真实答辩是老师带领的课堂活动，问题善意、答错不丢人。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；无真实答辩；R0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
