# S0-U4-L03《备份作品文件》证据说明（第一阶段）

- 台账：S0-U4-L03，知识点 备份，前置 S0-U4-L02，状态 todo→in_review（本 PR），detailAssetPresent=false。
- 依据：仅台账标题、知识点与通用验收；main 上无 S0 详细稿，全部作品名、内容与备份地点为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/s0/backup_executor.py`
  - `examples/blockly/s0/test_backup_executor.py`
  - `docs/roadmap/evidence/S0-U4-L03/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/S0-U4-L03/README.md`
- 本地测试：`python3 -m unittest test_backup_executor -v`，11 个测试首跑全部通过（正确备份、练习 B 换作品、仅 1 份作品失败、内容不一致失败、备份不存在作品失败、缺备份失败、重复备份失败、缺检查失败、拓展第 3 份作品通过、保存重开一致、缺开始事件失败）。
- 安全说明：课堂模拟，不复制、不移动、不删除真实文件；真实备份须请老师或监护人一起做并打开备份核对。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；S0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
