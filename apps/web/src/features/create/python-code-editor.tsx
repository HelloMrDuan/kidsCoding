'use client'

import { python } from '@codemirror/lang-python'
import { indentUnit } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { EditorView, placeholder } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { useEffect, useRef, type RefObject } from 'react'

const phrases = EditorState.phrases.of({
  Find: '查找', Replace: '替换', next: '下一个', previous: '上一个', all: '全部',
  'match case': '区分大小写', regexp: '正则', 'by word': '整词匹配', replace: '替换',
  'replace all': '全部替换', close: '关闭', 'Go to line': '跳转到行', go: '跳转',
  'Fold line': '折叠代码', 'Unfold line': '展开代码',
})

export function PythonCodeEditor({ initial, editorRef, onChange }: {
  initial: string; editorRef: RefObject<EditorView | null>; onChange: (source: string) => void
}) {
  const root = useRef<HTMLDivElement>(null)
  const change = useRef(onChange)
  useEffect(() => { change.current = onChange }, [onChange])
  useEffect(() => {
    const editor = new EditorView({
      parent: root.current!,
      state: EditorState.create({ doc: initial, extensions: [
        basicSetup, python(), indentUnit.of('    '), phrases,
        EditorView.contentAttributes.of({ 'aria-label': 'Python 代码', inputmode: 'text', spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off' }),
        placeholder('在这里写下你的第一行 Python 代码'),
        EditorView.updateListener.of((update) => { if (update.docChanged) change.current(update.state.doc.toString()) }),
      ] }),
    })
    editorRef.current = editor
    return () => { editor.destroy(); editorRef.current = null }
  }, [initial, editorRef])
  return <div className="kc-python-code" ref={root} />
}
