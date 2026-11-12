# G2-U3-L05 变异检验：把判定、编译、校验、运行器里的 20 处逻辑故意改错，看单元测试能不能发现。
# 用法（仓库任意位置，需要先 git commit 或保证改动已提交，因为脚本用 git checkout 还原）：
#   python3 docs/curriculum/g2-u3-l05/mutate-l05.py            # 全部 20 处
#   python3 docs/curriculum/g2-u3-l05/mutate-l05.py 3 6        # 只跑下标 3..5
# 输出：KILLED = 被发现；SURVIVED = 没被发现（要补测试）；KILLED(超时) = 靠超时发现（变异让 VM 死循环）。
# 需要 apps/web/node_modules 已安装。工作树必须干净，否则最后会报 DIRTY。
import subprocess, os, sys
ROOT=subprocess.run(['git','rev-parse','--show-toplevel'],cwd=os.path.dirname(os.path.abspath(__file__)),capture_output=True,text=True,check=True).stdout.strip()
REPO=os.path.join(ROOT,'apps','web')
D='src/features/lessons/g2-u3-l05/'
muts=[
 (D+'judge.ts',"finalTime === 0\n      ? { passed: true","finalTime <= 0\n      ? { passed: true",'舞台：归零 → 小于等于 0 也算'),
 (D+'judge.ts',"const everCountedDown = trace.frames.some(f => f.timeLeft > 0)","const everCountedDown = true",'舞台：不要求真的数过'),
 (D+'judge.ts',"if (minTime < 0) problems.push","if (false) problems.push",'任务：允许负数'),
 (D+'judge.ts',"else if (trace.broadcasts.length > 1) problems.push","else if (false) problems.push",'任务：允许重复广播'),
 (D+'judge.ts',"if (changedAfter.length > 0) problems.push","if (false) problems.push",'任务：不检查广播后得分不变'),
 (D+'judge.ts',"if (scoreAtOver === 0) problems.push","if (false) problems.push",'任务：不检查倒计时期间得过分'),
 (D+'judge.ts',"if (maxTime !== level.startSeconds) problems.push","if (false) problems.push",'任务：不检查起点秒数'),
 (D+'judge.ts',"if (trace.checks.length === 0) {","if (false) {",'知识：没有检查也往下走'),
 (D+'judge.ts',"} else if (!lastCheck.result || lastCheck.value >= 1) {","} else if (false) {",'知识：不要求最后一次检查为真'),
 (D+'judge.ts',"first - lastCheck.frame > L05_PARAMS.broadcastSlackFrames","false",'知识：不要求检查与广播相连'),
 (D+'judge.ts',"const passed = stage.passed && task.passed && knowledge.passed","const passed = stage.passed && task.passed",'总体：不看知识证据'),
 (D+'judge.ts',"if (trace.endedBy === 'stopped')","if (false)",'停止也判定'),
 (D+'compile.ts',"inputs: { VALUE: [1, num(-b.by)] }","inputs: { VALUE: [1, num(b.by)] }",'编译：减少变成增加'),
 (D+'compile.ts',"operator_lt","operator_gt",'编译：条件 < 变成 >'),
 (D+'compile.ts',"runnableScripts(program).forEach","program.scripts.forEach",'编译：散积木也编译'),
 (D+'compile.ts',"num(L05_PARAMS.scoreEverySeconds)","num(1)",'编译：得分脚本间隔改了'),
 (D+'compile.ts',"OPERAND2: [1, num(0)] } })\n  mk('fv'","OPERAND2: [1, num(-100)] } })\n  mk('fv'",'编译：得分脚本不再受 timeLeft > 0 约束'),
 (D+'program.ts',"if (slot !== 'top') errors.push(`${at} “重复执行”只能放在最外层`)","if (false) errors.push(`${at} “重复执行”只能放在最外层`)",'校验：允许重复套重复'),
 (D+'program.ts',"L05_PARAMS.minStart, L05_PARAMS.maxStart)","L05_PARAMS.minStart, 9999)",'校验：起点上限不检查'),
 (D+'testing/node-vm-runner.ts',"seq.stepThread = (thread: unknown) => { origStepThread(thread); vm.runtime.requestRedraw() }","",'运行器：不请求重绘'),
]
start=int(sys.argv[1]) if len(sys.argv)>1 else 0
end=int(sys.argv[2]) if len(sys.argv)>2 else len(muts)
env=dict(os.environ); env.pop('NODE_OPTIONS',None)
res=[]
for i,(f,a,b,name) in enumerate(muts):
    if i<start or i>=end: continue
    path=os.path.join(REPO,f)
    orig=open(path,encoding='utf8').read()
    if a not in orig: res.append((i,'SKIP(未找到)',name)); continue
    try:
        open(path,'w',encoding='utf8').write(orig.replace(a,b,1))
        try:
            r=subprocess.run(['npx','vitest','--run','src/features/lessons/g2-u3-l05/'],cwd=REPO,capture_output=True,text=True,timeout=40,env=env)
            res.append((i,'KILLED' if r.returncode!=0 else 'SURVIVED',name))
        except subprocess.TimeoutExpired:
            res.append((i,'KILLED(超时)',name))
    finally:
        subprocess.run(['git','checkout','--',os.path.join('apps/web',f)],cwd=ROOT,check=True)
for x in res: print(*x)
d=subprocess.run(['git','status','--short'],cwd=ROOT,capture_output=True,text=True).stdout
print('WORKTREE CLEAN' if not d.strip() else 'DIRTY: '+d)
