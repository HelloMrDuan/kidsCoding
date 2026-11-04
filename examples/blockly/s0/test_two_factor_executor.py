import json
import unittest

from two_factor_executor import TwoFactorError, correct_program, run_program


def login(password, code="482917", request=True, method=None):
    prog = [{"type": "when_start"},
            {"type": "password", "value": password}]
    if request:
        prog.append({"type": "request_code"})
    if method is not None:
        prog.append({"type": "method", "name": method})
    if code is not None:
        prog.append({"type": "enter_code", "value": code})
    return prog


class TestS0U2L02(unittest.TestCase):
    def test_correct_login(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["factors"], 2)

    def test_practice_b_different_password(self):
        r = run_program(login("Moon9876"))
        self.assertEqual(r["status"], "success")

    def test_missing_second_factor_fails(self):
        with self.assertRaises(TwoFactorError):
            run_program(login("Sun12345", code=None))

    def test_wrong_code_fails(self):
        with self.assertRaises(TwoFactorError):
            run_program(login("Sun12345", code="482918"))

    def test_short_code_fails(self):
        with self.assertRaises(TwoFactorError):
            run_program(login("Sun12345", code="123"))

    def test_code_before_password_fails(self):
        prog = [
            {"type": "when_start"},
            {"type": "enter_code", "value": "482917"},
            {"type": "password", "value": "Sun12345"},
            {"type": "request_code"},
        ]
        with self.assertRaises(TwoFactorError):
            run_program(prog)

    def test_missing_request_fails(self):
        with self.assertRaises(TwoFactorError):
            run_program(login("Sun12345", request=False))

    def test_extension_app_method_passes(self):
        r = run_program(login("Sun12345", method="app"))
        self.assertEqual(r["status"], "success")

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(TwoFactorError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
