"""S0-U4-L06 class digital safety guide executor (first stage, not a web
classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '制作班级数字安全指南', focus concept '恢复',
generic acceptance. All titles, topics, texts and contributors are
implementation choices, NOT detailed-lesson values.
Model: a class safety guide is valid when, after a start event:
  - a title block gives a non-empty guide title;
  - at least 4 section blocks, each with a topic from
    (threat, update, backup, recovery, log) and non-empty text;
  - section topics are distinct;
  - the recovery topic is present (this lesson's focus concept is 恢复);
  - at least 2 distinct contributor blocks;
  - a check block with non-empty text is present;
  - at most 60 blocks.
The guide gathers the whole S0-U4 unit: threat modelling, updates, backup,
recovery and log reading. It is a classroom guide, not a real security
policy; anything unsure must be shown to a teacher or guardian.
Practice A: title 班级数字安全指南; sections threat/先想威胁再想防护,
backup/每份作品都备份, recovery/删了从备份恢复并核对,
log/看日志找异常请老师; contributors 小狐, 小兔; check 请老师检查.
Practice B: title 我们班的安全小手册; sections update/只用官方更新,
backup/备份完要打开核对, recovery/恢复后检查内容,
log/异常要照抄日志内容; contributors 小龟, 小鸟; check 全班一起读一遍.
Fault: only 3 sections; a duplicate topic; no recovery section;
only 1 contributor; missing check; missing title; missing start.
Extension: a 5th section passes.
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""

TOPICS = {"threat", "update", "backup", "recovery", "log"}


class GuideError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise GuideError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise GuideError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "title" or not rest[0].get("text"):
        raise GuideError("缺少指南标题")
    title = rest[0]["text"]
    sections = []
    contributors = []
    check = None
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "section":
            topic, text = b.get("topic"), b.get("text")
            if topic not in TOPICS:
                raise GuideError(f"未知主题 {topic}")
            if not text:
                raise GuideError(f"主题 {topic} 的内容不能为空")
            if topic in [s["topic"] for s in sections]:
                raise GuideError(f"主题 {topic} 重复")
            sections.append({"topic": topic, "text": text})
        elif bt == "contributor":
            name = b.get("name")
            if not name:
                raise GuideError("参与者名称不能为空")
            if name in contributors:
                raise GuideError(f"参与者 {name} 重复")
            contributors.append(name)
        elif bt == "check":
            if check is not None:
                raise GuideError("检查记录重复")
            if not b.get("text"):
                raise GuideError("检查记录不能为空")
            check = b["text"]
        else:
            raise GuideError(f"不支持的积木类型：{bt}")
    if len(sections) < 4:
        raise GuideError("指南至少要包含 4 个主题")
    if "recovery" not in [s["topic"] for s in sections]:
        raise GuideError("指南必须包含恢复主题")
    if len(contributors) < 2:
        raise GuideError("指南至少要有 2 名参与者")
    if check is None:
        raise GuideError("指南缺少检查记录")
    return {"status": "success", "title": title, "sections": sections,
            "contributors": contributors, "check": check}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "title", "text": "班级数字安全指南"},
        {"type": "section", "topic": "threat", "text": "先想威胁再想防护"},
        {"type": "section", "topic": "backup", "text": "每份作品都备份"},
        {"type": "section", "topic": "recovery", "text": "删了从备份恢复并核对"},
        {"type": "section", "topic": "log", "text": "看日志找异常请老师"},
        {"type": "contributor", "name": "小狐"},
        {"type": "contributor", "name": "小兔"},
        {"type": "check", "text": "请老师检查"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
