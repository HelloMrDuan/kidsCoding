"""S0-U2-L02 two-factor executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '体验双因素验证', focus concept '认证', generic
acceptance. All steps and codes are implementation choices, NOT
detailed-lesson values.
SAFETY: the password and code here are classroom EXAMPLES, never real
credentials. In class, learners must not type a real password or a real
verification code, and must never share a code with anyone. This executor
never stores, sends, or checks a real account.
Model: a login succeeds only when, after a start event, in order:
  1. a password block (non-empty example value) — first factor;
  2. a request_code block — the system sends an example code;
  3. optionally a method block, whose name is app or sms;
  4. an enter_code block whose value is exactly the issued example
     code 482917 — second factor;
  at most 60 blocks.
Practice A: password Sun12345, request code, enter 482917.
Practice B: password Moon9876, request code, enter 482917.
Fault: missing the second factor; a wrong code; a code that is not
6 digits; entering a code before the password; missing the request step.
Extension: the same login with method app passes.
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""

ISSUED_CODE = "482917"


class TwoFactorError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise TwoFactorError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise TwoFactorError("程序过长：超过60个积木")
    rest = blocks[1:]
    if len(rest) < 3:
        raise TwoFactorError("登录至少需要口令、请求验证码、输入验证码三步")
    if rest[0].get("type") != "password" or not rest[0].get("value"):
        raise TwoFactorError("第一步必须是输入口令")
    if rest[1].get("type") != "request_code":
        raise TwoFactorError("输入口令后必须先请求验证码")
    tail = rest[2:]
    if tail and tail[0].get("type") == "method":
        if tail[0].get("name") not in ("app", "sms"):
            raise TwoFactorError("验证方式必须是 app 或 sms")
        tail = tail[1:]
    if len(tail) != 1 or tail[0].get("type") != "enter_code":
        raise TwoFactorError("最后一步必须是输入验证码，且只能输入一次")
    code = tail[0].get("value", "")
    if not (isinstance(code, str) and len(code) == 6 and code.isdigit()):
        raise TwoFactorError("验证码必须是 6 位数字")
    if code != ISSUED_CODE:
        raise TwoFactorError("验证码与发出的示例验证码不一致")
    return {"status": "success", "factors": 2}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "password", "value": "Sun12345"},
        {"type": "request_code"},
        {"type": "enter_code", "value": "482917"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
