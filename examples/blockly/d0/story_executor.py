"""D0-U4-L01 science story executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '写一段科普剧情', focus concept '叙事', generic
acceptance. All story scenes and facts are implementation choices, NOT
detailed-lesson values.
Model: a science story must have at least 3 scenes in order, each scene
has a narration and one science fact, and the facts in non-conclusion scenes must be distinct
(the conclusion restates one earlier fact by design). A story passes only if every scene has a narration
and a fact, all facts are distinct, and the story ends with a conclusion
scene that restates one fact.
Practice A: scenes [question, experiment, conclusion] — question: "水会变成什么？",
experiment: "水加热变成水蒸气", conclusion restates "水加热变成水蒸气".
Practice B: scenes [question, observation, conclusion] — question: "叶子为什么是绿的？",
observation: "叶子有叶绿素", conclusion restates "叶子有叶绿素".
Fault: a scene missing its fact, or two scenes sharing the same fact, or
no conclusion scene.
Extension: add a 4th scene (application) before the conclusion.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class StoryError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise StoryError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise StoryError("程序过长：超过60个积木")
    scenes = []
    current = None
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "scene":
            current = {"name": b.get("name"), "narration": None, "fact": None}
            scenes.append(current)
        elif bt == "narration":
            if current is None: raise StoryError("旁白必须属于一个场景")
            current["narration"] = b.get("text")
        elif bt == "fact":
            if current is None: raise StoryError("科普点必须属于一个场景")
            current["fact"] = b.get("text")
        else:
            raise StoryError(f"不支持的积木类型：{bt}")
    if len(scenes) < 3:
        raise StoryError("科普剧情至少要包含 3 个场景")
    for s in scenes:
        if not s["narration"]:
            raise StoryError(f"场景 {s['name']} 缺少旁白")
        if not s["fact"]:
            raise StoryError(f"场景 {s['name']} 缺少科普点")
    facts = [s["fact"] for s in scenes]
    # Conclusion restates an earlier fact by design, so distinctness
    # applies only to non-conclusion scenes.
    non_conclusion = [s["fact"] for s in scenes[:-1]]
    if len(set(non_conclusion)) != len(non_conclusion):
        raise StoryError("科普点不能重复")
    if scenes[-1]["name"] != "conclusion":
        raise StoryError("科普剧情必须以结论场景结尾")
    if scenes[-1]["fact"] not in facts[:-1]:
        raise StoryError("结论场景必须复述前面出现过的一个科普点")
    return {"status": "success", "scenes": [s["name"] for s in scenes], "facts": facts}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "scene", "name": "question"},
        {"type": "narration", "text": "小明问：水会变成什么？"},
        {"type": "fact", "text": "水可以变成水蒸气"},
        {"type": "scene", "name": "experiment"},
        {"type": "narration", "text": "加热水，看到水蒸气"},
        {"type": "fact", "text": "水加热变成水蒸气"},
        {"type": "scene", "name": "conclusion"},
        {"type": "narration", "text": "原来水加热会变成水蒸气"},
        {"type": "fact", "text": "水加热变成水蒸气"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
