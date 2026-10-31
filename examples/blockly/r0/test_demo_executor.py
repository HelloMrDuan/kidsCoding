import json
import unittest

from demo_executor import DemoError, correct_program, run_program


def scene(kind, shot, narration, seconds):
    return {"type": "scene", "kind": kind, "shot": shot,
            "narration": narration, "seconds": seconds}


def base(scenes, consent=True, audience="class", consent_block=True,
         publish_block=True):
    prog = [{"type": "when_start"},
            {"type": "title", "title": "演示"}]
    prog += scenes
    if consent_block:
        prog.append({"type": "consent", "guardian_ok": consent})
    if publish_block:
        prog.append({"type": "publish", "audience": audience})
    return prog


def good_scenes():
    return [scene("intro", "起点", "这是作品", 20),
            scene("how", "工作", "它这样工作", 25),
            scene("result", "终点", "它成功了", 15)]


class TestR0U4L05(unittest.TestCase):
    def test_correct_demo(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["total_seconds"], 60)

    def test_practice_b_other_work(self):
        scenes = [scene("intro", "花盆", "这是浇水机", 15),
                  scene("how", "浇水", "干了就浇水", 30),
                  scene("result", "长大", "植物长大了", 20)]
        r = run_program(base(scenes))
        self.assertEqual(r["total_seconds"], 65)

    def test_total_too_long_fails(self):
        scenes = [scene("intro", "起点", "这是作品", 60),
                  scene("how", "工作", "它这样工作", 60),
                  scene("result", "终点", "它成功了", 10)]
        with self.assertRaises(DemoError):
            run_program(base(scenes))

    def test_total_too_short_fails(self):
        scenes = [scene("intro", "起点", "这是作品", 10),
                  scene("how", "工作", "它这样工作", 10),
                  scene("result", "终点", "它成功了", 5)]
        with self.assertRaises(DemoError):
            run_program(base(scenes))

    def test_missing_kind_fails(self):
        scenes = [scene("intro", "起点", "这是作品", 20),
                  scene("how", "工作", "它这样工作", 25),
                  scene("how", "工作2", "它继续工作", 15)]
        with self.assertRaises(DemoError):
            run_program(base(scenes))

    def test_first_not_intro_fails(self):
        scenes = [scene("how", "工作", "它这样工作", 25),
                  scene("intro", "起点", "这是作品", 20),
                  scene("result", "终点", "它成功了", 15)]
        with self.assertRaises(DemoError):
            run_program(base(scenes))

    def test_seconds_not_positive_fails(self):
        scenes = [scene("intro", "起点", "这是作品", 20),
                  scene("how", "工作", "它这样工作", 0),
                  scene("result", "终点", "它成功了", 15)]
        with self.assertRaises(DemoError):
            run_program(base(scenes))

    def test_empty_narration_fails(self):
        scenes = [scene("intro", "起点", "这是作品", 20),
                  scene("how", "工作", "", 25),
                  scene("result", "终点", "它成功了", 15)]
        with self.assertRaises(DemoError):
            run_program(base(scenes))

    def test_consent_false_fails(self):
        with self.assertRaises(DemoError):
            run_program(base(good_scenes(), consent=False))

    def test_publish_before_consent_fails(self):
        prog = [{"type": "when_start"}, {"type": "title", "title": "演示"}]
        prog += good_scenes()
        prog.append({"type": "publish", "audience": "class"})
        prog.append({"type": "consent", "guardian_ok": True})
        with self.assertRaises(DemoError):
            run_program(prog)

    def test_extension_four_scenes_pass(self):
        scenes = [scene("intro", "起点", "这是作品", 20),
                  scene("how", "工作", "它这样工作", 25),
                  scene("how", "转弯", "它这样转弯", 20),
                  scene("result", "终点", "它成功了", 25)]
        r = run_program(base(scenes))
        self.assertEqual(r["total_seconds"], 90)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(DemoError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
