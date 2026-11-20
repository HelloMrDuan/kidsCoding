"""Structure tests for G3-U1-L01 star-flags .sb3. Not a VM run test."""

import json
import unittest
import zipfile
from pathlib import Path

from build_g3_u1_l01 import build_project, build_sb3

HERE = Path(__file__).resolve().parent


class TestG3U1L01(unittest.TestCase):
    def setUp(self):
        self.project = build_project()
        self.sprite = self.project["targets"][1]
        self.blocks = self.sprite["blocks"]

    def test_pen_extension_and_targets(self):
        self.assertEqual(self.project["extensions"], ["pen"])
        self.assertTrue(self.project["targets"][0]["isStage"])
        self.assertEqual(self.sprite["name"], "画笔")

    def test_procedure_definition_and_call(self):
        proto = self.blocks["proto_star"]
        self.assertEqual(proto["opcode"], "procedures_prototype")
        self.assertEqual(proto["mutation"]["proccode"], "画星形 %s")
        self.assertEqual(proto["mutation"]["argumentids"], '["size"]')
        call = self.blocks["call_star"]
        self.assertEqual(call["opcode"], "procedures_call")
        self.assertEqual(call["mutation"]["proccode"], "画星形 %s")

    def test_star_loop_is_five_sides_144_degrees(self):
        repeat = self.blocks["repeat_star"]
        self.assertEqual(repeat["opcode"], "control_repeat")
        self.assertEqual(repeat["inputs"]["TIMES"], [1, [4, "5"]])
        turn = self.blocks["turn_star"]
        self.assertEqual(turn["inputs"]["DEGREES"], [1, [4, "144"]])
        arg = self.blocks["arg_size"]
        self.assertEqual(arg["opcode"], "argument_reporter_string_number")
        self.assertEqual(arg["fields"]["VALUE"], ["size"])

    def test_main_loop_is_six_flags_size_grows_by_20(self):
        repeat = self.blocks["repeat_flags"]
        self.assertEqual(repeat["inputs"]["TIMES"], [1, [4, "6"]])
        set_size = self.blocks["set_size"]
        self.assertEqual(set_size["inputs"]["VALUE"], [1, [4, "20"]])
        change = self.blocks["change_size"]
        self.assertEqual(change["inputs"]["VALUE"], [1, [4, "20"]])

    def test_pen_blocks_present(self):
        opcodes = {b["opcode"] for b in self.blocks.values()}
        self.assertIn("pen_clear", opcodes)
        self.assertIn("pen_penDown", opcodes)
        self.assertIn("pen_penUp", opcodes)

    def test_no_dead_pen_opcodes(self):
        # Regression: "pen_down"/"pen_up" are not Scratch VM opcodes and are
        # silently skipped by the sequencer, so pen never goes down and no
        # line is drawn even though the sprite still moves. The real VM
        # opcodes are pen_penDown/pen_penUp.
        opcodes = {b["opcode"] for b in self.blocks.values()}
        self.assertNotIn("pen_down", opcodes)
        self.assertNotIn("pen_up", opcodes)

    def test_sb3_roundtrip(self):
        out = build_sb3(HERE / "g3-u1-l01-star-flags.sb3")
        with zipfile.ZipFile(out) as zf:
            names = zf.namelist()
            self.assertIn("project.json", names)
            data = json.loads(zf.read("project.json").decode())
            self.assertEqual(data["extensions"], ["pen"])
            # costume assets must be present in the archive
            for target in data["targets"]:
                for costume in target["costumes"]:
                    self.assertIn(costume["md5ext"], names)


if __name__ == "__main__":
    unittest.main()
