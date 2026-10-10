"""KidsCoding P1: four original project reference implementations (no personal data)."""
from __future__ import annotations

from dataclasses import dataclass, field
import math
import random


def math_art_svg(sides: int = 5, petals: int = 12, seed: int = 7) -> str:
    """P1-U1-L06: deterministic editable SVG maths art."""
    if not (3 <= sides <= 12 and 3 <= petals <= 36):
        raise ValueError("invalid polygon or petal count")
    rng = random.Random(seed)
    shapes = ['<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">',
              '<rect width="480" height="360" fill="#101d41"/>']
    for _ in range(28):
        shapes.append(f'<circle cx="{rng.randrange(8,473)}" cy="{rng.randrange(8,353)}" r="2" fill="#ffe7a3"/>')
    vertices = []
    for i in range(sides):
        angle = math.tau * i / sides - math.pi/2
        vertices.append(f'{240+82*math.cos(angle):.2f},{180+82*math.sin(angle):.2f}')
    shapes.append(f'<polygon points="{" ".join(vertices)}" stroke="#fff3cf" fill="#5667ce" stroke-width="3"/>')
    for i in range(petals):
        angle = math.tau * i / petals
        shapes.append(f'<circle cx="{240+112*math.cos(angle):.2f}" cy="{180+112*math.sin(angle):.2f}" r="12" fill="#ec9ecd"/>')
    return ''.join(shapes) + '</svg>'


@dataclass
class CaveAdventure:
    """P1-U2-L06: branching text adventure with resettable state."""
    room: str = "entrance"
    has_key: bool = False
    ended: bool = False
    history: list[str] = field(default_factory=list)

    def choose(self, action: str) -> str:
        if self.ended:
            return "game-over"
        action = action.strip().lower()
        transitions = {
            ("entrance", "left"): "crystal", ("entrance", "right"): "ridge",
            ("crystal", "take"): "key-collected", ("crystal", "back"): "entrance",
            ("ridge", "exit"): "safe-exit", ("ridge", "back"): "entrance"
        }
        if self.room == "crystal" and action == "door":
            outcome = "victory" if self.has_key else "locked"
        else:
            outcome = transitions.get((self.room, action), "invalid-action")
        if outcome == "invalid-action":
            return outcome
        if outcome == "key-collected":
            self.has_key = True
        elif outcome == "victory" or outcome == "safe-exit":
            self.room, self.ended = outcome, True
        elif outcome != "locked":
            self.room = outcome
        self.history.append(outcome)
        return outcome

    def reset(self) -> None:
        self.room, self.has_key, self.ended = "entrance", False, False
        self.history.clear()


@dataclass
class Breakout:
    """P1-U3-L06: physics model; pygame_showcase provides the actual renderer."""
    width: int = 480
    height: int = 320
    ball_x: float = 240.0
    ball_y: float = 230.0
    velocity_x: float = 105.0
    velocity_y: float = -130.0
    radius: float = 7.0
    paddle_y: float = 292.0
    score: int = 0
    lives: int = 3
    state: str = "playing"
    bricks: set[tuple[int, int]] = field(default_factory=lambda: {(x,y) for x in range(38,440,52) for y in (40,60)})

    def step(self, delta: float, paddle_x: float) -> str:
        if self.state != "playing":
            return self.state
        if not 0 < delta <= 0.05:
            raise ValueError("delta must be a small positive timestep")
        self.ball_x += self.velocity_x * delta
        self.ball_y += self.velocity_y * delta
        if self.ball_x-self.radius <= 0 or self.ball_x+self.radius >= self.width:
            self.velocity_x = -self.velocity_x
            self.ball_x = max(self.radius, min(self.width-self.radius, self.ball_x))
        if self.ball_y-self.radius <= 0:
            self.velocity_y, self.ball_y = abs(self.velocity_y), self.radius
        if self.velocity_y > 0 and self.paddle_y-self.radius <= self.ball_y <= self.paddle_y+11 and abs(self.ball_x-paddle_x) <= 43:
            self.velocity_y, self.ball_y = -abs(self.velocity_y), self.paddle_y-self.radius
        for brick in sorted(self.bricks):
            x,y = brick
            if x-self.radius <= self.ball_x <= x+46+self.radius and y-self.radius <= self.ball_y <= y+14+self.radius:
                self.bricks.remove(brick)
                self.score += 10
                self.velocity_y = -self.velocity_y
                if not self.bricks:
                    self.state = "win"
                break
        if self.ball_y-self.radius > self.height:
            self.lives -= 1
            if self.lives <= 0:
                self.state = "lose"
            else:
                self.ball_x,self.ball_y,self.velocity_x,self.velocity_y = 240,230,105,-130
        return self.state

    def reset(self) -> None:
        self.__dict__.update(Breakout().__dict__)


@dataclass
class SpaceSurvival:
    """P1-U4-L06: bounded deterministic enemy spawning and game reset."""
    width: int = 480
    ship_x: float = 240.0
    enemies: list[tuple[float,float]] = field(default_factory=list)
    score: int = 0
    lives: int = 3
    elapsed: float = 0.0
    state: str = "menu"
    next_spawn: float = 0.0
    seed: int = 19
    _rng: random.Random = field(init=False, repr=False)

    def __post_init__(self):
        self._rng = random.Random(self.seed)

    def start(self):
        if self.state == "menu":
            self.state = "playing"

    def update(self, delta: float, direction: int = 0):
        if self.state != "playing":
            return
        if not 0 < delta <= 0.05 or direction not in (-1,0,1):
            raise ValueError("invalid step")
        self.ship_x = max(18, min(self.width-18, self.ship_x + direction*180*delta))
        self.elapsed += delta
        if self.elapsed >= self.next_spawn and len(self.enemies) < 12:
            self.enemies.append((float(self._rng.randint(20,self.width-20)),0.0))
            self.next_spawn = self.elapsed + 0.65
        remaining = []
        for x,y in self.enemies:
            y += 110*delta
            if y >= 300:
                self.lives -= 1
            else:
                remaining.append((x,y))
        self.enemies = remaining
        if self.lives <= 0:
            self.lives,self.state = 0,"lose"
        elif self.elapsed >= 30:
            self.state = "win"

    def restart(self):
        self.__dict__.update(SpaceSurvival(seed=self.seed).__dict__)
        self.start()
