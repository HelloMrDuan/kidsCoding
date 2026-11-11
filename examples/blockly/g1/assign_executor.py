"""G1-U4-L03 assign executor (first stage, not a web classroom).

Lesson: '给人物分配任务', age 6-9, engine blockly.
Required: the fox script drives the car; the rabbit script handles
prompts and timing.
Verification: the two characters have independent tasks and do not
both control the car.
Failure from the detailed lesson: the same action executed by both
scripts at once, causing jitter.
Extension: a third recorder character may be added with its own task.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class AssignError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise AssignError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 30:
        raise AssignError("程序过长：超过30个积木")
    tasks = {}
    for b in blocks[1:]:
        if b.get("type") == "assign":
            actor = b.get("actor")
            task = b.get("task")
            if actor in tasks and tasks[actor] != task:
                raise AssignError("同一角色任务不一致：在任务单上写清角色职责与脚本归属")
            tasks[actor] = task
        else:
            raise AssignError(f"不支持的积木类型：{b.get('type')}")
    car_controllers = [a for a, t in tasks.items() if t == "drive"]
    if len(car_controllers) != 1:
        raise AssignError("同一动作被两个脚本同时执行造成抖动：不重复控制小车")
    if tasks.get("fox") != "drive":
        raise AssignError("狐狸脚本负责行驶")
    if tasks.get("rabbit") != "prompt_and_timer":
        raise AssignError("兔子脚本负责提示与计时")
    return {"status": "success", "tasks": tasks}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "assign", "actor": "fox", "task": "drive"},
        {"type": "assign", "actor": "rabbit", "task": "prompt_and_timer"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
