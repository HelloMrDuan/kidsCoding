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
| 2026-10-11 | EDU-101 | 功能集中提交，121单测与30条Chrome、生产构建/lint/台账通过；功能head `af62e13c84888353c816fba104f9e1b4c1d0998a` | [#27](https://github.com/HelloMrDuan/kidsCoding/pull/27) | 待合并 | 待main验收 | in_review；真实PR URL本机记录，CI通过后随同一任务收尾记录PR回填，避免重复功能推送 |
| 2026-10-11 | EDU-101 | PR #27 CI 8/8全绿且mergeable clean，已合并功能 | [#27](https://github.com/HelloMrDuan/kidsCoding/pull/27) | `25e41b482ef33bf53bc4c040cc8a1b5be5e9a5d7` | [课程main检查中](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38104195809) / [台账main通过](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38104195800) | merged_waiting_ci；记录本机待同任务收尾PR回填 |
| 2026-10-11 | EDU-101 | **工程交付完成**：双角色独立坐标/动作、真Blockly结果核验、观察预测/两目标练习/漏切换纠错/分层提示/反思、可修改本机作品；121单测、Chrome30条、PR/main各8/8通过 | [#27](https://github.com/HelloMrDuan/kidsCoding/pull/27) | `25e41b482ef33bf53bc4c040cc8a1b5be5e9a5d7` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38104195809) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38104195800) | **completed**；下项EDU-102小熊对白。人类教研/儿童试学/真实硬件/生产部署未验收；11/12课及432课状态未提前完成 |

## EDU-102 执行记录

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-11 | EDU-102 | 基于已验收main `c6d893f90c00a8d5939bd7aeb23c9bf7f18d7bd9`领取第11课独立对白、错角色教学、可修改作品与三屏Chrome验收 | 待正式PR | 待合并 | 待main验收 | in_progress；仅本任务，EDU-103保持todo |
| 2026-10-11 | EDU-102 | 本地集中验收：135单测、38实际Chrome、最终生产构建/lint/单任务台账通过；第11课独立对白/错角色修复/可改作品/三屏截图 | 待创建真实PR | 待合并 | 待main验收 | in_progress；人类评分/儿童试学/生产发布未验收，EDU-103未实施 |
| 2026-10-11 | EDU-102 | 一次集中功能提交，135单测/38真实Chrome/生产构建/lint/台账通过，head `a7cde9e456b3cb73cc371e3457328a29703196d0` | [#29](https://github.com/HelloMrDuan/kidsCoding/pull/29) | 待合并 | 待main验收 | in_review；真实URL本机记录，CI通过后随同任务收尾PR回填 |
| 2026-10-11 | EDU-102 | PR #29 CI 8/8全绿、mergeable clean，功能已合并 | [#29](https://github.com/HelloMrDuan/kidsCoding/pull/29) | `1f4b55fa3ec7a87243e954c3bafdccc504fddf24` | [课程main检查中](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38107147501) / [台账main检查](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38107147455) | merged_waiting_ci；记录本机，待同任务收尾PR回填 |
| 2026-10-11 | EDU-102 | **工程交付完成**：小熊独立对白/角色状态、真Blockly结果判定、预测/两目标实操/错角色修复/三层提示/复盘、可改本机作品；135单测、38真实Chrome、PR/main各8/8通过 | [#29](https://github.com/HelloMrDuan/kidsCoding/pull/29) | `1f4b55fa3ec7a87243e954c3bafdccc504fddf24` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38107147501) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38107147455) | **completed**；下项EDU-103毕业作品。人类教研/UX评分、儿童试学/真实硬件/生产发布未验收；432课及EDU-103未提前完成 |
| 2026-10-11 | EDU-103 | 领取第12课真实毕业寻宝：独立100/200步、错误实验、两种方案与作品重开/重复领奖 | 待提交 | 待合并 | 待验收 | in_progress；仅此任务 |
| 2026-10-11 | EDU-103 | 本地集中验收：154单测、48真实Chrome、生产构建/TypeScript、lint及单任务台账通过；12张三屏前后/错误/重开作品证据 | 待创建PR | 待合并 | 待main验收 | in_progress；人类评分/试学/生产发布未验收 |
| 2026-10-11 | EDU-103 | 真实功能PR创建，154单测/48 Chrome/12截图；功能分支一次集中推送 | [#31](https://github.com/HelloMrDuan/kidsCoding/pull/31) | 待合并 | 待验收 | in_review；PR URL本地回填，收尾记录提交 |
| 2026-10-11 | EDU-103 | 功能PR CI 8/8且无阻塞后合并，等待main复核 | [#31](https://github.com/HelloMrDuan/kidsCoding/pull/31) | `a43043b95706f002dc7bb304be72aac6c933d3c7` | 待main验收 | merged_waiting_ci |
| 2026-10-11 | EDU-103 | **工程交付完成**：真实fox100/bear200毕业礼物、重复隔离/两方案/错误修复/可改本机作品/重复领奖；154单测、48 Chrome、12截图、PR/main各8/8全绿 | [#31](https://github.com/HelloMrDuan/kidsCoding/pull/31) | `a43043b95706f002dc7bb304be72aac6c933d3c7` | [课程main](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38112165402) / [台账main](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38112165401) | **completed**；下项SYS-101。人类质量/试学/实体手机/生产发布未验收 |

## UX-001 设计基线冻结（本任务开发尚未完成）

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-11 | UX-001 | 项目方认可 V2 视觉方向；归档10页可交互HTML、可离线单文件原型、10项原创演示素材及Codex实施规范。没有改动任何业务界面或课程状态 | 本次设计归档PR，创建后见GitHub | 待本次设计归档合并 | 待本次设计归档主CI | in_progress；UX-001 设计tokens代码、对比度测试、三端真实业务截图均未实施，不得标 completed |

| 2026-10-11 | UX-001 | 确认设计 PR #33 合并与 main CI 8/8；开始冻结规则、V2 真实 tokens 和基础 CSS 实施，负责人裁定保留原型文字颜色并记录 AA 缺口 | [设计 #33](https://github.com/HelloMrDuan/kidsCoding/pull/33) | 2ab0687a908af41891794aa45d83d41fea7b434a | [基线 main](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38129176212) / [台账](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38129176215) | in_progress；全 AA 未满足，不标 completed，不领取 UX-002 |
| 2026-10-11 | UX-001 | 本地真实 V2 tokens/基础 CSS/冻结规则实施；160 单测、52 真 Chrome、33 三屏对照图、生产构建/TypeScript/lint/单任务台账通过 | 待正式 PR | 待合并 | 待 main | in_progress；严格保留冻结色，完整 AA 缺口未关闭，不标 completed，不领取其他任务 |
| 2026-10-11 | UX-001 | 冻结 V2 基础正式 PR；160 单测、52 真 Chrome、33 截图，功能分支一次推送 | [#34](https://github.com/HelloMrDuan/kidsCoding/pull/34) | 待合并 | 待验收 | in_review；完整 AA 未达，不标 completed |
| 2026-10-11 | UX-001 | 功能 PR 8/8 全绿、无阻塞后合并，等待 main 复核 | [#34](https://github.com/HelloMrDuan/kidsCoding/pull/34) | `ee1cddaa63f8baf3db57b873930a3f25461a83ec` | 待 main | merged_waiting_ci；AA 验收缺口仍未关闭 |
| 2026-10-11 | UX-001 | V2 真实 tokens/基础 CSS/永久冻结规则完成；160 单测、52 Chrome、33 截图；PR/main 各8/8成功 | [#34](https://github.com/HelloMrDuan/kidsCoding/pull/34) | `ee1cddaa63f8baf3db57b873930a3f25461a83ec` | [课程 main](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38132983377) / [台账 main](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38132982986) | **completed（基础工程）**；按负责人裁定保留原型色并记录 AA 缺口，不宣称全 AA、十页迁移或生产发布；下一项 UX-002 未领取 |

## UX-002 统一按钮状态与错误反馈组件

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-14 | UX-002 | 已领取并开始实现：Button/StatusTag/FeedbackPanel 三组件 + 单元测试 + 真实 Chrome E2E；视觉严格取自原型 .button/.chip/.stage-feedback，未改布局与色板 | 待正式 PR | 待合并 | 待验收 | in_progress；仅此任务，UX-003 保持 todo；PR 创建后回填 in_review |
| 2026-10-14 | UX-002 | 功能 PR 创建：Button/StatusTag/FeedbackPanel 三组件 + 单元测试 + 真实 Chrome E2E；20 单元测试、8 真实 Chrome（UX-002 4 条 + v2-tokens 4 条）、生产构建/lint 通过 | [#36](https://github.com/HelloMrDuan/kidsCoding/pull/36) | 待合并 | 待验收 | in_review；workflow 文件因 App 无 Workflows 权限由负责人网页编辑补齐，内容已验对；未合并，未标 completed |
| 2026-10-14 | UX-002 | **工程交付完成**：Button/StatusTag/FeedbackPanel 三组件 + 单元测试 + 真实 Chrome E2E；20 单测、8 真 Chrome、PR/main 各 8/8 通过；错误 chip 按 chip 模式从冻结 danger 色推导已在 PR 明示 | [#36](https://github.com/HelloMrDuan/kidsCoding/pull/36) | `132aa4f099905c719c88251e15b80a543fdf8909` | [课程 main](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38533655342) / [台账 main](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38533659641) | **completed**；业务页面未改接，AA 缺口仍未关闭，不宣称全 AA；下一项 UX-003 未领取 |

## UX-003 统一任务卡、进度与故事组件

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-14 | UX-003 | 已领取并开始实现：StoryDialog 内联故事引导 + LessonCard 地图 .step 节点 + ProgressTrack 课堂进度 + 单元测试 + 真实 Chrome E2E；视觉严格取自 V2 课堂面板，未改布局与色板，未改解锁规则 | 待正式 PR | 待合并 | 待验收 | in_progress；仅此任务；PR 创建后回填 in_review |
| 2026-10-14 | UX-003 | 功能 PR 创建：三个真实 React 组件 + 单元测试 + 真实 Chrome E2E；29 单元测试、11 真实 Chrome（三视口）、生产构建/lint 通过；三张三端截图已入库（提交 8dccede） | [#38](https://github.com/HelloMrDuan/kidsCoding/pull/38) | 待合并 | 待验收 | in_review；PR CI 8/8 全绿、无冲突；未合并，未标 completed |
| 2026-10-15 | UX-003 | **工程交付完成**：StoryDialog 内联故事引导、LessonCard 地图 .step 节点、ProgressTrack 课堂进度（位置与完成数区分）；29 单测、11 真 Chrome、PR/main 各 8/8 通过；三张三端截图已入库并 SHA-256 核对 | [#38](https://github.com/HelloMrDuan/kidsCoding/pull/38) | `d6624b4de3f940fa57d44641661616aea0bb735a` | [课程 main](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38659599006) / [台账 main](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38659599021) | **completed**；解锁业务未改，留给 UX-102；5 项 supabase Windows 路径失败为既有遗留，不属本轮修复 |

## UX-101 学习地图四单元分区

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-15 | UX-101 | 已领取并开始实现：左侧四单元列表 + 右侧章节地形图 + 当前单元三节课时节点；复用 map-terrain.svg 与 UX-003 LessonCard；真实课程数据驱动切换 | 待正式 PR | 待合并 | 待验收 | in_progress；仅此任务；PR 创建后回填 in_review |
| 2026-10-15 | UX-101 | 功能 PR 创建：AdventureMap + MapView 真实数据适配 + kc-map-* 样式；15 单测、6 真实 Chrome E2E；workflow 接线与证据图提交由后续提交补齐 | [#40](https://github.com/HelloMrDuan/kidsCoding/pull/40) | 待合并 | 待验收 | in_review；PR CI 8/8 全绿、无冲突；未合并，未标 completed |
| 2026-10-15 | UX-101 | **工程交付完成**：四单元切换、12 节真实链接、真实进度状态、不自动锁定；15 单测、6 真 Chrome、PR/main 各 8/8 通过；六张证据图已入库并逐个 blob SHA 核对；V2 视觉对比已按持续开发授权完成；E2E 抓出的 useState 默认值冻结 bug 已修 | [#40](https://github.com/HelloMrDuan/kidsCoding/pull/40) | `153b22453b20af368ffe2e22153c02395399bfc1` | [课程 main](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38673730227) / [台账 main](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38673730285) | **completed**；解锁业务未改，留给 UX-102；5 项 supabase Windows 路径失败为既有遗留，不属本轮修复 |

## UX-102 地图节点与真实进度解锁

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-15 | UX-102 | 已领取并开始实现：真实访问规则 + 权益查询 + locked 优先状态 + 锁关拦截复用 + 权益变化重拉；先核实真实数据来源（12 节全 trial，无锁定节点；无未发布数据来源） | 待正式 PR | 待合并 | 待验收 | in_progress；仅此任务；PR 创建后回填 in_review |
| 2026-10-15 | UX-102 | 功能 PR 创建：useCourseAccess + MapView locked 优先 + AdventureMap/页头 CTA 跳过 locked；7 新增单测、7 真实 Chrome E2E；workflow 接线由负责人在网页编辑器补齐（提交 e7b15fa） | [#42](https://github.com/HelloMrDuan/kidsCoding/pull/42) | 待合并 | 待验收 | in_review；PR CI 8/8 全绿、无冲突；未合并，未标 completed |
| 2026-10-15 | UX-102 | **工程交付完成**：真实规则驱动的 locked/completed/current/available；7 新增单测、22 相关单测、7 真 Chrome、PR/main 各 8/8 通过；CI 产物三张截图已下载核对；真实数据截图与 UX-101 证据图字节相同，零视觉回归 | [#42](https://github.com/HelloMrDuan/kidsCoding/pull/42) | `61ea5c06cce6c60441c9be14b8379d2ad0f4e124` | [课程 main](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38692383919) / [台账 main](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38692384158) | **completed**；学员侧无未发布数据来源，地图不伪造未发布节点；锁屏既有文案未改；5 项 supabase Windows 路径失败为既有遗留，不属本轮修复 |

## UX-103 地图曲线连线与重点关卡（方案 A）

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-15 | UX-103 | 已领取并核对 V2 基线：原型连线为直线（非曲线），当前实现已逐字抄入；冻结设计冲突（任务要曲线 vs 原型直线）已提交差异与两方案，等待负责人裁决，未擅自写实现代码 | 待裁决 | 待定 | 待验收 | blocked；等裁决 |
| 2026-10-15 | UX-103 | 负责人裁决：方案 A——按冻结 V2，保留直线连线 + 补回归测试；“曲线连线”不实施，“重点关卡”即原型已有 current 突出，不新发明标记 | 待正式 PR | 待定 | 待验收 | in_progress；零视觉改动 |
| 2026-10-15 | UX-103 | 功能 PR 创建：新增 ux-103.spec.ts（6 E2E：直线几何、12 节点路径、重点突出不遮挡触控）；workflow 接线由负责人在网页编辑器补齐（提交 41a41f1，差异仅 2 行） | [#44](https://github.com/HelloMrDuan/kidsCoding/pull/44) | 待合并 | 待验收 | in_review；等 PR CI |
| 2026-10-15 | UX-103 | **工程交付完成**：PR CI 8/8，真实 Chrome Frozen V2 步骤 30 通过（含新增 6 项）；桌面截图与 UX-101/102 证据图字节相同，零视觉变化 | [#44](https://github.com/HelloMrDuan/kidsCoding/pull/44) | `86dede064902210a91c60d5e66dd5336e08d137c` | [课程 main](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38700761845) / [台账 main](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38700761829) | **completed**；曲线连线按裁决不实施，如未来要曲线需另行 V2 设计变更裁决 |

## UX-104 地图桌面平板手机适配（方案 A）

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-15 | UX-104 | 已领取并核对 V2 基线与实测：三端无溢出、返回滚动保持已生效；冻结设计冲突（任务要手机单列 vs 原型手机 3 列）已提交差异与两方案，等待负责人裁决，未擅自写实现代码 | 待裁决 | 待定 | 待验收 | blocked；等裁决 |
| 2026-10-15 | UX-104 | 负责人裁决：方案 A——按冻结 V2，手机保留 3 列 + 补三项回归证明；“手机单列地图”不实施 | 待正式 PR | 待定 | 待验收 | in_progress；零视觉改动 |
| 2026-10-15 | UX-104 | 功能 PR 创建：新增 ux-104.spec.ts（7 E2E：三端无溢出、三端滚动恢复、手机 3 列锁定）；workflow 接线由负责人在网页编辑器补齐（提交 42261d3，差异仅 2 行） | [#46](https://github.com/HelloMrDuan/kidsCoding/pull/46) | 待合并 | 待验收 | in_review；等 PR CI |
| 2026-10-15 | UX-104 | **工程交付完成**：PR CI 8/8，真实 Chrome Frozen V2 步骤 37 通过（含新增 7 项）；三端 main CI 截图已独立复核；CI 中 UX-104 与 UX-101 桌面截图字节不相同（抓取状态不同），不以字节一致作为证据；PR #46 零业务/CSS 改动 | [#46](https://github.com/HelloMrDuan/kidsCoding/pull/46) | `eeab8f99209da2b10f999d7bba7bfd489f34b50d` | [课程 main](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38709033183) / [台账 main](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38709033210) | **completed**；手机单列按裁决不实施，如未来要单列需另行 V2 设计变更裁决 |

## UX-105 学习地图真实浏览器视觉回归

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-15 | UX-105 | 已领取并做覆盖审计：空/部分/完成、锁定、奖励幂等、键盘切单元/CTA、手机触控三端均已有真实 spec 覆盖；确认真实缺口为键盘节点激活、Tab 顺序、平板触控、空进度截图，不重复造 spec | 待正式 PR | 待定 | 待验收 | in_progress；零视觉改动 |
| 2026-10-15 | UX-105 | 功能 PR 创建：新增 ux-105.spec.ts（5 E2E：键盘节点激活×2、Tab 顺序、平板触控、空进度截图）；workflow 接线由 ChatGPT 用 GitHub 工具完成（提交 056ca16，差异仅 2 行），无需负责人手动编辑 | [#48](https://github.com/HelloMrDuan/kidsCoding/pull/48) | 待合并 | 待验收 | in_review；等 PR CI |
| 2026-10-15 | UX-105 | **工程交付完成**：PR CI 8/8，真实 Chrome Frozen V2 步骤 42 通过（含新增 5 项）；PR CI 产物空进度截图已下载逐项核对（CI 来源哈希 f3aaf921…，与本地哈希分开记录，不混用）；零业务/CSS 改动 | [#48](https://github.com/HelloMrDuan/kidsCoding/pull/48) | `aa6393ba1c92692bb93cf848f13341c1e402d9cb` | [课程 main](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38718520283) / [台账 main](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38718520176) | **completed**；未引入快照基线比对（仓库无已提交基线机制）；台账 scope 旧文件名 learning-map-visual.spec.ts 与实际 ux-105.spec.ts 的差异已在 PR 中说明 |

## UX-201 课堂顶部任务进度与保存状态

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-16 | UX-201 | 已领取并实现：课堂顶部真实状态条（步骤 X / Y + 130px×5px 真实进度条 + 本机/云端保存状态区分）+ 重进恢复上次步骤 + 保存失败真实重试 + 云端失败重试/仅用本机继续；saveLessonDraft 返回 boolean，失败不显示成功；严格保持 V2 冻结课堂布局 | 待正式 PR | 待合并 | 待验收 | in_progress；仅此任务；PR 创建后回填 in_review |
| 2026-10-16 | UX-201 | 功能 PR 创建：状态条 + 保存状态 + 恢复逻辑 + ux-201.spec.ts（5 E2E）；Workflow 接线由 ChatGPT 用 GitHub 工具完成（提交 4832343，差异仅路径触发 + Frozen V2 命令 2 行），此前 403 为 Muse GitHub App 无 Workflows 权限 | [#50](https://github.com/HelloMrDuan/kidsCoding/pull/50) | 待合并 | 待验收 | in_review；首轮 PR CI 7/8，scratch-real-vm-browser duo 失败并含 React #418，未合并，未标 completed |
| 2026-10-16 | UX-201 | **React #418 修复**：根因为 useState 初始化器渲染时读 sessionStorage（恢复步骤 + 保存状态），SSR 渲染第 1 步/未保存，客户端水合渲染不同文本；duo 测试保存后 reload() 触发。修复（远程 a088a4d）：首渲染不读存储，水合后 microtask 恢复，功能未回退；本地 A/B：原始代码有 #418，修复后无 #418；修复后 PR CI 8/8 | [#50](https://github.com/HelloMrDuan/kidsCoding/pull/50) | 待合并 | 待验收 | in_review；PR CI 8/8 全绿、无冲突 |
| 2026-10-16 | UX-201 | **工程交付完成**：PR CI 8/8，真实 Chrome Frozen V2 步骤 47 通过（含新增 5 项）；duo 桌面 34 通过 + 手机端 13 通过；main CI 产物三张 UX-201 三端截图已下载逐张核对（步骤 1/5、20% 蓝条、绿色“已保存到本机”，无溢出；CI 哈希桌面 747233d6…、平板 499a65d6…、手机 ac3f8ecf…，与本地哈希分开记录，不混用） | [#50](https://github.com/HelloMrDuan/kidsCoding/pull/50) | `3ed6fd084d7d27b1c0261c36584156e95c877da4` | [课程 main](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38863681676) / [台账 main](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38863681655) | **completed**；`Failed to fetch` 已定位为 Blockly 音效 mp3 外部请求在沙箱代理失败（装饰性，不影响保存/同步，CI 无此问题）；5 项 Supabase CLI 单测失败为沙箱既存环境问题，与本任务无关；草稿仍为 sessionStorage，只声称“本机” |

## UX-202 课堂任务舞台积木三域布局

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-17 | UX-202 | **交付完成**：三域布局首版（PR #52）+ 冻结 V2 视觉对齐（紧凑标题行、课时条内进度/保存、扁平任务栏、舞台底部运行/重置）；舞台改用真实卡通插画角色与 SVG 场景（无圆形占位）；Blockly 改为 zelos 圆润卡通积木、分类亮色+图标；vitest 124/124；三尺寸截图经负责人确认 | [#53](https://github.com/HelloMrDuan/kidsCoding/pull/53) | `698a3c8ea144f710b822697190f73fab140cb5f6` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39027595967) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39027595976) | **completed**；首页与全站 V2 外壳另行登记新任务 |

## UX-005 全站冻结V2外壳（左侧导航+顶栏）

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-17 | UX-005 | **交付完成**：全站冻结 V2 外壳（222px 深蓝侧栏 + 76px 顶栏 + 1180/860/600 响应式 + 手机抽屉/底部导航），学习/创作/家长页面共用；首页不在范围；app-shell 单测 3/3、UI+lessons 182/182；三端截图经负责人确认 | [#55](https://github.com/HelloMrDuan/kidsCoding/pull/55) | `ac1d6b0103669fdaab3d8b1e4f87780647528ec7` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39036102104) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39036102073) | **completed**；首页属 UX-601；地图儿童卡通化由 UX-106 完成，课程体系/作品中心等内页样式后续任务 |

## UX-106 学习地图儿童卡通化

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-17 | UX-106 | **交付完成**：学习地图儿童卡通化（卡通头图与小狐狸、单元吉祥物、按单元卡通世界封面、彩色圆形关卡节点+黄色小路）；状态与 testid 不回归；三端截图经负责人确认；儿童受众原则写入 VISUAL-LOCK.md | [#56](https://github.com/HelloMrDuan/kidsCoding/pull/56) | `77a52a649080d9859498de9e7237f9ed1cb4f014` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39037075751) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39037075778) | **completed**；课程体系、作品中心、卡册等内页的儿童卡通化后续逐页登记 |

## UX-601 首页成熟产品级真实体验入口

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-18 | UX-601 | **交付完成**：首页按冻结 V2 学习中心原型逐区实现（标题行、深色主卡+V2 插画、进度环+周打卡、三条插画路径卡、示例作品），纳入全站外壳；CTA 新用户→/onboarding/age、已开始→下一课；数字来自真实进度；三端截图经负责人确认 | [#59](https://github.com/HelloMrDuan/kidsCoding/pull/59) | `fbc8b681450ba477511611aacc61210ff2c5dd03` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39049278801) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39049278748) | **completed**；课程体系、作品中心、卡册等内页后续逐页对齐 V2 |

## UX-501 执行记录

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-18 | UX-501 | 课程体系页对齐冻结 V2 #page-catalog 并分页分层：路线列表每页 6 张插画路线卡+分页+方向筛选；路线详情页单元标签切换、每次只显示一个单元；手机端一行一条紧凑列表；如实标注 可体验/教案已备/规划中；三端截图无横向溢出，owner 确认 | [#61](https://github.com/HelloMrDuan/kidsCoding/pull/61) | `67fb94042de1354858cb565b5db9fe0b20101f93` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39084344835) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39084344848) | **in_progress**（页面部分已交付）；统一 L0–L5 成熟度数据源未建立（02-PHASED-DELIVERY P1.2） |

## OPS-003 执行记录

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-18 | OPS-003 | **交付完成**：比对遗留 PR #1 与 main，其舞台/执行器/运行门禁已由 #16 及 EDU-101~103、UX-202 更完整交付；旧分叉直接合并会删约 5.6 万行；决定关闭不移植，证据 evidence/OPS-003/pr1-closure.md；PR #1 已关闭留言，分支保留；owner 确认 | [#63](https://github.com/HelloMrDuan/kidsCoding/pull/63) | `0847cde2598c31ced1366939be95b7b03899822e` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39090066911) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39090066873) | **completed**；下一项 SYS-101 |

## SYS-101 执行记录

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-18 | SYS-101 | **交付完成**：12 节启蒙课 ↔ G0/G1 目录映射（launch-catalog-mapping.ts + evidence/SYS-101 映射表），逐课标注关系/目录课/共同概念/理由；评审全部为衔接、无替代；保留原 ID 与进度，432 不变，启蒙进度不自动完成目录课；22 项单测通过；owner 确认 | [#65](https://github.com/HelloMrDuan/kidsCoding/pull/65) | `3fc426881e7818be5af22b9d13ad62563d21345d` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39095422817) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39095422805) | **completed**；下一项 SYS-102（L0–L5 统一状态） |

## SYS-102 执行记录

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-18 | SYS-102 | **交付完成**：`lesson-maturity.ts` 为唯一 L0–L5 成熟度来源（大纲/详案/引擎/实验可试玩/验收/正式发布，逐级 fail-closed）；目录、详情、后台、`/api/curriculum/catalog` 统一读取，`playable` 仅 L5；L3=7 门目录实验课+12 节启蒙课，L4/L5=0；修正目录与详情试玩入口不一致；6 项新测试；三端截图 owner 确认 | [#67](https://github.com/HelloMrDuan/kidsCoding/pull/67) | `05ff515cee53281f1ca465cf90bf9c042f80401c` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39107647945) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39107647931) | **completed**；UX-501 的 L0–L5 依赖已满足 |

## UX-501 完成记录

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-18 | UX-501 | **交付完成**：V2 #page-catalog 分页分层（#61）+ 真实 L0–L5 状态（SYS-102 #67）：18 路线和每课显示统一成熟度，大纲课无可运行入口，三端无横向溢出 | [#61](https://github.com/HelloMrDuan/kidsCoding/pull/61) / [#67](https://github.com/HelloMrDuan/kidsCoding/pull/67) | `67fb94042de1354858cb565b5db9fe0b20101f93` / `05ff515cee53281f1ca465cf90bf9c042f80401c` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39084344848) / [L0–L5 main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39107647945) | **completed**；课程详情页 V2 改版另排期 |

## UX-301 完成记录

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-18 | UX-301 | **交付完成**：作品中心按冻结 V2 #page-portfolio 重做；`portfolio-works.ts` 只从真实存档生成作品卡（积木快照 + Python 本机/云端草稿），显示真实课程名、更新时间、积木数、来源（本机/本机+云端/仅云端）；封面为本课场景角色插画或孩子自己的代码，无示例图；无作品显示小狐狸空状态；每页 8 件分页、手机紧凑行；三端截图 owner 确认 | [#70](https://github.com/HelloMrDuan/kidsCoding/pull/70) | `7fb164cb4248c1fbccedea913d7215dd48e49ebd` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39113860472) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39113860452) | **completed**；账号云端暂只覆盖 Python 草稿，积木作品云端同步随账号绑定流程另行处理 |
