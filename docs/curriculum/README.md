# KidsCoding 全学段原创课程资产 v1

> 内容优先于页面。2026-10-10 首次整理。当前为**大纲与教案资产**，不等于可执行课程或已发布课程。

## 交付范围

- **18 条学习路径、72 个单元、432 节原创课程目录**：`apps/web/src/content/curriculum/full-catalog-v1.json`。
- **现有 12 节启蒙课程的逐课教学脚本**：`apps/web/src/content/curriculum/foundation-guides-v1.json`。
- 课程条目包含：年龄建议、引擎、前置路线、单元、概念、逐课主题、可观察学习产出、项目作品、验收证据、课程成熟度。
- 启蒙详案包含：剧情、教学目标、六步引导、常见错误、三层提示、拓展挑战、家长问答、作品验收、素材清单。

## 全路线一览

| 路线 | 年龄 | 课程 | 引擎/方式 |
| --- | --- | ---: | --- |
| G0 图形化启蒙与计算思维 | 5-7 | 24 | blockly |
| G1 故事编程与动画 | 6-9 | 24 | blockly |
| G2 Scratch 动画与游戏基础 | 7-11 | 24 | scratch |
| G3 Scratch 高阶项目与创意设计 | 9-13 | 24 | scratch |
| P0 Python 编程入门 | 9-13 | 24 | python |
| P1 Python 游戏与图形创作 | 10-15 | 24 | python |
| P2 Python 算法与数据结构 | 11-16 | 24 | python |
| P3 Python 数据与自动化 | 11-17 | 24 | python |
| C0 C++ 基础与信息学入门 | 11-16 | 24 | cpp |
| C1 C++ 算法竞赛与工程思维 | 12-18 | 24 | cpp |
| W0 网页设计与前端基础 | 11-16 | 24 | web |
| W1 JavaScript 应用与创意游戏 | 12-18 | 24 | web |
| A0 人工智能素养与安全 | 7-13 | 24 | ai |
| A1 Python 人工智能应用实践 | 12-18 | 24 | ai-python |
| R0 机器人与物联网编程 | 8-15 | 24 | hardware |
| S0 数字素养与网络安全 | 8-16 | 24 | literacy |
| M0 数学思维与算法实验 | 7-14 | 24 | math |
| D0 创意设计与跨学科 STEAM | 8-16 | 24 | steam |

合计：**18 路线 × 4 单元 × 6 课 = 432 课**。这代表**已编排课程纲要**，不是 432 节可玩的软件关卡，更不是 432 份完整教案。各课状态均为 `outline_not_playable`。单个课程必须经过教案细化、游戏/代码实现、素材制作、验证与发布审核之后才能上线。

## 与现有仓库的关系

1. 现有 `launch-lessons.ts` 和 `foundation-units.ts` 的 12 节启蒙课程、ID 与 4 个单元保持不变，避免触发前台/后台兼容性问题。
2. `foundation-guides-v1.json` 精确沿用 `lesson-01-forest-hello` 至 `lesson-12-graduation-show` 的 ID，可作为后续逐课配音、动画、测评数据的来源。
3. `full-catalog-v1.json` 是独立的大课程目录，**暂不接入产品发布 API**，未来须增加课程迁移、分版本审核和引擎能力校验，不能批量标成已上线。
4. 课程成熟度建议按 `outline → detailed_script → assets_ready → engine_supported → tested → published` 推进；首批内容为详案但执行能力仍需要逐课核对。
5. 不修改既有课程逻辑、不新增“虚假可玩关卡”、不让课程数量虚增前台。

## 课程设计统一规范

每课必须至少有：明确任务情境、最多三个核心新知识点、动手操作路径、实际运行结果、可观察验收、常见误解和分层提示、自主改造的空间。一个单元以独立作品收尾，教师/家长评价**学习证据**而不是单纯打卡次数。年龄为建议入口，需允许根据能力测评跨年龄选择。

## 内容合规与版权

可借鉴公开的知识结构、教学方法、通用知识点；**不得直接复制**编程猫/核桃编程/西瓜创客等商业课程的完整课件、题库、视频、角色 IP、插画、配音和专有文案。案例、剧情、项目名称由 KidsCoding 原创组织，视觉素材与音频另行清查授权。AI 教学项目使用匿名模拟数据和明确权限，面向未成年人设置分享审核与隐私保护。

## 公开参考及借鉴范围（不表示对方认可或授权）

- 核桃编程（官方）：https://official.hetao101.com/curriculum —— 图形化→Python→C++、频繁练习与闯关引导。
- 西瓜创客（官方）：https://www.xiguacity.cn/curriculum —— 创造、游戏、分享、反思的项目式学习路径。
- 西瓜创客 AI（官方）：https://www.xiguacity.cn/ai-course —— AI 通识、工具应用、项目实践与安全边界。
- CSTA 2026 PK–12 标准：https://csteachers.org/pk12standards/view/ —— 算法设计、编程、数据、网络安全和 AI 的能力领域。
- Harvard ScratchEd Creative Computing：https://scratched.gse.harvard.edu/guide/curriculum.html —— Scratch 创意编程与项目复盘。
- Code.org 课程组织指南：https://support.code.org/hc/en-us/articles/4404186145293-Navigating-the-New-Curriculum-Overview-Page —— 用教学概念分组的课程/单元结构。

**待开发内容**：每节课的逐屏指引、完整评测用例、配音素材、课程项目代码及后台发布链路；本批未声称完成。
## 72个单元毕业项目蓝图

新增 `apps/web/src/content/curriculum/unit-capstone-blueprints-v1.json`，涵盖每单元5阶段作品制作、逐项证据、100分评价、分层任务、素材需求以及领域特定执行与安全约束。**此资产仍是设计蓝图，不是72个已经编写完成的可玩项目。**
