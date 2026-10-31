# R0-U1-L04《蜂鸣器播放旋律》证据说明（第一阶段）

- 台账：R0-U1-L04，知识点 执行器，前置 R0-U1-L03，状态 todo→in_review（本 PR），detailAssetPresent=false。
- 依据：仅台账标题、知识点与通用验收；main 上无 R0 详细稿，全部引脚、音符、拍数与旋律为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/r0/buzzer_executor.py`
  - `examples/blockly/r0/test_buzzer_executor.py`
  - `docs/roadmap/evidence/R0-U1-L04/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/R0-U1-L04/README.md`
- 本地测试：`python3 -m unittest test_buzzer_executor -v`，11 个测试首跑全部通过（正确旋律、练习 B 换旋律、错音符失败、拍数为 0 失败、音符不足失败、缺播放失败、播放后加音符失败、错引脚失败、拓展六个音通过、保存重开一致、缺开始事件失败）。
- 真实性说明：模拟模型，不发声、非真实硬件运行；真实接线须断电、由老师或监护人指导。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；无真实硬件运行；无真实声音；R0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
