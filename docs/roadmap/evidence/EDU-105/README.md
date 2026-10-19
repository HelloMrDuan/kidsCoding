# EDU-105 G0-U1 打磨：语音朗读、反思作答、错块定位

来源：TQ-004 重新复核（#84）的打磨清单。仍为 L3 实验可试玩。

| 改动 | 位置 | 验证 |
|---|---|---|
| 🔊 听一听：每关说明 + 预测问题、错误诊断 + 当前提示、反思题都能中文朗读（浏览器自带 zh-CN 声音，不录音不上传，不支持时按钮隐藏） | features/lessons/voice/read-aloud.tsx | read-aloud.test.tsx；E2E 断言朗读文本与 zh-CN |
| 错块定位：撞石头/落水/出界/门锁等失败时说“问题出在第 N 块‘X’” | grid-lab.tsx failingBlockNote | grid-lab-pointer.test.ts；E2E |
| 点选式反思：每课一题、三个选项、判对错并说明原因，选择保存在本机，重开仍在 | g0-u1-grid-lessons.ts reflectionCheck、grid-draft.ts | g0-u1-grid-lessons.test.ts、grid-draft.test.ts；E2E |

截图：lesson-1440/768/375.png（L04 失败后诊断 + 错块 + 听一听），reflect-1440/768/375.png（L05 完成页反思）。

AI 参考再评（评分者也是实现者）：L01 82 / L02 82 / L03 80 / L04 85 / L05 85 / L06 89。仍需负责人或独立人工复核与儿童试学。
