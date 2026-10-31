"""S0-U4-L01 simple threat model executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '简单威胁模型', focus concept '威胁建模', generic
acceptance. All assets, actors, methods, impacts and guards are implementation
choices, NOT detailed-lesson values.
Model: a simple threat model is valid when, after a start event:
  - an asset block gives a non-empty thing to protect;
  - at least 2 threat blocks, each with non-empty actor, method, impact
    and guard;
  - threat methods are distinct (the same method twice is not a second threat);
  - a review block gives a non-empty review note;
  - at most 60 blocks.
All scenarios are fictional classroom examples. No real account, no real
personal information, and no real person is named as a threat actor; actors
are generic roles such as 陌生人. Guards are classroom habits: ask a teacher
or guardian, do not share a password or code, keep a backup. This model is a
classroom thinking tool, NOT a real security guarantee; when unsure, ask a
teacher or guardian.
Practice A: asset 班级画稿; threats (陌生人, 乱点链接, 画稿被删,
先问老师) and (同学误操作, 不小心删除, 画稿丢失, 备份一份);
review 请老师检查.
Practice B: asset 我的账号; threats (陌生人, 猜口令, 账号被别人用,
口令不告诉别人) and (陌生人, 骗验证码, 账号被盗, 验证码不告诉别人);
review 请监护人检查.
Fault: only 1 threat; a threat missing its guard; a duplicate method;
missing asset; missing review.
Extension: a 3rd threat passes.
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""

class ThreatError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise ThreatError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise ThreatError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "asset" or not rest[0].get("text"):
        raise ThreatError("缺少要保护的东西")
    asset = rest[0]["text"]
    threats = []
    review = None
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "threat":
            for field in ("actor", "method", "impact", "guard"):
                if not b.get(field):
                    raise ThreatError(f"威胁缺少{field}")
            if b["method"] in [t["method"] for t in threats]:
                raise ThreatError(f"威胁方法 {b['method']} 重复")
            threats.append({"actor": b["actor"], "method": b["method"],
                            "impact": b["impact"], "guard": b["guard"]})
        elif bt == "review":
            if review is not None:
                raise ThreatError("检查记录重复")
            if not b.get("text"):
                raise ThreatError("检查记录不能为空")
            review = b["text"]
        else:
            raise ThreatError(f"不支持的积木类型：{bt}")
    if len(threats) < 2:
        raise ThreatError("威胁模型至少要包含 2 条威胁")
    if review is None:
        raise ThreatError("威胁模型缺少检查记录")
    return {"status": "success", "asset": asset, "threats": threats,
            "review": review}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "asset", "text": "班级画稿"},
        {"type": "threat", "actor": "陌生人", "method": "乱点链接",
         "impact": "画稿被删", "guard": "先问老师"},
        {"type": "threat", "actor": "同学误操作", "method": "不小心删除",
         "impact": "画稿丢失", "guard": "备份一份"},
        {"type": "review", "text": "请老师检查"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
