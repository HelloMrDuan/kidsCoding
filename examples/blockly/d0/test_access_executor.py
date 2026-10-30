import unittest, json
from access_executor import run_program, correct_program

class TestD0U4L04(unittest.TestCase):
    def test_correct_check(self):
        r = run_program(correct_program())
        self.assertEqual(len(r["items"]), 4)
    def test_practice_b_small_text_fixed(self):
        # txt2 is presented with size 16 and a fix record for txt2:
        # the item itself passes, and the fix record shows the work.
        prog = [{"type": "when_start"},
                {"type": "item", "name": "pic1", "kind": "image"},
                {"type": "alt", "text": "一只狐狸"},
                {"type": "item", "name": "txt1", "kind": "text"},
                {"type": "size", "value": 14},
                {"type": "item", "name": "vid1", "kind": "video"},
                {"type": "caption", "text": "森林剧场"},
                {"type": "item", "name": "txt2", "kind": "text"},
                {"type": "size", "value": 16},
                {"type": "fix", "item": "txt2"}]
        r = run_program(prog)
        self.assertIn("txt2", r["fixes"])
    def test_image_no_alt_unfixed_fails(self):
        prog = [{"type": "when_start"},
                {"type": "item", "name": "pic1", "kind": "image"},
                {"type": "item", "name": "vid1", "kind": "video"},
                {"type": "caption", "text": "开场"},
                {"type": "item", "name": "txt1", "kind": "text"},
                {"type": "size", "value": 16},
                {"type": "fix", "item": "vid1"}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("替代文本", str(cm.exception))
    def test_video_no_caption_fails(self):
        prog = [{"type": "when_start"},
                {"type": "item", "name": "pic1", "kind": "image"},
                {"type": "alt", "text": "狐狸"},
                {"type": "item", "name": "vid1", "kind": "video"},
                {"type": "item", "name": "txt1", "kind": "text"},
                {"type": "size", "value": 16},
                {"type": "fix", "item": "pic1"}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("字幕", str(cm.exception))
    def test_too_few_items_fails(self):
        prog = correct_program()[:5]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_no_fix_fails(self):
        prog = [{"type": "when_start"},
                {"type": "item", "name": "pic1", "kind": "image"},
                {"type": "alt", "text": "狐狸"},
                {"type": "item", "name": "vid1", "kind": "video"},
                {"type": "caption", "text": "开场"},
                {"type": "item", "name": "txt1", "kind": "text"},
                {"type": "size", "value": 16}]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("修复", str(cm.exception))
    def test_extension_fourth_passes(self):
        prog = correct_program() + [
            {"type": "item", "name": "pic3", "kind": "image"},
            {"type": "alt", "text": "一只乌龟"}]
        # fix list already contains pic2; new item passes on its own
        r = run_program(prog)
        self.assertEqual(len(r["items"]), 5)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(len(r["items"]), 4)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)
