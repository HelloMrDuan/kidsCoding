"""S0-U3-L04 kind message executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '友善的网络表达', focus concept '信息素养', generic
acceptance. All comments are fictional teaching examples, NOT
detailed-lesson values, and are never to be repeated at a real person.
Model: after a start event, at least 4 comments, including at least 1
kind, at least 1 neutral, and at least 1 rude comment; every rude
comment must have exactly one rewrite block with non-empty text that
contains none of the unkind words (难看, 笨, 讨厌); a rewrite for a
non-rude comment fails; no comment id twice; at most 60 blocks.
Practice A: kind 你的画颜色真好看; neutral 我看到你画了一只猫;
rude 你画得真难看, rewritten as 可以再试试不同的颜色;
kind 谢谢你的分享.
Practice B: neutral 这是一个故事; rude 你写得真差,
rewritten as 可以再改改结尾; kind 我喜欢这个开头;
neutral 我读完了.
Fault: a rude comment without a rewrite; a rewrite containing an
unkind word; a rewrite for a kind comment; a duplicate comment id;
only 3 comments.
Extension: a 5th kind comment passes.
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""

UNKIND = ("难看", "笨", "讨厌")


class KindError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise KindError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise KindError("程序过长：超过60个积木")
    comments = {}
    rewrites = {}
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "comment":
            cid = b.get("id")
            tone = b.get("tone")
            if not cid:
                raise KindError("留言缺少编号")
            if cid in comments:
                raise KindError(f"留言 {cid} 重复")
            if tone not in ("kind", "neutral", "rude"):
                raise KindError(f"留言 {cid} 的语气必须是 kind、neutral 或 rude")
            if not b.get("text"):
                raise KindError(f"留言 {cid} 内容不能为空")
            comments[cid] = tone
        elif bt == "rewrite":
            cid = b.get("id")
            text = b.get("text", "")
            if cid in rewrites:
                raise KindError(f"留言 {cid} 的改写重复")
            if not text:
                raise KindError(f"留言 {cid} 的改写不能为空")
            if any(word in text for word in UNKIND):
                raise KindError(f"留言 {cid} 的改写仍含不友善词语")
            rewrites[cid] = text
        else:
            raise KindError(f"不支持的积木类型：{bt}")
    if len(comments) < 4:
        raise KindError("至少要写 4 条留言")
    tones = set(comments.values())
    for required in ("kind", "neutral", "rude"):
        if required not in tones:
            raise KindError(f"至少要包含 1 条{required}留言")
    for cid, tone in comments.items():
        if tone == "rude" and cid not in rewrites:
            raise KindError(f"不友善留言 {cid} 缺少改写")
        if tone != "rude" and cid in rewrites:
            raise KindError(f"非不友善留言 {cid} 不需要改写")
    return {"status": "success", "comments": comments}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "comment", "id": "c1", "tone": "kind", "text": "你的画颜色真好看"},
        {"type": "comment", "id": "c2", "tone": "neutral", "text": "我看到你画了一只猫"},
        {"type": "comment", "id": "c3", "tone": "rude", "text": "你画得真难看"},
        {"type": "rewrite", "id": "c3", "text": "可以再试试不同的颜色"},
        {"type": "comment", "id": "c4", "tone": "kind", "text": "谢谢你的分享"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
