# R0-U4-L05《制作演示视频》证据说明（第一阶段）

- 台账：R0-U4-L05，知识点 展示，前置 R0-U4-L04，状态 todo→in_review（本 PR），detailAssetPresent=false。
- 依据：仅台账标题、知识点与通用验收；main 上无 R0 详细稿，全部标题、镜头、解说词与时长为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/r0/demo_executor.py`
  - `examples/blockly/r0/test_demo_executor.py`
  - `docs/roadmap/evidence/R0-U4-L05/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/R0-U4-L05/README.md`
- 本地测试：`python3 -m unittest test_demo_executor -v`，13 个测试首跑全部通过（正确演示、练习 B 另一件作品、总时长超长失败、总时长太短失败、缺镜头类型失败、首镜头不是介绍失败、时长非正数失败、解说词为空失败、监护人不同意失败、同意前发布失败、拓展四个镜头通过、保存重开一致、缺开始事件失败）。
- 真实性说明：分镜头脚本模型，不真正拍摄、剪辑或发布视频；真实拍摄须监护人同意，不拍别人、不公开。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；无真实拍摄的视频；R0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
