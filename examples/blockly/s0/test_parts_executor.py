import unittest, json
from parts_executor import run_program, correct_program, PARTS

class TestS0U1L01(unittest.TestCase):
    def test_correct_parts(self):
        r = run_program(correct_program())
        self.assertEqual(r["parts"], PARTS)
    def test_practice_b_different_order(self):
        prog = [{"type": "when_start"}] + [{"type": "match", "part": n, "function": f} for n, f in reversed(list(PARTS.items()))]
        r = run_program(prog)
        self.assertEqual(r["parts"], PARTS)
    def test_wrong_function_fails(self):
        prog = correct_program()
        prog[1] = {"type": "match", "part": "screen", "function": "input"}
        with self.assertRaises(Exception):
            run_program(prog)
    def test_missing_part_fails(self):
        prog = correct_program()[:-1]
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_extra_part_passes(self):
        prog = correct_program() + [{"type": "match", "part": "printer", "function": "print"}]
        r = run_program(prog)
        self.assertEqual(r["extra"], {"printer": "print"})
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["parts"], PARTS)
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)
