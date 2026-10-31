import json
import unittest

from collab_executor import CollabError, correct_program, run_program


def member(name):
    return {"type": "member", "name": name}


def task(name, work):
    return {"type": "task", "member": name, "work": work}


def share(item, kind="public"):
    return {"type": "share", "item": item, "kind": kind}


def base(title, members, tasks, shares, review=True):
    prog = [{"type": "when_start"}, {"type": "title", "text": title}]
    prog += [member(m) for m in members]
    prog += [task(m, w) for m, w in tasks]
    prog += [share(s) for s in shares]
    if review:
        prog.append({"type": "review"})
    return prog


class TestS0U3L05(unittest.TestCase):
    def test_correct_collab(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["members"], ["小狐", "小兔"])

    def test_practice_b_different_project(self):
        r = run_program(base("班级故事", ["小龟", "小鸟"],
                             [("小龟", "讲故事"), ("小鸟", "配音")],
                             ["故事稿"]))
        self.assertEqual(r["status"], "success")

    def test_only_one_member_fails(self):
        with self.assertRaises(CollabError):
            run_program(base("森林海报", ["小狐"],
                             [("小狐", "画画")], ["画稿"]))

    def test_member_without_task_fails(self):
        with self.assertRaises(CollabError):
            run_program(base("森林海报", ["小狐", "小兔"],
                             [("小狐", "画画")], ["画稿"]))

    def test_private_share_fails(self):
        prog = correct_program()[:-1]
        prog = prog[:-1] + [share("家庭住址", kind="private"),
                            {"type": "review"}]
        with self.assertRaises(CollabError):
            run_program(prog)

    def test_missing_review_fails(self):
        with self.assertRaises(CollabError):
            run_program(base("森林海报", ["小狐", "小兔"],
                             [("小狐", "画画"), ("小兔", "写字")],
                             ["画稿"], review=False))

    def test_duplicate_member_fails(self):
        with self.assertRaises(CollabError):
            run_program(base("森林海报", ["小狐", "小狐"],
                             [("小狐", "画画")], ["画稿"]))

    def test_extension_third_member_passes(self):
        r = run_program(base("森林海报", ["小狐", "小兔", "小龟"],
                             [("小狐", "画画"), ("小兔", "写字"),
                              ("小龟", "上色")],
                             ["画稿", "海报"]))
        self.assertEqual(len(r["members"]), 3)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(CollabError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
