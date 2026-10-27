import hashlib
import io
import json
import unittest
import zipfile
from pathlib import Path

from build_g2_projects import LESSONS, SANDBOX, build_models, check_all, embedded_models, project_for, read_sample


class G2ProjectTests(unittest.TestCase):
    def test_checked_in_samples_and_sandbox_models_are_current(self):
        self.assertEqual(check_all(), [])
        self.assertEqual(json.loads(embedded_models(SANDBOX.read_text(encoding="utf-8"))), build_models())

    def test_every_sample_is_a_complete_editable_sb3(self):
        for lesson_id, builder in LESSONS.items():
            filename, project, files, _ = builder()
            self.assertTrue(filename.endswith('.sb3.b64'))
            with zipfile.ZipFile(io.BytesIO(read_sample(filename))) as archive:
                names = set(archive.namelist())
                self.assertIn("project.json", names)
                packed = json.loads(archive.read("project.json"))
                self.assertEqual(packed, json.loads(json.dumps(project)))
                for target in packed["targets"]:
                    for costume in target["costumes"]:
                        self.assertIn(costume["md5ext"], names, lesson_id)
                        data = archive.read(costume["md5ext"])
                        self.assertEqual(hashlib.md5(data).hexdigest(), costume["assetId"])
                        self.assertTrue(data.startswith(b"<svg"), "costumes are original editable SVG")

    def test_block_wiring_is_consistent(self):
        for lesson_id in LESSONS:
            for target in project_for(lesson_id)["targets"]:
                blocks = target["blocks"]
                for block_id, block in blocks.items():
                    if block["next"]:
                        self.assertEqual(blocks[block["next"]]["parent"], block_id, (lesson_id, block_id))
                    if block["parent"]:
                        self.assertIn(block["parent"], blocks)
                    if block["topLevel"]:
                        self.assertIsNone(block["parent"])

    def test_params_point_at_real_slots(self):
        for lesson_id, model in build_models().items():
            targets = {"Stage": model["stage"], **{s["name"]: s for s in model["sprites"]}}
            for param in model["params"]:
                block = targets[param["target"]]["blocks"][param["block"]]
                self.assertTrue(param["slot"] in block["inputs"] or param["slot"] in block["fields"], (lesson_id, param))

    def test_l01_is_stage_plus_two_sprites_with_their_own_scripts(self):
        project = project_for("G2-U1-L01")
        stage, cat, bird = project["targets"]
        self.assertTrue(stage["isStage"])
        self.assertEqual(stage["blocks"], {})
        self.assertEqual([c["name"] for c in stage["costumes"]], ["春日公园"])
        self.assertEqual((cat["name"], bird["name"]), ("小橘猫", "小鸟"))
        for sprite, prefix in ((cat, "cat"), (bird, "bird")):
            self.assertEqual(sprite["blocks"][f"{prefix}_flag"]["opcode"], "event_whenflagclicked")
            self.assertEqual(sprite["blocks"][f"{prefix}_goto"]["opcode"], "motion_gotoxy")
            self.assertEqual(sprite["blocks"][f"{prefix}_click"]["opcode"], "event_whenthisspriteclicked")
            self.assertEqual(sprite["blocks"][f"{prefix}_say"]["opcode"], "looks_sayforsecs")
        # The bird starts outside the nest so practice B needs a real edit.
        self.assertEqual(bird["blocks"]["bird_goto"]["inputs"]["X"], [1, [4, "-150"]])

    def test_l02_sprites_own_several_costumes_and_the_stage_owns_only_its_backdrop(self):
        project = project_for("G2-U1-L02")
        stage, cat, bird = project["targets"]
        self.assertEqual([c["name"] for c in stage["costumes"]], ["演出舞台"])
        self.assertEqual(stage["blocks"], {})
        self.assertEqual([c["name"] for c in cat["costumes"]], ["站立", "挥手"])
        self.assertEqual([c["name"] for c in bird["costumes"]], ["收翅", "展翅"])
        blocks = cat["blocks"]
        self.assertEqual(blocks["cat_switch"]["opcode"], "looks_switchcostumeto")
        self.assertEqual(blocks["cat_costume_menu"]["fields"]["COSTUME"][0], "站立")
        self.assertTrue(blocks["cat_costume_menu"]["shadow"])
        self.assertEqual(blocks["cat_repeat"]["opcode"], "control_repeat")
        self.assertEqual(blocks["cat_repeat"]["inputs"]["SUBSTACK"], [2, "cat_next"])
        self.assertEqual(blocks["cat_next"]["opcode"], "looks_nextcostume")
        self.assertEqual(blocks["cat_wait"]["opcode"], "control_wait")
        # Starts at one repeat so practice B needs a real edit.
        self.assertEqual(blocks["cat_repeat"]["inputs"]["TIMES"], [1, [4, "1"]])
        model = build_models()["G2-U1-L02"]
        kinds = {(p["block"], p["slot"]): p["kind"] for p in model["params"]}
        self.assertEqual(kinds[("cat_wait", "DURATION")], "tenths")
        self.assertEqual(kinds[("cat_costume_menu", "COSTUME")], "choice")


if __name__ == "__main__":
    unittest.main()
