# KidsCoding P1/P2 · 八个单元级真实参考项目

G3/Scratch 的运行时另行验收。这是 P1 与 P2 的纯 Python 项目参考实现，不会自动开放儿童端在线运行。

P1：数学艺术 SVG、洞穴文字冒险、打砖块物理+Pygame UI、太空生存状态模型。
P2：成绩名次与二分查找、FIFO消息中心、BFS迷宫最短路、拓扑依赖排程。

```bash
cd examples/python/advanced
python -m unittest discover -s . -p 'test_*.py' -v
python -m pip install -r requirements-pygame.txt
SDL_VIDEODRIVER=dummy python pygame_showcase.py --smoke
python pygame_showcase.py   # 有桌面显示设备时才运行
```

使用原创形状、匿名模拟数据，禁止读取真实儿童资料。Python 图形运行器仍需浏览器安全隔离、运行时限制、输入过滤、课程题目逐项验证后才允许上线。
