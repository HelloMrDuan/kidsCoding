"""S0-U1-L03 internet journey executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '理解互联网如何通信', focus concept '文件', generic
acceptance. All steps and messages are implementation choices, NOT
detailed-lesson values.
Model: a file travels over the internet when, after a start event:
  - an original content block gives a non-empty message;
  - the six steps occur exactly once, in order:
    write, split, send, route, receive, assemble;
  - an optional packet block may appear only between split and send,
    with count at least 2;
  - a final content block gives the same message as the original;
  - at most 60 blocks.
Practice A: message "你好", six steps in order.
Practice B: message "明天见", six steps in order.
Fault: a missing step; steps out of order; a duplicated step; a final
message different from the original; no final content block.
Extension: the same journey with a packet block count 3 passes.
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""

ORDER = ["write", "split", "send", "route", "receive", "assemble"]


class InternetError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise InternetError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise InternetError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "content" or not rest[0].get("text"):
        raise InternetError("缺少原始文件内容")
    original = rest[0]["text"]
    steps = []
    packet_seen = False
    final = None
    for i, b in enumerate(rest[1:]):
        bt = b.get("type")
        if bt == "step":
            steps.append(b.get("name"))
        elif bt == "packet":
            if packet_seen:
                raise InternetError("数据包说明重复")
            if steps != ["write", "split"]:
                raise InternetError("数据包说明只能在拆分后、发送前出现")
            if not isinstance(b.get("count"), int) or b["count"] < 2:
                raise InternetError("数据包数量至少为 2")
            packet_seen = True
        elif bt == "content":
            if steps != ORDER:
                raise InternetError("六个步骤未按顺序全部完成，不能结束")
            if final is not None:
                raise InternetError("结束内容重复")
            final = b.get("text")
        else:
            raise InternetError(f"不支持的积木类型：{bt}")
    if final is None:
        raise InternetError("缺少结束文件内容")
    if steps != ORDER:
        raise InternetError("六个步骤必须按顺序各出现一次")
    if final != original:
        raise InternetError("到达对方的文件内容与原始文件不一致")
    return {"status": "success", "message": original, "steps": steps,
            "packets": packet_seen}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "content", "text": "你好"},
        {"type": "step", "name": "write"},
        {"type": "step", "name": "split"},
        {"type": "step", "name": "send"},
        {"type": "step", "name": "route"},
        {"type": "step", "name": "receive"},
        {"type": "step", "name": "assemble"},
        {"type": "content", "text": "你好"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
