"""D0-U3-L06 engineering challenge showcase executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '工程挑战成果展', focus concept '测试', generic
acceptance. All projects are implementation choices, NOT detailed-lesson
values.
Model: an engineering showcase must have a title and at least 3 projects.
Each project states its problem, its solution, and one test result
(pass or fail). A showcase passes only if all projects have a problem,
a solution, and a test result, and at least one project passed its test
and at least one project was fixed after failing (showing iteration).
Practice A: bridge (problem: weak, solution: more layers, test: pass),
alarm (problem: late warning, solution: lower threshold, test: pass
after fix), signal (problem: short green, solution: longer green, test:
fail then fix -> pass).
Practice B: guide (problem: unclear route, solution: signs, test: pass),
sorting (problem: wrong bin, solution: labels, test: pass), energy
(problem: high coal, solution: more solar, test: pass) — but practice B
alone lacks a fail-then-fix story, so it must be combined with a fix
record to pass; the test below adds a fix record for sorting.
Fault: a project missing its test result, or a showcase with only 2
projects, or no project showing iteration (no fail-then-fix).
Extension: add a 4th project (plant, problem: slow growth, solution:
more light, test: pass).
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class ShowcaseError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise ShowcaseError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise ShowcaseError("程序过长：超过60个积木")
    title = None
    projects = {}
    current = None
    fixes = []
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "title":
            title = b.get("text")
        elif bt == "project":
            current = b.get("name")
            projects[current] = {"problem": None, "solution": None, "test": None}
        elif bt == "problem":
            if current is None: raise ShowcaseError("问题必须属于一个项目")
            projects[current]["problem"] = b.get("text")
        elif bt == "solution":
            if current is None: raise ShowcaseError("方案必须属于一个项目")
            projects[current]["solution"] = b.get("text")
        elif bt == "test":
            if current is None: raise ShowcaseError("测试必须属于一个项目")
            projects[current]["test"] = b.get("result")
        elif bt == "fix":
            fixes.append(b.get("project"))
        else:
            raise ShowcaseError(f"不支持的积木类型：{bt}")
    if not title:
        raise ShowcaseError("成果展需要一个标题")
    if len(projects) < 3:
        raise ShowcaseError("成果展至少要展出 3 个项目")
    for name, p in projects.items():
        for field in ["problem", "solution", "test"]:
            if not p[field]:
                raise ShowcaseError(f"项目 {name} 缺少 {field}")
    if not any(p["test"] == "pass" for p in projects.values()):
        raise ShowcaseError("成果展至少要有一个项目通过测试")
    if not fixes:
        raise ShowcaseError("成果展至少要展示一次根据测试失败做的改进")
    for f in fixes:
        if f not in projects:
            raise ShowcaseError(f"改进引用了未展出的项目 {f}")
    return {"status": "success", "title": title,
            "projects": list(projects.keys()), "fixes": fixes}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "title", "text": "工程挑战成果展"},
        {"type": "project", "name": "bridge"},
        {"type": "problem", "text": "桥太弱"},
        {"type": "solution", "text": "加层"},
        {"type": "test", "result": "pass"},
        {"type": "project", "name": "alarm"},
        {"type": "problem", "text": "预警太晚"},
        {"type": "solution", "text": "降低阈值"},
        {"type": "test", "result": "pass"},
        {"type": "project", "name": "signal"},
        {"type": "problem", "text": "绿灯太短"},
        {"type": "solution", "text": "加长绿灯"},
        {"type": "test", "result": "pass"},
        {"type": "fix", "project": "signal"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
