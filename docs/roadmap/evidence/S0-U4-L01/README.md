# S0-U4-L01《简单威胁模型》证据说明（第一阶段）

- 台账：S0-U4-L01，知识点 威胁建模，前置 S0-U3-L06，状态 todo→in_review（本 PR），detailAssetPresent=false。
- 依据：仅台账标题、知识点与通用验收；main 上无 S0 详细稿，全部情景与数值为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/s0/threat_executor.py`
  - `examples/blockly/s0/test_threat_executor.py`
  - `docs/roadmap/evidence/S0-U4-L01/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/S0-U4-L01/README.md`
- 本地测试：`python3 -m unittest test_threat_executor -v`，10 个测试首跑全部通过（正确模型、练习 B 换资产、仅 1 条威胁失败、缺防护失败、方法重复失败、缺资产失败、缺检查失败、拓展第 3 条威胁通过、保存重开一致、缺开始事件失败）。
- 安全说明：全部情景虚构，不用真实账号与真实个人信息，角色为通用角色，防护为课堂习惯；本模型是课堂思考工具，不是真实安全保证，拿不准问老师或监护人。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；S0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
