"""M0-U3-L01 coin toss executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for M0 on main. Built ONLY from the
register entry: title '模拟抛硬币', focus concept '随机', generic
acceptance. All toss outcomes are implementation choices, NOT
detailed-lesson values. This is a deterministic simulator of a coin
model, not a claim about real-world randomness.
Model: a coin toss result is either 'heads' or 'tails'. A simulation
run states the number of tosses and the list of results; it passes only
if the list length equals the stated count and every result is a valid
side, and the counts of heads and tails add up to the total.
Practice A: 10 tosses, 6 heads, 4 tails.
Practice B: 4 tosses, 2 heads, 2 tails (different goal: smaller run).
Fault: a result list with an invalid side, or a count that does not
match the list length.
Extension: a second run of 10 tosses, also valid.
This executor does NOT prove web classroom access, independent teaching review,
or child trial. Those remain missing.
"""
class CoinError(Exception):
    pass

def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise CoinError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 40:
        raise CoinError("程序过长：超过40个积木")
    runs = []
    for b in blocks[1:]:
        bt = b.get("type")
        if bt == "toss_run":
            count = b.get("count")
            results = b.get("results")
            if len(results) != count:
                raise CoinError(f"抛硬币次数与结果数不符：说好 {count} 次，实际 {len(results)} 个结果")
            for r in results:
                if r not in ("heads", "tails"):
                    raise CoinError(f"无效的抛硬币结果：{r}，只能是正面或反面")
            runs.append({"count": count, "heads": results.count("heads"), "tails": results.count("tails")})
        else:
            raise CoinError(f"不支持的积木类型：{bt}")
    if not runs:
        raise CoinError("至少要模拟一次抛硬币")
    return {"status": "success", "runs": runs}

def correct_program():
    return [
        {"type": "when_start"},
        {"type": "toss_run", "count": 10,
         "results": ["heads", "tails", "heads", "heads", "tails", "heads", "tails", "heads", "heads", "tails"]},
    ]

if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
