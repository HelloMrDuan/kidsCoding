'use client'

import type { ComponentProps, ReactNode } from 'react'
import styles from '../scratch-create/scratch-create.module.css'

export function Workspace({ title, status, actions, children }: { title: string; status?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.editorShell}>
      <header className={styles.editorBar}>
        <WorkspaceLink href="/create" data-testid="studio-back">← 返回</WorkspaceLink>
        <h1 data-testid="studio-title" title={title}>{title}</h1>
        {status && <span aria-live="polite">{status}</span>}
        {actions}
      </header>
      <main className={styles.editorPane}>{children}</main>
    </div>
  )
}

export function downloadWork(data: BlobPart, name: string, extension: 'sb3' | 'py') {
  const url = URL.createObjectURL(new Blob([data], { type: extension === 'py' ? 'text/x-python;charset=utf-8' : 'application/zip' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name.replace(/[<>:"/\\|?*]/g, '_').replace(new RegExp(`\\.${extension}$`, 'i'), '') + '.' + extension
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// A document navigation lets native beforeunload protect the editor history.
export function WorkspaceLink(props: ComponentProps<'a'>) {
  return <a {...props} />
}
