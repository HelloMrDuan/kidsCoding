"""Build G3-U1-L01 practice and failure-case variants from the main .sb3.

This script does NOT claim pen rendering, child usability, or lesson
completion. It only produces additional .sb3 files whose structure
and Scratch VM execution can be checked:

- Practice A: set size 30, change by 10 -> VM size 90, x 160, threads 0.
  (Main lesson: set 20, change 20 -> size 140.)
- Practice B: a second procedure parameter "color". The procedure sets
  pen hue to the color argument before drawing, and the main script
  changes color by 30 each flag (0, 30, 60, 90, 120, 150) -> VM size 140,
  color variable 180, x 160, threads 0. Visual color differences still
  need a real browser/renderer screenshot; Node VM alone does not
  prove them.
- Failure case: procedure move steps fixed at 20, ignoring the size
  argument. VM still ends at x 160, size variable 140, threads 0,
  because the x loop and the size variable are independent of the
  procedure's move steps. The bug is structural: every star is drawn
  with move 20, so all six stars are the same size despite the size
  variable changing. Pen trajectories are NOT visually verified by
  Node VM alone (no rendering module), so the failure must be
  taught from the project structure and the move-steps value, not
  from a screenshot.

Run after build_g3_u1_l01.py has generated g3-u1-l01-star-flags.sb3.
"""

import copy
import json
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
COLOR_VAR_ID = "g3u1l01-color"


def _block(opcode, next_id=None, parent=None, inputs=None, fields=None,
           mutation=None):
    out = {
        "opcode": opcode, "next": next_id, "parent": parent,
        "inputs": inputs or {}, "fields": fields or {},
        "shadow": False, "topLevel": False,
    }
    if mutation is not None:
        out["mutation"] = mutation
    return out


def build_variants(source: Path, outdir: Path) -> list[Path]:
    with zipfile.ZipFile(source) as z:
        proj = json.loads(z.read("project.json"))
        assets = {n: z.read(n) for n in z.namelist() if n != "project.json"}

    def write(name, mutate):
        p = copy.deepcopy(proj)
        mutate(p["targets"][1])
        dest = outdir / name
        with zipfile.ZipFile(dest, "w", compression=zipfile.ZIP_DEFLATED) as z:
            z.writestr("project.json", json.dumps(p, ensure_ascii=False))
            for n, data in assets.items():
                z.writestr(n, data)
        return dest

    def practice_a(sprite):
        blocks = sprite["blocks"]
        blocks["set_size"]["inputs"]["VALUE"] = [1, [4, "30"]]
        blocks["change_size"]["inputs"]["VALUE"] = [1, [4, "10"]]

    def practice_b(sprite):
        blocks = sprite["blocks"]
        sprite["variables"][COLOR_VAR_ID] = ["color", 0]
        mut2 = {
            "tagName": "mutation", "children": [],
            "proccode": "画星形 %s %s",
            "argumentids": '["size", "color"]',
            "argumentnames": '["size", "color"]',
            "argumentdefaults": '["20", "0"]',
            "warp": "false",
        }
        blocks["proto_star"]["mutation"] = mut2
        blocks["call_star"]["mutation"] = mut2
        blocks["call_star"]["inputs"]["color"] = [1, "color_reporter"]
        blocks["color_reporter"] = _block(
            "data_variable", parent="call_star",
            fields={"VARIABLE": ["color", COLOR_VAR_ID]})
        blocks["change_color"] = _block(
            "data_changevariableby", "penup_loop", parent="change_size",
            fields={"VARIABLE": ["color", COLOR_VAR_ID]},
            inputs={"VALUE": [1, [4, "30"]]})
        blocks["change_size"]["next"] = "change_color"
        blocks["penup_loop"]["parent"] = "change_color"
        blocks["set_color"] = _block(
            "data_setvariableto", "repeat_flags", parent="set_size",
            fields={"VARIABLE": ["color", COLOR_VAR_ID]},
            inputs={"VALUE": [1, [4, "0"]]})
        blocks["set_size"]["next"] = "set_color"
        blocks["repeat_flags"]["parent"] = "set_color"
        blocks["set_hue"] = _block(
            "pen_setPenHueToNumber", "repeat_star", parent="define_star",
            inputs={"HUE": [1, "arg_color"]})
        blocks["arg_color"] = _block(
            "argument_reporter_string_number", parent="set_hue",
            fields={"VALUE": ["color"]})
        blocks["define_star"]["next"] = "set_hue"
        blocks["repeat_star"]["parent"] = "set_hue"

    def failure(sprite):
        sprite["blocks"]["move_star"]["inputs"]["STEPS"] = [1, [4, "20"]]

    outdir.mkdir(parents=True, exist_ok=True)
    return [
        write("g3-u1-l01-practice-a.sb3", practice_a),
        write("g3-u1-l01-practice-b.sb3", practice_b),
        write("g3-u1-l01-failure-hardcoded-size.sb3", failure),
    ]


if __name__ == "__main__":
    for p in build_variants(HERE / "g3-u1-l01-star-flags.sb3", HERE):
        print(p)
