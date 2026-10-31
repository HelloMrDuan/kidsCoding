import json
import unittest

from kind_message_executor import KindError, correct_program, run_program


def comment(cid, tone, text):
    return {"type": "comment", "id": cid, "tone": tone, "text": text}


def rewrite(cid, text):
    return {"type": "rewrite", "id": cid, "text": text}


def base(items):
    return [{"type": "when_start"}] + items


class TestS0U3L04(unittest.TestCase):
    def test_correct_messages(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(len(r["comments"]), 4)

    def test_practice_b_different_messages(self):
        r = run_program(base([
            comment("c1", "neutral", "这是一个故事"),
            comment("c2", "rude", "你写得真差"),
            rewrite("c2", "可以再改改结尾"),
            comment("c3", "kind", "我喜欢这个开头"),
            comment("c4", "neutral", "我读完了"),
        ]))
        self.assertEqual(r["status"], "success")

    def test_rude_without_rewrite_fails(self):
        with self.assertRaises(KindError):
            run_program(base([
                comment("c1", "kind", "你的画颜色真好看"),
                comment("c2", "neutral", "我看到你画了一只猫"),
                comment("c3", "rude", "你画得真难看"),
                comment("c4", "kind", "谢谢你的分享"),
            ]))

    def test_rewrite_with_unkind_word_fails(self):
        with self.assertRaises(KindError):
            run_program(base([
                comment("c1", "kind", "你的画颜色真好看"),
                comment("c2", "neutral", "我看到你画了一只猫"),
                comment("c3", "rude", "你画得真难看"),
                rewrite("c3", "你画得真难看，再改改"),
                comment("c4", "kind", "谢谢你的分享"),
            ]))

    def test_rewrite_for_kind_fails(self):
        with self.assertRaises(KindError):
            run_program(base([
                comment("c1", "kind", "你的画颜色真好看"),
                rewrite("c1", "颜色真好看"),
                comment("c2", "neutral", "我看到你画了一只猫"),
                comment("c3", "rude", "你画得真难看"),
                rewrite("c3", "可以再试试不同的颜色"),
                comment("c4", "kind", "谢谢你的分享"),
            ]))

    def test_duplicate_id_fails(self):
        with self.assertRaises(KindError):
            run_program(base([
                comment("c1", "kind", "你的画颜色真好看"),
                comment("c1", "kind", "你的画颜色真好看"),
                comment("c3", "rude", "你画得真难看"),
                rewrite("c3", "可以再试试不同的颜色"),
                comment("c4", "neutral", "我读完了"),
            ]))

    def test_only_three_comments_fails(self):
        with self.assertRaises(KindError):
            run_program(base([
                comment("c1", "kind", "你的画颜色真好看"),
                comment("c2", "neutral", "我看到你画了一只猫"),
                comment("c3", "rude", "你画得真难看"),
                rewrite("c3", "可以再试试不同的颜色"),
            ]))

    def test_extension_fifth_comment_passes(self):
        r = run_program(correct_program() + [
            comment("c5", "kind", "期待你的下一幅画")])
        self.assertEqual(len(r["comments"]), 5)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(KindError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
