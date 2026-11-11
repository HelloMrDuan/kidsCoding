// 用法：在 apps/web 目录下运行  node ../../docs/curriculum/g2-u3-l04/probe-touch-without-renderer.cjs
const req = id => require(require.resolve(id, {paths: [process.cwd()]}));
const VM = req('scratch-vm');
const costume = (name, id) => ({assetId: id, name, md5ext: id + '.svg', dataFormat: 'svg', rotationCenterX: 20, rotationCenterY: 20});
const base = () => ({variables: {}, lists: {}, broadcasts: {}, comments: {}, currentCostume: 0, sounds: [], volume: 100, tempo: 60});
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="red"/></svg>';
const project = {
  targets: [
    {isStage: true, name: 'Stage', ...base(), blocks: {}, layerOrder: 0, costumes: [costume('bg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')], variables: {sc: ['score', 0]}},
    {isStage: false, name: '篮子', ...base(), blocks: {}, layerOrder: 1, visible: true, x: 0, y: 0, size: 100, direction: 90, draggable: false, rotationStyle: 'all around', costumes: [costume('b', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')]},
    {isStage: false, name: '球', ...base(), layerOrder: 2, visible: true, x: 0, y: 0, size: 100, direction: 90, draggable: false, rotationStyle: 'all around', costumes: [costume('f', 'cccccccccccccccccccccccccccccccc')],
      blocks: {
        h: {opcode: 'event_whenflagclicked', next: 'i', parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true, x: 0, y: 0},
        i: {opcode: 'control_if', next: null, parent: 'h', inputs: {CONDITION: [2, 't'], SUBSTACK: [2, 's']}, fields: {}, shadow: false, topLevel: false},
        t: {opcode: 'sensing_touchingobject', next: null, parent: 'i', inputs: {TOUCHINGOBJECTMENU: [1, 'm']}, fields: {}, shadow: false, topLevel: false},
        m: {opcode: 'sensing_touchingobjectmenu', next: null, parent: 't', inputs: {}, fields: {TOUCHINGOBJECTMENU: ['篮子', null]}, shadow: true, topLevel: false},
        s: {opcode: 'motion_setx', next: null, parent: 'i', inputs: {X: [1, [4, '99']]}, fields: {}, shadow: false, topLevel: false},
      }},
  ], monitors: [], extensions: [], meta: {semver: '3.0.0', vm: '0.2.0', agent: 'probe'},
};
(async () => {
  const vm = new VM();
  const SS = req('scratch-storage'); const Storage = typeof SS === 'function' ? SS : (SS.default || SS.ScratchStorage);
  const storage = new Storage(); vm.attachStorage(storage);
  for (const id of ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'cccccccccccccccccccccccccccccccc'])
    storage.cache(storage.AssetType.ImageVector, storage.DataFormat.SVG, Buffer.from(svg), id);
  await vm.loadProject(JSON.stringify(project));
  console.log('renderer attached:', !!vm.runtime.renderer);
  vm.greenFlag();
  for (let i = 0; i < 5; i++) vm.runtime._step();
  const ball = vm.runtime.targets.find(t => t.sprite && t.sprite.name === '球');
  const basket = vm.runtime.targets.find(t => t.sprite && t.sprite.name === '篮子');
  console.log('basket and ball at same place (0,0); ball.x after "if touching basket then set x 99" =', ball.x, '(99 means touching was detected, 0 means NOT detected)');
  console.log('isTouchingSprite direct =', ball.isTouchingSprite('篮子'));
  process.exit(0);
})().catch(e => { console.log('ERR', e.message); process.exit(1); });
