import json
import unittest

from update_executor import UpdateError, correct_program, run_program


def update(to_version, source="official", fixes="修补漏洞"):
    return {"type": "update", "to_version": to_version,
            "source": source, "fixes": fixes}


def base(name, version, updates, verify_version, works=True):
    prog = [{"type": "when_start"},
            {"type": "app", "name": name, "version": version}] + updates
    if verify_version is not None:
        prog.append({"type": "verify", "version": verify_version, "works": works})
    return prog


class TestS0U4L02(unittest.TestCase):
    def test_correct_update(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["version"], "1.1")

    def test_practice_b_different_app(self):
        r = run_program(base("音乐应用", "2.0",
                             [update("2.1", fixes="修补播放卡顿漏洞")],
                             "2.1"))
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["app"], "音乐应用")

    def test_unknown_source_fails(self):
        with self.assertRaises(UpdateError):
            run_program(base("画图应用", "1.0",
                             [update("1.1", source="unknown")], "1.1"))

    def test_older_version_fails(self):
        with self.assertRaises(UpdateError):
            run_program(base("画图应用", "1.0",
                             [update("1.0")], "1.0"))

    def test_missing_fix_fails(self):
        with self.assertRaises(UpdateError):
            run_program(base("画图应用", "1.0",
                             [update("1.1", fixes="")], "1.1"))

    def test_verify_version_mismatch_fails(self):
        with self.assertRaises(UpdateError):
            run_program(base("画图应用", "1.0",
                             [update("1.1", fixes="修补画笔闪退漏洞")],
                             "1.0"))

    def test_verify_not_working_fails(self):
        with self.assertRaises(UpdateError):
            run_program(base("画图应用", "1.0",
                             [update("1.1", fixes="修补画笔闪退漏洞")],
                             "1.1", works=False))

    def test_extension_two_updates_pass(self):
        r = run_program(base("画图应用", "1.0",
                             [update("1.1", fixes="修补画笔闪退漏洞"),
                              update("1.2", fixes="修补保存失败漏洞")],
                             "1.2"))
        self.assertEqual(r["version"], "1.2")
        self.assertEqual(len(r["updates"]), 2)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(UpdateError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
