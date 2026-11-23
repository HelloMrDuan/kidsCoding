import json
import unittest

from defense_executor import DefenseError, correct_program, run_program


def claim(point, evidence):
    return {"type": "claim", "point": point, "evidence": evidence}


def question(kind, text):
    return {"type": "question", "kind": kind, "question": text}


def answer(text):
    return {"type": "answer", "answer": text}


def reflect(text):
    return {"type": "reflect", "improve": text}


def base(claims, questions, answers, reflect_block=True):
    prog = [{"type": "when_start"}, {"type": "work", "title": "作品"}]
    prog += claims + questions + answers
    if reflect_block:
        prog.append(reflect("下次改进"))
    return prog


def good_claims():
    return [claim("能沿线走", "传感器差速"),
            claim("丢线会停下", "两边都不在线就停下")]


def good_questions():
    return [question("how", "怎么转向"),
            question("fail", "丢线怎么办")]


class TestR0U4L06(unittest.TestCase):
    def test_correct_defense(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["reflect"], "下次加更多传感器")

    def test_practice_b_other_work(self):
        prog = [{"type": "when_start"},
                {"type": "work", "title": "智慧浇水机"},
                claim("干了浇水", "湿度低于 40 就浇"),
                claim("湿了不浇", "湿度 40 及以上就不浇"),
                question("why", "为什么是 40"),
                question("fail", "传感器坏了怎么办"),
                answer("40 是干和湿的分界"),
                answer("先停下再请老师检查"),
                reflect("下次多测几组读数")]
        r = run_program(prog)
        self.assertEqual(r["status"], "success")

    def test_too_few_claims_fails(self):
        with self.assertRaises(DefenseError):
            run_program(base([claim("能沿线走", "传感器差速")],
                             good_questions(),
                             [answer("a"), answer("b")]))

    def test_too_few_questions_fails(self):
        with self.assertRaises(DefenseError):
            run_program(base(good_claims(),
                             [question("fail", "丢线怎么办")],
                             [answer("停下再找线")]))

    def test_no_fail_question_fails(self):
        with self.assertRaises(DefenseError):
            run_program(base(good_claims(),
                             [question("how", "怎么转向"),
                              question("why", "为什么这样")],
                             [answer("a"), answer("b")]))

    def test_answers_mismatch_fails(self):
        with self.assertRaises(DefenseError):
            run_program(base(good_claims(), good_questions(),
                             [answer("只答了一个")]))

    def test_empty_claim_fails(self):
        with self.assertRaises(DefenseError):
            run_program(base([claim("能沿线走", ""),
                             claim("丢线会停下", "两边都不在线就停下")],
                             good_questions(),
                             [answer("a"), answer("b")]))

    def test_empty_answer_fails(self):
        with self.assertRaises(DefenseError):
            run_program(base(good_claims(), good_questions(),
                             [answer("a"), answer("")]))

    def test_reflect_before_answers_fails(self):
        prog = [{"type": "when_start"}, {"type": "work", "title": "作品"}]
        prog += good_claims() + good_questions()
        prog.append(reflect("下次改进"))
        prog += [answer("a"), answer("b")]
        with self.assertRaises(DefenseError):
            run_program(prog)

    def test_missing_reflect_fails(self):
        with self.assertRaises(DefenseError):
            run_program(base(good_claims(), good_questions(),
                             [answer("a"), answer("b")],
                             reflect_block=False))

    def test_extension_three_rounds_pass(self):
        prog = [{"type": "when_start"}, {"type": "work", "title": "作品"},
                claim("a", "证据a"), claim("b", "证据b"),
                claim("c", "证据c"),
                question("how", "怎么"), question("why", "为什么"),
                question("fail", "失败怎么办"),
                answer("答1"), answer("答2"), answer("答3"),
                reflect("下次改进")]
        r = run_program(prog)
        self.assertEqual(len(r["answers"]), 3)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(DefenseError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
