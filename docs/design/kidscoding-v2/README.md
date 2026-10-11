# KidsCoding 视觉设计基线 V2（已获用户确认）

> 状态：**视觉方向已获项目方确认**；**仅为原型，不是已开发/发布的课程页面**。审批日期 2026-10-11。
> PR Task-ID: **UX-001**（设计阶段 in_progress；业务实现尚未完成）。

## 从这里开始看

1. [可交互原型（依赖本目录 assets）](./prototype.html)：10 个页面，可桌面/手机浏览；模拟课程流程、积木、示例作品、学情数据。
2. [一体化离线原型](./KidsCoding-V2-Interactive.html)：图片内嵌在单个 HTML 文件，下载后直接在 Chrome 打开。
3. [详细设计交接规格](./DESIGN-SPEC.md)：设计变量、路由映射、课程/版权边界、真实实施要求。
4. [素材资产](./assets/)：设计阶段生成的占位/演示素材，**不可冒称学员作品或已授权生产素材**。

## 核准后的视觉系统（以 V2 而非旧版暖橙卡通方案为准）

- 产品：**面向 6–16 岁的成熟少儿编程教育科技平台**；不是低幼星球游戏，也不是用大圆角渐变堆砌的营销模板。
- 视觉：海军蓝侧栏 `#152238`、页面底色 `#f3f6fb`、主操作蓝 `#2463eb`、主文字 `#18243a`、白色内容卡、轻边界 `#e7edf5`。
- 元素：紧凑导航、专业任务模块、可信学习进度、作品封面、重点操作按钮；儿童角色仅用于课程插画，不支配全站 UI。
- 层级：**首页继续学习**优先；**地图的关卡进度**清晰；**课堂的任务/积木/舞台与运行反馈**可见；**Scratch/Python 工作台**强调编辑体验；家长/后台信息可追溯。
- 技术：只借鉴编程猫、核桃编程、西瓜创客的公开页面信息组织与教学体验，禁止复制未授权角色、课件、商业界面或源码。

## 十页与现有路由

| 视觉稿 | 对应实现 |
|---|---|
| 学习中心 | 单独学生端首页，路由在开发任务中确定 |
| 学习地图 | `/learn/map` |
| 编程课堂 | `/learn/lesson/[lessonId]` |
| 课程体系 | `/learn/catalog` |
| Scratch 工作台 | `/learn/scratch-lab/[lessonId]` |
| Python 实验室 | `/learn/python-lab/[lessonId]` |
| 作品中心 | `/learn/portfolio` |
| 家长中心 | `/parent/overview` |
| 品牌官网 | `/` |
| 运营后台 | `/admin`、`/admin/catalog` |

## 交给 Codex 的实施纪律

- 必读 `docs/roadmap/02-PHASED-DELIVERY.md`、`06-PAGE-LEVEL-IMPLEMENTATION-SPEC.md`、`07-PR-BY-PR-IMPLEMENTATION-BACKLOG.md`、`09-TEACHING-QUALITY-GATE.md`、`11-TASK-EXECUTION-POLICY.md`。
- **一次只做一个 Task-ID**。优先完成 UX-001 的真实 token/测试，然后 UX-002 / UX-003 / UX-004，再继续 UX-101～105 地图、UX-201～206 课堂。每批实际代码→正常/异常/恢复测试→PR→CI→合并→main CI→台账回填。
- 视觉原型只定义验收的布局与风格，**不能直接覆盖 Next.js 业务代码**，不能把演示积木当真实 Blockly，不能把模拟输出当 Pyodide，不能把设计稿的演示数值当真实学习记录。
- 独立 12 课与 432 目录保留原 ID 和进度，避免双算；锁定课程不得误开；作品云端保存与访问隔离需真实测试。
- 关键宽度 `1440×900`、`768×1024`、`375×812`；验证触控、键盘、焦点、`prefers-reduced-motion`、失败反馈及慢网络。
- 所有重要页面除静态视觉外必须真实可操作，不能通过原型按钮“显示成功”来冒充生产功能。
- **完成口径**：仅在对应功能验收、真实 PR、CI、合并和 main CI 均通过后将对应 Task-ID 标 `completed`。

## 视觉参考与证据边界

公开材料：<https://www.xiguacity.cn/curriculum>、<https://official.hetao101.com/curriculum>、<https://lab.codemao.cn/>；未登录竞品的付费学生端或获取专有素材。
