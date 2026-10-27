# G2-U1 原创 Scratch 课程项目

- `build_g2_projects.py`：生成每节 G2-U1 课程的原创 `.sb3`（检入为 `apps/web/public/scratch-samples/<name>.sb3.b64`，即同一 zip 的 base64 文本）以及嵌入在 `apps/web/public/scratch-g2-sandbox.html` 中的课程模型（积木骨架 + 允许修改的参数及范围）。
- `python examples/scratch/g2/build_g2_projects.py --write` 重新生成；不带参数时只检查检入文件是否最新（CI 的 `scratch-sb3-structure` 任务运行 `test_g2_projects.py`）。
- SVG 均为本项目原创绘制：`park-backdrop.svg`（春日公园背景）、`orange-cat.svg`（小橘猫）、`blue-bird.svg`（小鸟）。
- 结构测试不证明执行；真实执行由 `apps/web/tests/e2e/scratch-g2-u1.spec.ts` 在真 Chrome + 官方 scratch-vm 中验证。
