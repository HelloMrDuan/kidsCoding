"""S0-U2-L01 password executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '为账号创建口令', focus concept '认证', generic
acceptance. All rules and examples are implementation choices, NOT
detailed-lesson values.
SAFETY: every password in this file is a classroom EXAMPLE, never a real
password. In class, learners must not type a real password, must not
share any password with anyone except a guardian, and must ask a guardian
before creating any real account. This executor never stores, sends, or
checks a real account.
Rules (implementation choices) for an example password to pass:
  - at least 8 characters;
  - at least one letter and at least one digit;
  - no spaces;
  - not in the common weak list (123456, 12345678, password, qwerty, 111111);
  - not equal to the account name.
Model: after a start event, an account block (non-empty name), a password
block, and a confirm block whose value equals the password; at most 60 blocks.
Practice A: account 小狐, example password Sun12345, confirm Sun12345.
Practice B: account 小兔, example password Moon9876, confirm Moon9876.
Fault: too short; letters only; digits only; a common weak password;
password equal to the account name; confirm mismatch.
Extension: a longer example password with a symbol, Star!2024abc, passes.
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""

COMMON_WEAK = {"123456", "12345678", "password", "qwerty", "111111"}


class PasswordError(Exception):
    pass


def check_password(password, account):
    if len(password) < 8:
        raise PasswordError("口令太短：至少 8 个字符")
    if " " in password:
        raise PasswordError("口令不能含空格")
    if password in COMMON_WEAK:
        raise PasswordError("口令太常见，容易被猜到")
    if password == account:
        raise PasswordError("口令不能和账号名相同")
    if not any(c.isalpha() for c in password):
        raise PasswordError("口令至少要含一个字母")
    if not any(c.isdigit() for c in password):
        raise PasswordError("口令至少要含一个数字")


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise PasswordError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise PasswordError("程序过长：超过60个积木")
    account = password = confirm = None
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "account":
            if account is not None:
                raise PasswordError("账号重复")
            if not b.get("name"):
                raise PasswordError("账号名不能为空")
            account = b["name"]
        elif bt == "password":
            if password is not None:
                raise PasswordError("口令重复")
            password = b.get("value")
        elif bt == "confirm":
            if confirm is not None:
                raise PasswordError("确认口令重复")
            confirm = b.get("value")
        else:
            raise PasswordError(f"不支持的积木类型：{bt}")
    if account is None:
        raise PasswordError("缺少账号")
    if password is None:
        raise PasswordError("缺少口令")
    if confirm is None:
        raise PasswordError("缺少确认口令")
    check_password(password, account)
    if confirm != password:
        raise PasswordError("两次输入的口令不一致")
    return {"status": "success", "account": account}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "account", "name": "小狐"},
        {"type": "password", "value": "Sun12345"},
        {"type": "confirm", "value": "Sun12345"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
