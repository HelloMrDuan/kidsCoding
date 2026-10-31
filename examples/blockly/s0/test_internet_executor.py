import json
import unittest

from internet_executor import InternetError, correct_program, run_program


def journey(message, steps=None, packet=None):
    if steps is None:
        steps = ["write", "split", "send", "route", "receive", "assemble"]
    prog = [{"type": "when_start"}, {"type": "content", "text": message}]
    for s in steps:
        prog.append({"type": "step", "name": s})
        if s == "split" and packet is not None:
            prog.append({"type": "packet", "count": packet})
    prog.append({"type": "content", "text": message})
    return prog


class TestS0U1L03(unittest.TestCase):
    def test_correct_journey(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["message"], "你好")

    def test_practice_b_different_message(self):
        r = run_program(journey("明天见"))
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["message"], "明天见")

    def test_missing_step_fails(self):
        with self.assertRaises(InternetError):
            run_program(journey("你好", ["write", "split", "send", "receive", "assemble"]))

    def test_out_of_order_fails(self):
        with self.assertRaises(InternetError):
            run_program(journey("你好", ["write", "split", "route", "send", "receive", "assemble"]))

    def test_duplicate_step_fails(self):
        with self.assertRaises(InternetError):
            run_program(journey("你好", ["write", "split", "send", "send", "route", "receive", "assemble"]))

    def test_changed_content_fails(self):
        prog = journey("你好")
        prog[-1] = {"type": "content", "text": "你好吗"}
        with self.assertRaises(InternetError):
            run_program(prog)

    def test_missing_final_content_fails(self):
        with self.assertRaises(InternetError):
            run_program(journey("你好")[:-1])

    def test_extension_packets_passes(self):
        r = run_program(journey("你好", packet=3))
        self.assertTrue(r["packets"])

    def test_save_reopen_reruns_identically(self):
        prog = correct_program()
        first = run_program(prog)
        reopened = json.loads(json.dumps(prog))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(InternetError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
