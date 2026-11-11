"""M0-U1-L06 geometry gallery executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '制作几何艺术馆', focus concept '对称', generic
acceptance. All exhibit counts and names are implementation choices,
NOT detailed-lesson values.
Model: a geometry gallery must contain at least 3 exhibits, each exhibit
being a named work from the earlier M0-U1 lessons (square, mirror flower,
polygon, fractal tree), each work must be symmetric or regular, and the
gallery must have a title.
Practice A: gallery with square, mirror flower, pentagon.
Practice B: gallery with hexagon, fractal tree, mirror flower (different
goal: different selection, same completeness rule).
Fault: gallery with only 2 exhibits, or with an asymmetric work.
Extension: add a fourth exhibit (fractal tree) to practice A.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
WORKS = {
    "square": {"symmetric": True},
    "mirror_flower": {"symmetric": True},
    "pentagon": {"symmetric": True},
    "hexagon": {"symmetric": True},
    "fractal_tree": {"symmetric": True},
    "broken_shape": {"symmetric": False},
}

class GalleryError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise GalleryError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise GalleryError("程序过长：超过40个积木")
    title = None
    exhibits = []
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "title":
            title = b.get("text")
        elif bt == "exhibit":
            exhibits.append(b.get("work"))
        else:
            raise GalleryError(f"不支持的积木类型：{bt}")
    if not title:
        raise GalleryError("几何艺术馆需要一个标题")
    if len(exhibits) < 3:
        raise GalleryError("几何艺术馆至少要展出3件作品")
    for w in exhibits:
        if w not in WORKS:
            raise GalleryError(f"未知作品：{w}")
        if not WORKS[w]["symmetric"]:
            raise GalleryError(f"作品不对称，不能展出：{w}")
    return {"status": "success", "title": title, "exhibits": exhibits}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "title", "text": "几何艺术馆"},
        {"type": "exhibit", "work": "square"},
        {"type": "exhibit", "work": "mirror_flower"},
        {"type": "exhibit", "work": "pentagon"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
