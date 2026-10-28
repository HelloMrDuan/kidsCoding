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

    def test_l03_stage_owns_two_backdrops_a_sound_and_a_sound_inside_a_repeat(self):
        filename, project, files, _ = LESSONS["G2-U1-L03"]()
        stage, cat, bird = project["targets"]
        self.assertEqual([c["name"] for c in stage["costumes"]], ["夜晚森林", "绿色草地"])
        self.assertEqual([s["name"] for s in stage["sounds"]], ["开幕铃"])
        self.assertEqual([s["name"] for s in bird["sounds"]], ["叽叽", "啾啾"])
        self.assertEqual(cat["sounds"], [])
        blocks = stage["blocks"]
        self.assertEqual(blocks["stage_switch"]["opcode"], "looks_switchbackdropto")
        self.assertEqual(blocks["stage_backdrop_menu"]["fields"]["BACKDROP"][0], "夜晚森林")
        self.assertEqual(blocks["stage_repeat"]["inputs"]["SUBSTACK"], [2, "stage_play"])
        self.assertEqual(blocks["stage_play"]["opcode"], "sound_playuntildone")
        # The bug the lesson starts with: the sound sits inside a 3x repeat.
        self.assertEqual(blocks["stage_repeat"]["inputs"]["TIMES"], [1, [4, "3"]])
        with zipfile.ZipFile(io.BytesIO(read_sample(filename))) as archive:
            for target in project["targets"]:
                for sound in target["sounds"]:
                    data = archive.read(sound["md5ext"])
                    self.assertTrue(data.startswith(b"RIFF") and data[8:12] == b"WAVE")
                    self.assertEqual(hashlib.md5(data).hexdigest(), sound["assetId"])
                    self.assertEqual((len(data) - 44) // 2, sound["sampleCount"])
                    self.assertLess(len(data), 400_000)

    def test_l04_motion_blocks_start_facing_left_and_the_pinwheel_turns_in_a_repeat(self):
        project = project_for("G2-U1-L04")
        stage, cat, wheel = project["targets"]
        self.assertEqual([c["name"] for c in stage["costumes"]], ["小河边"])
        self.assertEqual(stage["blocks"], {})
        self.assertEqual((cat["name"], wheel["name"]), ("小橘猫", "风车"))
        blocks = cat["blocks"]
        self.assertEqual([blocks[b]["opcode"] for b in ("cat_goto", "cat_point", "cat_move", "cat_say")],
                         ["motion_gotoxy", "motion_pointindirection", "motion_movesteps", "looks_sayforsecs"])
        # The bug the lesson starts with: facing left, so the walk goes away from the fish.
        self.assertEqual(blocks["cat_point"]["inputs"]["DIRECTION"], [1, [8, "-90"]])
        self.assertEqual(cat["direction"], -90)
        self.assertEqual(cat["rotationStyle"], "left-right")
        wb = wheel["blocks"]
        self.assertEqual(wb["wheel_repeat"]["inputs"]["SUBSTACK"], [2, "wheel_turn"])
        self.assertEqual(wb["wheel_turn"]["opcode"], "motion_turnright")
        self.assertEqual(wb["wheel_turn"]["inputs"]["DEGREES"], [1, [4, "15"]])
        params = {(p["block"], p["slot"]): p for p in build_models()["G2-U1-L04"]["params"]}
        self.assertEqual(params[("cat_point", "DIRECTION")]["options"], ["90", "-90", "0", "180"])
        self.assertEqual((params[("cat_move", "STEPS")]["min"], params[("cat_move", "STEPS")]["max"]), (10, 300))
        self.assertNotIn(("cat_goto", "X"), params)

    def test_l05_one_broadcast_many_receivers_and_the_bird_listens_for_the_wrong_message(self):
        project = project_for("G2-U1-L05")
        stage, cat, bird, rabbit = project["targets"]
        self.assertEqual(stage["broadcasts"], {"kc-msg-open": "开场", "kc-msg-bow": "谢幕"})
        self.assertEqual([c["name"] for c in stage["costumes"]], ["幕布舞台", "灯光舞台"])
        self.assertEqual(cat["blocks"]["cat_bcast"]["opcode"], "event_broadcast")
        self.assertEqual(cat["blocks"]["cat_bcast"]["inputs"]["BROADCAST_INPUT"], [1, [11, "开场", "kc-msg-open"]])
        receivers = {t["name"]: b["fields"]["BROADCAST_OPTION"][0] for t in project["targets"] for b in t["blocks"].values()
                     if b["opcode"] == "event_whenbroadcastreceived"}
        # The bug the lesson starts with: only the bird listens for a message nobody sends.
        self.assertEqual(receivers, {"Stage": "开场", "小鸟": "谢幕", "小白兔": "开场"})
        for target in project["targets"]:
            self.assertEqual(target["variables"], {})
        model = build_models()["G2-U1-L05"]
        self.assertEqual(model["stage"]["broadcasts"], ["开场", "谢幕"])
        self.assertNotIn("broadcasts", build_models()["G2-U1-L04"]["stage"])

    def test_l06_card_combines_lesson_blocks_and_the_balloon_starts_without_a_wait(self):
        filename, project, files, _ = LESSONS["G2-U1-L06"]()
        stage, cat, cake, balloon = project["targets"]
        self.assertEqual([c["name"] for c in stage["costumes"]], ["生日贺卡"])
        self.assertEqual([c["name"] for c in cake["costumes"]], ["蜡烛熄灭", "蜡烛点亮"])
        self.assertEqual([s["name"] for s in cake["sounds"]], ["生日歌"])
        b = balloon["blocks"]
        self.assertEqual([b[k]["opcode"] for k in ("balloon_home", "balloon_wait", "balloon_say", "balloon_repeat", "balloon_rise")],
                         ["motion_gotoxy", "control_wait", "looks_sayforsecs", "control_repeat", "motion_changeyby"])
        # The bug the lesson starts with: the balloon waits 0 s and talks over the cat's 2 s greeting.
        self.assertEqual(b["balloon_wait"]["inputs"]["DURATION"], [1, [4, "0"]])
        self.assertEqual(cat["blocks"]["cat_say"]["inputs"]["SECS"], [1, [4, "2"]])
        self.assertEqual(cake["blocks"]["cake_costume_menu"]["fields"]["COSTUME"][0], "蜡烛熄灭")
        with zipfile.ZipFile(io.BytesIO(read_sample(filename))) as archive:
            data = archive.read(cake["sounds"][0]["md5ext"])
            self.assertTrue(data.startswith(b"RIFF") and data[8:12] == b"WAVE")


if __name__ == "__main__":
    unittest.main()
