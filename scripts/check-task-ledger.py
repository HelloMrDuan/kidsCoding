#!/usr/bin/env python3
"""Validate task state and one-task-per-PR policy. Python stdlib only."""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TASKS = "docs/roadmap/task-register.json"
LESSONS = "docs/roadmap/lesson-task-register.json"
CATALOG = "apps/web/src/content/curriculum/full-catalog-v1.json"
LOG = "docs/roadmap/TASK-CHANGELOG.md"
STATES = {"todo", "in_progress", "in_review", "merged_waiting_ci", "completed", "blocked"}
REPO = "https://github.com/HelloMrDuan/kidsCoding"


def check(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def load(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def prior_file(base: str, path: str) -> dict | None:
    proc = subprocess.run(
        ["git", "show", f"{base}:{path}"],
        cwd=ROOT, text=True, capture_output=True, check=False,
    )
    if proc.returncode:
        return None
    return json.loads(proc.stdout)


def valid_evidence(item: dict, *, lesson: bool) -> None:
    evidence = item.get("evidence", {})
    check(isinstance(evidence, dict), f"{item['id']}: evidence missing")
    status = item["status"]
    if status in ("in_review", "merged_waiting_ci", "completed"):
        check(
            isinstance(evidence.get("pr"), str) and evidence["pr"].startswith(f"{REPO}/pull/"),
            f"{item['id']}: {status} requires real PR URL",
        )
    if status in ("merged_waiting_ci", "completed"):
        check(
            bool(re.fullmatch(r"[0-9a-f]{40}", str(evidence.get("mergeCommit", "")))),
            f"{item['id']}: merged status requires full merge SHA",
        )
    if status == "completed":
        check(
            isinstance(evidence.get("mainCI"), str)
            and evidence["mainCI"].startswith(f"{REPO}/actions/runs/"),
            f"{item['id']}: completed requires successful main CI URL",
        )
        if lesson:
            check(bool(evidence.get("realE2E")) and bool(evidence.get("lessonReview")),
                  f"{item['id']}: completed lesson requires real E2E and independent review")
        else:
            check(bool(evidence.get("tests")), f"{item['id']}: completed requires test evidence")
        log = (ROOT / LOG).read_text(encoding="utf-8")
        check(f"| {item['id']} |" in log, f"{item['id']}: completed task missing in changelog")
    if status == "blocked":
        check(len(item.get("notes", "").strip()) >= 12,
              f"{item['id']}: blocked requires a concrete reason and recovery plan")


def check_ledger() -> tuple[list[dict], list[dict]]:
    product = load(TASKS)
    lessons = load(LESSONS)
    catalog = load(CATALOG)
    tasks = product.get("tasks", [])
    rows = lessons.get("lessons", [])
    check(len(tasks) > 0, "product task register empty")
    check(len(rows) == 432, f"lesson register requires exactly 432 catalog lessons, got {len(rows)}")
    check(lessons.get("courseCount") == 432, "courseCount inconsistent")
    catalog_rows = {
        lesson["id"]: (track["id"], unit["id"], lesson["title"], lesson["status"])
        for track in catalog["tracks"]
        for unit in track["units"]
        for lesson in unit["lessons"]
    }
    check(len(catalog_rows) == 432, "catalog itself is not 432 unique lessons")
    ids = {t["id"] for t in tasks}
    check(len(ids) == len(tasks), "duplicate product task IDs")
    lesson_ids = {l["id"] for l in rows}
    check(len(lesson_ids) == len(rows), "duplicate lesson task IDs")
    check(set(catalog_rows) == lesson_ids, "lesson tracking IDs do not exactly match catalog")

    for task in tasks:
        tid = task["id"]
        check(bool(re.fullmatch(r"[A-Z]+-[0-9]{3}", tid)), f"{tid}: invalid product task ID")
        check(task.get("status") in STATES, f"{tid}: bad status")
        check(task.get("title") and task.get("scope") and task.get("acceptance"), f"{tid}: incomplete task description")
        check(task.get("priority") in {"P0", "P1", "P2"}, f"{tid}: priority missing")
        deps = task.get("dependencies", [])
        check(len(deps) == len(set(deps)), f"{tid}: duplicate dependencies")
        check(tid not in deps and all(d in ids for d in deps), f"{tid}: unknown/self dependency")
        valid_evidence(task, lesson=False)

    visited: set[str] = set()
    active: set[str] = set()
    graph = {t["id"]: t.get("dependencies", []) for t in tasks}

    def walk(tid: str) -> None:
        if tid in visited:
            return
        check(tid not in active, f"{tid}: cycle in dependencies")
        active.add(tid)
        for d in graph[tid]:
            walk(d)
        active.remove(tid)
        visited.add(tid)

    for tid in ids:
        walk(tid)

    for lesson in rows:
        lid = lesson["id"]
        check(lesson.get("status") in STATES, f"{lid}: invalid task status")
        check(
            (lesson.get("trackId"), lesson.get("unitId"), lesson.get("title"), lesson.get("catalogStatus"))
            == catalog_rows[lid], f"{lid}: mismatch against real catalog",
        )
        check(lesson.get("plannedLearningOutcome") and len(lesson.get("acceptance", [])) >= 3,
              f"{lid}: no measurable learning goal/acceptance")
        valid_evidence(lesson, lesson=True)

    return tasks, rows


def validate_pr(task_map: dict[str, dict]) -> None:
    body = os.environ.get("TASK_PR_BODY", "")
    found = re.findall(r"(?m)^Task-ID:\s*([A-Z][A-Z0-9-]+)\s*$", body)
    check(len(found) == 1, "PR description must contain exactly one standalone 'Task-ID: EDU-101' line")
    tid = found[0]
    check(tid in task_map, f"PR references unknown task ID {tid}")
    check(task_map[tid]["status"] != "todo", f"{tid}: PR task still marked todo")
    base = os.environ.get("TASK_BASE_SHA", "").strip()
    check(bool(re.fullmatch(r"[0-9a-f]{40}", base)), "TASK_BASE_SHA missing/invalid")
    old_product = prior_file(base, TASKS)
    old_lessons = prior_file(base, LESSONS)
    if old_product is None and old_lessons is None:
        check(tid == "OPS-001", "initial registry bootstrapping must be OPS-001")
        return

    changed: set[str] = set()
    for before, now, key in ((old_product, load(TASKS), "tasks"), (old_lessons, load(LESSONS), "lessons")):
        if before is None:
            check(False, "cannot replace a missing existing registry in a feature PR")
        old_map = {x["id"]: x for x in before[key]}
        new_map = {x["id"]: x for x in now[key]}
        changed |= {k for k in set(old_map) | set(new_map) if old_map.get(k) != new_map.get(k)}

    check(changed == {tid}, f"Each PR must update exactly its one Task-ID entry; changed={sorted(changed)}, declared={tid}")


def main() -> None:
    tasks, lessons = check_ledger()
    mapping = {i["id"]: i for i in tasks + lessons}
    if os.environ.get("TASK_VALIDATE_PR") == "1":
        validate_pr(mapping)
    statuses = {s: sum(i["status"] == s for i in tasks + lessons) for s in sorted(STATES)}
    print(f"Task ledger OK: {len(tasks)} product tasks; {len(lessons)} lesson tasks; states={statuses}")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, KeyError, OSError, json.JSONDecodeError) as exc:
        print(f"TASK TRACKING FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
