import json
import unittest

from privacy_executor import PrivacyError, correct_program, run_program


def item(name, action):
    return {"type": "item", "name": name, "action": action}


def base(items):
    return [{"type": "when_start"}] + items


class TestS0U2L03(unittest.TestCase):
    def test_correct_protection(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["kept"], ["姓名", "家庭住址"])

    def test_practice_b_different_items(self):
        r = run_program(base([
            item("电话号码", "keep"), item("密码", "keep"),
            item("喜欢的运动", "share"), item("喜欢的书", "share"),
        ]))
        self.assertEqual(r["status"], "success")

    def test_private_shared_fails(self):
        with self.assertRaises(PrivacyError):
            run_program(base([
                item("姓名", "share"), item("家庭住址", "keep"),
                item("喜欢的颜色", "share"), item("喜欢的动物", "share"),
            ]))

    def test_shareable_kept_fails_classification(self):
        with self.assertRaises(PrivacyError):
            run_program(base([
                item("姓名", "keep"), item("家庭住址", "keep"),
                item("喜欢的颜色", "keep"), item("喜欢的动物", "share"),
            ]))

    def test_unknown_item_fails(self):
        with self.assertRaises(PrivacyError):
            run_program(base([
                item("姓名", "keep"), item("家庭住址", "keep"),
                item("喜欢的颜色", "share"), item("身份证号", "keep"),
            ]))

    def test_only_private_fails(self):
        with self.assertRaises(PrivacyError):
            run_program(base([
                item("姓名", "keep"), item("家庭住址", "keep"),
                item("电话号码", "keep"),
            ]))

    def test_duplicate_item_fails(self):
        with self.assertRaises(PrivacyError):
            run_program(base([
                item("姓名", "keep"), item("姓名", "keep"),
                item("喜欢的颜色", "share"), item("喜欢的动物", "share"),
            ]))

    def test_extension_fifth_item_passes(self):
        r = run_program(correct_program() + [item("生日", "keep")])
        self.assertEqual(len(r["kept"]), 3)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(PrivacyError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
