import json
import unittest

from recovery_executor import RecoveryError, correct_program, run_program


def cycle(name, content, copy_to):
    return [
        {"type": "file", "name": name, "content": content},
        {"type": "backup", "name": name, "copy_to": copy_to, "content": content},
        {"type": "delete", "name": name},
        {"type": "restore", "name": name, "content": content},
        {"type": "verify", "name": name, "content": content},
    ]


class TestS0U4L04(unittest.TestCase):
    def test_correct_recovery(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["present"]["森林画稿"], "画了小狐")

    def test_practice_b_different_file(self):
        r = run_program([{"type": "when_start"}] +
                        cycle("故事稿", "写了森林故事", "云盘"))
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["restored"], ["故事稿"])

    def test_delete_without_backup_fails(self):
        with self.assertRaises(RecoveryError):
            run_program([
                {"type": "when_start"},
                {"type": "file", "name": "森林画稿", "content": "画了小狐"},
                {"type": "delete", "name": "森林画稿"},
            ])

    def test_restore_without_delete_fails(self):
        with self.assertRaises(RecoveryError):
            run_program([
                {"type": "when_start"},
                {"type": "file", "name": "森林画稿", "content": "画了小狐"},
                {"type": "backup", "name": "森林画稿", "copy_to": "U盘",
                 "content": "画了小狐"},
                {"type": "restore", "name": "森林画稿", "content": "画了小狐"},
            ])

    def test_restore_content_mismatch_fails(self):
        prog = correct_program()
        prog[4] = {"type": "restore", "name": "森林画稿", "content": "画了小兔"}
        with self.assertRaises(RecoveryError):
            run_program(prog)

    def test_verify_content_mismatch_fails(self):
        prog = correct_program()
        prog[5] = {"type": "verify", "name": "森林画稿", "content": "画了小兔"}
        with self.assertRaises(RecoveryError):
            run_program(prog)

    def test_deleted_not_restored_fails(self):
        with self.assertRaises(RecoveryError):
            run_program([
                {"type": "when_start"},
                {"type": "file", "name": "森林画稿", "content": "画了小狐"},
                {"type": "backup", "name": "森林画稿", "copy_to": "U盘",
                 "content": "画了小狐"},
                {"type": "delete", "name": "森林画稿"},
            ])

    def test_extension_two_files_pass(self):
        r = run_program([{"type": "when_start"}] +
                        cycle("森林画稿", "画了小狐", "U盘") +
                        cycle("故事稿", "写了森林故事", "云盘"))
        self.assertEqual(len(r["restored"]), 2)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(RecoveryError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
