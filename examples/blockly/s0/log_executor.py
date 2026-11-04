"""S0-U4-L05 log and anomaly executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '理解日志与异常', focus concept '恢复', generic
acceptance. All log messages, levels and actions are implementation
choices, NOT detailed-lesson values.
Model: reading a log is valid when, after a start event:
  - at least 3 log blocks, each with a level in (info, warning, error)
    and a non-empty message;
  - at least 1 info log (the normal baseline) and at least 1 error log
    (the anomaly);
  - at least 1 diagnosis block, whose error_message equals the message of
    an actual error log (a diagnosis must be grounded in the log, not
    invented, and a warning is not an error);
  - each diagnosis has a different error_message;
  - at least 1 action block, whose action is one of
    restore_from_backup (从备份恢复), reopen (重新打开),
    ask_teacher (请老师检查);
  - the number of action blocks equals the number of diagnosis blocks
    (every diagnosed anomaly gets one recovery action);
  - at most 60 blocks.
This is a classroom simulation only. Log messages are fictional classroom
examples, never real system logs and never containing real personal
information. A real anomaly must be shown to a teacher or guardian; the
classroom action ask_teacher is always allowed.
Practice A: logs info 打开画稿, info 保存画稿, error 画稿打不开;
diagnosis 画稿打不开; action restore_from_backup.
Practice B: logs info 打开音乐, warning 音乐声音小,
error 音乐播不出来; diagnosis 音乐播不出来; action reopen.
Fault: invented diagnosis; diagnosis naming a warning; no error log;
fewer than 3 logs; unknown action; diagnosis without a matching action;
missing start.
Extension: two error logs, two diagnoses and two actions pass.
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""

LEVELS = {"info", "warning", "error"}
ACTIONS = {"restore_from_backup", "reopen", "ask_teacher"}


class LogError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise LogError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise LogError("程序过长：超过60个积木")
    logs = []
    diagnoses = []
    actions = []
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "log":
            if b.get("level") not in LEVELS:
                raise LogError(f"日志级别不对：{b.get('level')}")
            if not b.get("message"):
                raise LogError("日志内容不能为空")
            logs.append({"level": b["level"], "message": b["message"]})
        elif bt == "diagnosis":
            msg = b.get("error_message")
            if not msg:
                raise LogError("诊断的异常内容不能为空")
            if msg in diagnoses:
                raise LogError(f"异常 {msg} 已诊断过")
            diagnoses.append(msg)
        elif bt == "action":
            if b.get("action") not in ACTIONS:
                raise LogError(f"恢复办法不对：{b.get('action')}")
            actions.append(b["action"])
        else:
            raise LogError(f"不支持的积木类型：{bt}")
    if len(logs) < 3:
        raise LogError("日志至少要有 3 条")
    if not any(l["level"] == "info" for l in logs):
        raise LogError("日志中没有正常记录，无法对照异常")
    errors = [l["message"] for l in logs if l["level"] == "error"]
    if not errors:
        raise LogError("日志中没有异常记录")
    if not diagnoses:
        raise LogError("缺少异常诊断")
    for msg in diagnoses:
        if msg not in errors:
            raise LogError(f"诊断的异常 {msg} 不在日志的异常记录中")
    if len(actions) != len(diagnoses):
        raise LogError("每个诊断的异常都要配一个恢复办法")
    return {"status": "success", "logs": logs, "errors": errors,
            "diagnoses": diagnoses, "actions": actions}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "log", "level": "info", "message": "打开画稿"},
        {"type": "log", "level": "info", "message": "保存画稿"},
        {"type": "log", "level": "error", "message": "画稿打不开"},
        {"type": "diagnosis", "error_message": "画稿打不开"},
        {"type": "action", "action": "restore_from_backup"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
