"""KidsCoding P2: four deterministic standard-library-only algorithm projects."""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
import heapq


def binary_search_first(items: list[int], target: int) -> int:
    if any(items[i] > items[i+1] for i in range(len(items)-1)):
        raise ValueError("sorted input required")
    low,high = 0,len(items)
    while low < high:
        mid = (low+high)//2
        if items[mid] < target:
            low = mid+1
        else:
            high = mid
    return low if low < len(items) and items[low] == target else -1


def ranked_scores(scores: list[tuple[str,int]]) -> list[tuple[str,int,int]]:
    """P2-U1-L06: dense rank ties; stable, deterministic secondary sort."""
    if len({name for name,_ in scores}) != len(scores):
        raise ValueError("duplicate aliases")
    for name,score in scores:
        if not isinstance(name,str) or not name.strip() or isinstance(score,bool) or not isinstance(score,int) or not 0 <= score <= 100:
            raise ValueError("invalid alias or score")
    ordered = sorted(scores,key=lambda v:(-v[1],v[0]))
    rank, previous, result = 0,None,[]
    for name,score in ordered:
        if score != previous:
            rank += 1
            previous = score
        result.append((name,score,rank))
    return result


@dataclass
class MessageQueue:
    """P2-U2-L06: single-process FIFO message centre."""
    pending: deque[tuple[int,str]] = field(default_factory=deque)
    processed: list[tuple[int,str]] = field(default_factory=list)
    next_id: int = 1

    def send(self, payload: str) -> int:
        if not isinstance(payload,str) or not payload.strip() or len(payload) > 120:
            raise ValueError("message must contain 1..120 characters")
        key = self.next_id
        self.next_id += 1
        self.pending.append((key,payload.strip()))
        return key

    def consume(self) -> tuple[int,str] | None:
        if not self.pending:
            return None
        item = self.pending.popleft()
        self.processed.append(item)
        return item


def shortest_maze_path(grid: list[list[int]], start: tuple[int,int], goal: tuple[int,int]) -> list[tuple[int,int]] | None:
    """P2-U3-L06: BFS shortest path for a rectangular unweighted maze."""
    if not grid or not grid[0] or any(len(row) != len(grid[0]) or any(cell not in (0,1) for cell in row) for row in grid):
        raise ValueError("rectangular maze with 0/1 cells required")
    h,w = len(grid),len(grid[0])
    def valid(p):
        x,y = p
        return 0 <= x < w and 0 <= y < h and grid[y][x] == 0
    if not valid(start) or not valid(goal):
        raise ValueError("invalid start or goal")
    queue = deque([start])
    parent = {start:None}
    while queue:
        now = queue.popleft()
        if now == goal:
            path = []
            while now is not None:
                path.append(now)
                now = parent[now]
            return path[::-1]
        x,y = now
        for p in ((x+1,y),(x,y+1),(x-1,y),(x,y-1)):
            if valid(p) and p not in parent:
                parent[p] = now
                queue.append(p)
    return None


def schedule_dependencies(tasks: dict[str,list[str]]) -> list[str]:
    """P2-U4-L06: topological ordering with cycle detection."""
    if any(not isinstance(n,str) or not n.strip() for n in tasks):
        raise ValueError("blank task name")
    indegree = {name:0 for name in tasks}
    forward = {name:[] for name in tasks}
    for name,deps in tasks.items():
        if len(set(deps)) != len(deps):
            raise ValueError("duplicate dependency")
        for dep in deps:
            if dep not in tasks:
                raise ValueError(f"unknown dependency: {dep}")
            indegree[name] += 1
            forward[dep].append(name)
    ready = [name for name,d in indegree.items() if d == 0]
    heapq.heapify(ready)
    result = []
    while ready:
        name = heapq.heappop(ready)
        result.append(name)
        for child in forward[name]:
            indegree[child] -= 1
            if indegree[child] == 0:
                heapq.heappush(ready,child)
    if len(result) != len(tasks):
        raise ValueError("cyclic task dependencies")
    return result
