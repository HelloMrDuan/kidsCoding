// 探针：真实 scratch-vm 里「等待 1 秒 + 将 timeLeft 增加 -1」的倒计时能不能用虚拟时钟做成确定的帧数。
// 用法：在 apps/web 目录下运行  node ../../docs/curriculum/g2-u3-l05/probe-countdown-virtual-clock.cjs
// 不需要渲染器（本课不判断碰撞）。只打印实测值，不做断言；断言在正式 spec 里。
const req = id => require(require.resolve(id, {paths: [process.cwd()]}));
const VM = req('scratch-vm');

// 虚拟时钟：每走一帧前进 STEP_MS。scratch-vm 的 control_wait 用 Timer.nowObj.now()，而 Timer 打包后取不到，
// 所以只能换全局时钟：浏览器里是 self.performance.now（Timer.USE_PERFORMANCE 为真时），Node 里没有 self，退回 Date.now。
// runtime.currentMSecs 每帧由 Date.now() 更新，所以两个都要换。
const STEP_MS = 1000 / 30;
let virtualNow = 1_000_000;
Date.now = () => virtualNow;
if (typeof self !== 'undefined' && self.performance) self.performance.now = () => virtualNow;
console.log('uses self.performance:', typeof self !== 'undefined' && !!self.performance);

const costume = (name, id) => ({assetId: id, name, md5ext: id + '.svg', dataFormat: 'svg', rotationCenterX: 0, rotationCenterY: 0});
const base = () => ({variables: {}, lists: {}, broadcasts: {}, comments: {}, currentCostume: 0, sounds: [], volume: 100, tempo: 60});
const ID = 'a'.repeat(32);
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4"/></svg>';

const num = v => [4, String(v)];
const blk = (opcode, extra) => ({opcode, next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: false, ...extra});

// 学生脚本变体。times：重复次数；guard：是否用「直到 timeLeft < 1」；
function studentBlocks(variant) {
  const b = {};
  b.h = blk('event_whenflagclicked', {topLevel: true, x: 0, y: 0, next: 's'});
  b.s = blk('data_setvariableto', {parent: 'h', next: 'r', inputs: {VALUE: [1, num(10)]}, fields: {VARIABLE: ['timeLeft', 'tl']}});
  if (variant === 'until') {
    // 重复执行直到〈timeLeft < 1〉{ 等待 1 秒; 将 timeLeft 增加 -1 }
    b.r = blk('control_repeat_until', {parent: 's', next: 'g', inputs: {CONDITION: [2, 'c'], SUBSTACK: [2, 'w']}});
    b.c = blk('operator_lt', {parent: 'r', inputs: {OPERAND1: [3, 'v', [10, '']], OPERAND2: [1, num(1)]}});
    b.v = blk('data_variable', {parent: 'c', fields: {VARIABLE: ['timeLeft', 'tl']}});
  } else {
    // 没有判断：固定重复 15 次（比 10 多）
    b.r = blk('control_repeat', {parent: 's', next: 'g', inputs: {TIMES: [1, num(15)], SUBSTACK: [2, 'w']}});
  }
  b.w = blk('control_wait', {parent: 'r', next: 'd', inputs: {DURATION: [1, num(1)]}});
  b.d = blk('data_changevariableby', {parent: 'w', inputs: {VALUE: [1, num(-1)]}, fields: {VARIABLE: ['timeLeft', 'tl']}});
  b.g = blk('event_broadcast', {parent: 'r', inputs: {BROADCAST_INPUT: [1, [11, '游戏结束', 'bc']]}});
  return b;
}
// 课程自带的得分脚本：每等 0.5 秒，若 timeLeft > 0 才加 1 分
function scorerBlocks() {
  const b = {};
  b.h = blk('event_whenflagclicked', {topLevel: true, x: 0, y: 0, next: 'f'});
  b.f = blk('control_forever', {parent: 'h', inputs: {SUBSTACK: [2, 'w']}});
  b.w = blk('control_wait', {parent: 'f', next: 'i', inputs: {DURATION: [1, num(0.5)]}});
  b.i = blk('control_if', {parent: 'w', inputs: {CONDITION: [2, 'c'], SUBSTACK: [2, 'a']}});
  b.c = blk('operator_gt', {parent: 'i', inputs: {OPERAND1: [3, 'v', [10, '']], OPERAND2: [1, num(0)]}});
  b.v = blk('data_variable', {parent: 'c', fields: {VARIABLE: ['timeLeft', 'tl']}});
  b.a = blk('data_changevariableby', {parent: 'i', inputs: {VALUE: [1, num(1)]}, fields: {VARIABLE: ['score', 'sc']}});
  return b;
}

function project(variant) {
  return {
    targets: [
      {isStage: true, name: 'Stage', ...base(), blocks: {}, layerOrder: 0, costumes: [costume('bg', ID)],
        variables: {tl: ['timeLeft', 0], sc: ['score', 0]}, broadcasts: {bc: '游戏结束'}},
      {isStage: false, name: '学生', ...base(), blocks: studentBlocks(variant), layerOrder: 1, visible: false, x: 0, y: 0, size: 100, direction: 90, draggable: false, rotationStyle: 'all around', costumes: [costume('c', ID)]},
      {isStage: false, name: '水果', ...base(), blocks: scorerBlocks(), layerOrder: 2, visible: false, x: 0, y: 0, size: 100, direction: 90, draggable: false, rotationStyle: 'all around', costumes: [costume('c', ID)]},
    ], monitors: [], extensions: [], meta: {semver: '3.0.0', vm: '0.2.0', agent: 'probe'},
  };
}

async function run(variant, frames) {
  const vm = new VM();
  const SS = req('scratch-storage'); const Storage = typeof SS === 'function' ? SS : (SS.default || SS.ScratchStorage);
  const storage = new Storage(); vm.attachStorage(storage);
  storage.cache(storage.AssetType.ImageVector, storage.DataFormat.SVG, Buffer.from(svg), ID);
  await vm.loadProject(JSON.stringify(project(variant)));
  const stage = vm.runtime.getTargetForStage();
  const val = name => Object.values(stage.variables).find(v => v.name === name).value;
  let broadcasts = 0; let firstBroadcastFrame = null;
  vm.runtime.on('BROADCAST_FIRED', () => {});
  const origStart = vm.runtime.startHats.bind(vm.runtime);
  let frame = 0;
  vm.runtime.startHats = (opcode, ...rest) => {
    if (opcode === 'event_whenbroadcastreceived') { broadcasts++; if (firstBroadcastFrame === null) firstBroadcastFrame = frame; }
    return origStart(opcode, ...rest);
  };
  vm.runtime.currentStepTime = STEP_MS;
  // 调度器在一帧里会反复轮询正在“等待”的线程，直到有重绘请求或用掉 75% 的帧时间才退出。
  // 虚拟时钟在一帧内不走，所以第二个条件永远不会成立，必须靠重绘请求退出：每跑一遍线程就请求一次重绘，
  // 于是一帧恰好跑一遍（Scratch 兼容模式里“循环每帧一圈”的语义），结果确定且便宜。
  const seq = vm.runtime.sequencer;
  const origStepThread = seq.stepThread.bind(seq);
  seq.stepThread = thread => { origStepThread(thread); vm.runtime.requestRedraw(); };
  vm.greenFlag();
  const rows = [];
  for (frame = 1; frame <= frames; frame++) {
    virtualNow += STEP_MS;
    vm.runtime.updateCurrentMSecs();
    vm.runtime._step();
    rows.push({frame, t: Math.round(frame * STEP_MS), timeLeft: val('timeLeft'), score: val('score')});
  }
  return {variant, rows, finalTimeLeft: val('timeLeft'), finalScore: val('score'), broadcasts, firstBroadcastFrame};
}

(async () => {
  for (const variant of ['until', 'repeat15']) {
    const r = await run(variant, 600);
    const firstZero = r.rows.find(x => x.timeLeft <= 0);
    const minTL = Math.min(...r.rows.map(x => x.timeLeft));
    const scoreChanges = r.rows.filter((x, i) => i > 0 && x.score !== r.rows[i - 1].score).map(x => x.frame);
    console.log(JSON.stringify({
      variant: r.variant,
      finalTimeLeft: r.finalTimeLeft, minTimeLeft: minTL, finalScore: r.finalScore,
      firstFrameTimeLeftZeroOrLess: firstZero && firstZero.frame,
      broadcastFrame: r.firstBroadcastFrame,
      lastScoreChangeFrame: scoreChanges[scoreChanges.length - 1], scoreChanges: scoreChanges.length,
      sampleSeconds: [0, 30, 60, 150, 299, 300, 301, 330, 450].map(i => r.rows[i] && ({f: r.rows[i].frame, tl: r.rows[i].timeLeft, sc: r.rows[i].score})),
    }));
  }
  process.exit(0);
})().catch(e => { console.log('ERR', e.stack || e.message); process.exit(1); });
