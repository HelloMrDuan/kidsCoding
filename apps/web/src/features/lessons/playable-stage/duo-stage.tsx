'use client'

import { useEffect, useState } from 'react'
import { useBlockExecutor } from './use-block-executor'
import styles from './duo-stage.module.css'
import { duoLessonHints } from '@/content/curriculum/launch-lessons'
import { getKidsBlockLabel, quoteBlock } from '@/features/lessons/blockly/block-labels'

function Friend({ bear = false }: { bear?: boolean }) {
  return <svg viewBox="0 0 80 80" aria-hidden="true">
    {bear ? <><circle cx="20" cy="22" r="13" fill="#a36a43"/><circle cx="60" cy="22" r="13" fill="#a36a43"/></> :
      <><path d="M12 38 10 6 35 24M45 24 70 6 68 38" fill="#d96729"/><path d="m16 25-1-11 12 13m26 0 12-13-1 11" fill="#ffe0bd"/></>}
    <ellipse cx="40" cy="44" rx="31" ry="29" fill={bear ? '#b47b51' : '#ed853f'}/>
    <path d="M13 44Q24 44 40 60Q56 44 67 44Q65 72 40 73Q15 72 13 44" fill="#fff2dc"/>
    <ellipse cx="28" cy="40" rx="3" ry="4" fill="#332f27"/><ellipse cx="52" cy="40" rx="3" ry="4" fill="#332f27"/>
    <path d="M35 56Q40 52 45 56L40 61Z" fill="#332f27"/><path d="M34 64Q40 68 46 64" fill="none" stroke="#332f27" strokeWidth="2" strokeLinecap="round"/>
  </svg>
}


export function DuoStage({ blocks, requiredBlocks, stepIndex, onRunSuccess, onRunClear, dialogue = false, graduation = false }: {
  blocks: Array<{ type: string }>
  requiredBlocks: string[]
  stepIndex: number
  onRunSuccess: () => void
  onRunClear: () => void
  dialogue?: boolean
  graduation?: boolean
}) {
  const executor = useBlockExecutor(blocks, requiredBlocks, stepIndex, graduation ? 'graduation' : dialogue ? 'dialogue' : true)
  const activeHints = duoLessonHints[graduation ? 'lesson-12-graduation-show' : dialogue ? 'lesson-11-duo-rehearsal' : 'lesson-10-second-friend']
  const [prediction, setPrediction] = useState<'bear' | 'both' | null>(null)
  const [observedMistake, setObservedMistake] = useState(false)
  const [reflection, setReflection] = useState<'own' | 'together' | null>(null)
  const [hintCount, setHintCount] = useState(0)
  const { executionState, characterPosition, partnerPosition, activeActor, characterMessage } = executor
  const ready = executionState === 'success' && (stepIndex !== 0 || prediction !== null) &&
    (stepIndex !== 3 || observedMistake) && (stepIndex !== 4 || reflection === 'own')

  useEffect(() => {
    if (ready) onRunSuccess()
    else onRunClear()
  }, [ready, onRunSuccess, onRunClear])

  // Capture the observed result once; keep it when the child edits the repair.
  if (!observedMistake && stepIndex === 3 && executionState === 'error' &&
    (graduation ? characterPosition === 100 && partnerPosition === 100 : dialogue ? characterMessage === '你好！' && executor.partnerMessage === null && characterPosition === 100 && partnerPosition === 100 : characterPosition === 200 && partnerPosition === 0)) {
    setObservedMistake(true)
  }

  return <section className={`${styles.stage} ${dialogue || graduation ? styles.dialogueStage : ''} ${graduation ? styles.graduationStage : ''}`} data-testid="lesson-playable-stage" aria-label="双角色运行舞台">
    <div className={styles.heading}>
      <div><p className={styles.eyebrow}>森林朋友 · {graduation ? '毕业寻宝' : dialogue ? '各自的声音' : '独立行动'}</p><h3>{graduation ? '不同的距离，一起找到礼物' : dialogue ? '小熊的对白，交给小熊说' : '两位朋友，各走自己的路'}</h3></div>
      <span className={styles.badge}>一次移动 = 100 步</span>
    </div>
    {stepIndex === 0 && <div className={styles.activity}>
      <p>小狐狸和小熊都在各自的 <strong>0 步起点</strong>。{graduation ? '狐狸在 100 步守住路标，小熊要走到 200 步寻找礼物。两个目标都到位才找到礼物。' : dialogue ? '今天排练出发：各走 100 步后，只有小熊说“我们一起出发吧！”。' : '它们要分别走到 100 步的野餐旗。'}</p>
      <p>先猜一猜：切换到小熊后，下一块{graduation ? `移动后的${quoteBlock('repeat_twice')}会让谁再走 100 步？` : dialogue ? '“说一句话”会让谁说话？' : `${quoteBlock('move_right')}会让谁走？`}</p>
      <div className={styles.buttons}>
        <button data-testid="duo-predict-bear" aria-pressed={prediction === 'bear'} onClick={() => setPrediction('bear')}>只有小熊</button>
        <button data-testid="duo-predict-both" aria-pressed={prediction === 'both'} onClick={() => setPrediction('both')}>两个一起</button>
      </div>
      {prediction && <p role="status">记住你的预测，接下来亲自运行验证。猜错也可以继续实验。</p>}
    </div>}
    {stepIndex === 3 && <div className={styles.activity} data-testid="duo-debug-task">
      <strong>{graduation ? '实验：小熊少走一次' : dialogue ? '实验：故意把对白交错朋友' : '实验：故意漏掉切换'}</strong>
      <p>{graduation ? '清空重拼：开始 → 狐狸移动 → 切换 → 小熊移动。亲自运行，观察礼物为什么没有出现。再给小熊补一次移动。' : dialogue ? '清空重拼：开始 → 移动 → 说话 → 切换 → 移动。亲自运行，观察是谁开口。再把说话移到切换之后。' : `清空积木，亲自拼“开始时 → ${getKidsBlockLabel('move_right')} → ${getKidsBlockLabel('move_right')}”并运行。观察小熊，再修好程序。`}</p>
      <p>{observedMistake ? graduation ? '已观察：狐狸 100 步，小熊只有 100 步，礼物尚未找到。给小熊补上 100 步，再试一次。' : dialogue ? '已观察：两位朋友各走了 100 步，但狐狸开口，小熊没有目标对白。现在把说话交给小熊。' : '已观察：小狐狸走了 200 步，小熊仍在 0 步。现在把切换补在两次移动中间。' : '这一关需要先观察真实错误结果，再修复。'}</p>
    </div>}
    <div className={styles.toolbar}>
      <p data-testid="duo-active-actor">当前操作：<strong>{activeActor === 'main' ? '小狐狸' : '小熊'}</strong></p>
      <div className={styles.buttons}>
        <button data-testid="reset-code-button" onClick={() => { executor.reset(); onRunClear() }}>重置舞台</button>
        <button className={styles.run} data-testid="run-code-button" disabled={executionState === 'running' || (stepIndex === 0 && prediction === null)}
          onClick={() => { onRunClear(); void executor.run() }}>{executionState === 'running' ? '正在行动…' : '▶ 运行积木'}</button>
      </div>
    </div>
    <div className={styles.landscape}>
      <div className={styles.sky} aria-hidden="true">☁　☀　☁</div>
      {([{ label: '小狐狸', position: characterPosition, bear: false, active: activeActor === 'main', goal: stepIndex === 0 ? 0 : 100 },
        { label: '小熊', position: partnerPosition, bear: true, active: activeActor === 'partner', goal: graduation ? stepIndex < 2 ? 0 : 200 : (dialogue ? stepIndex === 0 : stepIndex < 2) ? 0 : 100 }]).map(friend =>
        <div key={friend.label} className={styles.lane}>
          <div className={styles.laneLabel}><strong>{friend.label}</strong><span data-testid={friend.bear ? 'duo-bear-distance' : 'duo-fox-distance'}>已走 {friend.position} / 目标 {friend.goal} 步</span></div>
          <div className={styles.track}>
            <div className={styles.flag} style={graduation ? { left: `${friend.bear ? 85 : 42.5}%` } : undefined} aria-hidden="true">⚑<small>{graduation && friend.bear ? 200 : 100}</small></div>
            <div className={`${styles.friend} ${friend.active ? styles.active : ''}`}
              data-testid={friend.bear ? 'stage-character-partner' : 'stage-character-main'} data-position={friend.position}
              style={{ left: `${graduation ? Math.min(friend.position, 235) * .425 : Math.min(friend.position, 200) / 2}%` }}>
              <Friend bear={friend.bear}/><span>{executor.actorActions[friend.bear ? 'partner' : 'main'] === 'moving' ? '正在移动' : executor.actorActions[friend.bear ? 'partner' : 'main'] === 'speaking' ? '正在说话' : friend.active ? '正在操作' : '等待指令'}</span>
              {(friend.bear ? executor.partnerMessage : characterMessage) && <em data-testid={friend.bear ? 'duo-bear-message' : 'duo-fox-message'}>{friend.bear ? executor.partnerMessage : characterMessage}</em>}
            </div>
            <span className={styles.start}>0</span>
          </div>
        </div>)}
    </div>
    {graduation && <div className={styles.gift} data-testid="graduation-gift" data-found={String(executor.giftFound)}>
      <svg viewBox="0 0 60 60" aria-hidden="true"><path d="M8 26h44v28H8z" fill="#dfa848"/><path d="M5 19h50v12H5z" fill="#efc56e"/><path d="M26 19h8v35h-8z" fill="#497459"/><path d="M30 19C8 17 15 2 25 10l5 9c22-2 15-17 5-9z" fill="none" stroke="#497459" strokeWidth="4"/></svg>
      <div><strong>{executor.giftFound ? '礼物已找到！' : '礼物等待两位朋友到位'}</strong><p>{executor.giftFound ? '已验证：狐狸 100 步、小熊 200 步。重跑会重新寻找；重置会收起礼物。' : '目标：狐狸 100 步，小熊 200 步。只拼积木或只到一个目标都不会找到礼物。'}</p></div>
    </div>}
    {dialogue && <div className={styles.dialogueBoard} data-testid="duo-dialogue-board" aria-label="角色对白记录">
      <p><strong>小狐狸说：</strong><span data-testid="duo-fox-speech-record">{characterMessage ?? '还没有说话'}</span></p>
      <p><strong>小熊说：</strong><span data-testid="duo-bear-speech-record">{executor.partnerMessage ?? '还没有说话'}</span></p>
      <small>{stepIndex >= 2 ? '本关目标：小熊说“我们一起出发吧！”；作品关卡可另加狐狸问候。' : '本关先观察或移动，两个对白都留空。'}</small>
    </div>}
    <div className={styles.result} role="status" aria-live="polite" data-testid="duo-result">
      {executionState === 'idle' && '先拼好积木，再运行。重置只恢复舞台，保留你的代码。'}
      {executionState === 'running' && '按顺序执行中，注意当前操作的朋友。'}
      {executionState === 'error' && <strong className={styles.error}>{executor.errorMessage}</strong>}
      {executionState === 'success' && <><strong>运行成功！两个角色的{dialogue ? '位置和对白' : '位置'}符合本关目标。</strong>
        {stepIndex === 3 && !observedMistake && <p>还需要先完成上面的错误实验。</p>}
        {stepIndex === 2 && <p>{graduation ? '小熊再走一次，到达 200 步；狐狸仍停在 100 步。重复动作也只给当前角色。' : dialogue ? '小熊说出了出发对白，小狐狸没有跟着说。对白也有自己的角色归属。' : '小狐狸停在 100 步，小熊接着走。切换的是操作权，已经走过的位置不会变。'}</p>}
        {ready && <p>可以点击“完成这一关”继续。</p>}</>}
    </div>
    {executor.actionLog.length > 0 && <ol className={styles.log} data-testid="duo-action-log">{executor.actionLog.map((line, i) => <li key={i}>{line}</li>)}</ol>}
    <div className={styles.buttons}><button data-testid="duo-show-hint" disabled={hintCount === activeHints.length} onClick={() => setHintCount(count => count + 1)}>看看提示（{hintCount}/3）</button></div>
    {activeHints.slice(0, hintCount).map((hint, i) => <p className={styles.hint} key={hint}>{i + 1}. {hint}</p>)}
    {stepIndex === 4 && <div className={styles.activity}>
      <strong>{graduation ? '我的毕业寻宝作品' : dialogue ? '我的出发排练作品' : '我的野餐作品'}</strong><p>{graduation ? `选一种方案：小熊移动后接${quoteBlock('repeat_twice')}，或给小熊接两块移动。还可以给狐狸加问候、给小熊加庆祝话。保持狐狸 100 步、小熊 200 步，再运行验证。` : dialogue ? '保留小熊的出发对白，也可以在切换前给狐狸另加“你好！”。两位朋友各走 100 步，目标对白仍由小熊说。' : '你可以保留两位朋友各走 100 步，也可以在切换前给小狐狸加一句问候。两种作品都能过关。'}</p>
      <p>想一想：为什么{graduation ? '小熊再做一次时，狐狸仍停在 100 步？' : dialogue ? '小熊说话时，狐狸不会跟着说？' : '两位朋友不会一起移动？'}</p>
      <div className={styles.buttons}>
        <button data-testid="duo-reflect-own" aria-pressed={reflection === 'own'} onClick={() => setReflection('own')}>动作只给当前角色</button>
        <button data-testid="duo-reflect-together" aria-pressed={reflection === 'together'} onClick={() => setReflection('together')}>{dialogue ? '说话会让所有角色开口' : '移动会让所有角色走'}</button>
      </div>
      {reflection && <p data-testid="duo-reflection">{reflection === 'own' ? dialogue ? '对！两个角色各有自己的对白，切换决定后面的说话交给谁。' : '对！两个角色各有自己的位置，切换只改变后面动作的目标。' : dialogue ? '再看对白记录：小熊开口时，狐狸的对白不会改变。说话只给当前角色。' : '再观察两条轨道：第一块移动时，小熊还在原地。移动只给当前角色。'}</p>}
      <p>完成后记录本机作品；当前编辑草稿只保留在本浏览器会话。这里是编程练习，不是认证成绩。</p>
    </div>}
  </section>
}
