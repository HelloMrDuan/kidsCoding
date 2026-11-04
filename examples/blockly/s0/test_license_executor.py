import json
import unittest

from license_executor import LicenseError, correct_program, run_program


def work(wid, lic, action):
    return {"type": "work", "id": wid, "license": lic, "action": action}


def base(works):
    return [{"type": "when_start"}] + works


class TestS0U3L03(unittest.TestCase):
    def test_correct_actions(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(len(r["actions"]), 4)

    def test_practice_b_different_works(self):
        r = run_program(base([
            work("歌曲E", "free_use", "use"),
            work("图片F", "with_credit", "use_with_credit"),
            work("故事G", "ask_permission", "ask_first"),
            work("歌曲H", "not_allowed", "skip"),
        ]))
        self.assertEqual(r["status"], "success")

    def test_ask_permission_used_directly_fails(self):
        with self.assertRaises(LicenseError):
            run_program(base([
                work("故事A", "free_use", "use"),
                work("歌曲B", "with_credit", "use_with_credit"),
                work("图片C", "ask_permission", "use"),
                work("故事D", "not_allowed", "skip"),
            ]))

    def test_not_allowed_used_fails(self):
        with self.assertRaises(LicenseError):
            run_program(base([
                work("故事A", "free_use", "use"),
                work("歌曲B", "with_credit", "use_with_credit"),
                work("图片C", "ask_permission", "ask_first"),
                work("故事D", "not_allowed", "use"),
            ]))

    def test_with_credit_without_credit_fails(self):
        with self.assertRaises(LicenseError):
            run_program(base([
                work("故事A", "free_use", "use"),
                work("歌曲B", "with_credit", "use"),
                work("图片C", "ask_permission", "ask_first"),
                work("故事D", "not_allowed", "skip"),
            ]))

    def test_duplicate_work_fails(self):
        with self.assertRaises(LicenseError):
            run_program(base([
                work("故事A", "free_use", "use"),
                work("故事A", "free_use", "use"),
                work("图片C", "ask_permission", "ask_first"),
                work("故事D", "not_allowed", "skip"),
            ]))

    def test_only_three_works_fails(self):
        with self.assertRaises(LicenseError):
            run_program(base([
                work("故事A", "free_use", "use"),
                work("图片C", "ask_permission", "ask_first"),
                work("故事D", "not_allowed", "skip"),
            ]))

    def test_extension_fifth_work_passes(self):
        r = run_program(correct_program() + [
            work("图片I", "free_use", "use")])
        self.assertEqual(len(r["actions"]), 5)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(LicenseError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
