import type { EventActor, EventActorId, EventAction } from '@/features/lessons/event/event-engine'
import type { EventGoal, EventLesson, EventSpecBlock } from './g0-u2-event-lessons'

/**
 * G0-U3 (Hark A): loop lessons on the event stage. The SYS-107 “重复 N 次”
 * block runs inside each character's script, and a show stage (`parallel`)
 * plays every script beat by beat at the same time, so the engine can judge
 * whether performers really stay in step. Same formal-course shape as G0-U2:
 * error lab, guided, two different practices, a creative remake, 复盘 and a
 * saved work. Experimental (L3), never "published".
 */

const firefly = (id: 'firefly_a' | 'firefly_b' | 'firefly_c', name: string, x: number): EventActor => ({ id, name, can: ['glow_on', 'glow_off'], x, y: 42, size: 16 })
const A = firefly('firefly_a', '亮亮', 26)
const B = firefly('firefly_b', '闪闪', 50)
const C = firefly('firefly_c', '点点', 74)

const night = (...actors: EventActor[]) => ({ actors, scenery: 'firefly-night' as const, parallel: true })

/** The goal: on the start flag each named firefly lights up and goes dark, `rounds` times, in step. */
const flash = (ids: EventActorId[], rounds: number): EventGoal => ({
  expectations: [{
    interaction: { kind: 'start' },
    effects: ids.flatMap(id => Array.from({ length: rounds }, () => [[id, 'glow_on'], [id, 'glow_off']] as Array<[EventActorId, EventAction]>).flat()),
  }],
})

const ON = 'glow_on'
const OFF = 'glow_off'
const S = 'when_start'
const loop = (repeat: number, ...body: string[]): EventSpecBlock => ({ repeat, body })
const script = (...blocks: EventSpecBlock[]) => blocks
const block = (repeat: number, ...body: string[]) => [{ type: S }, { type: 'repeat_times', times: repeat, body: body.map(type => ({ type })) }]
const BLOCKS = [S, ON, OFF, 'repeat_times']

const L04: EventLesson = {
  id: 'G0-U3-L04',
  title: '萤火虫闪三次',
  story: '夏夜的池塘边，三只萤火虫约好表演“闪三轮”：每一轮都要一起亮起来、再一起熄灭。谁快了一拍、慢了一拍，或者最后忘了熄灯，观众一眼就看出来。',
  concept: '重复节奏与同步：一轮“亮、灭”重复几次，几只萤火虫要在同一拍做同一件事',
  objectives: [
    '能把“亮起来、熄灭”组成一轮，用“重复 3 次”闪三轮，最后是熄灭的',
    '能预测第几个动作后灯是亮还是灭（第 6 个动作后是灭）',
    '能对照亮灭记录，找出哪只萤火虫不同步，并改它重复里面的顺序',
  ],
  diagnoses: {
    left_glowing: '表演结束了灯还亮着：每一轮都要先亮起来、再熄灭。看看重复里面是不是少了“熄灭”。',
    out_of_sync: '有一只萤火虫没跟上节拍：对照它的亮灭记录，第一拍应该是“亮”。看看它重复里面的顺序。',
    missing_effect: '少闪了一轮：数一数亮灭记录有几个黄点，重复的次数要和约好的轮数一样。',
    extra_effect: '多闪了一轮：重复的次数比约好的轮数多，改小一点。',
    empty_repeat: '“重复”积木的大嘴巴里是空的：把“亮起来”和“熄灭”放进去。',
    no_hat: '这段积木上面没有“开始时”，萤火虫不知道什么时候开始表演。',
    nothing_happened: '按了开始旗，萤火虫一动不动：积木要接在“开始时”下面。',
  },
  steps: [
    {
      id: 'only-on',
      kind: 'error-lab',
      title: '错误实验：只亮不熄',
      instruction: '亮亮的程序是“重复 3 次（亮起来）”。这是一个故意的错误：先按原样运行，看看表演结束时灯是什么样，亮灭记录有几个暗点，再修好它。',
      predict: '先猜一猜：重复 3 次“亮起来”，表演结束时亮亮是亮的还是暗的？',
      predictChoices: [
        { text: '闪了三轮，最后熄灭', when: 'pass' },
        { text: '一直亮着，没有熄灭', when: 'left_glowing' },
      ],
      errorLab: {
        expect: 'left_glowing',
        expected: '如果每一轮都有“亮、灭”，亮灭记录应该是“亮暗亮暗亮暗”，最后是暗的。',
        actual: '重复里面只有“亮起来”，记录是三个黄点，表演完灯还亮着。',
      },
      level: night(A),
      editable: ['firefly_a'],
      allowedBlocks: BLOCKS,
      starter: { firefly_a: block(3, ON) },
      goal: flash(['firefly_a'], 3),
      hints: [
        '看亮灭记录：三个都是黄点，一个暗点也没有。',
        '一轮要做两件事：先亮起来，再熄灭。',
        '在重复里面“亮起来”的下面，加一块“熄灭”，次数还是 3。',
      ],
      solutions: [{ firefly_a: script(S, loop(3, ON, OFF)) }, { firefly_a: script(S, ON, OFF, ON, OFF, ON, OFF) }],
      counterExamples: [
        { scripts: { firefly_a: script(S, loop(3, ON)) }, failure: 'left_glowing' },
        { scripts: { firefly_a: script(S, loop(2, ON, OFF)) }, failure: 'missing_effect' },
      ],
    },
    {
      id: 'one-flash',
      kind: 'guided',
      title: '先闪一下',
      instruction: '先只闪一轮：按开始旗后，亮亮亮起来，再熄灭。顺序反了，或者忘了熄灭，都不算一轮。',
      predict: '先猜一猜：只放“亮起来”，结束时灯是什么样？',
      level: night(A),
      editable: ['firefly_a'],
      allowedBlocks: [S, ON, OFF],
      goal: flash(['firefly_a'], 1),
      hints: [
        '一轮就是一个黄点、一个暗点。',
        '先“亮起来”，后“熄灭”。',
        '接“开始时”，下面放“亮起来”，再放“熄灭”。',
      ],
      solutions: [{ firefly_a: script(S, ON, OFF) }],
      counterExamples: [
        { scripts: { firefly_a: script(S, ON) }, failure: 'left_glowing' },
        { scripts: { firefly_a: script(ON, OFF) }, failure: 'no_hat' },
        { scripts: { firefly_a: script(S, ON, OFF, ON, OFF) }, failure: 'extra_effect' },
      ],
    },
    {
      id: 'three-rounds',
      kind: 'practice-a',
      title: '练习 A：和亮亮一起闪三轮',
      instruction: '亮亮已经会闪三轮了。帮闪闪拼程序：用“重复”闪三轮，和亮亮同一拍亮、同一拍灭。先想一想：第 6 个动作做完，灯是亮还是灭？',
      predict: '先猜一猜：闪三轮一共几个动作？第 6 个动作后灯是亮还是灭？',
      level: night(A, B),
      editable: ['firefly_b'],
      allowedBlocks: BLOCKS,
      starter: { firefly_a: block(3, ON, OFF) },
      goal: flash(['firefly_a', 'firefly_b'], 3),
      hints: [
        '比一比两只萤火虫的亮灭记录，点数一样多吗？',
        '一轮两个动作，三轮就是 6 个，第 6 个是“熄灭”。',
        '闪闪：“开始时”下面放“重复 3 次（亮起来、熄灭）”。',
      ],
      solutions: [
        { firefly_a: script(S, loop(3, ON, OFF)), firefly_b: script(S, loop(3, ON, OFF)) },
        { firefly_a: script(S, loop(3, ON, OFF)), firefly_b: script(S, ON, OFF, ON, OFF, ON, OFF) },
      ],
      counterExamples: [
        { scripts: { firefly_a: script(S, loop(3, ON, OFF)), firefly_b: script(S, loop(2, ON, OFF)) }, failure: 'missing_effect' },
        { scripts: { firefly_a: script(S, loop(3, ON, OFF)), firefly_b: script(S, loop(4, ON, OFF)) }, failure: 'extra_effect' },
        { scripts: { firefly_a: script(S, loop(3, ON, OFF)), firefly_b: script(S, loop(3, ON)) }, failure: 'out_of_sync' },
      ],
    },
    {
      id: 'catch-the-beat',
      kind: 'practice-b',
      title: '练习 B：点点慢了一拍',
      instruction: '三只萤火虫一起表演。点点的程序是“重复 3 次（熄灭、亮起来）”：次数对了，可它总比大家慢一拍。先运行看亮灭记录，再改好点点重复里面的顺序。',
      predict: '先猜一猜：点点的第一拍是亮还是暗？',
      level: night(A, B, C),
      editable: ['firefly_c'],
      allowedBlocks: BLOCKS,
      starter: { firefly_a: block(3, ON, OFF), firefly_b: block(3, ON, OFF), firefly_c: block(3, OFF, ON) },
      goal: flash(['firefly_a', 'firefly_b', 'firefly_c'], 3),
      hints: [
        '点点的记录第一个是暗点，别人的第一个是黄点。',
        '次数都是 3，不同的是重复里面的先后：大家都是先亮后灭。',
        '把点点重复里面换成：亮起来、熄灭。',
      ],
      solutions: [
        { firefly_a: script(S, loop(3, ON, OFF)), firefly_b: script(S, loop(3, ON, OFF)), firefly_c: script(S, loop(3, ON, OFF)) },
        { firefly_a: script(S, loop(3, ON, OFF)), firefly_b: script(S, loop(3, ON, OFF)), firefly_c: script(S, ON, OFF, ON, OFF, ON, OFF) },
      ],
      counterExamples: [
        { scripts: { firefly_a: script(S, loop(3, ON, OFF)), firefly_b: script(S, loop(3, ON, OFF)), firefly_c: script(S, loop(3, OFF, ON)) }, failure: 'out_of_sync' },
        { scripts: { firefly_a: script(S, loop(3, ON, OFF)), firefly_b: script(S, loop(3, ON, OFF)), firefly_c: script(S, loop(2, ON, OFF)) }, failure: 'missing_effect' },
      ],
    },
    {
      id: 'my-firefly-show',
      kind: 'creative',
      title: '创意改造：我的萤火虫表演',
      instruction: '亮亮和闪闪想多表演几轮：先选闪几轮，再把两只萤火虫的重复次数都改好，让它们一直同步，最后都熄灭。通过后，它就是你的“萤火虫表演”作品。',
      predict: '先猜一猜：改成 5 轮，要改几个数字？',
      level: night(A, B),
      editable: ['firefly_a', 'firefly_b'],
      allowedBlocks: BLOCKS,
      starter: { firefly_a: block(3, ON, OFF), firefly_b: block(3, ON, OFF) },
      goal: flash(['firefly_a', 'firefly_b'], 3),
      creative: {
        prompt: '萤火虫要闪几轮？',
        choices: ['rounds-3', 'rounds-4', 'rounds-5'],
        labels: ['闪 3 轮', '闪 4 轮', '闪 5 轮'],
        goals: [flash(['firefly_a', 'firefly_b'], 3), flash(['firefly_a', 'firefly_b'], 4), flash(['firefly_a', 'firefly_b'], 5)],
      },
      hints: [
        '只改了一只萤火虫的次数，另一只就跟不上或多闪。',
        '两只萤火虫的重复次数都要等于选的轮数。',
        '例如闪 5 轮：亮亮和闪闪都改成“重复 5 次（亮起来、熄灭）”。',
      ],
      solutions: [{ firefly_a: script(S, loop(3, ON, OFF)), firefly_b: script(S, loop(3, ON, OFF)) }],
      counterExamples: [
        { scripts: { firefly_a: script(S, loop(3, ON, OFF)), firefly_b: script(S, loop(2, ON, OFF)) }, failure: 'missing_effect' },
        { scripts: { firefly_a: script(S, loop(3, ON, OFF)), firefly_b: script(S, loop(3, OFF, ON)) }, failure: 'out_of_sync' },
      ],
    },
  ],
  review: {
    whatIf: '如果约好闪 6 轮，每只萤火虫的程序要怎么改？',
    answer: '重复里面还是“亮起来、熄灭”，只把每一只的次数都改成 6：几轮就重复几次，大家的次数和顺序一样才同步。',
  },
  reflection: '说一说：为什么三只萤火虫的重复次数和里面的顺序都要一样？',
  reflectionCheck: {
    question: '闪三轮，每轮“亮起来、熄灭”，第 6 个动作做完灯是什么样？',
    options: [
      { text: '熄灭', correct: true },
      { text: '亮着', correct: false },
      { text: '一会儿亮一会儿灭，停不下来', correct: false },
    ],
    why: '一轮两个动作，第 6 个动作是第三轮的“熄灭”；重复的次数是固定的，闪完就停。',
  },
  parentQuestion: '请孩子展示“萤火虫表演”，和孩子一起拍手打节拍：亮一下拍一下，数一数一共闪了几轮。',
  project: { stepId: 'my-firefly-show', title: '我的萤火虫表演', passedText: '{label}，两只萤火虫一直同步，最后都熄灭了' },
}

export const g0u3EventLessons: Record<string, EventLesson> = { [L04.id]: L04 }
