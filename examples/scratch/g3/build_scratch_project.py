"""Build an original G3 Scratch 3 project archive with green-flag meteor clones.

Creates a valid project structure and editable SVG media for import into Scratch 3.
This builder/test does NOT prove Scratch VM execution; manual/VM validation is a
separate publication gate.
"""
import hashlib
import json
from pathlib import Path
import zipfile

HERE = Path(__file__).resolve().parent
TARGET = HERE / "meteor_clones.sb3"


def block(opcode, next=None, parent=None, inputs=None, fields=None, shadow=False, topLevel=False, x=None, y=None):
    out = {"opcode":opcode,"next":next,"parent":parent,"inputs":inputs or {},"fields":fields or {},"shadow":shadow,"topLevel":topLevel}
    if topLevel:
        out.update(x=x,y=y)
    return out


def build_project() -> dict:
    stage_bytes = (HERE/"stage-stars.svg").read_bytes()
    meteor_bytes = (HERE/"meteor.svg").read_bytes()
    def costume(name, raw, cx, cy):
        digest = hashlib.md5(raw).hexdigest()
        return {"assetId":digest,"name":name,"md5ext":digest+".svg","dataFormat":"svg","rotationCenterX":cx,"rotationCenterY":cy}
    blocks = {
        "flag":block("event_whenflagclicked","hide",topLevel=True,x=50,y=60),
        "hide":block("looks_hide","repeat",parent="flag"),
        "repeat":block("control_repeat",parent="hide",inputs={"TIMES":[1,[4,"10"]],"SUBSTACK":[2,"spawn"]}),
        "spawn":block("control_create_clone_of","wait",parent="repeat",inputs={"CLONE_OPTION":[1,"menu"]}),
        "menu":block("control_create_clone_of_menu",parent="spawn",fields={"CLONE_OPTION":["_myself_",None]},shadow=True),
        "wait":block("control_wait",parent="spawn",inputs={"DURATION":[1,[4,"0.3"]]}),
        "clone_flag":block("control_start_as_clone","show",topLevel=True,x=390,y=60),
        "show":block("looks_show","set_y",parent="clone_flag"),
        "set_y":block("motion_sety","down",parent="show",inputs={"Y":[1,[4,"170"]]}),
        "down":block("control_repeat","delete",parent="set_y",inputs={"TIMES":[1,[4,"30"]],"SUBSTACK":[2,"move_y"]}),
        "move_y":block("motion_changeyby","move_pause",parent="down",inputs={"DY":[1,[4,"-13"]]}),
        "move_pause":block("control_wait",parent="move_y",inputs={"DURATION":[1,[4,"0.05"]]}),
        "delete":block("control_delete_this_clone",parent="down")
    }
    stage = {"isStage":True,"name":"Stage","variables":{},"lists":{},"broadcasts":{},"blocks":{},"comments":{},"currentCostume":0,
             "costumes":[costume("星空山谷",stage_bytes,240,180)],"sounds":[],"volume":100,"layerOrder":0,"tempo":60,"videoTransparency":50,"videoState":"on","textToSpeechLanguage":None}
    sprite = {"isStage":False,"name":"流星","variables":{},"lists":{},"broadcasts":{},"blocks":blocks,"comments":{},"currentCostume":0,
              "costumes":[costume("流星",meteor_bytes,40,40)],"sounds":[],"volume":100,"layerOrder":1,"visible":True,
              "x":0,"y":0,"size":100,"direction":90,"draggable":False,"rotationStyle":"all around"}
    return {"targets":[stage,sprite],"monitors":[],"extensions":[],"meta":{"semver":"3.0.0","vm":"0.2.0","agent":"KidsCoding curriculum"}}


def build_sb3(destination=TARGET) -> Path:
    project = build_project()
    destination = Path(destination)
    destination.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(destination,"w",compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("project.json",json.dumps(project,ensure_ascii=False))
        for source,target in ((HERE/"stage-stars.svg",project["targets"][0]["costumes"][0]["md5ext"]),
                              (HERE/"meteor.svg",project["targets"][1]["costumes"][0]["md5ext"])):
            archive.write(source,target)
    return destination


if __name__ == "__main__":
    print(build_sb3())
