"""D0-U4-L05 three-round creation iteration executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '三轮创作迭代', focus concept '协作', generic
acceptance. All round counts, reviewer rules and checks are implementation
choices, NOT detailed-lesson values.
Model: a creation is improved in rounds. Each round must contain at least
one piece of feedback from a collaborator AND at least one revision made
after that feedback, so a round is not counted on feedback alone or on an
unreviewed change alone. A creation passes only when:
  - at least 3 rounds are completed, in order round1, round2, round3;
  - every round has feedback and a later revision;
  - feedback comes from at least 2 distinct reviewers across the rounds
    (collaboration, not a solo pass);
  - the final round is approved after its revision.
Practice A: 3 rounds, reviewers 小狐 / 小兔 / 小狐, each feedback then
revise, final round approved.
Practice B: 3 rounds, reviewers 小兔 / 小龟 / 小兔, each feedback then
revise, final round approved (different reviewers, same structure).
Fault: fewer than 3 rounds; a round without feedback; a round with
feedback but no revision; a revision before any feedback in its round;
a final round never approved; feedback from only one reviewer.
Extension: a 4th round (round4) with feedback, revision and approval.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""


class IterationError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise IterationError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise IterationError("程序过长：超过60个积木")
    rounds = {}
    order = []
    current = None
    reviewers = set()
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "round":
            current = b.get("name")
            if current in rounds:
                raise IterationError(f"轮次 {current} 重复")
            rounds[current] = {"feedback": False, "revise": False,
                               "approved": False, "feedback_seen": False}
            order.append(current)
        elif bt == "feedback":
            if current is None:
                raise IterationError("反馈必须属于一个轮次")
            reviewer = b.get("reviewer")
            if not reviewer:
                raise IterationError("反馈必须注明协作者")
            rounds[current]["feedback"] = True
            rounds[current]["feedback_seen"] = True
            reviewers.add(reviewer)
        elif bt == "revise":
            if current is None:
                raise IterationError("修改必须属于一个轮次")
            if not rounds[current]["feedback_seen"]:
                raise IterationError(f"{current} 修改前必须先有反馈")
            rounds[current]["revise"] = True
        elif bt == "approve":
            if current is None:
                raise IterationError("通过必须属于一个轮次")
            if not rounds[current]["revise"]:
                raise IterationError(f"{current} 通过前必须先有修改")
            rounds[current]["approved"] = True
        else:
            raise IterationError(f"不支持的积木类型：{bt}")
    if order[:3] != ["round1", "round2", "round3"]:
        raise IterationError("三轮创作迭代至少要按顺序完成 round1、round2、round3")
    for name in order[:3]:
        r = rounds[name]
        if not r["feedback"]:
            raise IterationError(f"{name} 缺少协作者反馈")
        if not r["revise"]:
            raise IterationError(f"{name} 有反馈但没有修改")
    if len(reviewers) < 2:
        raise IterationError("协作迭代至少需要 2 位不同协作者的反馈")
    if not rounds["round3"]["approved"]:
        raise IterationError("最后一轮修改后必须通过才能完成迭代")
    return {"status": "success", "rounds": order,
            "reviewers": sorted(reviewers)}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "round", "name": "round1"},
        {"type": "feedback", "reviewer": "小狐", "text": "开头不够清楚"},
        {"type": "revise", "change": "把开头改成一句话讲清主题"},
        {"type": "round", "name": "round2"},
        {"type": "feedback", "reviewer": "小兔", "text": "中间少了一个例子"},
        {"type": "revise", "change": "中间加一个森林例子"},
        {"type": "round", "name": "round3"},
        {"type": "feedback", "reviewer": "小狐", "text": "结尾可以再短一点"},
        {"type": "revise", "change": "结尾缩成一句话"},
        {"type": "approve"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
