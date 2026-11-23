"""R0-U4-L06 maker work defense executor (first stage, not a web
classroom, NOT a real defense, NOT a grade).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '创客作品答辩', focus concept '展示', generic
acceptance. All works, claims, questions and answers are
implementation choices and fictional classroom examples, NOT
detailed-lesson values.
Model: a simulated defense is valid when, in this order after a
start event:
  - a work block with a non-empty title (the work being defended);
  - at least 2 claim blocks, each with a non-empty point and
    non-empty evidence (what the work does, and the evidence for
    it);
  - at least 2 question blocks, each with a non-empty question and a
    kind in {how, why, fail}; at least one question must be of kind
    fail (a hard question about what goes wrong or what fails);
  - answer blocks, exactly as many as question blocks, in order,
    each with a non-empty answer;
  - exactly one reflect block, last, with a non-empty improvement
    (one thing to do better next time);
  - at most 60 blocks.
Defense lesson: a claim without evidence is just a boast; a defense
that never faces a hard question is not a defense; every question
gets an answer; and every defense ends with what to improve, not
with a self-awarded grade. There is deliberately no verdict block:
children do not grade themselves.
This is a SCRIPT MODEL ONLY. It never runs a real defense and never
grades anyone. A real defense is a classroom activity with a
teacher, where questions are asked kindly and answers are listened
to, and no child is shamed for a wrong answer.
Practice A: work 迷你巡线车； claims (沿线走, 传感器差速), (丢线
停下, 两边都不在线就停下)； questions how (怎么转向), fail (丢线
怎么办)； answers (慢的一侧就是线那边), (停下再找线)； reflect
(下次加更多传感器).
Practice B: work 智慧浇水机； claims (干了浇水, 湿度低于 40 就浇),
(湿了不浇, 湿度 40 及以上就不浇)； questions why (为什么是 40),
fail (传感器坏了怎么办)； answers (40 是干和湿的分界), (先停下
再请老师检查)； reflect (下次多测几组读数).
Fault: fewer than 2 claims; fewer than 2 questions; no fail
question; answers fewer or more than questions; an empty point,
evidence, question, answer or improvement; reflect before the
answers are complete; missing work/reflect; missing start.
Extension: 3 claims, 3 questions (how, why, fail), 3 answers,
reflect.
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor a real defense. Those remain missing.
"""

QUESTION_KINDS = ["how", "why", "fail"]


class DefenseError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise DefenseError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise DefenseError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "work":
        raise DefenseError("缺少作品：作品必须是开始后的第一个积木")
    if not rest[0].get("title"):
        raise DefenseError("作品标题不能为空")
    work = rest[0]["title"]
    claims = []
    questions = []
    answers = []
    reflect = None
    stage = 1  # 1 claims, 2 questions, 3 answers, 4 reflect, 5 done
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "claim":
            if stage != 1:
                raise DefenseError("陈述只能在作品之后、提问之前")
            if not b.get("point"):
                raise DefenseError("有一个陈述没有观点")
            if not b.get("evidence"):
                raise DefenseError("有一个陈述没有证据")
            claims.append(b)
        elif bt == "question":
            if stage == 1:
                if len(claims) < 2:
                    raise DefenseError("陈述少于 2 条，不能提问")
                stage = 2
            if stage != 2:
                raise DefenseError("提问只能在陈述之后、回答之前")
            if not b.get("question"):
                raise DefenseError("有一个问题是空的")
            if b.get("kind") not in QUESTION_KINDS:
                raise DefenseError(f"问题类型 {b.get('kind')} 不在怎么、为什么、失败中")
            questions.append(b)
        elif bt == "answer":
            if stage == 2:
                if len(questions) < 2:
                    raise DefenseError("问题少于 2 个，不能回答")
                if "fail" not in {q.get("kind") for q in questions}:
                    raise DefenseError("问题里没有失败类难题，不能回答")
                stage = 3
            if stage != 3:
                raise DefenseError("回答只能在提问之后、反思之前")
            if not b.get("answer"):
                raise DefenseError("有一个回答是空的")
            answers.append(b)
        elif bt == "reflect":
            if stage != 3:
                raise DefenseError("反思只能在回答之后")
            if len(answers) != len(questions):
                raise DefenseError("回答数和问题数不一样")
            if not b.get("improve"):
                raise DefenseError("反思没有写下次改进什么")
            reflect = b["improve"]
            stage = 4
        else:
            raise DefenseError(f"不支持的积木类型：{bt}")
    if reflect is None:
        raise DefenseError("缺少反思积木")
    return {"status": "success", "work": work, "claims": claims,
            "questions": questions, "answers": answers,
            "reflect": reflect}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "work", "title": "迷你巡线车"},
        {"type": "claim", "point": "小车能沿线走",
         "evidence": "传感器差速转向"},
        {"type": "claim", "point": "小车丢线会停下",
         "evidence": "两边都不在线就停下"},
        {"type": "question", "kind": "how", "question": "小车怎么转向"},
        {"type": "question", "kind": "fail", "question": "小车丢线怎么办"},
        {"type": "answer", "answer": "慢的一侧就是线那边"},
        {"type": "answer", "answer": "停下再找线"},
        {"type": "reflect", "improve": "下次加更多传感器"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
