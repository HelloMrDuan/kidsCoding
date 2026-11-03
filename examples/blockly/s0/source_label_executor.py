"""S0-U3-L02 image source label executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '标注图片素材来源', focus concept '版权', generic
acceptance. All images, authors, sources and permissions are fictional
implementation choices, NOT detailed-lesson values, and NO real image
is used or copied here.
Model: a work may use an image ONLY when its label is complete and
allowed: author non-empty, source non-empty, permission == allowed.
After a start event, at least 3 images, all labels complete and allowed,
image ids distinct; at most 60 blocks.
Practice A: pic1 作者小林 来源学校图库 allowed;
pic2 作者小梅 来源家庭相册 allowed;
pic3 作者小刚 来源自己创作 allowed.
Practice B: pic1 作者小兔 来源学校图库 allowed;
pic2 作者小狐 来源自己创作 allowed;
pic3 作者小鸟 来源公共图库 allowed.
Fault: missing author; missing source; permission unknown;
permission not_allowed; a duplicate image id; only 2 images.
Extension: a 4th image passes.
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""


class LabelError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise LabelError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise LabelError("程序过长：超过60个积木")
    seen = {}
    for b in blocks[1:]:
        if b.get("type") != "image":
            raise LabelError(f"不支持的积木类型：{b.get('type')}")
        iid = b.get("id")
        if not iid:
            raise LabelError("图片缺少编号")
        if iid in seen:
            raise LabelError(f"图片 {iid} 重复")
        if not b.get("author"):
            raise LabelError(f"图片 {iid} 缺少作者标注")
        if not b.get("source"):
            raise LabelError(f"图片 {iid} 缺少来源标注")
        if b.get("permission") != "allowed":
            raise LabelError(f"图片 {iid} 未获使用许可，不能使用")
        seen[iid] = b
    if len(seen) < 3:
        raise LabelError("作品至少要使用 3 张标注完整的图片")
    return {"status": "success", "images": sorted(seen)}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "image", "id": "pic1", "author": "小林",
         "source": "学校图库", "permission": "allowed"},
        {"type": "image", "id": "pic2", "author": "小梅",
         "source": "家庭相册", "permission": "allowed"},
        {"type": "image", "id": "pic3", "author": "小刚",
         "source": "自己创作", "permission": "allowed"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
