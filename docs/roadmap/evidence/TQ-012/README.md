# TQ-012 前9课单元作品可运行、可保存、可重开修改（TQ-002f）

## 改了什么
- `apps/web/src/content/curriculum/unit-projects.ts`：第1～9课单元作品配置单一来源（可用积木、起始程序、孩子可选对白、多种正确方案）。
- `observable-run` 多方案判定与按课对白；`ProjectSnapshot` 积木可带所选对白（兼容旧快照）。
- 第1～9课完成页 `/project/[projectId]/complete`：静态预览换成可运行作品 `unit-project.tsx`（运行 → 本机保存 → 重开修改）；改动后须重新运行通过才能保存；存储写满如实提示“没有保存”；未完成课堂（本机无程序）不能打开作品，只给回课堂入口。
- 第3/6/9课至少一项孩子选择（对白 / 在哪里说 / 先后顺序），两种不同方案都判为正确。
- 布局：1440 宽保存区紧贴运行/重置、首屏可见；375 宽舞台/积木分页，编辑积木时保存按钮固定可见，无横向滚动。
- 完成页与完成卡统一 V2 视觉：页面背景、`kc-panel`，「回看我的作品」改为 `kc-action-surface` 蓝色主按钮、次按钮 `kc-btn-outline`，「完成这一课」用 `--kc-action` 颜色；testid 与无障碍名称不变。

## 测试
- `apps/web/src/content/curriculum/tq012-unit-projects.test.ts`（15 例：每课配置、多方案都通过、错误方案具体错因、对白只来自本课、积木在面板内）
- `apps/web/src/features/lessons/playable-stage/unit-project.test.tsx`（7 例：运行后才能保存、改动须重跑、存储写满报错、重开恢复）
- `apps/web/src/features/progress/project-snapshot.test.ts`（4 例：对白字段与旧快照兼容）
- `apps/web/src/features/projects/project-complete-card.test.tsx`、`apps/web/src/features/ui/tokens.test.ts` 通过
- E2E `apps/web/tests/e2e/unit-project.spec.ts`（9 例：未完成锁定、L03 保存→刷新→重开→另一方案、L06 选对白在哪里说、L09 两种顺序、存储写满、1440 保存区首屏、375 保存按钮可见、375 无横向滚动、课堂完成后作品带入孩子程序）；`blockly-duo*.spec.ts` 回归。本地生产构建桌面端 22/22 通过。

## 截图（本地生产构建，未提交到仓库）
- `tq012-l03-passed-{1440,768,375}`、`tq012-l06-wrong-place-{1440,768,375}`、`tq012-l09-passed-{1440,768,375}`
- `tq012-l03-code-375`（积木分页）、`tq012-locked-1440`（未完成锁定）、`tq012-duo-1440`
- `tq012-l03-passed-1440-buttons`、`tq012-duo-1440-buttons`（完成卡 V2 按钮）

## 成熟度
课程成熟度仍为 **L3**，不因本任务升级；**未经儿童试学**。
