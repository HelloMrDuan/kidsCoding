import unittest
import xml.etree.ElementTree as ET
from p1_projects import math_art_svg, CaveAdventure, Breakout, SpaceSurvival
from p2_algorithms import binary_search_first, ranked_scores, MessageQueue, shortest_maze_path, schedule_dependencies


class P1Tests(unittest.TestCase):
    def test_svg_is_valid_and_reproducible(self):
        svg = math_art_svg(6,12,3)
        root = ET.fromstring(svg)
        self.assertEqual(root.tag,'{http://www.w3.org/2000/svg}svg')
        self.assertEqual(len(root.findall('{http://www.w3.org/2000/svg}circle')),40)
        self.assertEqual(math_art_svg(seed=9),math_art_svg(seed=9))

    def test_invalid_art_inputs(self):
        for kwargs in [{'sides':2},{'petals':100}]:
            with self.subTest(kwargs=kwargs),self.assertRaises(ValueError):
                math_art_svg(**kwargs)

    def test_cave_key_door_and_reset(self):
        game = CaveAdventure()
        self.assertEqual(game.choose('left'),'crystal')
        self.assertEqual(game.choose('door'),'locked')
        self.assertEqual(game.choose('take'),'key-collected')
        self.assertEqual(game.choose('door'),'victory')
        self.assertEqual(game.choose('take'),'game-over')
        game.reset()
        self.assertEqual((game.room,game.has_key,game.ended),('entrance',False,False))

    def test_cave_side_exit_and_invalid(self):
        game = CaveAdventure()
        self.assertEqual(game.choose('xyz'),'invalid-action')
        self.assertEqual(game.history,[])
        self.assertEqual(game.choose('right'),'ridge')
        self.assertEqual(game.choose('exit'),'safe-exit')

    def test_brick_score_once_and_win(self):
        game = Breakout(ball_x=45,ball_y=47,velocity_x=0,velocity_y=1,bricks={(38,40)})
        self.assertEqual(game.step(.01,240),'win')
        self.assertEqual(game.score,10)
        self.assertEqual(game.step(.01,240),'win')
        self.assertEqual(game.score,10)

    def test_border_bounce(self):
        game = Breakout(ball_x=6,ball_y=220,velocity_x=-100)
        game.step(.01,240)
        self.assertGreater(game.velocity_x,0)

    def test_loss_and_restart(self):
        game = Breakout(ball_y=329,velocity_y=100,lives=1)
        self.assertEqual(game.step(.01,240),'lose')
        game.reset()
        self.assertEqual((game.lives,game.score,game.state),(3,0,'playing'))

    def test_invalid_delta(self):
        for d in (-.1,1):
            with self.assertRaises(ValueError): Breakout().step(d,200)

    def test_space_menu_and_spawn(self):
        a,b = SpaceSurvival(seed=2),SpaceSurvival(seed=2)
        a.update(.02,1)
        self.assertEqual(a.ship_x,240)
        a.start()
        b.start()
        for _ in range(200):
            a.update(.02)
            b.update(.02)
        self.assertEqual(a.enemies,b.enemies)
        self.assertLessEqual(len(a.enemies),12)

    def test_space_clamp_and_restart(self):
        game = SpaceSurvival(ship_x=465)
        game.start()
        game.update(.05,1)
        self.assertLessEqual(game.ship_x,462)
        game.lives,game.score = 0,20
        game.restart()
        self.assertEqual((game.lives,game.score,game.state,game.elapsed),(3,0,'playing',0))


class P2Tests(unittest.TestCase):
    def test_binary_first_duplicate(self):
        self.assertEqual(binary_search_first([1,2,2,3],2),1)
        self.assertEqual(binary_search_first([1,3,5],4),-1)
        self.assertEqual(binary_search_first([],4),-1)

    def test_binary_unsorted_rejected(self):
        with self.assertRaises(ValueError):binary_search_first([3,1],1)

    def test_dense_rank_ties(self):
        self.assertEqual(ranked_scores([('D',75),('B',90),('A',90)]),
                         [('A',90,1),('B',90,1),('D',75,2)])

    def test_invalid_rank_inputs(self):
        for scores in [[('A',101)],[('A',70),('A',80)],[('B',True)]]:
            with self.subTest(scores=scores),self.assertRaises(ValueError):
                ranked_scores(scores)

    def test_queue_fifo_exactly_once(self):
        q=MessageQueue()
        a,b=q.send('first'),q.send('second')
        self.assertEqual([a,b],[1,2])
        self.assertEqual(q.consume(),(1,'first'))
        self.assertEqual(q.consume(),(2,'second'))
        self.assertIsNone(q.consume())
        self.assertEqual(len(q.processed),2)

    def test_queue_bad_payload(self):
        for payload in (' ','a'*121):
            with self.subTest(payload=payload),self.assertRaises(ValueError):
                MessageQueue().send(payload)

    def test_maze_shortest_path(self):
        grid=[[0,0,0],[1,1,0],[0,0,0]]
        path=shortest_maze_path(grid,(0,0),(2,2))
        self.assertEqual(len(path),5)
        self.assertEqual((path[0],path[-1]),((0,0),(2,2)))

    def test_maze_unreachable_and_origin(self):
        self.assertIsNone(shortest_maze_path([[0,1],[1,0]],(0,0),(1,1)))
        self.assertEqual(shortest_maze_path([[0]],(0,0),(0,0)),[(0,0)])

    def test_invalid_maze_rejected(self):
        for grid in ([],[[0,1],[0]],[[0,2]],[[1]]):
            with self.subTest(grid=grid),self.assertRaises(ValueError):
                shortest_maze_path(grid,(0,0),(0,0))

    def test_schedule_order_and_independent_tasks(self):
        self.assertEqual(schedule_dependencies({'舞台':[],'脚本':['舞台'],'测试':['脚本']}),['舞台','脚本','测试'])
        self.assertEqual(schedule_dependencies({'C':[],'B':[],'A':[]}),['A','B','C'])

    def test_schedule_invalid_and_cycles(self):
        for tasks in ({'A':['B'],'B':['A']},{'A':['Z']}):
            with self.subTest(tasks=tasks),self.assertRaises(ValueError):
                schedule_dependencies(tasks)
        self.assertEqual(schedule_dependencies({}),[])


if __name__ == "__main__":
    unittest.main()
