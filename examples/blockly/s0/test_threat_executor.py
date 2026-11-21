import json
import unittest

from threat_executor import ThreatError, correct_program, run_program


def threat(actor, method, impact, guard):
    return {"type": "threat", "actor": actor, "method": method,
            "impact": impact, "guard": guard}


def base(asset, threats, review="请老师检查"):
    prog = [{"type": "when_start"}, {"type": "asset", "text": asset}] + threats
    if review is not None:
        prog.append({"type": "review", "text": review})
    return prog


class TestS0U4L01(unittest.TestCase):
    def test_correct_model(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["asset"], "班级画稿")
        self.assertEqual(len(r["threats"]), 2)

    def test_practice_b_different_asset(self):
        r = run_program(base("我的账号", [
            threat("陌生人", "猜口令", "账号被别人用", "口令不告诉别人"),
            threat("陌生人", "骗验证码", "账号被盗", "验证码不告诉别人"),
        ], review="请监护人检查"))
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["review"], "请监护人检查")

    def test_only_one_threat_fails(self):
        with self.assertRaises(ThreatError):
            run_program(base("班级画稿", [
                threat("陌生人", "乱点链接", "画稿被删", "先问老师"),
            ]))

    def test_threat_missing_guard_fails(self):
        with self.assertRaises(ThreatError):
            run_program(base("班级画稿", [
                threat("陌生人", "乱点链接", "画稿被删", "先问老师"),
                threat("同学误操作", "不小心删除", "画稿丢失", ""),
            ]))

    def test_duplicate_method_fails(self):
        with self.assertRaises(ThreatError):
            run_program(base("班级画稿", [
                threat("陌生人", "乱点链接", "画稿被删", "先问老师"),
                threat("同学误操作", "乱点链接", "画稿丢失", "备份一份"),
            ]))

    def test_missing_asset_fails(self):
        with self.assertRaises(ThreatError):
            run_program([{"type": "when_start"}] + correct_program()[2:])

    def test_missing_review_fails(self):
        with self.assertRaises(ThreatError):
            run_program(base("班级画稿", [
                threat("陌生人", "乱点链接", "画稿被删", "先问老师"),
                threat("同学误操作", "不小心删除", "画稿丢失", "备份一份"),
            ], review=None))

    def test_extension_third_threat_passes(self):
        r = run_program(correct_program()[:-1] + [
            threat("陌生人", "假装老师要口令", "账号被用", "只告诉监护人"),
            {"type": "review", "text": "请老师检查"},
        ])
        self.assertEqual(len(r["threats"]), 3)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(ThreatError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
