# SYS-102 课程 L0–L5 唯一成熟度数据源

唯一来源：`apps/web/src/features/curriculum/lesson-maturity.ts` 的 `getLessonMaturity(id)`。

| 级别 | 含义 | 判定（逐级，低一级不成立则停止） |
| --- | --- | --- |
| L0 大纲规划 | 只有目录大纲 | 默认 |
| L1 详案已备 | 有详细教案 / 启蒙教案 | `getLessonContentStage != outline` 或属 12 节启蒙课 |
| L2 引擎原型 | 真实运行器能执行该课任务 | `trialIntegrations` 有登记（Blockly / Scratch VM / Pyodide） |
| L3 实验可试玩 | 有可路由的试玩入口 + E2E 规格 | 登记含 route + e2eSpec |
| L4 验收通过 | 除负责人批准外全部发布要求为 true | `release-readiness` 证据 |
| L5 正式发布 | 7 项发布要求全部 true | `evaluateReleaseReadiness().ready` |

## 读取方（同一状态）
- 前台目录 `/learn/catalog`：路线卡与课程卡状态标签（替换原先硬编码 `PYTHON_TRIAL` 与 G0/P0 特判）。
- 课程详情 `/learn/catalog/[lessonId]`：成熟度文字 + 试玩入口由 `trialRoute` 决定（testid 不变）。
- 后台 `/admin/catalog`：每课显示 L 级与未发布原因。
- API `/api/curriculum/catalog`：`maturity`、`trialAvailable`、`trialRoute`；`playable` 只在 L5 为 true。

## 当前分布（2026-10-18）
- 432 目录课：L3 共 7（G3-U1-L02、P0-U1-L01~L06），其余为 L1（有详案）或 L0（仅大纲）。
- 12 节启蒙课：L3（Blockly + tests/e2e/blockly-*）。
- L4 / L5：0。没有任何课程被标为正式发布。
- 修正：此前目录只把 P0-U1-L01~L03 标为可体验，而详情页实际给 L04~L06 也开了入口；现两处一致为 L3。

## 测试
`lesson-maturity.test.ts`（6 项）：六级有序；432+12 全部可判定；大纲=L0、无引擎详案=L1；无 L4/L5；L3 指向真实路由与存在的 e2e 文件且未发布；API 与数据源一致且 `playable=false`。

## 截图
1440/768/375：目录列表、P0 路线页、P0-U1-L02 详情，横向溢出 0。详情页视觉尚未按 V2 改版，属 UX-501 剩余工作。
