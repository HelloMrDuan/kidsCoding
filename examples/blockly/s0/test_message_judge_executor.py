import json
import unittest

from message_judge_executor import JudgeError, correct_program, run_program


def msg(mid, source, author, evidence, copied, verdict):
    return {"type": "message", "id": mid, "source_known": source,
            "author_named": author, "evidence_given": evidence,
            "copied_without_permission": copied, "verdict": verdict}


def base(messages):
    return [{"type": "when_start"}] + messages


class TestS0U3L01(unittest.TestCase):
    def test_correct_judgements(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(len(r["judgements"]), 4)

    def test_practice_b_different_messages(self):
        r = run_program(base([
            msg("m1", True, True, False, False, "do_not"),
            msg("m2", True, True, True, True, "do_not"),
            msg("m3", False, True, True, False, "do_not"),
            msg("m4", True, True, True, False, "trust"),
        ]))
        self.assertEqual(r["status"], "success")

    def test_wrong_verdict_fails(self):
        with self.assertRaises(JudgeError):
            run_program(base([
                msg("m1", True, True, True, False, "trust"),
                msg("m2", False, True, True, False, "trust"),
                msg("m3", True, False, True, True, "do_not"),
                msg("m4", True, True, True, False, "trust"),
            ]))

    def test_copied_judged_trust_fails(self):
        with self.assertRaises(JudgeError):
            run_program(base([
                msg("m1", True, True, True, False, "trust"),
                msg("m2", True, True, True, True, "trust"),
                msg("m3", False, True, True, False, "do_not"),
                msg("m4", True, True, True, False, "trust"),
            ]))

    def test_only_trust_fails(self):
        with self.assertRaises(JudgeError):
            run_program(base([
                msg("m1", True, True, True, False, "trust"),
                msg("m2", True, True, True, False, "trust"),
                msg("m3", True, True, True, False, "trust"),
                msg("m4", True, True, True, False, "trust"),
            ]))

    def test_duplicate_id_fails(self):
        with self.assertRaises(JudgeError):
            run_program(base([
                msg("m1", True, True, True, False, "trust"),
                msg("m1", True, True, True, False, "trust"),
                msg("m2", False, True, True, False, "do_not"),
                msg("m4", True, True, True, False, "trust"),
            ]))

    def test_too_few_messages_fails(self):
        with self.assertRaises(JudgeError):
            run_program(base([
                msg("m1", True, True, True, False, "trust"),
                msg("m2", False, True, True, False, "do_not"),
            ]))

    def test_extension_fifth_trust_passes(self):
        r = run_program(correct_program() + [
            msg("m5", True, True, True, False, "trust")])
        self.assertEqual(len(r["judgements"]), 5)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(JudgeError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
