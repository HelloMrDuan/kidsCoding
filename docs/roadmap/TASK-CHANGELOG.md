# KidsCoding 逐任务交付记录（追加式日志）

> 每次**完成一个**任务就增加一条，旧记录不可悄悄改写。此文件与 JSON 任务状态互相印证；PR/CI 链接、真实代码与审核结果才是完成证据。
>
> 本次新增追踪制度对应 `OPS-001`，目前 PR/合并后 CI 仍需验收，**不能提前记作 completed**。完工后由同一任务的收尾 PR 记录最终提交与 main CI。

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-11 | OPS-001 | 建立产品任务和432逐课总账、单任务制度、GitHub校验（待PR验收） | 待填 | 待填 | 待填 | in_review；完成证据待合并后补记 |

## 每次完成后的记录模板
```markdown
| YYYY-MM-DD | TASK-ID | 真正实现的功能/课程/页面与正反验收摘要 | https://github.com/.../pull/N | full SHA | https://github.com/.../actions/runs/N | completed；剩余缺口/下一个Task-ID |
```
- 若验收不通过：状态改为 blocked/in_review，写出原因、需要的权限或日志、下次复验标准，不填写不存在的SHA或假CI。
