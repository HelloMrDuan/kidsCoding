"""D0-U4-L04 accessibility check executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '无障碍内容检查', focus concept '数据', generic
acceptance. All content items and checks are implementation choices, NOT
detailed-lesson values.
Model: an accessibility check reviews content items. Each item must have
a text alternative (alt text) if it is an image, a caption if it is a
video, and a readable font size (>= 14) if it is text. A check passes
only if at least 3 items are reviewed, every item passes its own rule,
and at least one issue is found and fixed (showing the check did work).
Practice A: image with alt, video with caption, text size 16 -> all pass,
but a second image without alt is found and fixed (alt added).
Practice B: image with alt, text size 14, video with caption -> all pass,
plus a text size 12 found and fixed to 16 (different goal: different issue).
Fault: an image without alt and no fix, or a video without caption, or
fewer than 3 items reviewed.
Extension: add a 4th item (image with alt) that passes.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class AccessError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise AccessError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise AccessError("程序过长：超过60个积木")
    items = {}
    current = None
    fixes = []
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "item":
            current = b.get("name")
            items[current] = {"kind": b.get("kind"), "alt": None, "caption": None, "size": None}
        elif bt == "alt":
            if current is None: raise AccessError("替代文本必须属于一个内容项")
            items[current]["alt"] = b.get("text")
        elif bt == "caption":
            if current is None: raise AccessError("字幕必须属于一个内容项")
            items[current]["caption"] = b.get("text")
        elif bt == "size":
            if current is None: raise AccessError("字号必须属于一个内容项")
            items[current]["size"] = b.get("value")
        elif bt == "fix":
            fixes.append(b.get("item"))
        else:
            raise AccessError(f"不支持的积木类型：{bt}")
    if len(items) < 3:
        raise AccessError("无障碍检查至少要检查 3 个内容项")
    # A fix record alone does NOT excuse a still-broken item: every item
    # must pass its own rule, and at least one fix must be recorded.
    for name, it in items.items():
        if it["kind"] == "image" and not it["alt"]:
            raise AccessError(f"图片 {name} 缺少替代文本")
        if it["kind"] == "video" and not it["caption"]:
            raise AccessError(f"视频 {name} 缺少字幕")
        if it["kind"] == "text" and (it["size"] is None or it["size"] < 14):
            raise AccessError(f"文本 {name} 字号小于 14")
    if not fixes:
        raise AccessError("无障碍检查至少要发现并修复一个问题")
    for f in fixes:
        if f not in items:
            raise AccessError(f"修复引用了未检查的内容项 {f}")
    return {"status": "success", "items": list(items.keys()), "fixes": fixes}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "item", "name": "pic1", "kind": "image"},
        {"type": "alt", "text": "一只狐狸"},
        {"type": "item", "name": "vid1", "kind": "video"},
        {"type": "caption", "text": "森林剧场开场"},
        {"type": "item", "name": "txt1", "kind": "text"},
        {"type": "size", "value": 16},
        {"type": "item", "name": "pic2", "kind": "image"},
        {"type": "fix", "item": "pic2"},
        {"type": "alt", "text": "一只兔子"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
