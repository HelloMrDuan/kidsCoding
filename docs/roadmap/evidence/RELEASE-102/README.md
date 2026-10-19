# RELEASE-102 课程发布七门禁可追溯

- 门禁：内容、引擎、E2E、授权、进度、隐私、人审（`apps/web/src/features/curriculum/release-readiness.ts`）。
- 台账：`apps/web/src/content/curriculum/release-evidence-v1.json`，覆盖全部 25 节 L3 试玩课。
- 一道门只有 `status: pass` + 至少一条证据（仓库存在的文件 / 本仓库 Actions 运行 / 本仓库 PR）+ 审阅人 + ISO 日期才算通过。
- 不可被台账覆盖的仓库事实：无真实运行器、无 E2E、在正反例欠账名单、有未授权必需素材 → 对应门禁失败。
- 内容审阅不接受实现者或 AI；E2E 必须附 CI 运行；人审只认 `reviewerRole: owner`，且前六道全过才可批准。
- `lesson-maturity.ts` 的 L4/L5 只读这套判定；当前 25 节均 0/7，L4/L5 = 0。
- 后台 `/admin/catalog` 逐课显示七门状态、原因、已附证据数，每页 6 节分页；手机端隐藏长备注。
- 截图：`r102-1-*`（G0 第 1 页）、`r102-5-*`（第 5 页）三尺寸，均无横向溢出。
