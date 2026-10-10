"""KidsCoding P0 original standalone teaching examples.

All data is fictional and lives only in memory. No network or account access.
Each example corresponds to a unit's last lesson and can be imported for tests.
"""
from __future__ import annotations

import argparse
import json
import random
from dataclasses import dataclass


def make_profile(nickname: str, hobby: str, color: str) -> str:
    """P0-U1-L06: Create a privacy-respecting hobby card."""
    fields = {"昵称": nickname, "爱好": hobby, "喜欢的颜色": color}
    normalized: dict[str, str] = {}
    for label, value in fields.items():
        if not isinstance(value, str):
            raise TypeError(f"{label}必须是文字")
        clean = value.strip()
        if not clean or len(clean) > 20 or any(c in clean for c in "\r\n\t"):
            raise ValueError(f"{label}应为1至20字且不能包含换行")
        normalized[label] = clean
    return "\n".join(f"{label}：{value}" for label, value in normalized.items())


def assign_tasks(tasks: list[str], count: int, *, seed: int = 0) -> list[str]:
    """P0-U2-L06: Reproducible, non-commercial classroom task cards."""
    if isinstance(count, bool) or not isinstance(count, int):
        raise TypeError("数量必须是整数")
    if any(not isinstance(t, str) or not t.strip() for t in tasks):
        raise ValueError("任务卡不能为空")
    cleaned = [t.strip() for t in tasks]
    if len(set(cleaned)) != len(cleaned):
        raise ValueError("任务卡不能重复")
    if count < 1 or count > len(cleaned):
        raise ValueError("数量必须在1与任务总数之间")
    return random.Random(seed).sample(cleaned, count)


class LibraryDesk:
    """P0-U3-L06: In-memory loan desk with safe repeat operations."""

    def __init__(self, titles: list[str]):
        if not titles or any(not isinstance(t, str) or not t.strip() for t in titles):
            raise ValueError("图书清单不能包含空标题")
        titles = [title.strip() for title in titles]
        if len(set(titles)) != len(titles):
            raise ValueError("图书标题不能重复")
        self.available: dict[str, bool] = {title: True for title in titles}

    def borrow(self, title: str) -> bool:
        if title not in self.available or not self.available[title]:
            return False
        self.available[title] = False
        return True

    def return_book(self, title: str) -> bool:
        if title not in self.available or self.available[title]:
            return False
        self.available[title] = True
        return True


@dataclass(frozen=True)
class Task:
    identifier: int
    title: str
    done: bool = False


class TaskBoard:
    """P0-U4-L06: In-memory task manager; no names or remote storage."""

    def __init__(self) -> None:
        self._tasks: dict[int, Task] = {}
        self._next_id = 1

    def add(self, title: str) -> Task:
        if not isinstance(title, str):
            raise TypeError("任务名称必须是文字")
        title = title.strip()
        if not title or len(title) > 80:
            raise ValueError("任务名称应为1至80字")
        task = Task(self._next_id, title)
        self._tasks[task.identifier] = task
        self._next_id += 1
        return task

    def complete(self, identifier: int) -> bool:
        task = self._tasks.get(identifier)
        if task is None or task.done:
            return False
        self._tasks[identifier] = Task(task.identifier, task.title, True)
        return True

    def all_tasks(self) -> list[Task]:
        return list(self._tasks.values())


def main() -> None:
    parser = argparse.ArgumentParser(description="KidsCoding Python 入门项目教学演示")
    sub = parser.add_subparsers(dest="project", required=True)
    profile = sub.add_parser("profile", help="P0-U1-L06 无敏感信息的兴趣卡片")
    profile.add_argument("nickname")
    profile.add_argument("hobby")
    profile.add_argument("color")
    cards = sub.add_parser("cards", help="P0-U2-L06 随机任务卡分配")
    cards.add_argument("count", type=int)
    cards.add_argument("tasks", nargs="+")
    cards.add_argument("--seed", type=int, default=0)
    sub.add_parser("library", help="P0-U3-L06 图书借还演示")
    sub.add_parser("board", help="P0-U4-L06 班级任务板演示")
    args = parser.parse_args()
    if args.project == "profile":
        print(make_profile(args.nickname, args.hobby, args.color))
    elif args.project == "cards":
        print(json.dumps(assign_tasks(args.tasks, args.count, seed=args.seed), ensure_ascii=False))
    elif args.project == "library":
        desk = LibraryDesk(["森林故事", "星空旅行"])
        print(json.dumps({"first": desk.borrow("森林故事"), "repeat": desk.borrow("森林故事"), "return": desk.return_book("森林故事"), "after": desk.borrow("森林故事")}, ensure_ascii=False))
    elif args.project == "board":
        board = TaskBoard()
        a = board.add("整理书架")
        board.add("检查绿植")
        board.complete(a.identifier)
        print(json.dumps([vars(task) for task in board.all_tasks()], ensure_ascii=False))


if __name__ == "__main__":
    main()
