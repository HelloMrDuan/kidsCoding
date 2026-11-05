'use client'

// 编辑槽位（EditorSlot）：本课的脚本区。共享壳按 EditorSlotProps 渲染它；
// 手机上的 添加 / 上移 / 下移 / 删除 / 改数字 都是对同一个 Blockly 工作区的操作（A1：本课自己的工具栏，
// 不走全局命令通道）。草稿只有一份：初始内容来自 props.initial，每次作品变化通过 props.onChange 交出 session.draft()。
//
// embedLevelNav / embedTaskPanel：壳不知道本课的四个关卡和预测输入，所以最终接入时由本槽位自己带上；
// 过渡课堂页已经有自己的顶栏和任务抽屉，就不重复嵌入。

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import type { EditorSlotProps } from '../../workspace/workspace-slots'
import { L02_PARAMS } from '../params'
import type { L02Session } from '../session'
import { toDraft } from '../state'
import styles from './classroom.module.css'
import { LevelNav } from './level-nav'
import { ScriptEditor, type EditorHandle, type Selection } from './script-editor'
import { TaskPanel } from './task-panel'
import { useSession } from './use-session'

export type EditorSlotOptions = {
  embedLevelNav?: boolean
  embedTaskPanel?: boolean
  /** 工具栏末尾的额外控件（过渡课堂页放一个运行按钮，方便手机）。 */
  renderToolbarExtra?: () => ReactNode
}

export function L02EditorSlot({
  session, initial, onChange, onSelectionChange, editable, embedLevelNav, embedTaskPanel, renderToolbarExtra,
}: EditorSlotProps & EditorSlotOptions & { session: L02Session }) {
  const { snap, view } = useSession(session)
  const [selection, setSelection] = useState<Selection>(null)
  const editorRef = useRef<EditorHandle>(null)
  const onChangeRef = useRef(onChange)
  const lastEmitted = useRef<string>(JSON.stringify(toDraft(session.getSnapshot().state)))
  useEffect(() => { onChangeRef.current = onChange })

  // 初始内容（草稿恢复）：只在挂载时载入一次；不合法就忽略，保持课程起点，不覆盖好草稿。
  const hydrated = useRef(false)
  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    if (initial === undefined || initial === null) return
    try {
      session.loadDraft(initial)
      lastEmitted.current = JSON.stringify(session.draft()) // 恢复不算编辑，不回传
    } catch {
      /* 壳用 validateDraft 先过滤；这里兜底，保持起点 */
    }
  }, [initial, session])

  // 作品变化（脚本、预测、关卡）才回传；运行结果、帧、提示不回传。
  useEffect(() => {
    const json = JSON.stringify(session.draft())
    if (json === lastEmitted.current) return
    lastEmitted.current = json
    onChangeRef.current(JSON.parse(json))
  }, [snap.state, session])

  const { content, level, program, fingerprint, canRun, problems } = view
  const readOnly = content.readOnly || !editable
  const role = snap.role

  const fruitScript = [
    { text: '当绿旗被点击', color: '#c9a300', indent: false },
    { text: `移到 x: ${level.fruitX} y: ${L02_PARAMS.fruitStartY}`, color: '#4a6cd4', indent: false },
    { text: '重复执行（直到落到篮子下面）', color: '#d98a1d', indent: false },
    { text: `将 y 坐标增加 ${-level.fallSpeed}`, color: '#4a6cd4', indent: true },
  ]

  const onSelect = (s: Selection) => {
    setSelection(s)
    onSelectionChange?.(s)
  }

  const body = role === 'fruit' ? (
    <div data-testid="l2-fruit-script">
      <p className={styles.muted}>水果的脚本是课程准备好的，只能看，不能改。看看它是怎么落下来的。</p>
      <ol className={styles.readonlyList}>
        {fruitScript.map(s => <li key={s.text} className={s.indent ? styles.indent : ''} style={{ background: s.color }}>{s.text}</li>)}
      </ol>
    </div>
  ) : role === 'backdrop' ? (
    <p data-testid="l2-backdrop-note">背景（果园）没有脚本。</p>
  ) : (
    <>
      {readOnly ? (
        <p className={styles.muted} data-testid="l2-readonly-note">第一关的程序已经搭好，只能看，不能改。先去“任务”里写下预测，再运行。</p>
      ) : (
        <>
          <div className={styles.toolbar} data-testid="l2-toolbar">
            <button type="button" className={styles.btn} aria-expanded={snap.paletteOpen} data-testid="l2-add-block"
              onClick={() => session.setPaletteOpen(!snap.paletteOpen)}>添加积木</button>
            <button type="button" className={styles.btn} data-testid="l2-move-up" disabled={!selection?.canUp}
              onClick={() => editorRef.current?.moveSelected('up')} aria-label="上移选中的积木">上移</button>
            <button type="button" className={styles.btn} data-testid="l2-move-down" disabled={!selection?.canDown}
              onClick={() => editorRef.current?.moveSelected('down')} aria-label="下移选中的积木">下移</button>
            <button type="button" className={styles.btn} data-testid="l2-delete" disabled={!selection}
              onClick={() => editorRef.current?.deleteSelected()} aria-label="删除选中的积木">删除</button>
            <label>
              数字
              <input type="number" inputMode="numeric" data-testid="l2-number" disabled={selection?.value == null}
                value={selection?.value ?? ''} aria-label="选中积木的数字"
                onChange={e => { const v = e.target.value; if (v !== '' && v !== '-') editorRef.current?.setSelectedNumber(Number(v)) }} />
            </label>
            {renderToolbarExtra?.()}
          </div>
          {snap.paletteOpen && (
            <div className={styles.palette} data-testid="l2-palette" role="group" aria-label="素材抽屉：点一下就加到脚本里">
              <button type="button" className={`${styles.palBtn} ${styles.palEvent}`} data-testid="l2-add-flag" onClick={() => editorRef.current?.addBlock('kcl2_flag')}>当绿旗被点击</button>
              <button type="button" className={`${styles.palBtn} ${styles.palMove}`} data-testid="l2-add-move" onClick={() => editorRef.current?.addBlock('kcl2_move')}>将 x 坐标增加</button>
              <button type="button" className={`${styles.palBtn} ${styles.palRepeat}`} data-testid="l2-add-repeat" onClick={() => editorRef.current?.addBlock('kcl2_repeat')}>重复执行</button>
            </div>
          )}
        </>
      )}
      <div className={styles.scriptHost} data-testid="l2-script-host" data-program={fingerprint}>
        <ScriptEditor
          program={program}
          editable={!readOnly}
          resetKey={snap.editorKey}
          onChange={next => session.editProgram(next)}
          onSelect={onSelect}
          handleRef={editorRef}
        />
      </div>
      {!canRun && <p className={styles.error} data-testid="l2-problems">{problems.join('；')}</p>}
    </>
  )

  return (
    <Fragment>
      {embedLevelNav && <LevelNav session={session} />}
      {embedTaskPanel && <TaskPanel session={session} />}
      {body}
    </Fragment>
  )
}
