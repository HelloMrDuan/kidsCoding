import json
import unittest

from password_executor import PasswordError, correct_program, run_program


def prog(account, password, confirm=None):
    if confirm is None:
        confirm = password
    return [
        {"type": "when_start"},
        {"type": "account", "name": account},
        {"type": "password", "value": password},
        {"type": "confirm", "value": confirm},
    ]


class TestS0U2L01(unittest.TestCase):
    def test_correct_password(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["account"], "小狐")

    def test_practice_b_different_account(self):
        r = run_program(prog("小兔", "Moon9876"))
        self.assertEqual(r["status"], "success")

    def test_too_short_fails(self):
        with self.assertRaises(PasswordError):
            run_program(prog("小狐", "Sun123"))

    def test_letters_only_fails(self):
        with self.assertRaises(PasswordError):
            run_program(prog("小狐", "Sunshine"))

    def test_digits_only_fails(self):
        with self.assertRaises(PasswordError):
            run_program(prog("小狐", "98765432"))

    def test_common_weak_fails(self):
        with self.assertRaises(PasswordError):
            run_program(prog("小狐", "password"))

    def test_same_as_account_fails(self):
        with self.assertRaises(PasswordError):
            run_program(prog("小狐12345", "小狐12345"))

    def test_confirm_mismatch_fails(self):
        with self.assertRaises(PasswordError):
            run_program(prog("小狐", "Sun12345", confirm="Sun12346"))

    def test_extension_strong_password_passes(self):
        r = run_program(prog("小狐", "Star!2024abc"))
        self.assertEqual(r["status"], "success")

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(PasswordError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
