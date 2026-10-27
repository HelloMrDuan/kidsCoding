/**
 * UX-302: download the child's actual current Python source as a real .py file.
 * The file content is exactly the editor source; nothing is generated or faked.
 * Filename pattern mirrors the Scratch export (KidsCoding-<name>.sb3).
 */
export function buildPythonFileName(lessonId: string, when: Date = new Date()): string {
  const stamp = when.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `KidsCoding-${lessonId}-${stamp}.py`
}

export function downloadPythonFile(source: string, lessonId: string): void {
  const blob = new Blob([source], { type: 'text/x-python;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = buildPythonFileName(lessonId)
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
