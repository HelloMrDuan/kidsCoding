# KidsCoding 真实仓库现状盘点（2026-10-11）

> **仅记录已经在 main 可见的源文件与已知 CI 证据**；不自动认定部署、正式上线或学生真实学习结果。
>
> 仓库： https://github.com/HelloMrDuan/kidsCoding
>
> 采样 main：e745aa3c1b3b58a6626cdf3cb864f603d6d0c221
>
> 最近 main CI： https://github.com/HelloMrDuan/kidsCoding/actions/runs/38068377800 （7 个 Job success，属于仓库 CI，不等于生产验收）

## 1. 确认存在的内容资产

| 对象 | 已核实数量 | 所在文件 | 判定 |
| --- | ---: | --- | --- |
| 全部路线 | 18 | apps/web/src/content/curriculum/full-catalog-v1.json | 全量大纲 |
| 单元 | 72 | 同上 | 每路线 4 单元 |
| 目录课程 | 432 | 同上 | **432/432 为 outline_not_playable** |
| 独立详细教案 | 192 | track-g0/g1/g2/g3/p0/p1/p2/a0-detailed-lessons-* | 八路线各 24，均非正式发布 |
| 尚待详案 | 240 | 全量目录中剩余 10 条路线 | 仍为大纲 |
| 单元毕业项目 | 72 | unit-capstone-blueprints-v1.json | 作品蓝图，不是作品运行验收 |
| 独立启蒙教案 | 12 | foundation-guides-v1.json | 复用已有 launch-lessons IDs，**不计入 432** |

实际对应的八条详案路线为：G0、G1、G2、G3、P0、P1、P2、A0。全量目录条目状态不因别处已有详案而自动变更。目录详案与线上体验必须逐课绑定，不能按数量推断已发布。

## 2. 已存在的真实运行原型（分清验收边界）

### Blockly 独立 12 课

- 当前 main 的 apps/web/src/content/curriculum/launch-lessons.ts 有 12 节独立启蒙课，按森林、草地、花园、双角色毕业 4 个单元组织。
- 课程 01～09 接入 PlayableStage/use-block-executor 的确定性 Blockly 教学执行，并在 GitHub Chrome E2E 中覆盖部分步骤、实际移动、场景/对白、点击事件及不运行不通关。
- **课程 10～12** 仍有课程文字和模板，但 main 执行器**不支持 switch_character**，不能称为可玩双角色毕业项目；其课程数据及玩法尚需对齐。
- 遗留 PR #1 仍开放且存在合并阻塞，已经迁移的首关能力不要直接重复合并。
- 暂存代码：feat/blockly-duo-graduation-10-12 / 6ea640460da113e13bc00c80c7a4dd065abd0c1f，**未合并、未形成真实 CI 验收，禁止算作完成**。后续应基于本计划核对后重做或挑选有效代码。

### Scratch

- 真实 Scratch VM 在课程演示 /learn/scratch-lab/G3-U1-L02 加载现有 meteor-clones.sb3，支持绿旗、停止、分身运动/删除。
- 受限 Blockly 积木参数编辑作用于 VM，可导出/导入真实 .sb3，并在浏览器 IndexedDB 本地保存与刷新恢复。
- Supabase 草稿 API：apps/web/src/app/api/practice/scratch/route.ts；迁移 202610100010_scratch_private_drafts.sql 带 RLS。GitHub Actions 有基于真实 PostgreSQL 的两账号权限测试。
- **未验收**：正式部署的 Supabase 迁移及真人登录跨设备端到端；完整 Scratch Blocks 编辑器/渲染器、任意项目导入、CDN 可用性与第三方许可合规；不等于 G2/G3 全部课程可运行。
- 运行原型未进入正式发布：apps/web/src/features/curriculum/release-readiness.ts 的该课程证据均仍为 false。

### Python

- /learn/python-lab/P0-U1-L01 运行 Pyodide 实验；P0-U1-L02～L06 在 python-multi-grade.ts 中配置真实函数运行与多组自动反馈。
- Python 第一单元 **6 节有实验入口**，不代表 P0 的 24 节已全部可玩。
- 真实 Chrome + Pyodide E2E；Python 离线参考项目、Pygame 虚拟显示测试存在，但离线项目不自动成为在线课程。
- 账号私有源码草稿能力主要针对 L02～L06；迁移 202610100007～009。生产 Supabase 迁移、账号切换及服务端可信评测仍待验收。
- 浏览器自评是练习反馈，不应生成不可篡改成绩。

## 3. 网站结构/测试与生产化边界

- 技术：apps/web 内 Next.js/React/TypeScript + Blockly，Scratch VM iframe 沙箱，Pyodide，Supabase。
- 已有课程目录页 /learn/catalog、详情页 /learn/catalog/[lessonId]、审阅页 /admin/catalog 及详情页。
- 已有 12 节启蒙、地图、奖励、作品、家长/管理员等部分代码，但**存在页面/逻辑不等于全流程上线**。
- GitHub Actions 的 curriculum-content.yml 当前包含 7 类 Job：课程 ESLint/Vitest/构建、真实 PostgreSQL RLS、Python 离线项目、Pygame 高阶项目、Scratch ZIP 结构、真实 Python Chrome、真实 Scratch VM/Blockly Chrome。
- PR 已通过 + main CI success，只能证明检查覆盖部分能力；移动端兼容、账号云端、安全、发布运营等必须逐项新增独立验收证据。
- 发布门禁 release-readiness.ts 要求内容、引擎、E2E、授权、进度、儿童隐私、人审 7 类证据；当前试点条目全部未放行。
- Scratch 与 Python 的运行资源含外部 CDN/许可证风险，国内发布前须自托管、审查与真设备验证。

## 用户页面基线与成熟产品视觉差距（补充于 2026-10-11）

源码确认当前存在：`app/page.tsx`（StoryStage/GrowthPath/ParentConfidence/TrialCta）、`learn/map`、`learn/lesson/[lessonId]`、`learn/catalog`、`learn/portfolio`、`learn/scratch-lab`、`learn/python-lab`、`parent/overview`、`admin/catalog`；`app/globals.css` 有奶油/暖橙/云蓝等基础样式变量。**现有代码并不代表已达到成熟国内教育产品的视觉和移动端使用水平。**

静态源码检查中暂缺：统一设计 token/组件规范、每个核心页面与竞品公开截图的逐屏对照、儿童手机触控的全路径视觉验收、全部原创角色与音频版权清单。详情与硬性验收见 [03 对标研究](./03-COMPETITOR-CONTENT-UI-BENCHMARK.md)、[04 页面蓝图](./04-UI-EXPERIENCE-BLUEPRINT.md)。**上述页面缺口尚未通过真实浏览器逐页审计**，不伪称已完成现场视觉测量。

## 4. 主要差距与风险（按优先级）

| 优先 | 缺口 | 直接后果 | 应验收的证据 |
| --- | --- | --- | --- |
| P0 | 第 10～12 课角色切换未执行、两角色状态混用 | 毕业课程文案与行为不符 | 两角色不同坐标、各自语句、礼物目标的真浏览器正反例 |
| P0 | 12 课 ID 与 432 课大纲脱节 | 进度和已上线数量无法统一 | 映射表、单一发布状态、无重复计数 |
| P0 | 生产 Supabase 与真实登录未验收 | 云端草稿无法保证跨设备可靠性 | 真实迁移、A/B 账号 RLS、关闭重登恢复 |
| P0 | 课程通关过分依赖标准积木序列 | 无法验证创造性及可迁移学习 | 可观察状态/任务目标断言、重试/诊断/开放创作 |
| P0 | Scratch/Python 客户端反馈不可作为可信成绩 | 成绩可被客户端伪造 | 区分练习反馈与服务端可信记录 |
| P1 | Scratch VM 仅受限课程编辑 | G2/G3 大多数课程无法在线学习 | 真编辑器、资源许可、完整 E2E |
| P1 | G0/G1 等 192 详案无法全部运行 | 课程多、可学少 | 课程模板/引擎能力逐课映射 |
| P1 | 剩余 240 节只有大纲 | 中高阶课缺教学内容 | 按课程能力与阶段逐批详案+项目+测试 |
| P1 | 原创素材、音效与正式发布流程尚不齐 | 产品不具备规模化教学体验 | 版权审查、后台逐课发布、真实儿童隐私检查 |

## 5. 仓库证据索引

- 课程目录与全量状态：apps/web/src/content/curriculum/full-catalog-v1.json
- 192 详案：apps/web/src/content/curriculum/track-*-detailed-lessons-*.json
- 独立启蒙：apps/web/src/content/curriculum/launch-lessons.ts、foundation-units.ts
- Blockly 执行器：apps/web/src/features/lessons/playable-stage/
- Scratch：apps/web/src/features/scratch-vm/、apps/web/public/scratch-vm-sandbox.html
- Python：apps/web/src/features/python-lab/
- 作品保存：apps/web/src/app/api/practice/、apps/web/supabase/migrations/
- 测试：apps/web/tests/e2e/ 与 .github/workflows/curriculum-content.yml

**快照使用规则**：后续验收只增加经 main/PR/CI/生产实测验证的能力；数字变化须更新此文件及主计划，不得用历史快照冒充最新状态。
