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

/*
 * G0-U3-L06 森林节奏演出（OPS-055）：小狐狸和小兔子的动物乐队。
 * 节奏单元 = 两拍鼓声（敲鼓、敲鼓）+ 一次跳跃（跳一下），装进有限的“重复 N 次”；
 * 两个角色都在第 0 拍走上舞台（多角色入场事件），之后每一拍同步。鼓声在 V3 舞台由
 * Web Audio 现场合成（event-v3-audio.ts），与动作同一个计时器、同一拍；重复次数固定，
 * 演完就停。判定只用真实引擎（顺序、次数、同步、空重复），不看声音是否“播放过”。
 */
const DRUM = 'drum_beat'
const JUMP = 'jump'
const ENTER = 'enter_stage'
const UNIT = [DRUM, DRUM, JUMP]
const BAND_CAN: EventAction[] = [ENTER, DRUM, JUMP]
const foxPlayer = (over: Partial<EventActor> = {}): EventActor => ({ id: 'fox', name: '小狐狸', can: [...BAND_CAN], x: 28, y: 60, ...over })
const rabbitPlayer = (over: Partial<EventActor> = {}): EventActor => ({ id: 'rabbit', name: '小兔子', can: [...BAND_CAN], x: 64, y: 60, ...over })
const show = (...actors: EventActor[]) => ({ actors, scenery: 'stage-flags' as const, parallel: true })
/** 第 1–2 关：小狐狸已经站在台上独奏。 */
const SOLO = show(foxPlayer())
/** 第 3 关起：两位乐手都在后台，按开始旗后一起走上舞台再开始演奏。 */
const BAND = show(foxPlayer({ offstage: true }), rabbitPlayer({ offstage: true }))

type Pair = [EventActorId, EventAction]
/** 每位乐手：（可选）入场，然后每一段 `rounds` 轮 `unit`。 */
const rhythm = (ids: EventActorId[], parts: Array<{ rounds: number; unit: string[] }>, enter: boolean): EventGoal => ({
  expectations: [{
    interaction: { kind: 'start' },
    effects: ids.flatMap(id => [
      ...(enter ? [[id, ENTER] as Pair] : []),
      ...parts.flatMap(p => Array.from({ length: p.rounds }, () => p.unit.map(a => [id, a as EventAction] as Pair)).flat()),
    ]),
  }],
})
const main4 = { rounds: 4, unit: UNIT }
const CHORUS_A = [JUMP, JUMP, DRUM]
const CHORUS_B = [DRUM, JUMP]

const toBlocks = (spec: EventSpecBlock[]) => spec.map(b => (typeof b === 'string' ? { type: b } : { type: 'repeat_times', times: b.repeat, body: b.body.map(type => ({ type })) }))
const SHOW_BLOCKS = [S, ENTER, DRUM, JUMP, 'repeat_times']
const bandMain = script(S, ENTER, loop(4, ...UNIT))

const L06: EventLesson = {
  id: 'G0-U3-L06',
  title: '森林节奏演出',
  story: '动物乐队邀请你给鼓点和跳舞动作编一个可循环的节奏：小狐狸和小兔子一起走上舞台，咚、咚、跳，一轮接一轮，演完四轮就一起停下。',
  concept: '节拍、循环、同步综合：把“咚、咚、跳”的节奏单元装进有限循环，两位乐手同一拍入场、同一拍敲鼓和跳',
  objectives: [
    '能设计“敲鼓、敲鼓、跳一下”的节奏单元，并用“重复 4 次”演奏至少四轮，演完就停',
    '能把节奏和另一位角色的入场结合起来，让两位乐手每一拍都同步',
    '能对照节奏记录指出第几拍开始不同步，并改正；还能加一段不同的副歌',
  ],
  diagnoses: {
    empty_repeat: '“重复”积木的大嘴巴里是空的：把一轮节奏“敲鼓、敲鼓、跳一下”放进去。',
    wrong_order: '节奏的顺序不对：每一轮都是先敲两下鼓，再跳一下。先拍手演奏一遍“咚、咚、跳”。',
    out_of_sync: '有一位乐手没跟上节拍：对照两人的节奏记录（圆点是鼓、竖条是跳），找出第几拍开始不一样。',
    missing_effect: '少演了：数一数节奏记录，每轮包含哪些动作？重复的次数要和约好的轮数一样，入场也不能少。',
    extra_effect: '多演了：重复的次数比约好的轮数多，数四轮结束的时机。',
    no_hat: '这段积木上面没有“开始时”，乐手不知道什么时候开始演出。',
    hat_not_on_top: '“开始时”要放在最上面，演奏的积木接在它下面。',
    nothing_happened: '按了开始旗，乐手一动不动：积木要接在“开始时”下面。',
    cannot_do: '这块积木这位乐手做不到，换成“敲鼓”“跳一下”或“走上舞台”。',
    loop: '演出停不下来了：只用“重复 N 次”，次数是固定的，演完就停。',
  },
  steps: [
    {
      id: 'empty-drum-loop',
      kind: 'error-lab',
      title: '错误实验：空空的重复',
      instruction: '小狐狸的程序是“重复 4 次”，可是重复里面什么也没放。这是一个故意的错误：先按原样运行，听一听有没有鼓声、看看小狐狸动不动，再把一轮节奏“敲鼓、敲鼓、跳一下”放进重复里修好它。',
      predict: '先猜一猜：重复里面是空的，按开始旗后会听到几下鼓声？',
      predictChoices: [
        { text: '咚咚跳，演四轮', when: 'pass' },
        { text: '一下鼓声也没有，小狐狸不动', when: 'empty_repeat' },
      ],
      errorLab: {
        expect: 'empty_repeat',
        expected: '如果重复里面有“敲鼓、敲鼓、跳一下”，应该听到 8 下鼓声、看到 4 次跳跃。',
        actual: '重复里面是空的：一下鼓声也没有，小狐狸一动不动。',
      },
      level: SOLO,
      editable: ['fox'],
      allowedBlocks: [S, DRUM, JUMP, 'repeat_times'],
      starter: { fox: toBlocks(script(S, loop(4))) },
      goal: rhythm(['fox'], [main4], false),
      hints: [
        '先拍手演奏一遍节奏：咚、咚、跳。',
        '每轮包含哪些动作？两下“敲鼓”，一下“跳一下”。',
        '把“敲鼓、敲鼓、跳一下”放进“重复 4 次”的大嘴巴里。',
      ],
      solutions: [
        { fox: script(S, loop(4, ...UNIT)) },
        { fox: script(S, ...UNIT, ...UNIT, ...UNIT, ...UNIT) },
      ],
      counterExamples: [
        { scripts: { fox: script(S, loop(4)) }, failure: 'empty_repeat' },
        { scripts: { fox: script(S, loop(3, ...UNIT)) }, failure: 'missing_effect' },
        { scripts: { fox: script(S, loop(5, ...UNIT)) }, failure: 'extra_effect' },
      ],
    },
    {
      id: 'one-unit',
      kind: 'guided',
      title: '先设计一轮节奏',
      instruction: '先只演一轮：按开始旗后，小狐狸敲鼓、敲鼓、跳一下。一轮里少一下、顺序反了，都不算这个节奏。',
      predict: '先猜一猜：一轮节奏会听到几下鼓声？',
      level: SOLO,
      editable: ['fox'],
      allowedBlocks: [S, DRUM, JUMP],
      goal: rhythm(['fox'], [{ rounds: 1, unit: UNIT }], false),
      hints: [
        '一轮就是：咚、咚、跳。',
        '先选出“敲鼓”的声音积木，再选“跳一下”的动作积木。',
        '接“开始时”，下面放“敲鼓”“敲鼓”“跳一下”。',
      ],
      solutions: [{ fox: script(S, ...UNIT) }],
      counterExamples: [
        { scripts: { fox: script(S, DRUM, DRUM) }, failure: 'missing_effect' },
        { scripts: { fox: script(...UNIT) }, failure: 'no_hat' },
        { scripts: { fox: script(S, ...UNIT, ...UNIT) }, failure: 'extra_effect' },
      ],
    },
    {
      id: 'rabbit-joins',
      kind: 'practice-a',
      title: '练习 A：小兔子一起入场',
      instruction: '小狐狸已经会“走上舞台”再演四轮了。帮小兔子拼程序：按开始旗后也走上舞台，再用“重复 4 次”演奏同一个节奏，和小狐狸同一拍敲鼓、同一拍跳。',
      predict: '先猜一猜：入场算一拍，四轮节奏一共要几拍？',
      level: BAND,
      editable: ['rabbit'],
      allowedBlocks: SHOW_BLOCKS,
      starter: { fox: toBlocks(bandMain) },
      goal: rhythm(['fox', 'rabbit'], [main4], true),
      hints: [
        '比一比两人的节奏记录，点数和顺序一样吗？',
        '入场是第 1 拍，后面四轮每轮 3 拍，一共 13 拍。',
        '小兔子：“开始时”下面放“走上舞台”，再放“重复 4 次（敲鼓、敲鼓、跳一下）”。',
      ],
      solutions: [
        { fox: bandMain, rabbit: bandMain },
        { fox: bandMain, rabbit: script(S, ENTER, ...UNIT, ...UNIT, ...UNIT, ...UNIT) },
      ],
      counterExamples: [
        { scripts: { fox: bandMain, rabbit: script(S, loop(4, ...UNIT)) }, failure: 'out_of_sync' },
        { scripts: { fox: bandMain, rabbit: script(S, ENTER, loop(3, ...UNIT)) }, failure: 'missing_effect' },
        { scripts: { fox: bandMain, rabbit: script(S, ENTER, loop(4, DRUM, JUMP, DRUM)) }, failure: 'out_of_sync' },
      ],
    },
    {
      id: 'who-is-off-beat',
      kind: 'practice-b',
      title: '练习 B：第几拍开始不同步',
      instruction: '两位乐手一起演出，小兔子的程序是“重复 4 次（敲鼓、跳一下、敲鼓）”：次数对了，可节奏和小狐狸对不上。先运行，对照节奏记录说出第几拍开始不同步，再改好小兔子重复里面的顺序。',
      predict: '先猜一猜：入场之后，两人从第几拍开始不一样？',
      level: BAND,
      editable: ['rabbit'],
      allowedBlocks: SHOW_BLOCKS,
      starter: { fox: toBlocks(bandMain), rabbit: toBlocks(script(S, ENTER, loop(4, DRUM, JUMP, DRUM))) },
      goal: rhythm(['fox', 'rabbit'], [main4], true),
      hints: [
        '入场后第一拍两人都敲鼓，第二拍小狐狸还在敲鼓，小兔子却跳了。',
        '次数都是 4，不同的是重复里面的先后：大家都是咚、咚、跳。',
        '把小兔子重复里面换成：敲鼓、敲鼓、跳一下。',
      ],
      solutions: [
        { fox: bandMain, rabbit: bandMain },
      ],
      counterExamples: [
        { scripts: { fox: bandMain, rabbit: script(S, ENTER, loop(4, DRUM, JUMP, DRUM)) }, failure: 'out_of_sync' },
        { scripts: { fox: bandMain, rabbit: script(S, ENTER, loop(4)) }, failure: 'empty_repeat' },
      ],
    },
    {
      id: 'my-chorus',
      kind: 'creative',
      title: '创意改造：加一段副歌',
      instruction: '四轮主歌演完，再加第二种节奏作为副歌：先选一种副歌，然后在两位乐手的“重复 4 次”下面各接一个“重复 2 次（副歌）”。两人都要一直同步，演完就停。通过后，它就是你的“森林节奏演出”作品。',
      predict: '先猜一猜：加了副歌，两位乐手各要改几处？',
      level: BAND,
      editable: ['fox', 'rabbit'],
      allowedBlocks: SHOW_BLOCKS,
      starter: { fox: toBlocks(bandMain), rabbit: toBlocks(bandMain) },
      goal: rhythm(['fox', 'rabbit'], [main4, { rounds: 2, unit: CHORUS_A }], true),
      creative: {
        prompt: '副歌用哪种节奏？',
        choices: ['chorus-jump-jump-drum', 'chorus-drum-jump'],
        labels: ['副歌：跳、跳、咚', '副歌：咚、跳'],
        goals: [
          rhythm(['fox', 'rabbit'], [main4, { rounds: 2, unit: CHORUS_A }], true),
          rhythm(['fox', 'rabbit'], [main4, { rounds: 2, unit: CHORUS_B }], true),
        ],
      },
      hints: [
        '只给一位乐手加了副歌，另一位就停早了，不同步。',
        '主歌“重复 4 次”不动，在它下面再接一个“重复 2 次”。',
        '例如“跳、跳、咚”：两人都在主歌下面接“重复 2 次（跳一下、跳一下、敲鼓）”。',
      ],
      solutions: [
        { fox: script(S, ENTER, loop(4, ...UNIT), loop(2, ...CHORUS_A)), rabbit: script(S, ENTER, loop(4, ...UNIT), loop(2, ...CHORUS_A)) },
      ],
      counterExamples: [
        { scripts: { fox: bandMain, rabbit: bandMain }, failure: 'missing_effect' },
        // 只给小狐狸加副歌：小兔子演完主歌就停了，真实引擎按角色判为“少演了”。
        { scripts: { fox: script(S, ENTER, loop(4, ...UNIT), loop(2, ...CHORUS_A)), rabbit: bandMain }, failure: 'missing_effect' },
      ],
    },
  ],
  review: {
    whatIf: '如果约好演 6 轮主歌，两位乐手的程序要怎么改？',
    answer: '重复里面还是“敲鼓、敲鼓、跳一下”，只把两人的次数都改成 6：几轮就重复几次，两人的次数和顺序一样才同步，演完就停。',
  },
  reflection: '说一说：为什么两位乐手都要先“走上舞台”，而且重复的次数和里面的顺序都要一样？',
  reflectionCheck: {
    question: '“重复 4 次（敲鼓、敲鼓、跳一下）”演完以后会怎样？',
    options: [
      { text: '敲了 8 下鼓、跳了 4 下，然后停下', correct: true },
      { text: '一直敲下去，停不下来', correct: false },
      { text: '只敲 4 下鼓', correct: false },
    ],
    why: '一轮有两下鼓、一下跳，四轮就是 8 下鼓、4 下跳；重复的次数是固定的，演完就停，声音也一起停。',
  },
  parentQuestion: '请孩子展示“森林节奏演出”，和孩子一起拍手：咚、咚、跳，数一数演了几轮；再问他：“如果把重复里面的一块积木换掉，演出会怎样？”',
  project: { stepId: 'my-chorus', title: '森林节奏演出', passedText: '{label}，小狐狸和小兔子一起入场，四轮主歌加副歌一直同步，演完就停' },
}

export const g0u3EventLessons: Record<string, EventLesson> = { [L04.id]: L04, [L06.id]: L06 }
