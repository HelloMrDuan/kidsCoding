# S0-U4-L02《认识软件更新》证据说明（第一阶段）

- 台账：S0-U4-L02，知识点 威胁建模，前置 S0-U4-L01，状态 todo→in_review（本 PR），detailAssetPresent=false。
- 依据：仅台账标题、知识点与通用验收；main 上无 S0 详细稿，全部应用名与版本号为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/s0/update_executor.py`
  - `examples/blockly/s0/test_update_executor.py`
  - `docs/roadmap/evidence/S0-U4-L02/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/S0-U4-L02/README.md`
- 本地测试：`python3 -m unittest test_update_executor -v`，10 个测试首跑全部通过（正确更新、练习 B 换应用、来源不明失败、旧版本失败、缺修补说明失败、检查版本不一致失败、更新后打不开失败、拓展两次连续更新通过、保存重开一致、缺开始事件失败）。
- 安全说明：课堂模拟，不下载、不安装、不改动真实软件；真实更新须请老师或监护人检查、只用官方来源。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；S0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
