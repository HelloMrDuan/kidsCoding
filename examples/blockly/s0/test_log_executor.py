import json
import unittest

from log_executor import LogError, correct_program, run_program


def log(level, message):
    return {"type": "log", "level": level, "message": message}


def base(logs, diagnoses, actions):
    prog = [{"type": "when_start"}] + logs
    prog += [{"type": "diagnosis", "error_message": d} for d in diagnoses]
    prog += [{"type": "action", "action": a} for a in actions]
    return prog


class TestS0U4L05(unittest.TestCase):
    def test_correct_log_reading(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["errors"], ["画稿打不开"])

    def test_practice_b_different_log(self):
        r = run_program(base(
            [log("info", "打开音乐"), log("warning", "音乐声音小"),
             log("error", "音乐播不出来")],
            ["音乐播不出来"], ["reopen"]))
        self.assertEqual(r["status"], "success")

    def test_invented_diagnosis_fails(self):
        with self.assertRaises(LogError):
            run_program(base(
                [log("info", "打开画稿"), log("info", "保存画稿"),
                 log("error", "画稿打不开")],
                ["画稿不见了"], ["restore_from_backup"]))

    def test_warning_as_diagnosis_fails(self):
        with self.assertRaises(LogError):
            run_program(base(
                [log("info", "打开音乐"), log("warning", "音乐声音小"),
                 log("error", "音乐播不出来")],
                ["音乐声音小"], ["reopen"]))

    def test_no_error_log_fails(self):
        with self.assertRaises(LogError):
            run_program(base(
                [log("info", "打开画稿"), log("info", "保存画稿"),
                 log("warning", "画稿颜色淡")],
                ["画稿颜色淡"], ["ask_teacher"]))

    def test_too_few_logs_fails(self):
        with self.assertRaises(LogError):
            run_program(base(
                [log("info", "打开画稿"), log("error", "画稿打不开")],
                ["画稿打不开"], ["restore_from_backup"]))

    def test_unknown_action_fails(self):
        with self.assertRaises(LogError):
            run_program(base(
                [log("info", "打开画稿"), log("info", "保存画稿"),
                 log("error", "画稿打不开")],
                ["画稿打不开"], ["delete_everything"]))

    def test_extension_two_anomalies_pass(self):
        r = run_program(base(
            [log("info", "打开画稿"), log("error", "画稿打不开"),
             log("error", "画稿保存失败")],
            ["画稿打不开", "画稿保存失败"],
            ["restore_from_backup", "ask_teacher"]))
        self.assertEqual(len(r["diagnoses"]), 2)
        self.assertEqual(len(r["actions"]), 2)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(LogError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
