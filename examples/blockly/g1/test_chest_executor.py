import unittest
from chest_executor import run_program, correct_program

class TestG1U3L01(unittest.TestCase):
    def test_before_click_stays_closed(self):
        r = run_program(correct_program(), [])
        self.assertEqual(r["costume"], "closed")
        self.assertFalse(r["opened"])
    def test_one_click_opens(self):
        r = run_program(correct_program(), ["chest"])
        self.assertEqual(r["costume"], "open")
        self.assertTrue(r["opened"])
    def test_background_click_does_not_open(self):
        r = run_program(correct_program(), ["stage"])
        self.assertEqual(r["costume"], "closed")
    def test_stage_bound_event_fails(self):
        prog = [{"type": "when_start"}, {"type": "on_click", "target": "stage"}]
        with self.assertRaises(Exception) as cm:
            run_program(prog, ["stage"])
        self.assertIn("绑定哪个精灵", str(cm.exception))
    def test_extension_second_click_stays_open(self):
        r = run_program(correct_program(), ["chest", "chest"])
        self.assertEqual(r["costume"], "open")
    def test_missing_click_binding_fails(self):
        with self.assertRaises(Exception):
            run_program([{"type": "when_start"}], ["chest"])

if __name__ == "__main__":
    unittest.main(verbosity=2)
