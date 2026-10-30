"""G1-U3-L06 branch executor (first stage, not a web classroom).

Lesson: '互动故事分支', age 6-9, engine blockly, G1-U3 unit capstone.
Required: a choice variable with two branch stories; after walking a
branch, a different ending is shown.
Verification: choice=river shows the riverside, choice=hill shows the hillside.
Failure from the detailed lesson: both buttons show the same scene.
Extension: a hidden third ending - choice=forest shows the forest.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class BranchError(Exception):
    pass

ENDINGS = {"river": "河边", "hill": "山坡", "forest": "森林"}

def run_program(blocks, choice):
    if not blocks or blocks[0].get("type") != "when_start":
        raise BranchError("缺少开始事件：第一个积木必须是开始事件")
    branches = {}
    for b in blocks[1:]:
        if b.get("type") == "branch":
            branches[b.get("choice")] = b.get("ending")
        else:
            raise BranchError(f"不支持的积木类型：{b.get('type')}")
    if "river" not in branches or "hill" not in branches:
        raise BranchError("设置choice选择与两段分支剧情")
    if branches["river"] == branches["hill"]:
        raise BranchError("两个按钮都显示相同场景：逐条运行两种选择，对照不同的结果")
    if choice not in branches:
        raise BranchError(f"没有该选择的分支剧情：{choice}")
    return {"status": "success", "choice": choice, "ending": branches[choice]}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "branch", "choice": "river", "ending": "河边"},
        {"type": "branch", "choice": "hill", "ending": "山坡"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program(), "river"), ensure_ascii=False, indent=2))
    print(json.dumps(run_program(correct_program(), "hill"), ensure_ascii=False, indent=2))
