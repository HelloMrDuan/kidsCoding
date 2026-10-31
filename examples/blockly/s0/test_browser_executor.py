import json
import unittest

from browser_executor import BrowserError, correct_program, run_program


def item(name, kind):
    return {"type": "item", "name": name, "kind": kind}


def base(items):
    return [{"type": "when_start"}] + items


class TestS0U1L04(unittest.TestCase):
    def test_correct_comparison(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["browsers"], ["Chrome", "Edge"])

    def test_practice_b_different_items(self):
        r = run_program(base([
            item("Firefox", "browser"), item("Safari", "browser"),
            item("新闻网站", "website"), item("学校网站", "website"),
        ]))
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["websites"], ["学校网站", "新闻网站"])

    def test_wrong_kind_fails(self):
        with self.assertRaises(BrowserError):
            run_program(base([
                item("Chrome", "website"), item("Edge", "browser"),
                item("学校网站", "website"), item("视频网站", "website"),
            ]))

    def test_unknown_item_fails(self):
        with self.assertRaises(BrowserError):
            run_program(base([
                item("Chrome", "browser"), item("Edge", "browser"),
                item("学校网站", "website"), item("聊天软件", "website"),
            ]))

    def test_only_browsers_fails(self):
        with self.assertRaises(BrowserError):
            run_program(base([
                item("Chrome", "browser"), item("Edge", "browser"),
                item("Firefox", "browser"),
            ]))

    def test_duplicate_item_fails(self):
        with self.assertRaises(BrowserError):
            run_program(base([
                item("Chrome", "browser"), item("Chrome", "browser"),
                item("学校网站", "website"), item("视频网站", "website"),
            ]))

    def test_no_items_fails(self):
        with self.assertRaises(BrowserError):
            run_program([{"type": "when_start"}])

    def test_extension_fifth_item_passes(self):
        r = run_program(correct_program() + [item("图书馆网站", "website")])
        self.assertEqual(len(r["websites"]), 3)

    def test_save_reopen_reruns_identically(self):
        prog = correct_program()
        first = run_program(prog)
        reopened = json.loads(json.dumps(prog))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(BrowserError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
