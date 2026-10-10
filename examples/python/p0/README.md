# KidsCoding · Python 入门四个可执行参考项目

仅用于 P0 课程的**离线教学演示**。不涉及真实儿童姓名、密码、账号、付费抽奖、外部网络或数据上传。它们不代表 KidsCoding 线上 Python 运行引擎已接入。

| 对应课 | 原创项目 | 本地验收 |
|---|---|---|
| P0-U1-L06 | 兴趣名片生成器 | strip/字段长度/换行与空输入 |
| P0-U2-L06 | 班级任务卡随机分配器（不涉奖品） | 固定随机种子、唯一性、边界校验 |
| P0-U3-L06 | 图书馆借阅助手 | 首借、重复借、还书、未知书 |
| P0-U4-L06 | 校园任务管理器 | 添加、完成、重复完成、无效编号 |

## 命令

在本目录执行：

\`\`\`bash
python -m unittest discover -s . -p 'test_*.py' -v
python course_projects.py profile 小雨 画画 蓝
python course_projects.py cards 2 浇花 整理 图书 --seed 2
python course_projects.py library
python course_projects.py board
\`\`\`

请勿以这四个离线项目代替前台浏览器沙箱。要开放在线编程，仍需服务端隔离运行、安全配额、课程内容授权、自动测评集成和E2E验收。
