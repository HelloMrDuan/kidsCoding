"""Build the original G2-U1 Scratch 3 lesson projects and the sandbox lesson models.

Each lesson gets one editable .sb3 (original SVG artwork drawn for KidsCoding;
checked in base64-encoded as <name>.sb3.b64) and
one *lesson model*: the exact block skeleton plus the few parameters a learner may
change. The model is embedded in apps/web/public/scratch-g2-sandbox.html, so the
sandbox can reject any imported project that is not structurally this lesson.

Usage:
  python examples/scratch/g2/build_g2_projects.py          # check the checked-in files are current
  python examples/scratch/g2/build_g2_projects.py --write  # regenerate .sb3 files + embedded models

This builder/test proves structure only. Real execution is proven separately by
the Scratch VM browser E2E (apps/web/tests/e2e/scratch-g2-u1.spec.ts).
"""
from __future__ import annotations

import base64
import hashlib
import io
import json
import re
import sys
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
WEB = HERE.parents[2] / "apps" / "web"
SAMPLES = WEB / "public" / "scratch-samples"
SANDBOX = WEB / "public" / "scratch-g2-sandbox.html"
MODEL_START = '<script type="application/json" id="kc-g2-models">'
MODEL_END = "</script>"

STAGE_W, STAGE_H = 240, 180


def block(opcode, next=None, parent=None, inputs=None, fields=None, shadow=False, top=False, x=0, y=0):
    out = {"opcode": opcode, "next": next, "parent": parent, "inputs": inputs or {},
           "fields": fields or {}, "shadow": shadow, "topLevel": top}
    if top:
        out.update(x=x, y=y)
    return out


def num(value):
    return [1, [4, str(value)]]


def text(value):
    return [1, [10, str(value)]]


def svg_costume(name, filename, cx, cy):
    raw = (HERE / filename).read_bytes()
    digest = hashlib.md5(raw).hexdigest()
    return {"assetId": digest, "name": name, "md5ext": digest + ".svg", "dataFormat": "svg",
            "rotationCenterX": cx, "rotationCenterY": cy}, filename


def greet_scripts(prefix, x, y, greeting):
    """Green flag -> go to (x, y);  this sprite clicked -> say greeting for 2 secs."""
    return {
        f"{prefix}_flag": block("event_whenflagclicked", f"{prefix}_goto", top=True, x=40, y=40),
        f"{prefix}_goto": block("motion_gotoxy", parent=f"{prefix}_flag", inputs={"X": num(x), "Y": num(y)}),
        f"{prefix}_click": block("event_whenthisspriteclicked", f"{prefix}_say", top=True, x=40, y=200),
        f"{prefix}_say": block("looks_sayforsecs", parent=f"{prefix}_click",
                               inputs={"MESSAGE": text(greeting), "SECS": num(2)}),
    }


def sprite(name, costumes, blocks, layer, x, y):
    return {"isStage": False, "name": name, "variables": {}, "lists": {}, "broadcasts": {}, "blocks": blocks,
            "comments": {}, "currentCostume": 0, "costumes": costumes, "sounds": [], "volume": 100,
            "layerOrder": layer, "visible": True, "x": x, "y": y, "size": 100, "direction": 90,
            "draggable": False, "rotationStyle": "all around"}


def stage(costumes):
    return {"isStage": True, "name": "Stage", "variables": {}, "lists": {}, "broadcasts": {}, "blocks": {},
            "comments": {}, "currentCostume": 0, "costumes": costumes, "sounds": [], "volume": 100,
            "layerOrder": 0, "tempo": 60, "videoTransparency": 50, "videoState": "on",
            "textToSpeechLanguage": None}


def coordinate_params(target, prefix):
    return [
        {"target": target, "block": f"{prefix}_goto", "slot": "X", "kind": "int", "min": -STAGE_W, "max": STAGE_W},
        {"target": target, "block": f"{prefix}_goto", "slot": "Y", "kind": "int", "min": -STAGE_H, "max": STAGE_H},
        {"target": target, "block": f"{prefix}_say", "slot": "MESSAGE", "kind": "text", "maxLength": 20},
    ]


def lesson_g2_u1_l01():
    """认识舞台与精灵: one backdrop (舞台) + two sprites, each with its own scripts."""
    backdrop, backdrop_file = svg_costume("春日公园", "park-backdrop.svg", 240, 180)
    cat, cat_file = svg_costume("小橘猫", "orange-cat.svg", 48, 48)
    bird, bird_file = svg_costume("小鸟", "blue-bird.svg", 32, 28)
    project = {
        "targets": [
            stage([backdrop]),
            sprite("小橘猫", [cat], greet_scripts("cat", -120, -80, "你好！我是小橘猫。"), 1, -120, -80),
            sprite("小鸟", [bird], greet_scripts("bird", -150, 110, "叽叽！我想回到鸟窝。"), 2, -150, 110),
        ],
        "monitors": [], "extensions": [],
        "meta": {"semver": "3.0.0", "vm": "0.2.0", "agent": "KidsCoding G2-U1-L01"},
    }
    files = {backdrop["md5ext"]: backdrop_file, cat["md5ext"]: cat_file, bird["md5ext"]: bird_file}
    params = coordinate_params("小橘猫", "cat") + coordinate_params("小鸟", "bird")
    return "g2-u1-l01-park-friends.sb3.b64", project, files, params


LESSONS = {
    "G2-U1-L01": lesson_g2_u1_l01,
}


def model_for(project, params):
    def strip(blocks):
        return {bid: {k: b[k] for k in ("opcode", "next", "parent", "inputs", "fields", "shadow", "topLevel")}
                for bid, b in blocks.items()}
    targets = project["targets"]
    return {
        "stage": {"costumes": [c["name"] for c in targets[0]["costumes"]],
                  "sounds": [s["name"] for s in targets[0]["sounds"]], "blocks": strip(targets[0]["blocks"])},
        "sprites": [{"name": t["name"], "costumes": [c["name"] for c in t["costumes"]],
                     "sounds": [s["name"] for s in t["sounds"]], "blocks": strip(t["blocks"])}
                    for t in targets[1:]],
        "params": params,
    }


def build_models():
    models = {}
    for lesson_id, builder in LESSONS.items():
        _, project, _, params = builder()
        models[lesson_id] = model_for(project, params)
    return models


def sb3_text(project, files) -> str:
    """The checked-in sample is the genuine .sb3 zip, base64-encoded so it can be
    committed through text-only tooling; the lab decodes it back to the same bytes."""
    return base64.b64encode(sb3_bytes(project, files)).decode("ascii") + "\n"


def read_sample(filename) -> bytes:
    return base64.b64decode((SAMPLES / filename).read_text(encoding="ascii"))


def sb3_bytes(project, files) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        info = zipfile.ZipInfo("project.json", date_time=(2026, 10, 27, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, json.dumps(project, ensure_ascii=False))
        for target_name, source in sorted(files.items()):
            info = zipfile.ZipInfo(target_name, date_time=(2026, 10, 27, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, (HERE / source).read_bytes())
    return buffer.getvalue()


def project_for(lesson_id):
    return LESSONS[lesson_id]()[1]


def models_json() -> str:
    return json.dumps(build_models(), ensure_ascii=False, sort_keys=True)


def embedded_models(html: str) -> str:
    match = re.search(re.escape(MODEL_START) + r"(.*?)" + re.escape(MODEL_END), html, re.S)
    if not match:
        raise ValueError("sandbox has no embedded kc-g2-models block")
    return match.group(1).strip()


def write_all():
    SAMPLES.mkdir(parents=True, exist_ok=True)
    for builder in LESSONS.values():
        filename, project, files, _ = builder()
        (SAMPLES / filename).write_text(sb3_text(project, files), encoding="ascii")
    html = SANDBOX.read_text(encoding="utf-8")
    current = embedded_models(html)
    SANDBOX.write_text(html.replace(current, models_json(), 1), encoding="utf-8")


def check_all() -> list[str]:
    problems = []
    for lesson_id, builder in LESSONS.items():
        filename, project, files, _ = builder()
        path = SAMPLES / filename
        if not path.exists() or path.read_text(encoding="ascii") != sb3_text(project, files):
            problems.append(f"{lesson_id}: {filename} is stale; run with --write")
    if embedded_models(SANDBOX.read_text(encoding="utf-8")) != models_json():
        problems.append("scratch-g2-sandbox.html embedded models are stale; run with --write")
    return problems


if __name__ == "__main__":
    if "--write" in sys.argv:
        write_all()
    issues = check_all()
    for issue in issues:
        print(issue)
    sys.exit(1 if issues else 0)
