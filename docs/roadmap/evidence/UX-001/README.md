# UX-001：冻结 V2 视觉基础实施证据

基线为设计 [PR #33](https://github.com/HelloMrDuan/kidsCoding/pull/33)，提交 `2ab0687a908af41891794aa45d83d41fea7b434a`；[课程 main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38129176212) 和 [台账 main CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38129176215) 均已核实成功，合计 8 项。

## 实际代码与边界

`globals.css` 与 `features/ui/tokens.ts` 实现原型色值、现代中文系统字体 14px/1.55、8px 操作圆角、14px 面板、10px 内域、轻边界/阴影、导航/顶部/内容宽度和响应式尺寸变量。真实旧基础类通过兼容别名改用 V2，去除全站奶油渐变、玻璃和夸张拟物阴影；现有业务 DOM、位置、网格、课程数据与持久化代码没有修改。原型未修改、演示素材未加入 production public。

[VISUAL-LOCK](../../../design/kidscoding-v2/VISUAL-LOCK.md) 已由根 AGENTS、开发总纲、阶段计划、04/06/07 UI 规范引用，新会话不得自行重做 V2。

这不是十页 V2 迁移。冻结的导航与页面结构仍由 UX-002/003、UX-101～105、UX-201～206 等原任务逐项实施；旧局部样式没有通过全局通配覆盖强制迁移。本轮不领取其他任务、不将这些页面标为 V2 已验收。

## 独立视觉对比

真 Google Chrome / Playwright，1440×900、768×1024、375×812。三个实际路由各有 Before/After，三个对应 V2 原型各有 Reference，共 27 张完整页面截图；基础样本另有三组对照 6 张，共 33 张。

| 对比范围 | 精确检查 | 结果与尚未实施差异 |
| --- | --- | --- |
| 导航基础色、正文/次级字体、面板、主操作 | 生产构建 CSS 与批准原型 CSS 分别渲染同一隔离组件样本，逐项比对字体、颜色、背景、圆角、边框、阴影、内边距与 x/y/宽/高，并比较完整 PNG 字节 | 三断点一致；手机使用原型的已展开导航状态，仅验收基础视觉，不冒充业务导航布局 |
| 官网 `/` | Body 中性底色、面板轻边界/14px 圆角、主 CTA 蓝色；前后面板 x/宽 | 所有屏幕几何保持，无横向溢出。仍是旧官网信息结构，与原型官网有版式差异，待 UX-601/603；`home-*-reference` 对应原型品牌官网 marketing，学生学习中心不覆盖 `/` |
| 地图 `/learn/map` | 基础面板/主 CTA/字体及三屏前后测量 | 面板 x/宽保持，无横向溢出。当前页面仍无 V2 侧栏/顶栏/246px 单元侧区；局部旧渐变和卡片待 UX-101～105/603，不能据此宣称地图已还原 |
| 课堂 `/learn/lesson/lesson-12-graduation-show` | 实际 Blockly 与双角色页面截图、基础面板和前后测量 | 面板 x/宽保持，无横向溢出。当前任务/舞台/积木是既有结构，尚未实现 V2 的任务→积木→舞台三域和手机标签；原型第12课示例对白与真实毕业课程内容不同，真实内容保留。待 UX-201～206/603 |

截图命名：`{home,map,lesson}-{desktop,tablet,mobile}-{before,after,reference}.png`；基础样本 `{desktop,tablet,mobile}-tokens-{reference,actual}.png`。前后测量见 [before](./before-measurements.json) / [after](./after-measurements.json)。可复现代码 `apps/web/scripts/capture-v2-foundation.mjs`：分别启动基线与候选生产版本，在仓库执行 `node apps/web/scripts/capture-v2-foundation.mjs before|after`；自动契约与浏览器检查在 `tokens.test.ts` / `v2-tokens.spec.ts`。

## 对比度：未满足全 AA，不能 completed

项目负责人明确裁定：**严格保持原型文字颜色，记录 AA 缺口**。没有批准加深颜色，也没有明确取消任务的全 AA 完成条件。

| 白底色值用途 | 实测比值 | 门槛 | 结果 |
| --- | ---: | ---: | --- |
| 主文字 #18243a | 15.5293 | 4.5 | 通过 |
| 蓝操作 #2463eb / 白字 | 5.1732 | 4.5 | 通过 |
| 次级小字 #6f7d92 | 4.1796 | 4.5 | 未通过 |
| 成功小字 #148767 | 4.4765 | 4.5 | 未通过 |
| 警告小字 #ad6b20 | 4.2850 | 4.5 | 未通过 |
| 错误小字 #d64c4c | 4.2022 | 4.5 | 未通过 |
| 焦点环 #84afff | 2.1973 | 非文本 3 | 未通过 |

精确数值见 [contrast-report.json](./contrast-report.json)。契约测试会断言这些例外存在，防止静默改色或假报 AA；测试通过表示实现遵守冻结设计，不表示这些颜色达到 AA。正常正文/主操作/导航 AA 另有正向断言。**UX-001 待负责人明确调整完成条件或批准最小设计变更，再验收关闭；此前不领取下一任务。**

## 素材与质量审核边界

阅读两份完整 HTML、全部 10 项资产，确认非图片 DOM/逻辑一致；样本测试确认 CSS 除图片 URL 外一致。逐项尺寸/哈希/来源边界见 [assets-review.json](./assets-review.json)。README 仅说明设计阶段生成，没有具体生成记录或生产许可证明；部分图片可见 Scratch 猫/标识。没有认定这些素材已获生产授权，也没有自行替换或重画冻结素材。

沿用 07 的独立 UX 100 分标准，负责人/儿童/真实硬件评分未取得，不填写 AI 自评分，不宣称成熟产品或生产发布完成。课程教研 100 分标准独立，既有课程发布等级未变。

## 实际验证结果

160 条 Vitest / 24 文件通过；实际 Google Chrome 48 条原 1～12 课回归通过，0 失败/跳过/重试不稳；另 4 条 V2 基础视觉/键盘/触控/减少动效检查通过。课程包含正确/错误程序、角色隔离、重复运行、重置、保存重开/修改、配额失败恢复和奖励幂等，12 课含手机原生 tap。生产构建（含 TypeScript）通过；lint 0 错误、5 项既有警告；新代码专项 lint 通过。单任务台账通过。报告见 [单测](./unit-results.json)、[课程 Chrome](./course-browser-results.json)、[基础 Chrome](./theme-browser-results.json)、[视觉测量](./visual-comparison.json)。PR 与 main CI 实际 URL 将在同一 UX-001 收尾记录中回填。全 AA 缺口单独保留，不把自动检查成功当作全部完成。
