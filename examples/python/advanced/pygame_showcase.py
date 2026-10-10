"""Actual Pygame renderer for the P1 Breakout reference project.

Run:
  python pygame_showcase.py
CI (SDL dummy backend):
  SDL_VIDEODRIVER=dummy python pygame_showcase.py --smoke
"""
import argparse
import os

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--smoke",action="store_true")
    args = parser.parse_args()
    if args.smoke:
        os.environ["SDL_VIDEODRIVER"] = "dummy"

    import pygame
    from p1_projects import Breakout

    pygame.init()
    screen = pygame.display.set_mode((480,320))
    pygame.display.set_caption("KidsCoding | Original Breakout")
    game = Breakout()
    clock = pygame.time.Clock()
    running = True
    frame = 0
    try:
        while running:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                elif event.type == pygame.KEYDOWN and event.key == pygame.K_r:
                    game.reset()
            pressed = pygame.key.get_pressed()
            paddle = 240 if args.smoke else pygame.mouse.get_pos()[0]
            if pressed[pygame.K_LEFT]:
                paddle -= 5
            if pressed[pygame.K_RIGHT]:
                paddle += 5
            game.step(1/60,paddle)
            screen.fill((17,28,60))
            for x,y in game.bricks:
                pygame.draw.rect(screen,(249,177,94),(x,y,46,14),border_radius=4)
            pygame.draw.rect(screen,(101,211,183),(paddle-43,game.paddle_y,86,11),border_radius=5)
            pygame.draw.circle(screen,(248,244,190),(round(game.ball_x),round(game.ball_y)),round(game.radius))
            pygame.display.flip()
            frame += 1
            if args.smoke and frame >= 12:
                running = False
            clock.tick(60)
    finally:
        pygame.quit()
    if args.smoke:
        print(f"pygame-headless-smoke: success; frames={frame}; bricks={len(game.bricks)}")
