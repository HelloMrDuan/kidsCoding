# G3 Scratch 高阶示例：流星分身

本示例是原创可编辑的 Scratch 3 项目**生成器**。运行：
```bash
cd examples/scratch/g3
python build_scratch_project.py
python -m unittest discover -s . -p 'test_*.py' -v
```
生成 `meteor_clones.sb3`，可用 Scratch 3 编辑器“文件→从电脑中加载”导入尝试。
场景与流星均为仓库内原创 SVG，可修改、可审查，无商业角色和图片引用。

教学对应 `G3-U1-L02 克隆流星雨`，脚本包含点击绿旗隐藏原对象、循环创建10个分身、克隆显示/下落/删除。结构验证覆盖项目 JSON、素材哈希和脚本联接。

**严格区分：结构校验成功不等于 Scratch VM 实际运行成功。** 导入与30次循环行为尚需官方 Scratch 3 运行器真实验证，不得直接发布儿童端。
