"""D0-U2-L06 eco expo executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for D0 on main. Built ONLY from the
register entry: title '设计环保互动展', focus concept '模型', generic
acceptance. All exhibits are implementation choices, NOT detailed-lesson
values.
Model: an eco expo must have a title and at least 3 exhibits. Each
exhibit states a topic, a correct fact, and an interactive question with
a correct answer. An exhibit passes only if its fact matches the topic
(checked against a small fact table) and its answer matches the question
(checked against a small answer table).
Fact table (implementation choice): sorting -> "battery is harmful",
balance -> "producer > herbivore > carnivore", energy -> "solar is renewable".
Answer table: sorting question "battery goes where?" -> "harmful";
balance question "which level is most?" -> "producer"; energy question
"which is renewable?" -> "solar".
Practice A: sorting, balance, energy exhibits, all correct.
Practice B: energy, sorting, balance exhibits in a different order, all
correct.
Fault: an expo with only 2 exhibits, or a fact that does not match its
topic, or a wrong answer.
Extension: add a 4th exhibit (moon topic, fact "moon cycles monthly",
question "moon changes?" -> "yes").
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
FACTS = {
    "sorting": "battery is harmful",
    "balance": "producer > herbivore > carnivore",
    "energy": "solar is renewable",
    "moon": "moon cycles monthly",
}
ANSWERS = {
    "battery goes where?": "harmful",
    "which level is most?": "producer",
    "which is renewable?": "solar",
    "moon changes?": "yes",
}

class ExpoError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise ExpoError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise ExpoError("程序过长：超过60个积木")
    title = None
    exhibits = []
    current = None
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "title":
            title = b.get("text")
        elif bt == "exhibit":
            current = {"topic": b.get("topic"), "fact": None, "question": None, "answer": None}
            exhibits.append(current)
        elif bt == "fact":
            if current is None: raise ExpoError("事实必须属于一个展品")
            current["fact"] = b.get("text")
        elif bt == "question":
            if current is None: raise ExpoError("问题必须属于一个展品")
            current["question"] = b.get("text")
        elif bt == "answer":
            if current is None: raise ExpoError("答案必须属于一个展品")
            current["answer"] = b.get("text")
        else:
            raise ExpoError(f"不支持的积木类型：{bt}")
    if not title:
        raise ExpoError("环保互动展需要一个标题")
    if len(exhibits) < 3:
        raise ExpoError("环保互动展至少要展出 3 个主题")
    for e in exhibits:
        if e["topic"] not in FACTS:
            raise ExpoError(f"未知展品主题：{e['topic']}")
        if e["fact"] != FACTS[e["topic"]]:
            raise ExpoError(f"展品 {e['topic']} 事实错误：应为 {FACTS[e['topic']]}，实际 {e['fact']}")
        if e["question"] not in ANSWERS:
            raise ExpoError(f"未知互动问题：{e['question']}")
        if e["answer"] != ANSWERS[e["question"]]:
            raise ExpoError(f"互动答案错误：问题 {e['question']} 应答 {ANSWERS[e['question']]}，实际 {e['answer']}")
    return {"status": "success", "title": title,
            "topics": [e["topic"] for e in exhibits]}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "title", "text": "环保互动展"},
        {"type": "exhibit", "topic": "sorting"},
        {"type": "fact", "text": "battery is harmful"},
        {"type": "question", "text": "battery goes where?"},
        {"type": "answer", "text": "harmful"},
        {"type": "exhibit", "topic": "balance"},
        {"type": "fact", "text": "producer > herbivore > carnivore"},
        {"type": "question", "text": "which level is most?"},
        {"type": "answer", "text": "producer"},
        {"type": "exhibit", "topic": "energy"},
        {"type": "fact", "text": "solar is renewable"},
        {"type": "question", "text": "which is renewable?"},
        {"type": "answer", "text": "solar"},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
