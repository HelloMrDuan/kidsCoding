import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runWatchdog } from '../src/core.mjs';
import { ApiError } from '../src/api.mjs';

const MACHINE = 'm_abcdefghijklmnopqrstuvwxyz';
const HEALTHY = [
  'TJ_HEALTH={"status":"ok"}',
  'CONTAINERS=tianji-api-1|tianji-api:sealed-82b119e|Up 1h;tianji-web-1|tianji-web:static-82b119e|Up 1h;',
].join('\n');

function store(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    async get(k) { return data.has(k) ? structuredClone(data.get(k)) : null; },
    async put(k,v) { if (v == null) data.delete(k); else data.set(k, structuredClone(v)); }
  };
}
function clock() {
  let now=1760000000000;
  return {now:()=>now, sleep:async (ms)=>{now+=ms;}};
}
function fakeApi({states=['running'],out=HEALTHY,errors=[],execCode=0}={}) {
  const calls={getMachine:0,resumeMachine:0,exec:0,getOperation:0};
  return {
    calls,
    async getMachine() {
      const at=Math.min(calls.getMachine++,states.length-1);
      const x=states[at];
      if(x instanceof Error)throw x;
      return {state:x, id:MACHINE};
    },
    async resumeMachine() {
      const at=calls.resumeMachine++;
      if(errors[at])throw errors[at];
      return {id:'op1',state:'succeeded'};
    },
    async getOperation(){calls.getOperation++;return {id:'op1',state:'succeeded'};},
    async exec() {calls.exec++;return {exitCode:execCode,stdout:out};}
  };
}
function deps({api=fakeApi(),state=store(),tm=clock(),machineId=MACHINE,appDeployed=false,hold=false}={}) {
  return {api,store:state,now:tm.now,sleep:tm.sleep,log:()=>{},config:{machineId,appDeployed,hold}};
}
test('before Tianji migration running -> APP_PENDING; never exec or claim healthy', async()=>{
  const api=fakeApi(), state=store();
  const result=await runWatchdog(deps({api,state}));
  assert.equal(result.verdict,'APP_PENDING');
  assert.equal(api.calls.exec,0);
  assert.equal(api.calls.resumeMachine,0);
  const s=await state.get('status');
  assert.ok(s.lastRunAt);
  assert.ok(s.lastSuccessAt);
  assert.equal(s.lastHealthyAt,undefined);
});
test('before migration suspended -> bounded Resume -> APP_PENDING; no application calls',async()=>{
  const api=fakeApi({states:['suspended','suspended','running']});
  const result=await runWatchdog(deps({api}));
  assert.equal(result.verdict,'APP_PENDING');
  assert.equal(api.calls.resumeMachine,1);
  assert.equal(api.calls.exec,0);
});
test('owner stopped is never resumed',async()=>{
  const api=fakeApi({states:['stopped']});
  const result=await runWatchdog(deps({api}));
  assert.equal(result.verdict,'STOPPED_MANUAL');
  assert.equal(api.calls.resumeMachine,0);
});
test('suspended during maintenance hold is not resumed',async()=>{
  const api=fakeApi({states:['suspended']});
  const result=await runWatchdog(deps({api,hold:true}));
  assert.equal(result.verdict,'HELD');
  assert.equal(api.calls.resumeMachine,0);
});
test('invalid or old ID placeholder cannot call InstaBox',async()=>{
  const api=fakeApi();
  for(const id of ['', 'REPLACE_WITH_REAL_TJ_MACHINE_ID', 'tj-core-01']) {
    const result=await runWatchdog(deps({api,machineId:id}));
    assert.equal(result.verdict,'BLOCKED_CONFIG');
  }
  assert.equal(api.calls.getMachine,0);
  assert.equal(api.calls.resumeMachine,0);
});
test('after deployment verifies Tianji only, then marks application OK',async()=>{
  const api=fakeApi(),state=store();
  const result=await runWatchdog(deps({api,state,appDeployed:true}));
  assert.equal(result.verdict,'OK');
  assert.equal(api.calls.exec,1);
  assert.ok((await state.get('status')).lastHealthyAt);
});
test('after deployment missing web container -> APP_FAULT',async()=>{
  const api=fakeApi({out:HEALTHY.replace(/tianji-web-1\|[^;]+;/,'')});
  const result=await runWatchdog(deps({api,appDeployed:true}));
  assert.equal(result.verdict,'APP_FAULT');
  assert.ok(result.deep.problems.some(x=>x.includes('web')));
});
test('after deployment failed exec -> fail closed',async()=>{
  const api=fakeApi({execCode:1});
  const result=await runWatchdog(deps({api,appDeployed:true}));
  assert.equal(result.verdict,'BLOCKED_MONITOR');
});
test('auth failure -> BLOCKED_AUTH, no Resume',async()=>{
  const api=fakeApi({states:[new ApiError('no auth',{status:401})]});
  const result=await runWatchdog(deps({api}));
  assert.equal(result.verdict,'BLOCKED_AUTH');
  assert.equal(api.calls.resumeMachine,0);
});
test('capacity failure attempts exactly twice and persists episode',async()=>{
  const error=()=>new ApiError('no capacity',{code:'no_capacity',status:503});
  const api=fakeApi({states:['suspended'],errors:[error(),error(),error()]});
  const st=store();
  const result=await runWatchdog(deps({api,state:st}));
  assert.equal(result.verdict,'BLOCKED_CAPACITY');
  assert.equal(api.calls.resumeMachine,2);
  assert.equal((await st.get('episode')).attempts,2);
});
test('backup lock held means zero API calls',async()=>{
  const tm=clock(), st=store({lock:{at:tm.now(),runId:'other'}});
  const api=fakeApi();
  const result=await runWatchdog(deps({api,tm,state:st}));
  assert.equal(result.verdict,'LOCKED');
  assert.equal(api.calls.getMachine,0);
  assert.equal(api.calls.resumeMachine,0);
});

test('before Resume POST, a newly stopped machine is never woken', async()=>{
  const api=fakeApi({states:['suspended','stopped']});
  const result=await runWatchdog(deps({api}));
  assert.equal(result.verdict,'STOPPED_MANUAL');
  assert.equal(api.calls.resumeMachine,0);
});
test('before Resume POST, another actor changing machine to running prevents duplicate Resume', async()=>{
  const api=fakeApi({states:['suspended','running']});
  const result=await runWatchdog(deps({api}));
  assert.equal(result.verdict,'APP_PENDING');
  assert.equal(api.calls.resumeMachine,0);
});
