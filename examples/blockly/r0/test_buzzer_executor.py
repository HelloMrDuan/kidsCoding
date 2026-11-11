import json
import unittest

from buzzer_executor import BuzzerError, correct_program, run_program


def note(name, beats=1):
    return {"type": "note", "note": name, "beats": beats}


def base(voltage=5, pin=8, notes=None, play=True):
    prog = [{"type": "when_start"}, {"type": "power", "voltage": voltage}]
    if pin is not None:
        prog.append({"type": "buzzer", "pin": pin})
    prog += notes or []
    if play:
        prog.append({"type": "play"})
    return prog


class TestR0U1L04(unittest.TestCase):
    def test_correct_melody(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual([n["note"] for n in r["played"]],
                         ["C", "E", "G", "C"])
        self.assertEqual(r["total_beats"], 4)

    def test_practice_b_different_melody(self):
        r = run_program(base(notes=[note("E"), note("G"), note("A", 2),
                                    note("G")]))
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["total_beats"], 5)

    def test_wrong_note_fails(self):
        with self.assertRaises(BuzzerError):
            run_program(base(notes=[note("C"), note("E"), note("H"),
                                    note("G")]))

    def test_zero_beats_fails(self):
        with self.assertRaises(BuzzerError):
            run_program(base(notes=[note("C"), note("E", 0), note("G"),
                                    note("C")]))

    def test_too_few_notes_fails(self):
        with self.assertRaises(BuzzerError):
            run_program(base(notes=[note("C"), note("E"), note("G")]))

    def test_missing_play_fails(self):
        with self.assertRaises(BuzzerError):
            run_program(base(notes=[note("C"), note("E"), note("G"),
                                    note("C")], play=False))

    def test_note_after_play_fails(self):
        with self.assertRaises(BuzzerError):
            run_program(base(notes=[note("C"), note("E"), note("G"),
                                    note("C")]) + [note("E")])

    def test_wrong_pin_fails(self):
        with self.assertRaises(BuzzerError):
            run_program(base(pin=5, notes=[note("C"), note("E"),
                                           note("G"), note("C")]))

    def test_extension_six_notes_pass(self):
        r = run_program(base(notes=[note("C"), note("D"), note("E"),
                                    note("F"), note("G"), note("A")]))
        self.assertEqual(len(r["played"]), 6)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(BuzzerError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
