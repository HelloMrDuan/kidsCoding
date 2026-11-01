# G3-U1-L01 VM 运行证据（Node scratch-vm，无渲染器）

时间：2026-10-30
VM：scratch-vm@5.0.300（与仓库沙箱 `scratch-g2-sandbox.html` 同版本），scratch-storage@4.0.0
命令（临时目录，不改仓库 package.json）：
```
mkdir /tmp/g3vm && cd /tmp/g3vm
npm install scratch-vm@5.0.300 scratch-storage@4.0.0
node run.js   # 加载 examples/scratch/g3 生成的 g3-u1-l01-star-flags.sb3，greenFlag，运行 3 秒，stopAll
```

## 实际结果（不是结构测试）

- targets：`Stage`, `画笔`
- sprite x：160（预期 -200 + 6×60 = 160）
- sprite y：9.9e-14（即 0，浮点误差）
- direction：90（每颗星 5×144=720 度，6 颗星后回到起点方向）
- 变量 size：140（预期 20 + 6×20 = 140）
- threads：0（无永远循环残留）
- 结论脚本输出：`VM_RUN_OK`

## 修复记录（真实 bug，非事后美化）

首次 VM 加载失败，报错：`procedures_call` 的 mutation `argumentids` 应为字符串而非数组。
已修复生成器：`argumentids`、`argumentnames`、`argumentdefaults` 均改为字符串化 JSON
（例如 `"[\"size\"]"`、`"[\"20\"]"`），结构测试同步更新，VM 重新运行通过。

## 练习与找错变体（2026-10-30 后续，同一 VM 条件）

生成器：`examples/scratch/g3/build_g3_u1_l01_variants.py`，从主 .sb3 派生，不改主课 .sb3。

- 练习 A `g3-u1-l01-practice-a.sb3`：set size 30、change 10，VM 结果 x=160、y≈0、size=90、threads=0，`VM_RUN_OK`。证明改 size 序列确实改变最终变量，且循环/位置不受影响。
- 找错用例 `g3-u1-l01-failure-hardcoded-size.sb3`：过程内 move steps 写死为 20，不再用 size 参数，VM 结果 x=160、size 变量=140、threads=0，`VM_RUN_OK`。注意口径：VM 位置与变量结果与主课相同，不能从 x/size 证明“星星一样大”；找错证据是结构证据——move steps 固定为 20，6 颗星的移动步数相同，与 LESSON-DESIGN.md 中的找错设计一致。画笔轨迹仍未目视验证，教学时须从积木结构讲清，不得用 VM 位置结果冒充星形大小证据。

## 练习 B 与保存重开（2026-10-30 后续，同一 VM 条件）

- 练习 B `g3-u1-l01-practice-b.sb3`：过程改为 `画星形 %s %s`（size、color 两个参数），
  过程内先 set pen hue 为 color 参数，再重复 5 次移动 size、右转 144 度；
  主脚本 color 变量从 0 起、每次 +30，VM 结果 x=160、size=140、color=180、threads=0，`VM_RUN_OK`。
  颜色差异本身未在 Node VM 中目视验证，需真实浏览器截图确认，见下节。
- 保存重开（Node VM）：主课运行后用 `vm.saveProjectSb3()` 保存（1967 字节，原文件 1994 字节，
  差异为 VM 序列化，非测试改动），新 VM 重载后 blocks 27 个不变，含 procedures_call 与 pen_penDown（2026-10-31 前为误写的 pen_down，见修复说明），
  重跑 x=160、size=140、threads=0，`SAVE_REOPEN_OK`。注意口径：这是 Node VM 保存重开，
  不是 Scratch GUI 或网页课堂保存重开，网页课堂目前未接入本课（见下节）。

## 网页课堂接入核实（2026-10-30，main 30ee2278）

- 文件：`apps/web/src/app/learn/scratch-lab/[lessonId]/page.tsx`（552 字节）
- 代码：仅当 lessonId 为 `G3-U1-L02` 时返回 `<ScratchVMTrial/>`，G2 课程返回 `<ScratchG2Lab/>`，
  其余返回 `notFound()`。因此 G3-U1-L01 在网页课堂中返回 notFound，**未真正接入**。
- 详细稿 delivery 亦为 lessonCodeStatus=requires_individual_implementation、
  runtimeVerification=not_verified、materialsApproval=pending、releaseAllowed=false，
  与台账 catalogStatus=outline_not_playable 一致。

## 真实浏览器视觉验证（进行中，未完成）

- 本地 Chromium CLI 不可用：`/opt/meta-chromium/chrome --headless` 报错
  `Hatch WebGL domain policy is required for browser startup`，因此未用本地 CLI 截图冒充证据。
- 已改走 Muse  live browser：在 Scratch 编辑器（scratch.mit.edu/projects/editor）中
  加载主课与练习 B .sb3，点击绿旗运行并截图，报告星星数量、尺寸递增、颜色差异。
  截至本文件提交时浏览器任务已接受、结果尚未回传，**不得声称视觉已验证**。

## 2026-10-31 画笔根因、修复与真实浏览器验证（已完成）

- 根因：生成器误用 `pen_down` / `pen_up`，Scratch VM 真实 opcode 为 `pen_penDown` / `pen_penUp`。证据链：VM 原语表中有 `pen_penDown`/`pen_penUp` 而无 `pen_down`/`pen_up`；带记录的渲染桩跑旧文件时只出现 `penClear`，无 `penPoint`/`penLine`，而角色仍从 -200 走到 160——未知 opcode 被静默跳过。
- 修复后带记录的渲染桩：主课 7 次 penPoint、30 次 penLine（6 颗星 × 5 段，段长 20/40/60/80/100/120），终点 x=160、size=140；最小文件 1 次 penLine（-100,0 → 0,0）。
- 真实编辑器（scratch.mit.edu/projects/editor，未登录、未保存、未发布）：最小修复文件工作区完整、绿旗后出现 -100 至 0 的蓝色水平线；主课工作区有绿旗主堆与定义堆，My Blocks 有红色“画星形”积木（带 size 输入框），绿旗后舞台出现 6 个尺寸递增的蓝色五角星轮廓，终点 x=160、y=0、方向 90。主课星形目视验证至此完成（单设备编辑器，非三端、非网页课堂）。
- 2026-10-31 晚练习 B 与找错用例目视验证均已通过（Scratch 编辑器，未登录、未保存、未发布）：练习 B 6 颗星尺寸递增、颜色从左到右约红、黄绿、亮绿、青绿、蓝、紫，终点 x=160、y=0、方向 90；找错用例 6 颗蓝色小星形大小完全相同、无递增，终点 x=160、y=0、方向 90。
- 2026-10-31 晚练习 A 目视验证亦已通过（Scratch 编辑器，未登录、未保存、未发布）：工作区有绿旗主堆（set size 30、repeat 6、change size by 10）与定义堆（define 画星形 size、repeat 5、move size steps、turn 144），绿旗后 6 颗蓝色星形从左到右依次增大，终点 x=160、y=0、方向 90（最右侧星形部分被终点角色遮挡但轮廓可辨；size 变量 90 为脚本推算值，舞台未显示变量监视器，角色面板 Size 100 是角色大小、非 size 变量）。
- 仍未验证：网页课堂接入、独立教研、儿童试学、三端截图。

## 明确未验证

- 无渲染器：Node 运行警告 `No rendering module present; cannot load costume`，画笔轨迹未视觉验证，
  只能证明过程、循环、变量、位置在真实 VM 中执行，pen clear/down/up 积木未报错且线程正常结束
- pen 翻译缺失警告为 cosmetic，不影响执行结果
- 无独立教研、无儿童试学、无网页课堂接入、无三端截图
- 因此仍不得标 completed、不得发布
