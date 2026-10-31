"""S0-U3-L06 civility initiative executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '设计网络文明倡议', focus concept '协作', generic
acceptance. All titles, pledges, signers and actions are implementation
choices, NOT detailed-lesson values.
Model: a civility initiative is valid when, after a start event:
  - a title block gives a non-empty initiative title;
  - at least 3 pledge blocks, each with a topic from
    (kind, credit, privacy, safe, help) and non-empty text;
  - pledge topics are distinct;
  - at least 2 distinct signers;
  - an action block gives a non-empty follow-up action;
  - at most 60 blocks.
Practice A: title 网络文明倡议; pledges kind/说话友善不攻击人,
credit/用别人的作品先问, privacy/不分享隐私;
signers 小狐, 小兔; action 每周一起检查.
Practice B: title 我们班的文明约定; pledges safe/只分享公开作品,
help/遇到可疑消息请大人看, kind/留言先想想对方感受;
signers 小龟, 小鸟; action 每天提醒一次.
Fault: only 2 pledges; a duplicate topic; only 1 signer;
missing action; missing title.
Extension: a 4th pledge passes.
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""

TOPICS = {"kind", "credit", "privacy", "safe", "help"}


class InitiativeError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise InitiativeError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise InitiativeError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "title" or not rest[0].get("text"):
        raise InitiativeError("缺少倡议标题")
    title = rest[0]["text"]
    pledges = []
    signers = []
    action = None
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "pledge":
            topic = b.get("topic")
            text = b.get("text")
            if topic not in TOPICS:
                raise InitiativeError(f"未知主题 {topic}")
            if not text:
                raise InitiativeError(f"主题 {topic} 的约定内容不能为空")
            if topic in [p["topic"] for p in pledges]:
                raise InitiativeError(f"主题 {topic} 重复")
            pledges.append({"topic": topic, "text": text})
        elif bt == "signer":
            name = b.get("name")
            if not name:
                raise InitiativeError("签名者名称不能为空")
            if name in signers:
                raise InitiativeError(f"签名者 {name} 重复")
            signers.append(name)
        elif bt == "action":
            if action is not None:
                raise InitiativeError("跟进行动重复")
            if not b.get("text"):
                raise InitiativeError("跟进行动不能为空")
            action = b["text"]
        else:
            raise InitiativeError(f"不支持的积木类型：{bt}")
    if len(pledges) < 3:
        raise InitiativeError("倡议至少要包含 3 条约定")
    if len(signers) < 2:
        raise InitiativeError("倡议至少要有 2 名签名者")
    if action is None:
        raise InitiativeError("倡议缺少跟进行动")
    return {"status": "success", "title": title, "pledges": pledges,
            "signers": signers, "action": action}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "title", "text": "网络文明倡议"},
        {"type": "pledge", "topic": "kind", "text": "说话友善不攻击人"},
        {"type": "pledge", "topic": "credit", "text": "用别人的作品先问"},
        {"type": "pledge", "topic": "privacy", "text": "不分享隐私"},
        {"type": "signer", "name": "小狐"},
        {"type": "signer", "name": "小兔"},
        {"type": "action", "text": "每周一起检查"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
