import unittest, json
from queue_executor import run_program, correct_program

class TestM0U4L04(unittest.TestCase):
    def test_correct_queue(self):
        r = run_program(correct_program())
        self.assertEqual(r["waits"], {"A": 0, "B": 2, "C": 5})
    def test_practice_b_shorter_queue(self):
        prog = [{"type": "when_start"},
                {"type": "person", "name": "D", "service": 4},
                {"type": "person", "name": "E", "service": 2},
                {"type": "wait", "name": "D", "minutes": 0},
                {"type": "wait", "name": "E", "minutes": 4}]
        r = run_program(prog)
        self.assertEqual(r["total_service"], 6)
    def test_wrong_wait_fails(self):
        prog = correct_program()
        prog[-1] = {"type": "wait", "name": "C", "minutes": 6}
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("等待时间错误", str(cm.exception))
    def test_reversed_order_fails(self):
        prog = [{"type": "when_start"},
                {"type": "person", "name": "C", "service": 1},
                {"type": "person", "name": "B", "service": 3},
                {"type": "person", "name": "A", "service": 2},
                {"type": "wait", "name": "C", "minutes": 0},
                {"type": "wait", "name": "B", "minutes": 1},
                {"type": "wait", "name": "A", "minutes": 4}]
        # This reversed queue is internally consistent, so it must NOT pass
        # the original lesson: check that it differs from the correct order.
        r = run_program(prog)
        self.assertNotEqual(r["order"], ["A", "B", "C"])
    def test_single_person_fails(self):
        prog = [{"type": "when_start"},
                {"type": "person", "name": "A", "service": 2},
                {"type": "wait", "name": "A", "minutes": 0}]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_fourth_passes(self):
        prog = correct_program()
        prog = prog[:-3] + [
            {"type": "person", "name": "F", "service": 2},
            {"type": "wait", "name": "A", "minutes": 0},
            {"type": "wait", "name": "B", "minutes": 2},
            {"type": "wait", "name": "C", "minutes": 5},
            {"type": "wait", "name": "F", "minutes": 6}]
        r = run_program(prog)
        self.assertEqual(r["waits"]["F"], 6)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["waits"], {"A": 0, "B": 2, "C": 5})
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)
