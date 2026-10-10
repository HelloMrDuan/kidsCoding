import hashlib
import json
import tempfile
from pathlib import Path
import unittest
import zipfile
from build_scratch_project import HERE, build_project, build_sb3


class ScratchProjectStructureTests(unittest.TestCase):
    def test_targets_and_editable_assets(self):
        project = build_project()
        self.assertEqual(len(project["targets"]),2)
        self.assertTrue(project["targets"][0]["isStage"])
        sprite = project["targets"][1]
        self.assertFalse(sprite["isStage"])
        self.assertEqual(sprite["name"],"流星")
        for target,original in zip(project["targets"],("stage-stars.svg","meteor.svg")):
            asset = target["costumes"][0]
            self.assertEqual(asset["assetId"],hashlib.md5((HERE/original).read_bytes()).hexdigest())

    def test_clone_script_has_hats_repeats_and_cleanup(self):
        blocks = build_project()["targets"][1]["blocks"]
        self.assertEqual(blocks["flag"]["opcode"],"event_whenflagclicked")
        self.assertEqual(blocks["repeat"]["opcode"],"control_repeat")
        self.assertEqual(blocks["spawn"]["opcode"],"control_create_clone_of")
        self.assertEqual(blocks["clone_flag"]["opcode"],"control_start_as_clone")
        self.assertEqual(blocks["delete"]["opcode"],"control_delete_this_clone")
        self.assertEqual(blocks["move_y"]["next"],"move_pause")
        self.assertEqual(blocks["move_pause"]["opcode"],"control_wait")
        self.assertEqual(blocks["move_pause"]["inputs"]["DURATION"],[1,[4,"0.05"]])
        for name,block in blocks.items():
            if block["next"]:
                self.assertIn(block["next"],blocks,name)

    def test_browser_project_preserves_real_clone_motion_and_cleanup(self):
        # The checked-in sample (used by the actual VM E2E) must not drift
        # from the generator: an empty motion loop runs too fast to observe.
        browser_sample = HERE.parents[2] / "apps/web/public/scratch-samples/meteor-clones.sb3"
        with zipfile.ZipFile(browser_sample) as archive:
            blocks = json.loads(archive.read("project.json"))["targets"][1]["blocks"]
        movement = blocks["move_y"]
        pause = blocks[movement["next"]]
        self.assertEqual(pause["opcode"],"control_wait")
        self.assertEqual(pause["inputs"]["DURATION"],[1,[4,"0.05"]])
        self.assertEqual(blocks["delete"]["opcode"],"control_delete_this_clone")

    def test_sb3_is_complete_zip(self):
        with tempfile.TemporaryDirectory() as temporary:
            archive = build_sb3(Path(temporary)/"sample.sb3")
            with zipfile.ZipFile(archive) as z:
                self.assertEqual(len(z.namelist()),3)
                project = json.loads(z.read("project.json"))
                for target in project["targets"]:
                    costume = target["costumes"][0]
                    self.assertIn(costume["md5ext"],z.namelist())
                    self.assertIn(b"<svg",z.read(costume["md5ext"]))


if __name__ == "__main__":
    unittest.main()
