"""R0-U4-L05 demo video storyboard executor (first stage, not a web
classroom, NOT a real video, NOT published anywhere).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '制作演示视频', focus concept '展示', generic
acceptance. All titles, shots, narrations and durations are
implementation choices, NOT detailed-lesson values.
Model: a simulated demo video storyboard is valid when, in this
order after a start event:
  - a title block with a non-empty title;
  - at least 3 scene blocks, each with a non-empty shot, a non-empty
    narration and seconds (a positive integer); the first scene's
    kind must be intro; the scenes together must include at least
    one intro, one how and one result scene (kinds: intro = 介绍作
    品, how = 怎么工作, result = 结果和数据);
  - exactly one consent block with guardian_ok True (no real video
    may be made or shown without a guardian's agreement);
  - exactly one publish block, after the consent, with audience
    exactly "class" (classroom only, never public);
  - total duration at least 30 seconds and at most 120 seconds;
  - at most 60 blocks.
Showing lesson: a good demo tells what it is, how it works, and
what happened, in that order, and stays short enough to watch.
This is a STORYBOARD MODEL ONLY. It never records, edits or
publishes a real video. Real filming needs a guardian's agreement,
must not film other people without their agreement, and must never
be posted publicly by a child.
Practice A: title 迷你巡线车演示； scenes intro 20s, how 25s,
result 15s (total 60).
Practice B: title 智慧浇水机演示； scenes intro 15s, how 30s,
result 20s (total 65).
Fault: total under 30s or over 120s; a missing kind; a first scene
that is not intro; seconds not positive; an empty shot or
narration; guardian_ok not True; publish before consent; a
non-classroom audience; missing title/consent/publish; missing
start.
Extension: 4 scenes intro 20s, how 25s, how 20s, result 25s (total 90).
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor a real recorded video. Those remain missing.
"""

KINDS = ["intro", "how", "result"]


class DemoError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise DemoError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise DemoError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "title":
        raise DemoError("缺少标题：标题必须是开始后的第一个积木")
    if not rest[0].get("title"):
        raise DemoError("标题不能为空")
    title = rest[0]["title"]
    scenes = []
    consent = False
    published = None
    stage = 1  # 1 scenes, 2 consent, 3 publish, 4 done
    for b in rest[1:]:
        bt = b.get("type")
        if bt == "scene":
            if stage != 1:
                raise DemoError("镜头只能在标题之后、同意之前")
            if not b.get("shot"):
                raise DemoError("有一个镜头没有画面说明")
            if not b.get("narration"):
                raise DemoError("有一个镜头没有解说词")
            if b.get("kind") not in KINDS:
                raise DemoError(f"镜头类型 {b.get('kind')} 不在介绍、工作、结果中")
            seconds = b.get("seconds")
            if not isinstance(seconds, int) or isinstance(seconds, bool):
                raise DemoError("镜头时长必须是整数秒")
            if seconds <= 0:
                raise DemoError("镜头时长必须是正数")
            scenes.append(b)
        elif bt == "consent":
            if stage != 1:
                raise DemoError("同意只能出现一次")
            if len(scenes) < 3:
                raise DemoError("镜头少于 3 个，不能进入同意")
            if scenes[0].get("kind") != "intro":
                raise DemoError("第一个镜头必须是介绍作品")
            kinds = {s.get("kind") for s in scenes}
            if set(KINDS) - kinds:
                raise DemoError("镜头没有覆盖介绍、工作、结果三种类型")
            total = sum(s["seconds"] for s in scenes)
            if total < 30:
                raise DemoError(f"总时长 {total} 秒太短，不到 30 秒")
            if total > 120:
                raise DemoError(f"总时长 {total} 秒太长，超过 120 秒")
            if b.get("guardian_ok") is not True:
                raise DemoError("没有监护人同意，不能制作演示视频")
            consent = True
            stage = 2
        elif bt == "publish":
            if stage != 2:
                raise DemoError("发布只能在同意之后")
            if b.get("audience") != "class":
                raise DemoError("演示视频只能在班级内展示，不能公开")
            published = {"audience": "class"}
            stage = 3
        else:
            raise DemoError(f"不支持的积木类型：{bt}")
    if not consent:
        raise DemoError("缺少监护人同意积木")
    if published is None:
        raise DemoError("缺少发布积木")
    total = sum(s["seconds"] for s in scenes)
    return {"status": "success", "title": title, "scenes": scenes,
            "total_seconds": total, "published": published}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "title", "title": "迷你巡线车演示"},
        {"type": "scene", "kind": "intro", "shot": "小车停在起点",
         "narration": "这是我们的迷你巡线车", "seconds": 20},
        {"type": "scene", "kind": "how", "shot": "小车沿着黑线走",
         "narration": "传感器看到线就转向", "seconds": 25},
        {"type": "scene", "kind": "result", "shot": "小车到达终点",
         "narration": "小车走完了整条线", "seconds": 15},
        {"type": "consent", "guardian_ok": True},
        {"type": "publish", "audience": "class"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
