import json
import unittest

from poster_executor import PosterError, correct_program, run_program


def rule(topic, text):
    return {"type": "rule", "topic": topic, "text": text}


def base(title, rules, help_text="遇到问题请告诉老师或监护人"):
    prog = [{"type": "when_start"}, {"type": "title", "text": title}] + rules
    if help_text is not None:
        prog.append({"type": "help", "text": help_text})
    return prog


class TestS0U2L06(unittest.TestCase):
    def test_correct_poster(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(len(r["rules"]), 3)

    def test_practice_b_different_poster(self):
        r = run_program(base("我们家的安全海报", [
            rule("two_factor", "验证码不告诉别人"),
            rule("privacy", "隐私信息不分享"),
            rule("password", "口令要够长够杂"),
        ]))
        self.assertEqual(r["status"], "success")

    def test_only_two_rules_fails(self):
        with self.assertRaises(PosterError):
            run_program(base("家庭网络安全海报", [
                rule("password", "不分享口令"),
                rule("phishing", "可疑消息请大人看"),
            ]))

    def test_duplicate_topic_fails(self):
        with self.assertRaises(PosterError):
            run_program(base("家庭网络安全海报", [
                rule("password", "不分享口令"),
                rule("password", "口令要够长"),
                rule("phishing", "可疑消息请大人看"),
            ]))

    def test_missing_title_fails(self):
        with self.assertRaises(PosterError):
            run_program([{"type": "when_start"}] + correct_program()[2:])

    def test_missing_help_fails(self):
        with self.assertRaises(PosterError):
            run_program(base("家庭网络安全海报", [
                rule("password", "不分享口令"),
                rule("phishing", "可疑消息请大人看"),
                rule("permission", "不乱给权限"),
            ], help_text=None))

    def test_empty_rule_fails(self):
        with self.assertRaises(PosterError):
            run_program(base("家庭网络安全海报", [
                rule("password", ""),
                rule("phishing", "可疑消息请大人看"),
                rule("permission", "不乱给权限"),
            ]))

    def test_extension_fourth_rule_passes(self):
        r = run_program(correct_program()[:-1] + [
            rule("privacy", "隐私信息不分享"),
            {"type": "help", "text": "遇到问题请告诉老师或监护人"},
        ])
        self.assertEqual(len(r["rules"]), 4)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(PosterError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
