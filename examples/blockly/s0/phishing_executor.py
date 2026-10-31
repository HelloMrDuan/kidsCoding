"""S0-U2-L04 phishing message executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '识别钓鱼消息', focus concept '隐私', generic
acceptance. All messages and rules are implementation choices, NOT
detailed-lesson values, and NOT a real security guarantee.
SAFETY: every message here is FICTIONAL. In class, learners must not
click any link in a suspicious message, must not reply with personal
information, and must show the message to a teacher or guardian.
Rule (classroom heuristic): a message is safe ONLY when all of these
hold: the sender is known, it does not ask for a password, it does not
threaten urgently, and its link matches its claimed sender. Otherwise
it is phishing (unknown sender alone is enough: ask an adult).
Model: after a start event, at least 4 messages, including at least 1
safe and at least 1 phishing judgement; every verdict must match the
rule; no message id twice; at most 60 blocks.
Practice A: known teacher safe; unknown sender asking for a password
phishing; unknown sender urgent with a mismatched link phishing;
known family safe.
Practice B: known class teacher safe; unknown sender asking for a
password phishing; unknown sender urgent phishing; known friend with
a mismatched link phishing.
Fault: a wrong verdict; only safe judgements; a duplicate message id;
fewer than 4 messages.
Extension: a 5th message from an unknown sender with no other signal
is still phishing (unknown: ask an adult).
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""


class PhishingError(Exception):
    pass


def expected_verdict(msg):
    if (msg.get("sender_known") and not msg.get("asks_password")
            and not msg.get("urgent") and not msg.get("link_mismatch")):
        return "safe"
    return "phishing"


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise PhishingError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise PhishingError("程序过长：超过60个积木")
    seen = {}
    for b in blocks[1:]:
        if b.get("type") != "message":
            raise PhishingError(f"不支持的积木类型：{b.get('type')}")
        mid = b.get("id")
        verdict = b.get("verdict")
        if not mid:
            raise PhishingError("消息缺少编号")
        if mid in seen:
            raise PhishingError(f"消息 {mid} 重复")
        if verdict not in ("safe", "phishing"):
            raise PhishingError(f"消息 {mid} 的判断必须是 safe 或 phishing")
        if verdict != expected_verdict(b):
            raise PhishingError(f"消息 {mid} 的判断错误，应为 {expected_verdict(b)}")
        seen[mid] = verdict
    if len(seen) < 4:
        raise PhishingError("识别钓鱼消息至少要判断 4 条消息")
    if "safe" not in seen.values():
        raise PhishingError("至少要判断出 1 条安全消息")
    if "phishing" not in seen.values():
        raise PhishingError("至少要判断出 1 条钓鱼消息")
    return {"status": "success", "judgements": seen}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "message", "id": "m1", "sender_known": True,
         "asks_password": False, "urgent": False, "link_mismatch": False,
         "verdict": "safe"},
        {"type": "message", "id": "m2", "sender_known": False,
         "asks_password": True, "urgent": False, "link_mismatch": False,
         "verdict": "phishing"},
        {"type": "message", "id": "m3", "sender_known": False,
         "asks_password": False, "urgent": True, "link_mismatch": True,
         "verdict": "phishing"},
        {"type": "message", "id": "m4", "sender_known": True,
         "asks_password": False, "urgent": False, "link_mismatch": False,
         "verdict": "safe"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
