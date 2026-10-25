import { describe, expect, it } from 'vitest'
import { classifyPythonError, pythonHintLayers } from './python-error-hints'

describe('TQ-005 three-layer Python error hints', () => {
  it('classifies real Pyodide error names in order', () => {
    expect(classifyPythonError('SyntaxError: unterminated string literal')).toBe('syntax')
    expect(classifyPythonError('IndentationError: expected an indented block')).toBe('indentation')
    expect(classifyPythonError("NameError: name 'hoby' is not defined")).toBe('name')
    expect(classifyPythonError("TypeError: can only concatenate str (not \"int\") to str")).toBe('type')
    expect(classifyPythonError('ValueError: 应填写1至20字且不含换行')).toBe('value')
    expect(classifyPythonError('程序运行超时，已停止。')).toBe('timeout')
    expect(classifyPythonError('Python 引擎加载超时，请确认网络可以访问 jsDelivr，然后重试。')).toBe('engine')
    expect(classifyPythonError("NetworkError: Failed to execute 'importScripts' on 'WorkerGlobalScope'")).toBe('engine')
  })
  it('maps a wrong result without an exception to the wrong-output layers', () => {
    expect(classifyPythonError(null, true)).toBe('wrong-output')
    expect(classifyPythonError(null, false)).toBe('unknown')
  })
  it('always returns exactly three ordered layers, phenomenon first', () => {
    const probes: Array<[string | null, boolean]> = [
      ['SyntaxError: bad', false],
      ['IndentationError: bad', false],
      ['NameError: bad', false],
      ['TypeError: bad', false],
      ['ValueError: bad', false],
      ['程序运行超时，已停止。', false],
      [null, true],
      ['Python 引擎加载超时', false],
      ['Something unexpected happened', false],
    ]
    for (const [text, wrong] of probes) {
      const { layers } = pythonHintLayers(text, wrong)
      expect(layers).toHaveLength(3)
      expect(layers[0]).toMatch(/^现象：/)
      expect(layers[1]).toMatch(/^可能原因：/)
      expect(layers[2]).toMatch(/^动手修复：/)
    }
  })
  it('never claims a location it cannot know', () => {
    const { layers } = pythonHintLayers('Something unexpected happened')
    expect(layers.join('')).not.toMatch(/第\d+行|已定位/)
  })
})
