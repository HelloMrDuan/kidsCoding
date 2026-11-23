import json
import unittest

from permission_executor import PermissionError, correct_program, run_program


def setting(app, perm, decision):
    return {"type": "setting", "app": app, "permission": perm, "decision": decision}


def base(settings):
    return [{"type": "when_start"}] + settings


class TestS0U2L05(unittest.TestCase):
    def test_correct_settings(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(len(r["settings"]), 4)

    def test_practice_b_different_apps(self):
        r = run_program(base([
            setting("录音应用", "麦克风", "allow"),
            setting("录音应用", "通讯录", "deny"),
            setting("拍照应用", "相机", "allow"),
            setting("拍照应用", "位置", "deny"),
        ]))
        self.assertEqual(r["status"], "success")

    def test_needed_denied_fails(self):
        with self.assertRaises(PermissionError):
            run_program(base([
                setting("画图应用", "相册", "deny"),
                setting("画图应用", "位置", "deny"),
                setting("地图应用", "位置", "allow"),
                setting("地图应用", "通讯录", "deny"),
            ]))

    def test_unneeded_allowed_fails(self):
        with self.assertRaises(PermissionError):
            run_program(base([
                setting("画图应用", "相册", "allow"),
                setting("画图应用", "位置", "allow"),
                setting("地图应用", "位置", "allow"),
                setting("地图应用", "通讯录", "deny"),
            ]))

    def test_unknown_app_fails(self):
        with self.assertRaises(PermissionError):
            run_program(base([
                setting("画图应用", "相册", "allow"),
                setting("画图应用", "位置", "deny"),
                setting("游戏应用", "位置", "allow"),
                setting("地图应用", "通讯录", "deny"),
            ]))

    def test_only_allows_fails(self):
        with self.assertRaises(PermissionError):
            run_program(base([
                setting("画图应用", "相册", "allow"),
                setting("地图应用", "位置", "allow"),
                setting("录音应用", "麦克风", "allow"),
                setting("拍照应用", "相机", "allow"),
            ]))

    def test_duplicate_setting_fails(self):
        with self.assertRaises(PermissionError):
            run_program(base([
                setting("画图应用", "相册", "allow"),
                setting("画图应用", "相册", "allow"),
                setting("地图应用", "位置", "allow"),
                setting("地图应用", "通讯录", "deny"),
            ]))

    def test_extension_fifth_setting_passes(self):
        r = run_program(correct_program() + [
            setting("拍照应用", "通讯录", "deny")])
        self.assertEqual(len(r["settings"]), 5)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(PermissionError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
