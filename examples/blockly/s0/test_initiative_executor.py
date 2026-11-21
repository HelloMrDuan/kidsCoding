import json
import unittest

from initiative_executor import InitiativeError, correct_program, run_program


def pledge(topic, text):
    return {"type": "pledge", "topic": topic, "text": text}


def signer(name):
    return {"type": "signer", "name": name}


def base(title, pledges, signers, action="每周一起检查"):
    prog = [{"type": "when_start"}, {"type": "title", "text": title}] + pledges
    prog += [signer(s) for s in signers]
    if action is not None:
        prog.append({"type": "action", "text": action})
    return prog


class TestS0U3L06(unittest.TestCase):
    def test_correct_initiative(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(len(r["pledges"]), 3)

    def test_practice_b_different_initiative(self):
        r = run_program(base("我们班的文明约定", [
            pledge("safe", "只分享公开作品"),
            pledge("help", "遇到可疑消息请大人看"),
            pledge("kind", "留言先想想对方感受"),
        ], ["小龟", "小鸟"], action="每天提醒一次"))
        self.assertEqual(r["status"], "success")

    def test_only_two_pledges_fails(self):
        with self.assertRaises(InitiativeError):
            run_program(base("网络文明倡议", [
                pledge("kind", "说话友善不攻击人"),
                pledge("credit", "用别人的作品先问"),
            ], ["小狐", "小兔"]))

    def test_duplicate_topic_fails(self):
        with self.assertRaises(InitiativeError):
            run_program(base("网络文明倡议", [
                pledge("kind", "说话友善不攻击人"),
                pledge("kind", "留言先想想对方感受"),
                pledge("credit", "用别人的作品先问"),
            ], ["小狐", "小兔"]))

    def test_only_one_signer_fails(self):
        with self.assertRaises(InitiativeError):
            run_program(base("网络文明倡议", [
                pledge("kind", "说话友善不攻击人"),
                pledge("credit", "用别人的作品先问"),
                pledge("privacy", "不分享隐私"),
            ], ["小狐"]))

    def test_missing_action_fails(self):
        with self.assertRaises(InitiativeError):
            run_program(base("网络文明倡议", [
                pledge("kind", "说话友善不攻击人"),
                pledge("credit", "用别人的作品先问"),
                pledge("privacy", "不分享隐私"),
            ], ["小狐", "小兔"], action=None))

    def test_missing_title_fails(self):
        with self.assertRaises(InitiativeError):
            run_program([{"type": "when_start"}] + correct_program()[2:])

    def test_extension_fourth_pledge_passes(self):
        r = run_program(correct_program()[:-3] + [
            pledge("safe", "只分享公开作品"),
            signer("小狐"), signer("小兔"),
            {"type": "action", "text": "每周一起检查"},
        ])
        self.assertEqual(len(r["pledges"]), 4)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(InitiativeError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
