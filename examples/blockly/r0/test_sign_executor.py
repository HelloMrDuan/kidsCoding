import json
import unittest

from sign_executor import SignError, correct_program, run_program


def safety(checks=None, fail_item=None):
    items = ["wiring_power_off", "voltage_correct", "wires_insulated",
             "hands_dry", "adult_present"]
    if checks is not None:
        items = checks
    prog = []
    for i in items:
        prog.append({"type": "check", "item": i,
                     "result": False if i == fail_item else True})
    return prog


def base(title="欢迎来到森林剧场", leds=None, button=2, buzzer=8,
         notes=None, press=True, show=True, safety_blocks=None):
    prog = [{"type": "when_start"}]
    prog += safety_blocks if safety_blocks is not None else safety()
    if title is not None:
        prog.append({"type": "title", "text": title})
    for pin, color in (leds or [(13, "red")]):
        prog.append({"type": "led", "pin": pin, "color": color})
    if button is not None:
        prog.append({"type": "button", "pin": button})
    if buzzer is not None:
        prog.append({"type": "buzzer", "pin": buzzer})
    for n in (notes if notes is not None else ["C", "E", "G", "C"]):
        prog.append({"type": "note", "note": n})
    if press:
        prog.append({"type": "press"})
    if show:
        prog.append({"type": "show"})
    return prog


class TestR0U1L06(unittest.TestCase):
    def test_correct_sign(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertTrue(r["lit"])

    def test_practice_b_different_sign(self):
        r = run_program(base(title="欢迎来到我们班",
                             leds=[(12, "green")], button=3, buzzer=9,
                             notes=["E", "G", "A", "G"]))
        self.assertEqual(r["status"], "success")

    def test_safety_item_fails(self):
        with self.assertRaises(SignError):
            run_program(base(safety_blocks=safety(fail_item="hands_dry")))

    def test_missing_safety_item_fails(self):
        with self.assertRaises(SignError):
            run_program(base(safety_blocks=safety(
                checks=["wiring_power_off", "voltage_correct",
                        "wires_insulated", "hands_dry"])))

    def test_missing_title_fails(self):
        with self.assertRaises(SignError):
            run_program(base(title=None))

    def test_too_few_notes_fails(self):
        with self.assertRaises(SignError):
            run_program(base(notes=["C", "E", "G"]))

    def test_show_without_press_fails(self):
        with self.assertRaises(SignError):
            run_program(base(press=False))

    def test_press_before_setup_fails(self):
        with self.assertRaises(SignError):
            run_program([{"type": "when_start"}] + safety() +
                        [{"type": "title", "text": "欢迎来到森林剧场"},
                         {"type": "press"}])

    def test_extension_two_leds_pass(self):
        r = run_program(base(leds=[(13, "red"), (12, "green")]))
        self.assertEqual(len(r["leds"]), 2)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(SignError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
