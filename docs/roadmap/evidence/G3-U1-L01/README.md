# G3-U1-L01 用自制积木画图 — 证据（结构阶段）

课程 ID：G3-U1-L01
课程名称：用自制积木画图
焦点：自制积木（带 size 参数的画星形过程）
故事：机器人用同样的五角星花纹装饰六面旗，尺寸按输入参数变化。

## 本 PR 实际交付

- `examples/scratch/g3/build_g3_u1_l01.py`：原创 .sb3 生成器
  - pen 扩展，过程 `画星形 %s`，参数 size
  - 过程内：重复 5 次，移动 size 步，右转 144 度
  - 主脚本：清笔、移到 (-200, 0)、落笔、size=20、重复 6 次：调用画星形(size)、size+20、抬笔、x+60、落笔
- `examples/scratch/g3/test_g3_u1_l01.py`：6 个结构测试，本地通过
- `examples/scratch/g3/pen.svg`、`stage-flags.svg`：原创素材，非商业角色
- 台账：`docs/roadmap/lesson-task-register.json` 中 G3-U1-L01 一条由 todo 改为 in_review，证据 PR 为本 PR
- 变体：`build_g3_u1_l01_variants.py` 生成练习 A（size 30、+10）、练习 B（size+color 双参数）、找错用例（move 固定 20）

## VM 运行证据（2026-10-30，见 VM-RUN.md）

- scratch-vm@5.0.300 真实执行：sprite x=160（-200+6×60）、y≈0、direction=90、变量 size=140（20+6×20）、threads=0
- 修复过一个真实 bug：procedures_call 的 mutation argumentids 须为字符串化 JSON，非数组，VM 首次加载即报错，修复后通过
- 未验证画笔轨迹视觉：Node 运行无渲染器，costume 警告，pen 轨迹未目视确认；真实浏览器在 Scratch 编辑器中验证进行中，结果未回传
- 练习 B Node VM：x=160、size=140、color=180、threads=0；保存重开 Node VM：blocks 27 不变，重跑 x=160、size=140
- 网页课堂未接入：learn/scratch-lab/[lessonId]/page.tsx 仅处理 G3-U1-L02 与 G2，其余 notFound

## 2026-10-31 画笔根因与修复（已真实浏览器验证）

- 根因：生成器误用 `pen_down` / `pen_up`，但 Scratch VM 的真实画笔 opcode 是 `pen_penDown` / `pen_penUp`。`pen_clear` 存在故擦除能跑；未知 opcode 被执行器静默跳过、不报错，于是主循环照常跑、角色从 -200 走到 160、过程内移动也发生，但画笔从未落笔，一根线都画不出来。2026-10-30 的“工作区空白、0 颗星”与本次重测复现均由此解释：编辑器工作区同样因未知积木类型无法渲染该积木串。
- 修复：`build_g3_u1_l01.py` 中 4 处落笔/抬笔改为正确 opcode；变体由主文件派生，一并重建；结构测试增防回归断言（禁止 `pen_down` / `pen_up` 再出现），7 个测试全过。
- 带记录的渲染桩验证（Node scratch-vm + 记录调用的渲染桩）：主课产生 7 次 penPoint、30 次 penLine（6 颗星 × 每颗 5 段，段长 20/40/60/80/100/120 递增），终点 x=160、size=140；最小文件产生 1 次 penLine（-100,0 → 0,0）。
- 真实编辑器验证（2026-10-31，scratch.mit.edu/projects/editor，未登录、未保存、未发布）：最小修复文件工作区显示完整积木串，绿旗后舞台出现 -100 至 0 的蓝色水平线；主课工作区显示绿旗主堆与自定义积木定义堆，My Blocks 出现红色“画星形”积木（带 size 输入框），绿旗后舞台从左到右出现 6 个蓝色五角星轮廓、尺寸依次增大，终点 x=160、y=0、方向 90。
- 本次提交新增 `examples/scratch/g3/g3-u1-l01-star-flags.sb3`（修复后的主课文件，生成器可复现）。
- 2026-10-31 晚练习 B 与找错用例目视验证均已通过（Scratch 编辑器，未登录、未保存、未发布）：练习 B 6 颗星尺寸递增、颜色从左到右约红、黄绿、亮绿、青绿、蓝、紫，与色值 0/30/60/90/120/150 递变一致，终点 x=160、y=0、方向 90（最右侧星星部分被终点角色遮挡但轮廓可辨）；找错用例工作区定义中 move 步数写死 20、未用 size 参数，绿旗后 6 颗蓝色小星形大小完全相同、无递增，终点 x=160、y=0、方向 90，正是“变量涨了、星星没变大”的教学点。
- 仍未验证：网页课堂接入、独立教研、儿童试学、三端截图；本课仍不得标 completed，新头提交 CI 待复查。

## 明确未交付、不得冒称

- 不是网页课堂可玩课程：现有 G2 Blockly 课堂尚无过程积木与画笔积木，G3-U1-L01 尚未接入网页课堂
- 不是画笔轨迹视觉证据，也不是独立教研评审：AI 参考评审 46 分 redo 存在，但独立教研无记录，无儿童试学，无三端截图；独立教研材料包见 INDEPENDENT-REVIEW-PACK.md（仅材料清单，无结论）
- 不得标记 completed、不得发布，catalogStatus 仍为 outline_not_playable

## 下一步解锁条件

1. 带渲染器的 Scratch 环境中目视验证 6 颗星尺寸与位置递增
2. 决定网页课堂实现路径：扩展过程/画笔积木，或以 .sb3 导入课堂为先行路径
3. 练习 A、练习 B、找错、Node VM 保存重开已执行；仍缺视觉验证、课堂接入、独立教研、儿童试学
4. 独立人工教研复核后，方可进入 merged_waiting_ci / completed 流程
