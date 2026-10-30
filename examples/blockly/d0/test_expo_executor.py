import unittest, json
from expo_executor import run_program, correct_program

class TestD0U2L06(unittest.TestCase):
    def test_correct_expo(self):
        r = run_program(correct_program())
        self.assertEqual(r["topics"], ["sorting", "balance", "energy"])
    def test_practice_b_different_order(self):
        prog = [{"type": "when_start"}, {"type": "title", "text": "环保互动展"},
                {"type": "exhibit", "topic": "energy"},
                {"type": "fact", "text": "solar is renewable"},
                {"type": "question", "text": "which is renewable?"},
                {"type": "answer", "text": "solar"},
                {"type": "exhibit", "topic": "sorting"},
                {"type": "fact", "text": "battery is harmful"},
                {"type": "question", "text": "battery goes where?"},
                {"type": "answer", "text": "harmful"},
                {"type": "exhibit", "topic": "balance"},
                {"type": "fact", "text": "producer > herbivore > carnivore"},
                {"type": "question", "text": "which level is most?"},
                {"type": "answer", "text": "producer"}]
        r = run_program(prog)
        self.assertEqual(len(r["topics"]), 3)
    def test_too_few_exhibits_fails(self):
        prog = correct_program()
        idx = next(i for i, b in enumerate(prog) if b.get("type") == "exhibit" and b.get("topic") == "balance")
        prog = prog[:idx]
        with self.assertRaises(Exception) as cm:
            run_program(prog)
        self.assertIn("3 个", str(cm.exception))
    def test_wrong_fact_fails(self):
        prog = correct_program()
        prog[3] = {"type": "fact", "text": "battery is recyclable"}
        with self.assertRaises(Exception):
            run_program(prog)
    def test_wrong_answer_fails(self):
        prog = correct_program()
        prog[5] = {"type": "answer", "text": "recyclable"}
        with self.assertRaises(Exception):
            run_program(prog)
    def test_extension_fourth_passes(self):
        prog = correct_program() + [
            {"type": "exhibit", "topic": "moon"},
            {"type": "fact", "text": "moon cycles monthly"},
            {"type": "question", "text": "moon changes?"},
            {"type": "answer", "text": "yes"}]
        r = run_program(prog)
        self.assertEqual(len(r["topics"]), 4)
    def test_save_reopen_reruns_identically(self):
        prog = json.loads(json.dumps(correct_program(), ensure_ascii=False))
        r = run_program(prog)
        self.assertEqual(r["topics"], ["sorting", "balance", "energy"])
    def test_missing_start_fails(self):
        with self.assertRaises(Exception):
            run_program(correct_program()[1:])

if __name__ == "__main__":
    unittest.main(verbosity=2)
