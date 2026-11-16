'use client'

// 编辑槽位（EditorSlot）：本课的脚本区。共享壳按 EditorSlotProps 渲染它；
// 手机上的 添加 / 上移 / 下移 / 删除 / 改数字 都是对同一个 Blockly 工作区的操作（A1：本课自己的工具栏，
// 不走全局命令通道）。草稿只有一份：初始内容来自 props.initial，每次作品变化通过 props.onChange 交出 session.draft()。
//
// embedLevelNav / embedTaskPanel：壳不知道本课的四个关卡和预测输入，所以最终接入时由本槽位自己带上；
// 过渡课堂页已经有自己的顶栏和任务抽屉，就不重复嵌入。

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import type { EditorSlotProps } from '../../workspace/workspace-slots'
import type { L06Session } from '../session'
import { toDraft } from '../state'
import styles from './classroom.module.css'
import { LevelNav } from './level-nav'
import { ScriptEditor, type EditorHandle, type Selection } from './script-editor'
import { CollapsibleTaskPanel } from './task-panel'
import { useSession } from './use-session'

/**
 * 壳的控制通道（OPS-022，#480 的 `ShellControl`）：槽位自己的工具栏通过它调用壳的运行 / 停止 / 保存，
 * 并读到壳的运行与保存状态。槽位不自己维护第二套运行或保存状态机，也不直接读写草稿键。
 * #480 合并后 `EditorSlotProps.shell` 就是共享的 `ShellControl`；在此之前用结构相同的本地类型，字段一一对应。
 */
export type ShellControlLike = {
  run: () => void
  stop: () => void
  save: () => void
  running: boolean
  saveState: 'unsaved' | 'saved' | 'failed'
  judgment: unknown
}

const SAVE_STATE_TEXT: Record<ShellControlLike['saveState'], string> = { unsaved: '未保存', saved: '已保存到本机', failed: '未能保存' }

export type EditorSlotOptions = {
  embedLevelNav?: boolean
  embedTaskPanel?: boolean
  /** 工具栏末尾的额外控件（过渡课堂页放一个运行按钮，方便手机）。 */
  renderToolbarExtra?: () => ReactNode
}

export function L06EditorSlot({
  session, initial, onChange, onSelectionChange, editable, shell, embedLevelNav, embedTaskPanel, renderToolbarExtra,
}: EditorSlotProps & EditorSlotOptions & { session: L06Session; shell?: ShellControlLike }) {
  const { snap, view } = useSession(session)
  const [selection, setSelection] = useState<Selection>(null)
  const editorRef = useRef<EditorHandle>(null)
  const onChangeRef = useRef(onChange)
  const lastEmitted = useRef<string>(JSON.stringify(toDraft(session.getSnapshot().state)))
  useEffect(() => { onChangeRef.current = onChange })

  // 初始内容。壳在三种情况下重新挂载本槽位：
  //   1) 打开页面：initial 是已校验的草稿，或没有草稿（undefined）；
  //   2) 壳的“恢复初始”：initial 是 undefined，但会话里已经有作品 → 整体回到课程起点，并把起点回传给壳；
  //   3) 壳的“导入作品”：initial 是用户选的任意 JSON（壳不校验）→ 合法就载入；不合法就保持原作品不变，
  //      把当前作品回传给壳（避免壳的自动保存把无效内容写进草稿），并在槽位里如实显示导入失败。
  const hydrated = useRef(false)
  const [importError, setImportError] = useState<string | null>(null)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    const remount = session.noteSlotMounted()
    if (initial === undefined || initial === null) {
      // 第一次挂载且没有草稿：会话本来就是起点（或由调用方预先设好），不动它；
      // 再次挂载且 initial 为空 = 壳的“恢复初始”。
      if (remount && !session.isPristine()) {
        session.resetAll()
        lastEmitted.current = JSON.stringify(session.draft())
        onChangeRef.current(session.draft())
      }
      return
    }
    try {
      session.loadDraft(initial)
      lastEmitted.current = JSON.stringify(session.draft()) // 恢复 / 导入成功不算编辑，不回传
    } catch {
      lastEmitted.current = JSON.stringify(session.draft())
      onChangeRef.current(session.draft())
      setImportError('导入失败：这不是“水果接力挑战”的作品，原作品没有改变')
    }
  }, [initial, session])
  /* eslint-enable react-hooks/set-state-in-effect */

  // 作品变化（脚本、预测、关卡）才回传；运行结果、帧、提示不回传。
  useEffect(() => {
    const json = JSON.stringify(session.draft())
    if (json === lastEmitted.current) return
    lastEmitted.current = json
    onChangeRef.current(JSON.parse(json))
  }, [snap.state, session])

  const { content, program, fingerprint, canRun, problems } = view
  const readOnly = content.readOnly || !editable
  const role = snap.role

  const onSelect = (s: Selection) => {
    setSelection(s)
    onSelectionChange?.(s)
  }

  const body = role === 'backdrop' ? (
    <p data-testid="l6-backdrop-note">背景没有脚本。</p>
  ) : role === 'basket' ? (
    <p data-testid="l6-basket-note">篮子会跟着你的鼠标（或手指）左右移动，这是课程准备好的，不用你搭脚本。你要搭的是“水果”的脚本：点开“水果”角色。</p>
  ) : (
    <>
      {readOnly ? (
        <p className={styles.muted} data-testid="l6-readonly-note">第一关的程序已经搭好，只能看，不能改。先去“任务”里写下预测，再运行，移动篮子接水果。</p>
      ) : (
        <>
          <div className={styles.toolbar} data-testid="l6-toolbar">
            <button type="button" className={styles.btn} aria-expanded={snap.paletteOpen} data-testid="l6-add-block"
              onClick={() => session.setPaletteOpen(!snap.paletteOpen)}>添加积木</button>
            <button type="button" className={styles.btn} data-testid="l6-move-up" disabled={!selection?.canUp}
              onClick={() => editorRef.current?.moveSelected('up')} aria-label="上移选中的积木">上移</button>
            <button type="button" className={styles.btn} data-testid="l6-move-down" disabled={!selection?.canDown}
              onClick={() => editorRef.current?.moveSelected('down')} aria-label="下移选中的积木">下移</button>
            <button type="button" className={styles.btn} data-testid="l6-delete" disabled={!selection}
              onClick={() => editorRef.current?.deleteSelected()} aria-label="删除选中的积木">删除</button>
            <label>
              <span className={styles.numLabel}>{selection?.type === 'kcl6_score' ? '分数' : selection?.type === 'kcl6_repeat' ? '次数' : '数字'}</span>
              <input type="number" inputMode="numeric" data-testid="l6-number" disabled={selection?.value == null}
                value={selection?.value ?? ''} aria-label={selection?.type === 'kcl6_score' ? '选中积木的得分增量' : selection?.type === 'kcl6_repeat' ? '选中积木的重复次数' : '选中积木的数字'}
                onChange={e => { const v = e.target.value; if (v !== '' && v !== '-') editorRef.current?.setSelectedNumber(Number(v)) }} />
            </label>
            {renderToolbarExtra?.()}
            {shell && (
              <span className={styles.shellCtl} data-testid="l6-shell-ctl">
                <button type="button" className={`${styles.btn} ${shell.running ? styles.btnStop : styles.btnPrimary}`}
                  data-testid="l6-shell-run" data-running={shell.running}
                  disabled={!shell.running && view.runDisabled} title={!shell.running && view.runDisabled ? view.runReason : undefined}
                  onClick={() => (shell.running ? shell.stop() : shell.run())}>
                  {shell.running ? '停止' : '运行作品'}
                </button>
                <button type="button" className={styles.btn} data-testid="l6-shell-save" onClick={() => shell.save()}>保存</button>
                <span className={styles.muted} data-testid="l6-shell-save-state" data-state={shell.saveState}>{SAVE_STATE_TEXT[shell.saveState]}</span>
              </span>
            )}
          </div>
          {snap.paletteOpen && (
            <div className={styles.palette} data-testid="l6-palette" role="group" aria-label="素材抽屉：点一下就加到脚本里">
              <button type="button" className={`${styles.palBtn} ${styles.palEvent}`} data-testid="l6-add-flag" onClick={() => editorRef.current?.addBlock('kcl6_flag')}>当绿旗被点击</button>
              <button type="button" className={`${styles.palBtn} ${styles.palRepeat}`} data-testid="l6-add-forever" onClick={() => editorRef.current?.addBlock('kcl6_forever')}>一直重复</button>
              <button type="button" className={`${styles.palBtn} ${styles.palRepeat}`} data-testid="l6-add-repeat" onClick={() => editorRef.current?.addBlock('kcl6_repeat')}>重复执行</button>
              <button type="button" className={`${styles.palBtn} ${styles.palRepeat}`} data-testid="l6-add-iftouch" onClick={() => editorRef.current?.addBlock('kcl6_iftouch')}>如果 碰到 篮子？</button>
              <button type="button" className={`${styles.palBtn} ${styles.palSpawn}`} data-testid="l6-add-spawn" onClick={() => editorRef.current?.addBlock('kcl6_spawn')}>随机出生</button>
              <button type="button" className={`${styles.palBtn} ${styles.palFall}`} data-testid="l6-add-fall" onClick={() => editorRef.current?.addBlock('kcl6_fall')}>下落一步</button>
              <button type="button" className={`${styles.palBtn} ${styles.palScore}`} data-testid="l6-add-score" onClick={() => editorRef.current?.addBlock('kcl6_score')}>将 得分 增加</button>
              <button type="button" className={`${styles.palBtn} ${styles.palHide}`} data-testid="l6-add-hide" onClick={() => editorRef.current?.addBlock('kcl6_hide')}>隐藏</button>
            </div>
          )}
        </>
      )}
      <div className={styles.scriptHost} data-testid="l6-script-host" data-program={fingerprint}>
        <ScriptEditor
          program={program}
          editable={!readOnly}
          resetKey={snap.editorKey}
          onChange={next => session.editProgram(next)}
          onSelect={onSelect}
          handleRef={editorRef}
        />
      </div>
      {!canRun && <p className={styles.error} data-testid="l6-problems">{problems.join('；')}</p>}
    </>
  )

  return (
    <Fragment>
      {importError && <p className={styles.error} role="alert" data-testid="l6-import-error">{importError}</p>}
      {embedLevelNav && <LevelNav session={session} />}
      {embedTaskPanel && <CollapsibleTaskPanel session={session} />}
      {body}
      {/* 壳只显示三层结果；没有判定的原因（被停止、没落地、运行没完成）由课程自己如实告诉学生 */}
      {snap.notice && <p className={styles.error} role="status" data-testid="l6-run-notice">{snap.notice}</p>}
      {view.judgment?.status === 'not-judged' && <p className={styles.muted} role="status" data-testid="l6-not-judged">{view.judgment.reason}</p>}
    </Fragment>
  )
}
