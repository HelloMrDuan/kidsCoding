"""S0-U3-L01 message judgement executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '如何判断一条消息', focus concept '版权', generic
acceptance. All messages and rules are implementation choices, NOT
detailed-lesson values.
Rule (classroom heuristic, not a legal judgement): a message may be
trusted and reused ONLY when all of these hold: its source is known,
its author is named, it gives evidence, and it was not copied without
permission. Otherwise it must not be trusted or reused; when unsure,
ask a teacher or guardian.
Model: after a start event, at least 4 messages, including at least 1
trust and at least 1 do_not judgement; every verdict must match the
rule; no message id twice; at most 60 blocks.
Practice A: known source + named author + evidence + not copied -> trust;
unknown source -> do_not; author unnamed and copied without permission
-> do_not; known source + named author + evidence + not copied -> trust.
Practice B: no evidence -> do_not; copied without permission -> do_not;
unknown source -> do_not; all good -> trust.
Fault: a wrong verdict; only trust judgements; a duplicate message id;
fewer than 4 messages; a copied-without-permission message judged trust.
Extension: a 5th all-good message passes as trust.
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""


class JudgeError(Exception):
    pass


def expected_verdict(msg):
    if (msg.get("source_known") and msg.get("author_named")
            and msg.get("evidence_given")
            and not msg.get("copied_without_permission")):
        return "trust"
    return "do_not"


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise JudgeError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise JudgeError("程序过长：超过60个积木")
    seen = {}
    for b in blocks[1:]:
        if b.get("type") != "message":
            raise JudgeError(f"不支持的积木类型：{b.get('type')}")
        mid = b.get("id")
        verdict = b.get("verdict")
        if not mid:
            raise JudgeError("消息缺少编号")
        if mid in seen:
            raise JudgeError(f"消息 {mid} 重复")
        if verdict not in ("trust", "do_not"):
            raise JudgeError(f"消息 {mid} 的判断必须是 trust 或 do_not")
        if verdict != expected_verdict(b):
            raise JudgeError(f"消息 {mid} 的判断错误，应为 {expected_verdict(b)}")
        seen[mid] = verdict
    if len(seen) < 4:
        raise JudgeError("判断一条消息至少要判断 4 条消息")
    if "trust" not in seen.values():
        raise JudgeError("至少要判断出 1 条可信消息")
    if "do_not" not in seen.values():
        raise JudgeError("至少要判断出 1 条不可信消息")
    return {"status": "success", "judgements": seen}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "message", "id": "m1", "source_known": True,
         "author_named": True, "evidence_given": True,
         "copied_without_permission": False, "verdict": "trust"},
        {"type": "message", "id": "m2", "source_known": False,
         "author_named": True, "evidence_given": True,
         "copied_without_permission": False, "verdict": "do_not"},
        {"type": "message", "id": "m3", "source_known": True,
         "author_named": False, "evidence_given": True,
         "copied_without_permission": True, "verdict": "do_not"},
        {"type": "message", "id": "m4", "source_known": True,
         "author_named": True, "evidence_given": True,
         "copied_without_permission": False, "verdict": "trust"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
