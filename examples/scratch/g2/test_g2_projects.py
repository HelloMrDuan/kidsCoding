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

    def test_u2_l01_walk_cycle_has_four_frames_and_starts_with_no_wait(self):
        filename, project, files, params = LESSONS["G2-U2-L01"]()
        stage, cat, bird = project["targets"]
        self.assertEqual([c["name"] for c in stage["costumes"]], ["回家的小路"])
        self.assertEqual([c["name"] for c in cat["costumes"]], ["走路1", "走路2", "走路3", "走路4"])
        self.assertEqual(len({c["assetId"] for c in cat["costumes"]}), 4, "four distinct original frames")
        b = cat["blocks"]
        self.assertEqual(b["cat_repeat"]["inputs"]["SUBSTACK"], [2, "cat_move"])
        self.assertEqual([b[k]["opcode"] for k in ("cat_move", "cat_next", "cat_wait")],
                         ["motion_movesteps", "looks_nextcostume", "control_wait"])
        self.assertEqual(b["cat_next"]["parent"], "cat_move")
        # The bugs the lesson starts with: no wait inside the loop and 6 loops (not a whole 4-frame cycle).
        self.assertEqual(b["cat_wait"]["inputs"]["DURATION"], [1, [4, "0"]])
        self.assertEqual(b["cat_repeat"]["inputs"]["TIMES"], [1, [4, "6"]])
        self.assertEqual(b["cat_first_menu"]["fields"]["COSTUME"][0], "走路1")
        self.assertEqual(bird["blocks"]["bird_wait"]["inputs"]["DURATION"], [1, [4, "0.3"]])
        wait = next(p for p in params if p["block"] == "cat_wait")
        self.assertEqual((wait["kind"], wait["min"], wait["max"]), ("tenths", 0, 1.0))
        self.assertEqual({p["target"] for p in params}, {"小橘猫"}, "the bird is a fixed demo")

    def test_u2_l02_stage_forever_loop_and_backdrop_hats(self):
        _, project, _, params = LESSONS["G2-U2-L02"]()
        stage, owl, cat = project["targets"]
        self.assertEqual([c["name"] for c in stage["costumes"]], ["白天", "夜晚"])
        b = stage["blocks"]
        self.assertEqual(b["stage_forever"]["opcode"], "control_forever")
        self.assertIsNone(b["stage_forever"]["next"], "nothing can follow a forever loop")
        self.assertEqual([b[k]["opcode"] for k in ("stage_wait", "stage_next")], ["control_wait", "looks_nextbackdrop"])
        # The bugs the lesson starts with: 1 s phases and an owl that wakes for 白天.
        self.assertEqual(b["stage_wait"]["inputs"]["DURATION"], [1, [4, "1"]])
        self.assertEqual(owl["blocks"]["owl_hat"]["fields"]["BACKDROP"], ["白天", None])
        self.assertEqual(cat["blocks"]["cat_hat"]["fields"]["BACKDROP"], ["夜晚", None])
        self.assertEqual({(p["target"], p["block"]) for p in params if p["slot"] == "BACKDROP"}, {("猫头鹰", "owl_hat"), ("小橘猫", "cat_hat")})


    def test_u2_l03_nested_loops_bars_and_beats(self):
        _, project, files, params = LESSONS["G2-U2-L03"]()
        stage, drum, cat = project["targets"]
        self.assertEqual([s["name"] for s in drum["sounds"]], ["咚", "嗒", "啪"])
        b = drum["blocks"]
        self.assertEqual(b["drum_bars"]["opcode"], "control_repeat")
        self.assertEqual(b["drum_bars"]["inputs"]["SUBSTACK"], [2, "drum_beats"], "the beat loop sits inside the bar loop")
        self.assertEqual(b["drum_beats"]["inputs"]["SUBSTACK"], [2, "drum_dong"])
        self.assertEqual(b["drum_beats"]["next"], "drum_accent", "the accent ends each bar, after the inner loop")
        self.assertEqual([b[k]["opcode"] for k in ("drum_dong", "drum_wait1", "drum_accent", "drum_wait2")],
                         ["sound_playuntildone", "control_wait", "sound_playuntildone", "control_wait"])
        # The bug the lesson starts with: 4 咚 + accent = 5 beats per bar; uneven waits.
        self.assertEqual(b["drum_beats"]["inputs"]["TIMES"], [1, [4, "4"]])
        self.assertEqual(b["drum_bars"]["inputs"]["TIMES"], [1, [4, "2"]])
        self.assertNotEqual(b["drum_wait1"]["inputs"]["DURATION"], b["drum_wait2"]["inputs"]["DURATION"])
        self.assertEqual(len([f for f in files if f.endswith(".wav")]), 3)
        self.assertEqual([p["block"] for p in params if p["target"] == "小鼓" and p["slot"] == "TIMES"], ["drum_bars", "drum_beats"])
        self.assertEqual({p["block"] for p in params if p["slot"] == "SOUND_MENU"}, {"drum_accent_menu"}, "the 咚 beat sound is fixed")

    def test_u2_l04_flight_loop_move_turn(self):
        _, project, _, params = LESSONS["G2-U2-L04"]()
        stage, fly, flower = project["targets"]
        b = fly["blocks"]
        self.assertEqual(b["fly_repeat"]["inputs"]["SUBSTACK"], [2, "fly_move"])
        self.assertEqual([b[k]["opcode"] for k in ("fly_move", "fly_turn", "fly_next", "fly_wait")],
                         ["motion_movesteps", "motion_turnright", "looks_nextcostume", "control_wait"])
        # The bug the lesson starts with: 6 × 45 = 270, not a whole turn.
        times = int(b["fly_repeat"]["inputs"]["TIMES"][1][1])
        degrees = int(b["fly_turn"]["inputs"]["DEGREES"][1][1])
        self.assertNotEqual((times * degrees) % 360, 0)
        self.assertEqual([c["name"] for c in fly["costumes"]], ["展翅", "合翅"])
        self.assertEqual({p["block"] for p in params}, {"fly_repeat", "fly_move", "fly_turn", "fly_say"}, "start, direction and wait stay fixed")
        self.assertEqual(flower["name"], "花朵")

    def test_u2_l05_one_broadcast_many_receivers(self):
        _, project, _, params = LESSONS["G2-U2-L05"]()
        stage, fox, rabbit = project["targets"]
        self.assertEqual(stage["broadcasts"], {"kc-msg-show": "开演", "kc-msg-curtain": "谢幕"})
        self.assertEqual(stage["blocks"]["stage_bcast"]["inputs"]["BROADCAST_INPUT"][1][1], "开演")
        receivers = [(t["name"], b["fields"]["BROADCAST_OPTION"][0]) for t in project["targets"] for b in t["blocks"].values()
                     if b["opcode"] == "event_whenbroadcastreceived"]
        # Three receivers of one message (stage bell, fox, rabbit); the bug: the rabbit listens for 谢幕.
        self.assertEqual(receivers, [("Stage", "开演"), ("小狐狸", "开演"), ("小白兔", "谢幕")])
        self.assertEqual(rabbit["blocks"]["rabbit_wait"]["opcode"], "control_wait")
        self.assertEqual(rabbit["blocks"]["rabbit_wait"]["parent"], "rabbit_recv", "the wait sits inside the receiving script")
        self.assertEqual([s["name"] for s in stage["sounds"]], ["开演铃"])
        self.assertEqual({p["block"] for p in params}, {"fox_say", "rabbit_recv", "rabbit_wait", "rabbit_say"},
                         "the broadcast, the fox's receive and both entrance positions stay fixed")

    def test_u2_l06_three_scenes_and_a_stop_that_ends_every_loop(self):
        _, project, _, params = LESSONS["G2-U2-L06"]()
        stage, cat, drum = project["targets"]
        self.assertEqual(stage["broadcasts"], {"kc-msg-open": "开头", "kc-msg-middle": "中段", "kc-msg-end": "结尾"})
        chain, current = [], stage["blocks"]["stage_flag"]["next"]
        while current:
            b = stage["blocks"][current]
            chain.append(b["opcode"] if b["opcode"] != "event_broadcast" else "broadcast:" + b["inputs"]["BROADCAST_INPUT"][1][1])
            current = b["next"]
        # One green-flag script chains the three scenes: 开头 → wait T1 → 中段 → wait T2 → 结尾.
        self.assertEqual(chain, ["looks_switchbackdropto", "broadcast:开头", "control_wait", "broadcast:中段", "control_wait", "broadcast:结尾"])
        self.assertEqual([c["name"] for c in stage["costumes"]], ["开场", "音乐舞台", "谢幕"])
        self.assertEqual([c["name"] for c in cat["costumes"]], ["站好", "挥手"])
        self.assertEqual(cat["blocks"]["cat_dance"]["opcode"], "control_forever")
        self.assertEqual(drum["blocks"]["drum_loop"]["opcode"], "control_forever")
        self.assertEqual(drum["blocks"]["drum_dong"]["opcode"], "sound_play", "the beat does not wait for the sound to finish")
        # Out of step at the start (0.3 vs 0.5); the bug: 停止 [这个脚本] leaves both forever loops running.
        self.assertEqual((cat["blocks"]["cat_wait"]["inputs"]["DURATION"][1][1], drum["blocks"]["drum_wait"]["inputs"]["DURATION"][1][1]), ("0.3", "0.5"))
        self.assertEqual(cat["blocks"]["cat_stop"]["fields"]["STOP_OPTION"][0], "this script")
        self.assertEqual({p["block"] for p in params}, {"stage_wait1", "stage_wait2", "cat_hello", "cat_wait", "cat_bye", "cat_stop", "drum_wait"},
                         "broadcast names, receivers, backdrops and sounds stay fixed")
        self.assertEqual(next(p for p in params if p["block"] == "cat_stop")["options"], ["this script", "all"])

if __name__ == "__main__":
    unittest.main()
