"""Build an original G3-U1-L01 Scratch 3 project archive.

Lesson: G3-U1-L01 用自制积木画图 (custom block with a size parameter).
Story: a robot decorates six flags with the same star pattern, changing size.

The project uses the Scratch pen extension and a real procedure:
- procedure "画星形 size": repeat 5 times: move size steps, turn right 144 degrees.
- main script: clear pen, go to (-200, 0), pen down, set size to 20,
  repeat 6 times: call 画星形(size), change size by 20, pen up,
  change x by 60, pen down.

This builder/test proves project structure only. It does NOT prove
Scratch VM execution, pen rendering, or child usability. Those are
separate publication gates and must not be claimed from this file.
"""

import hashlib
import json
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
TARGET = HERE / "g3-u1-l01-star-flags.sb3"
SIZE_VAR_ID = "g3u1l01-size"


def block(opcode, next_id=None, parent=None, inputs=None, fields=None,
          shadow=False, top_level=False, x=None, y=None, mutation=None):
    out = {
        "opcode": opcode,
        "next": next_id,
        "parent": parent,
        "inputs": inputs or {},
        "fields": fields or {},
        "shadow": shadow,
        "topLevel": top_level,
    }
    if top_level:
        out.update(x=x, y=y)
    if mutation is not None:
        out["mutation"] = mutation
    return out


def _costume(name, raw, cx, cy):
    digest = hashlib.md5(raw).hexdigest()
    return {
        "assetId": digest,
        "name": name,
        "md5ext": digest + ".svg",
        "dataFormat": "svg",
        "rotationCenterX": cx,
        "rotationCenterY": cy,
    }


def build_project() -> dict:
    stage_bytes = (HERE / "stage-flags.svg").read_bytes()
    pen_bytes = (HERE / "pen.svg").read_bytes()
    stage_costume = _costume("旗帜舞台", stage_bytes, 240, 180)
    pen_costume = _costume("画笔", pen_bytes, 40, 40)

    proc_mutation = {
        "tagName": "mutation",
        "children": [],
        "proccode": "画星形 %s",
        "argumentids": '["size"]',
        "argumentnames": '["size"]',
        "argumentdefaults": '["20"]',
        "warp": "false",
    }

    blocks = {
        # Main script: green flag -> clear -> pen up -> goto -> pen down -> set size -> repeat 6
        "flag": block("event_whenflagclicked", "clear", top_level=True, x=40, y=40),
        "clear": block("pen_clear", "penup_main", parent="flag"),
        "penup_main": block("pen_penUp", "goto_start", parent="clear"),
        "goto_start": block(
            "motion_gotoxy", "pendown_main", parent="penup_main",
            inputs={"X": [1, [4, "-200"]], "Y": [1, [4, "0"]]},
        ),
        "pendown_main": block("pen_penDown", "set_size", parent="goto_start"),
        "set_size": block(
            "data_setvariableto", "repeat_flags", parent="pendown_main",
            fields={"VARIABLE": ["size", SIZE_VAR_ID]},
            inputs={"VALUE": [1, [4, "20"]]},
        ),
        "repeat_flags": block(
            "control_repeat", None, parent="set_size",
            inputs={"TIMES": [1, [4, "6"]], "SUBSTACK": [2, "call_star"]},
        ),
        # Loop body: call 画星形(size) -> size + 20 -> pen up -> x + 60 -> pen down
        "call_star": block(
            "procedures_call", "change_size", parent="repeat_flags",
            inputs={"size": [1, "size_reporter"]},
            mutation=proc_mutation,
        ),
        "size_reporter": block(
            "data_variable", None, parent="call_star",
            fields={"VARIABLE": ["size", SIZE_VAR_ID]},
        ),
        "change_size": block(
            "data_changevariableby", "penup_loop", parent="call_star",
            fields={"VARIABLE": ["size", SIZE_VAR_ID]},
            inputs={"VALUE": [1, [4, "20"]]},
        ),
        "penup_loop": block("pen_penUp", "change_x", parent="change_size"),
        "change_x": block(
            "motion_changexby", "pendown_loop", parent="penup_loop",
            inputs={"DX": [1, [4, "60"]]},
        ),
        "pendown_loop": block("pen_penDown", None, parent="change_x"),
        # Procedure definition: 画星形(size) -> repeat 5: move size, turn 144
        "define_star": block(
            "procedures_definition", "repeat_star", top_level=True, x=40, y=260,
            inputs={"custom_block": [1, "proto_star"]},
        ),
        "proto_star": block(
            "procedures_prototype", None, parent="define_star",
            mutation=proc_mutation,
        ),
        "repeat_star": block(
            "control_repeat", None, parent="define_star",
            inputs={"TIMES": [1, [4, "5"]], "SUBSTACK": [2, "move_star"]},
        ),
        "move_star": block(
            "motion_movesteps", "turn_star", parent="repeat_star",
            inputs={"STEPS": [1, "arg_size"]},
        ),
        "arg_size": block(
            "argument_reporter_string_number", None, parent="move_star",
            fields={"VALUE": ["size"]},
        ),
        "turn_star": block(
            "motion_turnright", None, parent="move_star",
            inputs={"DEGREES": [1, [4, "144"]]},
        ),
    }

    stage = {
        "isStage": True,
        "name": "Stage",
        "variables": {},
        "lists": {},
        "broadcasts": {},
        "blocks": {},
        "comments": {},
        "currentCostume": 0,
        "costumes": [stage_costume],
        "sounds": [],
        "volume": 100,
        "layerOrder": 0,
        "tempo": 60,
        "videoTransparency": 50,
        "videoState": "on",
        "textToSpeechLanguage": None,
    }
    sprite = {
        "isStage": False,
        "name": "画笔",
        "variables": {SIZE_VAR_ID: ["size", 20]},
        "lists": {},
        "broadcasts": {},
        "blocks": blocks,
        "comments": {},
        "currentCostume": 0,
        "costumes": [pen_costume],
        "sounds": [],
        "volume": 100,
        "layerOrder": 1,
        "visible": True,
        "x": -200,
        "y": 0,
        "size": 100,
        "direction": 90,
        "draggable": False,
        "rotationStyle": "all around",
    }
    return {
        "targets": [stage, sprite],
        "monitors": [],
        "extensions": ["pen"],
        "meta": {"semver": "3.0.0", "vm": "0.2.0", "agent": "KidsCoding curriculum"},
    }


def build_sb3(destination=TARGET) -> Path:
    project = build_project()
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    stage = project["targets"][0]["costumes"][0]
    sprite = project["targets"][1]["costumes"][0]
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("project.json", json.dumps(project, ensure_ascii=False))
        archive.write(HERE / "stage-flags.svg", stage["md5ext"])
        archive.write(HERE / "pen.svg", sprite["md5ext"])
    return destination


if __name__ == "__main__":
    print(build_sb3())
