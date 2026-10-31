"""R0-U4-L04 data record improvement executor (first stage, not a web
classroom, NOT real hardware, NOT real measurements).

PROVENANCE: no detailed lesson file for R0 on main. Built ONLY from the
register entry: title '数据记录改进', focus concept '工程', generic
acceptance. All times, values and units are implementation choices
and fictional classroom examples, NOT detailed-lesson values and NOT
real measurements.
Model: a simulated data improvement is valid when, in this order
after a start event:
  - an old log block with at least 3 records; each record is
    [time, value, unit] with a non-empty time, an integer value
    (which may be out of range: that is a flaw to fix) and a unit
    string (which may be empty: that is a flaw to fix); old times
    must be unique and in order;
  - a new log block with the same number of records, the same times
    in the same order, and for every position:
      * if the old value was in 0..1023, the new value must be
        unchanged (good data must not be changed);
      * if the old value was out of range, the new value must be in
        0..1023 (the true value is unknown, so any in-range value is
        accepted as a fix, and the fix must be noted);
      * if the old unit was non-empty, the new unit must be
        unchanged;
      * if the old unit was empty, the new unit must be non-empty;
  - at least one position must actually change (otherwise this is a
    copy, not an improvement);
  - exactly one summary block, after the new log, whose fixed value
    equals the number of changed positions;
  - at most 60 blocks.
Engineering lesson: keep good data, fix only what is flawed, and
count the fixes honestly. Changing good data, keeping a flaw, or
inventing a new time all fail.
This is a RECORD MODEL ONLY with fictional example numbers. It never
measures anything real.
Practice A: old [上午 512 lx, 中午 2000 (empty), 下午 300 lx] ->
new [上午 512 lx, 中午 800 lx, 下午 300 lx], fixed 1 (one position
changed, even though it had two flawed fields).
Practice B: old [上午 100 lx, 中午 200 (empty), 下午 300 lx] ->
new [上午 100 lx, 中午 200 lx, 下午 300 lx], fixed 1 (unit-only fix).
Fault: changing a good value; keeping an out-of-range value; keeping
an empty unit; inventing a time; changing the order or count; a
fixed count that does not match; no change at all; fewer than 3
records; missing old/new/summary; missing start.
Extension: 4 records, 2 flawed positions, fixed 2.
This executor does NOT prove web classroom access, independent teaching review,
child trial, nor a real measurement. Those remain missing.
"""


class DataLogError(Exception):
    pass


def _check_records(records, what, allow_bad_value):
    if not isinstance(records, list) or len(records) < 3:
        raise DataLogError(f"{what}记录少于 3 条")
    times = []
    for r in records:
        if not isinstance(r, list) or len(r) != 3:
            raise DataLogError(f"{what}里有一条记录不是 [时间, 数值, 单位]")
        time, value, unit = r
        if not time:
            raise DataLogError(f"{what}里有一条记录没有时间")
        if not isinstance(value, int) or isinstance(value, bool):
            raise DataLogError(f"{what}里有一条记录的数值不是整数")
        if not allow_bad_value and (value < 0 or value > 1023):
            raise DataLogError(f"{what}里的数值 {value} 超出 0..1023")
        if not isinstance(unit, str):
            raise DataLogError(f"{what}里有一条记录的单位不是文字")
        times.append(time)
    if len(set(times)) != len(times):
        raise DataLogError(f"{what}里有重复的时间")
    return records


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise DataLogError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise DataLogError("程序过长：超过60个积木")
    rest = blocks[1:]
    if not rest or rest[0].get("type") != "old":
        raise DataLogError("缺少旧记录：旧记录必须是开始后的第一个积木")
    old = _check_records(rest[0].get("records"), "旧", allow_bad_value=True)
    if len(rest) < 2 or rest[1].get("type") != "new":
        raise DataLogError("缺少新记录：新记录必须在旧记录之后")
    new = _check_records(rest[1].get("records"), "新", allow_bad_value=False)
    if len(new) != len(old):
        raise DataLogError("新记录条数和旧记录不一样")
    fixed = 0
    for (ot, ov, ou), (nt, nv, nu) in zip(old, new):
        if nt != ot:
            raise DataLogError(f"新记录的时间 {nt} 和旧记录的 {ot} 不一样")
        if 0 <= ov <= 1023 and nv != ov:
            raise DataLogError(f"{ot} 的好数值被改了")
        if not (0 <= ov <= 1023) and not (0 <= nv <= 1023):
            raise DataLogError(f"{ot} 的坏数值没有修好")
        if ou and nu != ou:
            raise DataLogError(f"{ot} 的好单位被改了")
        if not ou and not nu:
            raise DataLogError(f"{ot} 的空单位没有补上")
        if (nv, nu) != (ov, ou):
            fixed += 1
    if fixed == 0:
        raise DataLogError("新记录和旧记录一模一样，这不是改进")
    if len(rest) < 3 or rest[2].get("type") != "summary":
        raise DataLogError("缺少总结：总结必须在新记录之后")
    if rest[2].get("fixed") != fixed:
        raise DataLogError(f"总结的修正数 {rest[2].get('fixed')} 与算出的 {fixed} 不一致")
    if len(rest) > 3:
        raise DataLogError("总结之后还有多余积木")
    return {"status": "success", "old": old, "new": new, "fixed": fixed}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "old", "records": [["上午", 512, "lx"],
                                    ["中午", 2000, ""],
                                    ["下午", 300, "lx"]]},
        {"type": "new", "records": [["上午", 512, "lx"],
                                    ["中午", 800, "lx"],
                                    ["下午", 300, "lx"]]},
        {"type": "summary", "fixed": 1},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
