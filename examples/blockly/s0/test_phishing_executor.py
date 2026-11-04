import json
import unittest

from phishing_executor import PhishingError, correct_program, run_program


def msg(mid, known, asks, urgent, mismatch, verdict):
    return {"type": "message", "id": mid, "sender_known": known,
            "asks_password": asks, "urgent": urgent,
            "link_mismatch": mismatch, "verdict": verdict}


def base(messages):
    return [{"type": "when_start"}] + messages


class TestS0U2L04(unittest.TestCase):
    def test_correct_judgements(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(len(r["judgements"]), 4)

    def test_practice_b_different_messages(self):
        r = run_program(base([
            msg("m1", True, False, False, False, "safe"),
            msg("m2", False, True, False, False, "phishing"),
            msg("m3", False, False, True, False, "phishing"),
            msg("m4", True, False, False, True, "phishing"),
        ]))
        self.assertEqual(r["status"], "success")

    def test_wrong_verdict_fails(self):
        with self.assertRaises(PhishingError):
            run_program(base([
                msg("m1", True, False, False, False, "safe"),
                msg("m2", False, True, False, False, "safe"),
                msg("m3", False, False, True, True, "phishing"),
                msg("m4", True, False, False, False, "safe"),
            ]))

    def test_unknown_sender_judged_safe_fails(self):
        with self.assertRaises(PhishingError):
            run_program(base([
                msg("m1", True, False, False, False, "safe"),
                msg("m2", False, False, False, False, "safe"),
                msg("m3", False, False, True, True, "phishing"),
                msg("m4", True, False, False, False, "safe"),
            ]))

    def test_only_safe_fails(self):
        with self.assertRaises(PhishingError):
            run_program(base([
                msg("m1", True, False, False, False, "safe"),
                msg("m2", True, False, False, False, "safe"),
                msg("m3", True, False, False, False, "safe"),
                msg("m4", True, False, False, False, "safe"),
            ]))

    def test_duplicate_id_fails(self):
        with self.assertRaises(PhishingError):
            run_program(base([
                msg("m1", True, False, False, False, "safe"),
                msg("m1", True, False, False, False, "safe"),
                msg("m2", False, True, False, False, "phishing"),
                msg("m4", True, False, False, False, "safe"),
            ]))

    def test_too_few_messages_fails(self):
        with self.assertRaises(PhishingError):
            run_program(base([
                msg("m1", True, False, False, False, "safe"),
                msg("m2", False, True, False, False, "phishing"),
            ]))

    def test_extension_unknown_alone_is_phishing(self):
        r = run_program(correct_program() + [
            msg("m5", False, False, False, False, "phishing")])
        self.assertEqual(len(r["judgements"]), 5)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(PhishingError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
