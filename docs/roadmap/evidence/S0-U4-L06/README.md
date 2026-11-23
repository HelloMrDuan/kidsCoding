# S0-U4-L06《制作班级数字安全指南》证据说明（第一阶段）

- 台账：S0-U4-L06，知识点 恢复，前置 S0-U4-L05，状态 todo→in_review（本 PR），detailAssetPresent=false。
- 依据：仅台账标题、知识点与通用验收；main 上无 S0 详细稿，全部标题、主题与参与者为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/s0/guide_executor.py`
  - `examples/blockly/s0/test_guide_executor.py`
  - `docs/roadmap/evidence/S0-U4-L06/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/S0-U4-L06/README.md`
- 本地测试：`python3 -m unittest test_guide_executor -v`，10 个测试首跑全部通过（正确指南、练习 B 换指南、仅 3 个主题失败、主题重复失败、缺恢复主题失败、仅 1 名参与者失败、缺检查失败、拓展第 5 个主题通过、保存重开一致、缺开始事件失败）。
- 安全说明：指南是课堂提醒，不是真实安全政策；不写真实个人信息；真实问题请老师或监护人处理。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；S0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
