"""G1-U3-L02 key executor (first stage, not a web classroom).

Lesson: '判断是否拿钥匙', age 6-9, engine blockly.
Required: introduce a boolean variable hasKey; after picking up the key,
the door may be opened.
Verification: hasKey=true passes, hasKey=false is blocked with a prompt.
Failure from the detailed lesson: opening the door without checking the key.
Extension: silver and gold keys - extra key variables may be set without
breaking the pass.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class KeyError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise KeyError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 20:
        raise KeyError("程序过长：超过20个积木")
    has_key = False
    outcomes = []
    for b in blocks[1:]:
        t = b.get("type")
        if t == "pick_key":
            has_key = True
        elif t == "set_key":
            has_key = bool(b.get("value"))
        elif t == "try_open":
            if b.get("check", True):
                if has_key:
                    outcomes.append("pass")
                else:
                    outcomes.append("blocked_with_prompt")
            else:
                raise KeyError("不检查钥匙直接打开门：把开门指令放入判断条件内")
        elif t == "set_silver_key" or t == "set_gold_key":
            pass
        else:
            raise KeyError(f"不支持的积木类型：{t}")
    return {"status": "success", "hasKey": has_key, "outcomes": outcomes}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "set_key", "value": False},
        {"type": "try_open", "check": True},
        {"type": "pick_key"},
        {"type": "try_open", "check": True},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
