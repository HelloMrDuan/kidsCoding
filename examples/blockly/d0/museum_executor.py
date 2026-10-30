"""D0-U4-L03 museum guide executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '制作博物馆导览', focus concept '数据', generic
acceptance. All exhibits and data are implementation choices, NOT
detailed-lesson values.
Model: a museum guide presents exhibits, each with a name, a year, and
a fact. A guide passes only if at least 3 exhibits are presented, every
exhibit has a year and a fact, the years are in ascending order along
the route, and the guide ends with a summary naming the oldest exhibit.
Practice A: exhibits [stone (1000), bronze (1500), paper (2000)],
summary names stone.
Practice B: exhibits [pottery (1200), silk (1600), porcelain (1800)],
summary names pottery (different goal: different exhibits, same rule).
Fault: years out of order, an exhibit missing its fact, or a summary
naming the wrong oldest exhibit.
Extension: add a 4th exhibit (glass, 2100) at the end, summary still
names stone.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class MuseumError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise MuseumError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise MuseumError("程序过长：超过60个积木")
    exhibits = []
    summary = None
    current = None
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "exhibit":
            current = {"name": b.get("name"), "year": None, "fact": None}
            exhibits.append(current)
        elif bt == "year":
            if current is None: raise MuseumError("年份必须属于一个展品")
            current["year"] = b.get("value")
        elif bt == "fact":
            if current is None: raise MuseumError("讲解必须属于一个展品")
            current["fact"] = b.get("text")
        elif bt == "summary":
            summary = b.get("oldest")
        else:
            raise MuseumError(f"不支持的积木类型：{bt}")
    if len(exhibits) < 3:
        raise MuseumError("博物馆导览至少要包含 3 个展品")
    for e in exhibits:
        if e["year"] is None:
            raise MuseumError(f"展品 {e['name']} 缺少年份")
        if not e["fact"]:
            raise MuseumError(f"展品 {e['name']} 缺少讲解")
    years = [e["year"] for e in exhibits]
    if years != sorted(years):
        raise MuseumError(f"展品年份必须按从早到晚排列，实际 {years}")
    if summary is None:
        raise MuseumError("导览结尾需要总结")
    oldest = exhibits[0]["name"]
    if summary != oldest:
        raise MuseumError(f"总结应说出最早的展品 {oldest}，实际 {summary}")
    return {"status": "success", "exhibits": [e["name"] for e in exhibits], "oldest": oldest}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "exhibit", "name": "stone"},
        {"type": "year", "value": 1000},
        {"type": "fact", "text": "石头工具很古老"},
        {"type": "exhibit", "name": "bronze"},
        {"type": "year", "value": 1500},
        {"type": "fact", "text": "青铜器很结实"},
        {"type": "exhibit", "name": "paper"},
        {"type": "year", "value": 2000},
        {"type": "fact", "text": "纸张方便书写"},
        {"type": "summary", "oldest": "stone"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
