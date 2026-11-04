# S0-U4-L05《理解日志与异常》证据说明（第一阶段）

- 台账：S0-U4-L05，知识点 恢复，前置 S0-U4-L04，状态 todo→in_review（本 PR），detailAssetPresent=false。
- 依据：仅台账标题、知识点与通用验收；main 上无 S0 详细稿，全部日志内容与恢复办法为实现选择，见 LESSON-DESIGN.md。
- 文件：
  - `examples/blockly/s0/log_executor.py`
  - `examples/blockly/s0/test_log_executor.py`
  - `docs/roadmap/evidence/S0-U4-L05/LESSON-DESIGN.md`
  - `docs/roadmap/evidence/S0-U4-L05/README.md`
- 本地测试：`python3 -m unittest test_log_executor -v`，10 个测试首跑全部通过（正确读日志、练习 B 换日志、凭空诊断失败、warning 当异常失败、无异常日志失败、日志不足失败、未知恢复办法失败、拓展两条异常通过、保存重开一致、缺开始事件失败）。
- 安全说明：日志均为虚构课堂示例，不含真实个人信息；真实异常请老师或监护人看，不要自己乱改设置。
- 未完成项：不是网页课堂可玩课程；无独立教研评审；无儿童试学；S0 详细稿缺失待主架构补齐后复核。本课不得标 completed。
- CI：待复查，不得以任务台账通过冒充课程验收通过。
