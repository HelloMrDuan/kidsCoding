import json
import unittest

from energy_executor import EnergyError, correct_program, run_program


def round_(lights, usage):
    return {"type": "round", "lights": lights, "usage": usage}


def base(site="教室", rounds=None, summary=None, summary_block=True):
    prog = [{"type": "when_start"}]
    if site is not None:
        prog.append({"type": "site", "name": site})
    prog += rounds or []
    if summary_block:
        prog.append({"type": "summary", "first": summary[0],
                     "last": summary[1], "saved": summary[2]})
    return prog


class TestR0U4L01(unittest.TestCase):
    def test_correct_observation(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["summary"]["saved"], 22)

    def test_practice_b_lights_unchanged(self):
        r = run_program(base(rounds=[round_(8, 40), round_(8, 36)],
                             summary=(40, 36, 4)))
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["summary"]["saved"], 4)

    def test_usage_increase_fails(self):
        with self.assertRaises(EnergyError):
            run_program(base(rounds=[round_(10, 50), round_(6, 55)],
                             summary=(50, 55, -5)))

    def test_lights_increase_fails(self):
        with self.assertRaises(EnergyError):
            run_program(base(rounds=[round_(6, 50), round_(8, 40)],
                             summary=(50, 40, 10)))

    def test_no_improvement_fails(self):
        with self.assertRaises(EnergyError):
            run_program(base(rounds=[round_(10, 50), round_(6, 50)],
                             summary=(50, 50, 0)))

    def test_summary_mismatch_fails(self):
        with self.assertRaises(EnergyError):
            run_program(base(rounds=[round_(10, 50), round_(6, 35),
                                     round_(4, 28)],
                             summary=(50, 28, 20)))

    def test_negative_lights_fails(self):
        with self.assertRaises(EnergyError):
            run_program(base(rounds=[round_(-1, 50), round_(6, 35)],
                             summary=(50, 35, 15)))

    def test_too_few_rounds_fails(self):
        with self.assertRaises(EnergyError):
            run_program(base(rounds=[round_(10, 50)],
                             summary=(50, 50, 0)))

    def test_missing_site_fails(self):
        with self.assertRaises(EnergyError):
            run_program(base(site=None,
                             rounds=[round_(10, 50), round_(6, 35)],
                             summary=(50, 35, 15)))

    def test_missing_summary_fails(self):
        with self.assertRaises(EnergyError):
            run_program(base(rounds=[round_(10, 50), round_(6, 35)],
                             summary_block=False))

    def test_extension_four_rounds_pass(self):
        r = run_program(base(rounds=[round_(12, 60), round_(9, 48),
                                     round_(7, 42), round_(5, 35)],
                             summary=(60, 35, 25)))
        self.assertEqual(len(r["rounds"]), 4)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(EnergyError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
