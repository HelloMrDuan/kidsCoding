"""Executable positive, boundary and negative checks for four P0 unit projects."""
import unittest
from course_projects import LibraryDesk, TaskBoard, assign_tasks, make_profile


class ProfileTests(unittest.TestCase):
    def test_profile_is_formatted(self):
        self.assertEqual(make_profile(" 小雨 ", "画画", "蓝"), "昵称：小雨\n爱好：画画\n喜欢的颜色：蓝")

    def test_empty_profile_is_rejected(self):
        with self.assertRaises(ValueError):
            make_profile("   ", "画画", "蓝")

    def test_newline_and_long_inputs_rejected(self):
        for name in ["一\n二", "小" * 21]:
            with self.subTest(name=name), self.assertRaises(ValueError):
                make_profile(name, "画画", "蓝")

    def test_non_string_rejected(self):
        with self.assertRaises(TypeError):
            make_profile(8, "画画", "蓝")


class CardTests(unittest.TestCase):
    def test_selection_unique_and_within_pool(self):
        tasks = ["打扫", "浇花", "检查", "记录"]
        selected = assign_tasks(tasks, 3, seed=7)
        self.assertEqual(len(selected), 3)
        self.assertEqual(len(set(selected)), 3)
        self.assertTrue(set(selected).issubset(set(tasks)))

    def test_selection_is_reproducible(self):
        pool = ["打扫", "浇花", "检查", "记录"]
        self.assertEqual(assign_tasks(pool, 3, seed=23), assign_tasks(pool, 3, seed=23))

    def test_empty_pool_bad_count_and_duplicates_rejected(self):
        for tasks, count in [([], 1), (["A"], 0), (["A"], 2), (["A", "A"], 1), ([""], 1)]:
            with self.subTest(tasks=tasks, count=count), self.assertRaises(ValueError):
                assign_tasks(tasks, count)

    def test_bool_count_rejected(self):
        with self.assertRaises(TypeError):
            assign_tasks(["A"], True)


class LibraryTests(unittest.TestCase):
    def test_borrow_repeat_return_reborrow(self):
        desk = LibraryDesk(["森林故事"])
        self.assertTrue(desk.borrow("森林故事"))
        self.assertFalse(desk.borrow("森林故事"))
        self.assertTrue(desk.return_book("森林故事"))
        self.assertTrue(desk.borrow("森林故事"))

    def test_unknown_book_returns_false(self):
        desk = LibraryDesk(["森林故事"])
        self.assertFalse(desk.borrow("未知书"))
        self.assertFalse(desk.return_book("未知书"))

    def test_already_returned_does_not_count_as_return(self):
        desk = LibraryDesk(["森林故事"])
        self.assertFalse(desk.return_book("森林故事"))

    def test_duplicates_and_empty_titles_rejected(self):
        for books in [[], [""], ["星空", "星空"]]:
            with self.subTest(books=books), self.assertRaises(ValueError):
                LibraryDesk(books)


class TaskBoardTests(unittest.TestCase):
    def test_add_and_complete(self):
        board = TaskBoard()
        a = board.add(" 整理书架 ")
        b = board.add("检查绿植")
        self.assertEqual([a.identifier, b.identifier], [1, 2])
        self.assertTrue(board.complete(1))
        self.assertEqual([x.done for x in board.all_tasks()], [True, False])

    def test_missing_or_twice_complete_returns_false(self):
        board = TaskBoard()
        self.assertFalse(board.complete(1))
        board.add("打扫")
        self.assertTrue(board.complete(1))
        self.assertFalse(board.complete(1))

    def test_invalid_title_rejected(self):
        board = TaskBoard()
        for name in ["", "  ", "x" * 81]:
            with self.subTest(name=name), self.assertRaises(ValueError):
                board.add(name)

    def test_empty_board(self):
        self.assertEqual(TaskBoard().all_tasks(), [])


if __name__ == "__main__":
    unittest.main()
