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
        for name,block in blocks.items():
            if block["next"]:
                self.assertIn(block["next"],blocks,name)

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
