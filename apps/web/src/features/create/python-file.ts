import { MAX_NAME_LENGTH, MAX_PYTHON_BYTES } from './project-store'

export async function readPythonFile(file: File) {
  if (!/\.py$/i.test(file.name) || file.size > MAX_PYTHON_BYTES) throw new Error('请选择 128 KB 以内的 .py 文件。')
  let source: string
  try { source = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()) }
  catch { throw new Error('这个文件无法读取。请另存为 UTF-8 编码的 .py 文件再试。') }
  if (source.includes('\0')) throw new Error('此 .py 文件包含无法编辑的字符。')
  const name = (file.name.slice(0, -3).trim() || '导入的 Python 作品').slice(0, MAX_NAME_LENGTH)
  return { name, source: source.replace(/\r\n?/g, '\n') }
}
