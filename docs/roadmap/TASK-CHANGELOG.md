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

## SYS-103 执行记录

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-18 | SYS-103 | 第1～9课 Blockly 关卡按可观察结果评测（触发、步数、场景及切换位置、对白及时机）；参考程序结果即目标，等价解通过、反例失败并给出原因、无法执行不授予完成；130 vitest 通过 | [#72](https://github.com/HelloMrDuan/kidsCoding/pull/72) | `1586e277a56c4523ac52335e2f7a0af7978e7a84` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39117380477) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39117380520) | **completed**；第10～12课沿用双角色坐标判定；下一项 TQ-001 |

## TQ-001 执行记录

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-18 | TQ-001 | 逐课教学审核表与评分工具：6维度100分（给分必附证据）、9条硬否决（fail/未核即不可候选）、运行证据模板、AI/非独立审核不能认定优质、最多支持 L4；空白模板与填写说明在 docs/roadmap/teaching-reviews/，CI 逐份复查 | [#74](https://github.com/HelloMrDuan/kidsCoding/pull/74) | `e2468f910e8441568f9edcc21f765e8cd8204b8e` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39121854087) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39121854090) | **completed**；未给任何真实课程打分；下一项 TQ-003 |

## TQ-003 执行记录

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-18 | TQ-003 | 用 TQ-001 审核表复核第10～12课：AI 参考分 79/78/85，九条硬否决均通过；修正第11课错误提示，10～12课提示合并为单一来源并加测试入 CI | [#76](https://github.com/HelloMrDuan/kidsCoding/pull/76) | `95af5b8cdc311d2ccf2b1f8f457efc96650833ee` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39126276497) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39126276515) | **completed**；分数仅 AI 参考，未经人工认证、无儿童试学；三课仍 L3。遗留：双角色补救、自述反思、开放创作、第11课练习A去重 |

## TQ-004 执行记录

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-18 | TQ-004 | 用 TQ-001 审核表复核 G0-U1-L01～L06：六节都是 L1 详案、不可玩，AI 参考分 33～35，触发两条硬否决；逐课缺陷与恢复计划见 evidence/TQ-004 | [#78](https://github.com/HelloMrDuan/kidsCoding/pull/78) | `f94809318b921d709cb7cba881c40deb52d8f403` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39130429176) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39130429095) | **blocked**；验收不通过。待引擎网格/方向/障碍/开门能力 → 教案重写 → 可玩课堂与单元作品后重新复核 |

## SYS-106 执行记录

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-19 | SYS-106 | G0 网格寻路引擎：网格移动、四方向与转向、石头/小河/边界碰撞、捡钥匙开门；卡通森林网格舞台；引擎能力登记（direction、path_obstacles 已实现） | [#80](https://github.com/HelloMrDuan/kidsCoding/pull/80) | `928aaba4d90fcd6a1d9d7acc1bd067515b13f7e2` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39176017943) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39176018058) | completed；G0-U1 仍不可玩，下一步按 TQ-001 重写六节教案并接入课堂，再重新复核 TQ-004 |

## EDU-104 执行记录

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-19 | EDU-104 | G0-U1-L01～L06 按 TQ-001 重写并接入网格引擎：每课 4 关（两关带着做、自己搭、修别人程序），专属诊断、三层提示、正反例；V2 三区课堂、本机保存与刷新重开；L06 单元作品“森林寻路卡”可保存、重开、真实回放；43 项教案测试 + 4 个真实浏览器 E2E | [#82](https://github.com/HelloMrDuan/kidsCoding/pull/82) | `32c86eafaf283db95961c168965ae4922c3c18a5` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39185196960) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39185196982) | completed；成熟度 L3 实验可试玩，不是正式发布；下一步重新执行 TQ-004 |

## TQ-004 重新复核记录

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-19 | TQ-004 | EDU-104 合并后重新复核 G0-U1-L01～L06：九条硬否决全部 pass；知识递进、两种练习、反例/分层提示、单元作品均有证据；AI 参考分 76～86 | [#84](https://github.com/HelloMrDuan/kidsCoding/pull/84) | `4c17c2fe8b2a9dc30f31a9127dc83f566c4ec391` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39188727805) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39188727586) | completed；仍是 L3 实验可试玩；打磨另立任务：语音朗读、反思收集、L01～L03 提到 80 分以上、儿童试学 |

## EDU-105 执行记录

| 日期 | Task-ID | 内容 | PR | 合并提交 | main CI | 状态 |
|---|---|---|---|---|---|---|
| 2026-10-19 | EDU-105 | G0-U1 打磨：说明/预测/诊断/提示/反思可中文语音朗读；失败时指出第几块积木；每课点选式反思判对错并保存；AI 参考再评 L01 82 / L02 82 / L03 80 / L04 85 / L05 85 / L06 89 | [#86](https://github.com/HelloMrDuan/kidsCoding/pull/86) | `26e4fcd56a0dfbc8ccf97eda4a7f57221bd90135` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39193424664) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39193424454) | completed；仍是 L3 实验可试玩；儿童试学计划待另立任务 |

## SYS-105 执行记录

| 日期 | Task-ID | 内容 | PR | 合并提交 | main CI | 状态 |
|---|---|---|---|---|---|---|
| 2026-10-19 | SYS-105 | 课程内容 schema 门禁：重复 ID、可玩课无运行器/路由/E2E/引擎能力、public 素材无原创或授权登记、关卡缺正反例均让 CI 失败；新增 asset-licenses-v1.json；19 节历史试玩课列为只减不增的正反例欠账 | [#88](https://github.com/HelloMrDuan/kidsCoding/pull/88) | `c6c092a195d7d4c1b26c28df23cc0eefe452fda0` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39197933515) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39197933462) | completed；解除 RELEASE-102、RELEASE-105 阻塞 |

## RELEASE-102 执行记录

| 日期 | Task-ID | 内容 | PR | 合并提交 | main CI | 状态 |
|---|---|---|---|---|---|---|
| 2026-10-19 | RELEASE-102 | 发布七门禁可追溯：每门须证据（仓库文件/本仓库 CI/PR）+审阅人+日期；仓库事实（运行器、E2E、正反例欠账、素材授权）不可被台账覆盖；拒绝 AI/实现者审阅；人审仅负责人且排最后；release-evidence-v1.json 覆盖 25 节试玩课，全部 0/7，L4/L5=0；后台逐课分页门禁卡，三端截图 owner 确认 | [#90](https://github.com/HelloMrDuan/kidsCoding/pull/90) | `15565b8c69c1d0eba118009e014e63ed11b3a9fa` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39210798648) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39210798588) | completed；解除 RELEASE-103 阻塞 |

## TQ-002 执行记录

| 日期 | Task-ID | 内容 | PR | 合并提交 | main CI | 状态 |
|---|---|---|---|---|---|---|
| 2026-10-19 | TQ-002 | 前 9 节 Blockly 课逐课审计（只审计不修复）：9 份审核记录 + 汇总/报告；AI 参考分 27～43 全部退回重做、保持 L3；均无两次不同动手、课内纠错、开放创作，作品仅 3/6/9 课弱；L02、L09 硬否决 rigid-answer；7 组修复建议 | [#93](https://github.com/HelloMrDuan/kidsCoding/pull/93) | `dd7521a777f7626b67335764c220b5796ae5f169` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39221458292) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39221458283) | completed |

## TQ-008 执行记录

| 日期 | Task-ID | 内容 | PR | 合并提交 | main CI | 状态 |
|---|---|---|---|---|---|---|
| 2026-10-19 | TQ-008 | 前 9 课课堂反馈：具体错因、提示 1→2→3、第三层补救按单元路由（含可操作练习）；L02 四句预设对白真实可选、L09 指令与判定一致；窄屏积木自适应缩放、第 4/5 课舞台角色名；正反例单测与 E2E。课程仍 L3 | [#95](https://github.com/HelloMrDuan/kidsCoding/pull/95) | `4f68b1b36936d5a39db70461d6c05aadd64e58cf` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39238711505) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39238711513) | completed |

## TQ-009 执行记录

| 日期 | Task-ID | 内容 | PR | 合并提交 | main CI | 状态 |
|---|---|---|---|---|---|---|
| 2026-10-20 | TQ-009 | 前 9 课积木语义与文案对齐：block-labels 单一来源（“向右走/飞 100 步”“重复：再走/飞 100 步”），第 1～12 课文案引用真实积木名、角色名一致，第 5 课去掉无用“说一句话”，课堂进度改称“关”，舞台显示已走步数、终点角色不重叠；地图返回滚动恢复（ux-104）。课程仍 L3 | [#97](https://github.com/HelloMrDuan/kidsCoding/pull/97) | `96bf91cb93881bfaa6261ebf6f658908e98815fb` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39405396354) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39405396336) | completed |

## TQ-010 执行记录

| 日期 | Task-ID | 内容 | PR | 合并提交 | main CI | 状态 |
|---|---|---|---|---|---|---|
| 2026-10-20 | TQ-010 | 前 9 课每课一个纠错关（TQ-002d）：mistake-steps 单一来源，第 1～9 课各替换一个重复关为“真实错误 → 观察 → 回答 → 修复”关（课程仍 5 关），积木区自动摆好错误程序、可“再摆一次错误程序”；设计内错误运行不显示“哎呀”框、不计入提示升级；重置类按钮（重置、再摆一次错误程序、补救页再排一次/再试一次、格子课回到起点）改用 aria-hidden SVG 图标替换“↺”；正反例单测、组件测试与 L01/L05/L07 纠错关 E2E。课程仍 L3 | [#99](https://github.com/HelloMrDuan/kidsCoding/pull/99) | `3b2dee21a032b69199e1156b31e729d410b7a632` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39429034193) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39429034297) | completed |

## TQ-011 执行记录

| 日期 | Task-ID | 内容 | PR | 合并提交 | main CI | 状态 |
|---|---|---|---|---|---|---|
| 2026-10-21 | TQ-011 | 前 9 课第二项不同练习与去重（TQ-002e）：practice-steps 单一来源，前 9 课每课 4 关：热身、主任务、不同目标的新练习（预测距离/比较顺序/比较开始时与被点击时）、纠错；删除重复关；积木区从顶部完整显示与手机宽度适配；L06 切换场景清气泡、草地独立背景；花园小花可见；正反例单测、组件测试与第二项练习 E2E。课程仍 L3，未经儿童试学 | [#101](https://github.com/HelloMrDuan/kidsCoding/pull/101) | `0e76f5456dca0cb4861cb4a0290e168395a0af62` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39571407684) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39571407732) | completed |

## OPS-006 执行记录

| 记录日期 | Task-ID | 实际成果 | PR | 合并 SHA | main CI | 状态及遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-21 | OPS-006 | 本地 Supabase CLI 路径助手改按目标平台拼路径（win32/posix），三个脚本测试的跨平台期望修正（精确相等断言未放宽）；Linux 受影响文件 13/13、全量 Vitest 661/661（修复前 656/661） | [#102](https://github.com/HelloMrDuan/kidsCoding/pull/102) | `2f26130b0a4b32d6b650fdabb756df3b07a847e1` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39571489646) / [台账main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39571489645) | **completed**；Windows 主机行为不变（宿主恒等于目标）；无遗留 |

## TQ-012 执行记录

| 日期 | Task-ID | 内容 | PR | 合并提交 | main CI | 状态 |
|---|---|---|---|---|---|---|
| 2026-10-21 | TQ-012 | 前 9 课单元作品（TQ-002f）：unit-projects 单一来源，第 1～9 课完成页作品可运行、可本机保存、可重开修改，替换静态预览；第 3/6/9 课孩子可选对白/在哪里说/先后顺序，两种不同方案都判为正确；改动后须重新运行通过才能保存，存储写满如实报错，未完成课堂不能打开作品；快照带所选对白并兼容旧快照；1440 保存区首屏、375 分页且无横向滚动；完成页/完成卡 V2 视觉；单测、组件测试与 unit-project E2E。课程仍 L3，未经儿童试学 | [#108](https://github.com/HelloMrDuan/kidsCoding/pull/108) | `768f29720cef4ae5bf4ac9f01f27dc1e4c53e37a` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39608931445) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39608931176) | completed |

## TQ-013 执行记录

| 日期 | Task-ID | 内容 | PR | 合并提交 | main CI | 状态 |
|---|---|---|---|---|---|---|
| 2026-10-22 | TQ-013 | 儿童隐私与云同步审查（TQ-002g 前半）：privacy-review 数据清单与 PIPL/《儿童个人信息网络保护规定》差距表（AI 整理，非法律意见）；/api/guest 字段白名单、类型校验 400、64 KB 上限 413、写库失败 502，客户端不再上传测评答案；迁移 202610220011 早期表全部启用 RLS、儿童数据本人只读、guest_snapshots 仅 service role、清除历史答案、30 天清理函数（有 pg_cron 时每日调度）；CI 真实 PostgreSQL 16 RLS 脚本；课堂/测评同步处如实告知（--kc-text，对比度 ≥4.5:1）。真实 Supabase 验证留 CLOUD-103，监护人同意/删除留 CLOUD-105；课程仍 L3 | [#110](https://github.com/HelloMrDuan/kidsCoding/pull/110) | `fe79d575a58e9c6f1b660f97bc7853c5b7f34c77` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39723835621) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39723835636) | completed |

## TQ-015 执行记录

| 日期 | Task-ID | 内容 | PR | 合并提交 | main CI | 状态 |
|---|---|---|---|---|---|---|
| 2026-10-22 | TQ-015 | 双角色判定统一与提示升级：第 10～12 课判定抽为纯函数 duo-judge（失败原因改儿童短句：还没切换角色/对白给错人/还差 100 步/重复切换没有用）；DuoStage 删除舞台手动提示按钮，运行失败上报课堂页按 1→2→3 升级，第 4 关故意犯错的观察运行不计失败；课堂 handleNext 修正（程序正确仅活动未完成时点完成不误计失败）；新增「角色切换」补救页 remedial-switch-character（kind=switch 互动练习），第 10～12 课三级提示路由至此；运行按钮/旗子/天空改 SVG；毕业礼物卡文案改短句；三个双角色 e2e 改为真实失败驱动提示层级断言并新增 tier-3 补救页 e2e。本任务接续另一工作副本交接（原 cd1d124 未推送），在 main bb77fed 上重建。本地沙箱 e2e 两类伪影（Blockly 音效 Failed to fetch、Pixel 7 可见性）已在 origin/main 对照复现；完成页作品提示问题留 TQ-019；课程仍 L3 | [#112](https://github.com/HelloMrDuan/kidsCoding/pull/112) | `4ce60da6c2bf8c122f2ac89c47f4e2dc4144f3d8` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39751772198) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39751772169) | completed |

## TQ-019 执行记录

| 日期 | Task-ID | 内容 | PR | 合并提交 | main CI | 状态 |
|---|---|---|---|---|---|---|
| 2026-10-22 | TQ-019 | 完成页双角色作品接入提示升级：DuoProject 新增失败计数，DuoStage 每次失败运行经 onRunFailure 上报（沿用舞台既有"每次失败只报一次"纪律），用与课堂相同的 buildHintState 与本课 hintLayers 渲染 kc-hint 提示卡，1→2→3 升级；第 3 级渲染补救链接卡，点击经 router 跳 /learn/remedial/<本课补救 id>?from=<课程>&step=step-3（第 10～12 课为 remedial-switch-character）；运行成功清零计数，编辑不重置；保存门槛不变（判定通过+复盘才可保存）。新增组件测试 3 例与真实流程 e2e（走完第 10 课→完成页删移动块→失败升至三级→点开补救页）；本地 vitest 全量 782 全过、三断点截图核验 tier=3。PR CI 前两轮均在最后一步 V2 CSS 视觉规格处被外部 cancelled（非失败、与改动文件无关），第三轮 8/8 全绿后合并；课程仍 L3 | [#114](https://github.com/HelloMrDuan/kidsCoding/pull/114) | `15358c92a7c1e29aaa0e66f65e2375f035471243` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39778229323) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39778229357) | completed |

## OPS-002 执行记录

| 日期 | Task-ID | 内容 | PR | 合并提交 | main CI | 状态 |
|---|---|---|---|---|---|---|
| 2026-10-23 | OPS-002 | 每批真实交付关联任务 ID：新建 .github/PULL_REQUEST_TEMPLATE.md，把单任务制度前置到写 PR 时——首行唯一 Task-ID 占位（占位文本不匹配任务 CI 正则，漏填必被拒）、变更范围须与台账 scope 一致的声明、成功/失败边界/恢复证据栏、台账确认与审核人检查清单（唯一编号、范围一致、证据真实、合并后复核 main CI）。任务 CI 的强制校验（恰一行 Task-ID、编号存在、状态非 todo、只改一个台账条目）已由 check-task-ledger.py 落地，本任务补上缺失的模板环节；本地模拟校验正例通过、无编号/双编号/占位原文三反例均被拒；PR #116 为首个按模板填写的真实 PR | [#116](https://github.com/HelloMrDuan/kidsCoding/pull/116) | `9b98ba7ba6fdfc6bbbd68cf44693ba84a1ef05ce` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39895205320) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39895205295) | completed |

## OPS-004 执行记录

| 日期 | Task-ID | 内容 | PR | 合并提交 | main CI | 状态 |
|---|---|---|---|---|---|---|
| 2026-10-23 | OPS-004 | 每批完成后刷新任务记录（收尾机制成文）：在 11-TASK-EXECUTION-POLICY.md 新增第 7 节——触发条件为功能 PR 合并且 main 双工作流全绿；收尾五步：取证（PR/合并 SHA/main CI 双链接逐个验可达）、从最新 main 开只改台账与日志的关账 PR（同一 Task-ID 声明）、回填 completed 与 evidence 全字段（reviewer 记授权来源、tests 分清本地/CI）、CHANGELOG 追加一行执行记录、关账合并后看 main CI 并从主分支原始文件读回复核。另含强制校验与审计口径（check-task-ledger.py 已强制 completed 证据字段；认领时审计 42 个已完成任务证据链 42/42 完整）与失败路径（main CI 红回 in_progress、写入中断先只读核查再重试、证据不足停 merged_waiting_ci/blocked）。本任务关账即按此五步执行的首个样本 | [#119](https://github.com/HelloMrDuan/kidsCoding/pull/119) | `39b0f6f5d10ebe8481fd7c22a9f576ac7f293789` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39913905709) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39913905673) | completed |

## OPS-005 执行记录

| 日期 | Task-ID | 内容 | PR | 合并提交 | main CI | 状态 |
|---|---|---|---|---|---|---|
| 2026-10-23 | OPS-005 | 历史已合并功能事实对照：01-REPO-BASELINE.md 从 2026-10-11 快照（采样 e745aa3）全面刷新至采样 main 412120d。PR 盘点经 API 实测：117 个已合并、#1 与 #104 关闭未合并、#117 开放中（运维线）；内容资产逐个文件计数（18 路线、72 单元、432 目录课仍全部 outline_not_playable、192 详案、72 毕业蓝图、12 启蒙不计入 432）；九大功能域对照表按「当前能力事实 × 台账状态」判定已完/部分/未完（启蒙 12 课链路、课堂地图 UX、教学机制、流程机制为已完；Scratch/Python 实验室、账号云同步、作品系统为部分；逐课台账 432 为未完，属既定口径非漏账）；发布口径单列（release-evidence 门禁基本 unchecked、RELEASE-103 待 ≥3 名儿童真实试点，不冒称发布）；与旧版五项差异逐项列明；复核 43 个 completed 条目证据链齐全 | [#121](https://github.com/HelloMrDuan/kidsCoding/pull/121) | `c4ff5ea3ef3b4a733afaad38b66e8343263b1ade` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39922704457) / [追踪main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39922704236) | completed |


## OPS-008 执行记录

| 日期 | Task-ID | 内容 | PR | 合并提交 | main CI | 状态 |
|---|---|---|---|---|---|---|
| 2026-10-23 | OPS-008 | Next.js standalone 生产打包：apps/web/next.config.ts 新增 output:'standalone'，仅打包方式变更，页面设计、课程功能与数据库行为不变。预发布机以 main c4ff5ea 同源代码 + 本改动完成隔离实证：standalone 镜像 398MB（现行生产 prune 版 1.01GB、原版 1.7GB），追踪后 node_modules 65M、.next 13M，node server.js 直启、容器 healthy，/api/health、首页、课程目录、课时页、作品页五探针全 200；PR CI 8/8 全绿，main CI 于关账时 7/8 已绿（task-ledger 与 curriculum 其余 6 项），scratch-real-vm-browser 在 GitHub runner 长时间未完成（同项 PR 已通过、代码相同），duan 明确指示不等 runner 关账 | [#123](https://github.com/HelloMrDuan/kidsCoding/pull/123) | `554a7c2c84d9867307445c8a0dd5d620a0a2a62e` | [课程main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39926304434) / [台账main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/39926304427) | completed；预发布通道仍指 tq-011（代码未含 standalone），部署侧 standalone 运行层 Dockerfile 已备妥并验证、待通道目标更新后切换并做真实部署验收；OPS-007 的 deploy/Dockerfile.web 在其合并后随行对齐 |

## OPS-009 执行记录

| 日期 | Task-ID | 内容 | PR | 合并提交 | main CI | 状态 |
|---|---|---|---|---|---|---|
| 2026-10-24 | OPS-009 | 双机看门狗监控修复：tj-watchdog 自 bef41968 部署后每轮误报 APP_FAULT（机内实查：部署记录与 GHCR web 镜像=40 位全 SHA、api 镜像=cicd-prerelease-bef41968 8 位令牌，严格字符串相等使同一 commit 恒判不等）。三套 logic 改 sameVersionToken 前缀一致性比较（≥7 位、一方为前缀），真实漂移仍 APP_FAULT（负向测试）；tj+instabox CF 的 Resume per-episode Idempotency-Key 正式入库（仓库缺失的 tj 修复从已部署副本回收，避免按仓库重部署把 Resume 打回 bad_request）；三套稳态深检对抛错（监控通道失败）有界重试后才 fail-closed，真实不健康仍立即 APP_FAULT；tj 删除只写不读的 claim KV 写入（普通一轮 KV 写入 3→1；两 Worker 合计约 864→576 写/日）。GitHub 主监控失败模式定案：三次失败全为 runner 侧单次 exec "fetch failed"→BLOCKED_MONITOR（01:26Z schedule 运行 success 并自动关闭告警 issue #126，判定逻辑无误），schedule 约 3–4h 节拍为平台行为、仓库无解。Cron 漏触发审计：tj 近 20 轮节拍完整，历史空窗多为 KV 读回退（lastRunAt 倒退）所致。CF 部署已由 duan 执行：tj /status 于 02:25Z 起连续两轮 verdict=OK、lastHealthyAt 推进至 02:35:12Z，独立 curl 复核一致 | [#127](https://github.com/HelloMrDuan/kidsCoding/pull/127) | `48d81e282cc243e91fa99b2b0334526caf417f8d` | [台账main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/40052272971) | completed；未决：instabox-watchdog（旧机 CF Worker）部署状态未知（/status URL 未交接）；新版 CF Resume 尚未遇到真实 suspended episode 未实测；GitHub 主监控下次 schedule 将使用新代码 |

## OPS-007 执行记录

| 日期 | Task-ID | 实际工作 | PR | 当前验证 | 状态 |
|---|---|---|---|---|---|
| 2026-10-23 | OPS-007 | 引入 push 构建 GHCR 镜像的工作流，更新生产 Dockerfile 为 OPS-008 已验证的 Next.js standalone 结构；GHCR 发布≠机器已部署。 | [#125](https://github.com/HelloMrDuan/kidsCoding/pull/125) | config-check、test 通过；E2E、镜像发布和服务器真实拉取仍待验证 | in_review |

## OPS-010 执行记录

| 日期 | Task-ID | 实际工作 | PR | 当前验证 | 状态 |
|---|---|---|---|---|---|
| 2026-10-24 | OPS-010 | KidsCoding 已实机部署 main `cee5d1f95f11c702458cfc730097ea5844bf915b`（03:32:34Z DEPLOYED、GHCR digest 一致、health ok）；GitHub 备用监控与 Cloudflare Worker 源码/配置预期 SHA 统一切换 main，保留真正版本漂移告警。Cloudflare 已部署 Worker 仍需控制台更新并用真实 Cron 核验，不冒称监控生效。 | [#129](https://github.com/HelloMrDuan/kidsCoding/pull/129) | PR CI 待跑，Cloudflare 现网未核验 | in_review |

## OPS-011 执行记录

| 日期 | Task-ID | 工作范围 | PR | 证据与剩余边界 | 状态 |
|---|---|---|---|---|---|
| 2026-10-24 | OPS-011 | tj-watchdog 的 machine_cooldown 时间门、冷却请求不占普通预算、冷却后幂等键换代、并发/模糊错误 fail-closed、单独冷却次数保护；仅天机主监控，保留 Muse 备用层 | [#130](https://github.com/HelloMrDuan/kidsCoding/pull/130) | Cloudflare Cron 06:45、06:55 确有 scheduled 调用，06:55 resume-cap-reached；本轮单测与 CI 待验证，现网 Worker 未部署 | in_review |


## OPS-012 执行记录

| 日期 | Task-ID | 工作范围 | PR | 证据与剩余边界 | 状态 |
|---|---|---|---|---|---|
| 2026-10-24 | OPS-012 | platforms-core-01 的 Cloudflare `instabox-watchdog` 恢复冷却期处理：不计入普通重试、按平台截止时间等待、合法重试新幂等键、未知错误失败关闭、手动停止保护与专项测试；不更改生产数据或天机现网 | [#131](https://github.com/HelloMrDuan/kidsCoding/pull/131) | PR CI 与现网部署尚未验证，Muse 备用层保持开启 | in_review |


## OPS-013 执行记录

| 日期 | Task-ID | 工作范围 | PR | 证据与剩余边界 | 状态 |
|---|---|---|---|---|---|
| 2026-10-24 | OPS-013 | 修复 Kids CF watchdog 匿名 GitHub REST SHA 请求的单次抖动：网络/5xx 至多三次真实请求、403/429 限流退避/诊断、可选独立 GITHUB_TOKEN、不放宽 SHA 三方比对、不复用旧 SHA、不动 tj-watchdog | [#132](https://github.com/HelloMrDuan/kidsCoding/pull/132) | 08:11Z 现网 BLOCKED_MONITOR，后续必须用 Cloudflare 真实日志核对错误码；本次代码 CI 与生产部署待核验 | in_review |
| 2026-10-25 | TQ-005 | P0-U1 六课 Python 教学质量复核补齐：练习 B（多题自选输入 RUN_CUSTOM、L01 自改问候语）、三层错因提示（8 类）、L01 本机草稿保存/恢复、六课 AI 教学评审（非候选人）；课程 JSON 状态不动，仍 detailed_not_published | [#133](https://github.com/HelloMrDuan/kidsCoding/pull/133) | PR CI 全绿（含 python-browser-trial 11 个真 Pyodide e2e）；合并后 main 推送运行 curriculum-web 一次性抖动（同树 PR 绿、本地合同 485/485 全过，属 CI 侧偶发，见关账说明）；无儿童试学、无独立人审，评审结论非正式 | completed |
| 2026-10-25 | TQ-006 | G3-U1-L02 克隆流星雨教研复核：生成间隔参数（0.1–1.0 秒，默认 0.3 秒对齐样本）、加载失败重试入口、限制显式标注、课程文本 6 处 0.5 秒→0.3 秒对齐、G3-U1-L02 AI 教学评审 81 分（需打磨档，非候选人）；课程 JSON 状态不动，仍 detailed_not_published | [#136](https://github.com/HelloMrDuan/kidsCoding/pull/136) | PR CI 重跑全绿（curriculum-web 首轮一次性红、本地合同 485/485 全过，属 CI 侧偶发）；scratch-real-vm-browser 绿；无儿童试学、无独立人审，评审结论非正式 | completed |
| 2026-10-25 | TQ-007 | 建立432课逐课教研复核模板：432 课每课独立状态/评审证据模板（432-review-template.json/.md），详案存在不自动变更可玩或发布 | [#138](https://github.com/HelloMrDuan/kidsCoding/pull/138) | 功能 PR 首轮 task-ledger 失败已修（台账条目置 in_progress 并填 evidence.pr）；重跑后 PR CI 全绿（curriculum/deploy/task-tracking）；首轮 deploy test 作业一次性红、本地同头全量 793/793 全过，属 CI 侧偶发 | completed |
