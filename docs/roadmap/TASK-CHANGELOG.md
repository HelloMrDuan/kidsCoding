# KidsCoding 逐任务交付记录（追加式日志）

> 每次**完成一个**任务就增加一条，旧记录不可悄悄改写。此文件与 JSON 任务状态互相印证；PR/CI 链接、真实代码与审核结果才是完成证据。
>
> 本次新增追踪制度对应 `OPS-001`，PR #25 已合并 main 且原7项课程CI和新增task-ledger均成功，**本文件已追加 completed 记录**。该记录更新本身属于 OPS-001 的完工收尾，而不是开始新的功能任务。

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-11 | OPS-001 | 建立产品任务和432逐课总账、单任务制度、GitHub校验（待PR验收） | [#25](https://github.com/HelloMrDuan/kidsCoding/pull/25) | 待填 | 待填 | in_review；PR CI与合并后main CI待验收 |
| 2026-10-11 | OPS-001 | **交付完成**：61条产品任务、432条逐课任务、一次一任务规则；PR CI 8/8、main CI 8/8 通过（其中课程7项+追踪1项） | [#25](https://github.com/HelloMrDuan/kidsCoding/pull/25) | `1dd292d9d0abe780ffdf8e12ff6b798fd110a133` | [课程主CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38101243423) / [追踪主CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38101243415) | **completed**；下一项 OPS-002，432课仍全部todo |

## 每次完成后的记录模板
```markdown
| YYYY-MM-DD | TASK-ID | 真正实现的功能/课程/页面与正反验收摘要 | https://github.com/.../pull/N | full SHA | https://github.com/.../actions/runs/N | completed；剩余缺口/下一个Task-ID |
```
- 若验收不通过：状态改为 blocked/in_review，写出原因、需要的权限或日志、下次复验标准，不填写不存在的SHA或假CI。

## EDU-101 执行记录

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-11 | EDU-101 | 本地实施第10课双角色独立坐标/动作、真Blockly目标验证、漏切换错误练习与修复、预测复盘、可修改本机作品；集中验收证据见 evidence/EDU-101 | 待正式PR创建后回填 | 待合并 | 待main验收 | in_progress；仅本任务，第11/12课仍todo；不宣称人工教研或生产发布完成 |
