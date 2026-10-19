# RELEASE-103 证据（第一阶段：试学基础设施）

本 PR **不包含任何真实儿童试学**，任务保持 `in_progress`。

- 试学计划、监护人同意书、观察表、记录模板：`docs/roadmap/child-trials/`。
- 记录台账：`apps/web/src/content/curriculum/child-trials-v1.json`（当前 0 条）。
- 校验：`apps/web/src/features/curriculum/child-trial.ts`，校验内容包括同意日期不晚于试学日期、登记过的同意书版本、匿名编号、不含姓名/学校/照片等字段、年龄符合课程适龄、只认可试玩课程、必须有成人观察人、非 AI/非实现者审阅、时长在 1～60 分钟。
- 门禁：第七道“人审”要求该课至少有 1 条有效试学记录（`release-readiness.ts`）。
- 不得冒称：没有有效试学记录时，src/public 内出现“儿童实测”等说法，CI 即失败。
- 后台截图 r103-*（1440/768/375，无横向溢出）：显示试学记录数和每课的有效试学次数。

完成条件：试点 A（G0-U1-L01～L06）至少 3 名 5～7 岁儿童的有效记录入库并通过 CI；问题清单另立任务。
