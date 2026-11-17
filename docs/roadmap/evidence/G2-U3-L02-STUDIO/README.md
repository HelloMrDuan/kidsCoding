# OPS-042 证据包：G2-U3-L02《接住掉落水果》Scratch GUI 全屏课堂

新入口 `/studio/scratch/g2-u3-l02`（StudioShell 唯一外壳）。判定方法：
桥接直读当前作品 .sb3 → 本机真实 Scratch VM 完整运行一遍
（run-trace.ts 包裹 motion_changexby 原语记录每次真实移动与落地帧）
→ 既有 judge.ts 三层判定。不是静态数积木。

## 四关作品与真实运行数据（run-data.json 为机器可读原文）

| 文件 | 关卡 | 程序 | 落地帧 | 篮子 x | 舞台 | 任务 | 知识 | 总 |
|---|---|---|---|---|---|---|---|---|
| explore-reference.sb3 | 第一关（演示） | 重复 2 × +20 | 28 | 40 | ✗ | ✗ | ✓ | ✗（教学设定：预测对照用，本就接不住） |
| solve-reference.sb3 | 第二关 | 重复 15 × +10 | 28 | 150 | ✓ | ✓ | ✓ | ✓ |
| solve-buggy.sb3 | 第二关 | 重复 15 × −10（方向反） | 28 | −150 | ✗ | ✗ | ✓ | ✗ |
| transferLeft-reference.sb3 | 第三关 A | 重复 10 × −10 | 28 | −100 | ✓ | ✓ | ✓ | ✓ |
| transferLeft-buggy.sb3 | 第三关 A | 重复 10 × +10（方向反） | 28 | 100 | ✗ | ✗ | ✓ | ✗ |
| transferFast-reference.sb3 | 第三关 B | 重复 5 × +30（大步快跑） | 10 | 150 | ✓ | ✓ | ✓ | ✓ |
| transferFast-buggy.sb3 | 第三关 B | 重复 15 × +10（来不及） | 10 | 100 | ✗ | ✗ | ✓ | ✗ |

另有核心单测覆盖三案静态检查会误判的情形（真实 VM 执行记录识破）：
未连接积木（执行 0 次）、空循环（有重复积木且接住、循环内执行 0 次
→ 知识层 ✗）、无循环接住（知识层 ✗）。

## 保存与恢复

- 按关存入 IndexedDB（库 kidscoding-g2-u3-l02，key 为关卡 id），
  另存上次关卡；重载后回到上次关卡并恢复其作品，保存芯片回到
  “已保存”且绑定恢复作品哈希（Chromium 实测：恢复毛病版作品后
  复判仍为篮子 x=−150）。
- 保存失败注入（indexedDB.open 抛错）：芯片=“未能保存”，面板
  明示，判定结果照常呈现（检查成功 ≠ 已保存）。

## 截图（screenshots/，真实 Chromium，本地桥接宿主 = GUI 15.3.0
dist-standalone 开发构建 + 同协议 bridge.js，zh-cn locale）

- shell-1440.png / shell-phone.png：外壳与五视口几何（共 61/61 项通过）
- gui-zh-1440.png：GUI 简体中文（分类/积木/菜单）
- explore-judged-1440.png：第一关预测对照与三层判定
- solve-reference-passed-1440.png：参考作品三层全过
- solve-buggy-failed-1440.png：毛病作品舞台/任务不过
- restored-solve-1440.png：重载恢复
- save-failed-1440.png：保存失败如实显示

注：本地夹具验证不冒充线上部署验证；线上验收待 PR 合并与部署后进行。
