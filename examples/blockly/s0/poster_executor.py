"""S0-U2-L06 safety poster executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '家庭网络安全海报', focus concept '安全', generic
acceptance. All titles, topics and rules are implementation choices, NOT
detailed-lesson values.
Model: a family safety poster is valid when, after a start event:
  - a title block gives a non-empty poster title;
  - at least 3 rule blocks follow, each with a topic from the U2 set
    (password, two_factor, privacy, phishing, permission) and a
    non-empty rule text;
  - rule topics are distinct;
  - a final help block gives a non-empty help line (who to ask);
  - at most 60 blocks.
Practice A: title 家庭网络安全海报; rules password/不分享口令,
phishing/可疑消息请大人看, permission/不乱给权限;
help 遇到问题请告诉老师或监护人.
Practice B: title 我们家的安全海报; rules two_factor/验证码不告诉别人,
privacy/隐私信息不分享, password/口令要够长够杂;
help 遇到问题请告诉老师或监护人.
Fault: only 2 rules; a duplicate topic; missing title; missing help;
an empty rule text; an unknown topic.
Extension: a 4th rule passes.
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""

TOPICS = {"password", "two_factor", "privacy", "phishing", "permission"}


class PosterError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise PosterError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise PosterError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "title" or not rest[0].get("text"):
        raise PosterError("缺少海报标题")
    title = rest[0]["text"]
    rules = []
    help_text = None
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "rule":
            topic = b.get("topic")
            text = b.get("text")
            if topic not in TOPICS:
                raise PosterError(f"未知主题 {topic}")
            if not text:
                raise PosterError(f"主题 {topic} 的规则内容不能为空")
            if topic in [r["topic"] for r in rules]:
                raise PosterError(f"主题 {topic} 重复")
            rules.append({"topic": topic, "text": text})
        elif bt == "help":
            if help_text is not None:
                raise PosterError("求助方式重复")
            if not b.get("text"):
                raise PosterError("求助方式不能为空")
            help_text = b["text"]
        else:
            raise PosterError(f"不支持的积木类型：{bt}")
    if len(rules) < 3:
        raise PosterError("海报至少要包含 3 条规则")
    if help_text is None:
        raise PosterError("海报缺少求助方式")
    return {"status": "success", "title": title, "rules": rules, "help": help_text}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "title", "text": "家庭网络安全海报"},
        {"type": "rule", "topic": "password", "text": "不分享口令"},
        {"type": "rule", "topic": "phishing", "text": "可疑消息请大人看"},
        {"type": "rule", "topic": "permission", "text": "不乱给权限"},
        {"type": "help", "text": "遇到问题请告诉老师或监护人"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
