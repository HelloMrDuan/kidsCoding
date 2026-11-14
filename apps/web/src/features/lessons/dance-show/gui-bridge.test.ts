/**
 * OPS-038 安全接口单元测试：来源校验与消息结构校验。
 * 核心纪律：postMessage('*') 禁止；event.origin 必须严格在白名单内；
 * 消息必须符合约定 schema，否则丢弃。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  createGuiMessageListener,
  isAllowedGuiOrigin,
  isValidGuiMessage,
  postToGui,
} from './gui-bridge'

const ALLOW = ['http://localhost:8601', 'https://gui.example.com']

describe('isAllowedGuiOrigin（严格相等，不用子串或通配符）', () => {
  it('白名单内的来源通过', () => {
    expect(isAllowedGuiOrigin('http://localhost:8601', ALLOW)).toBe(true)
    expect(isAllowedGuiOrigin('https://gui.example.com', ALLOW)).toBe(true)
  })

  it('不在白名单的来源拒绝', () => {
    expect(isAllowedGuiOrigin('http://localhost:8602', ALLOW)).toBe(false)
    expect(isAllowedGuiOrigin('https://evil.example.com', ALLOW)).toBe(false)
    // 子域与相似域名也不行（严格相等）
    expect(isAllowedGuiOrigin('https://gui.example.com.evil.com', ALLOW)).toBe(false)
    expect(isAllowedGuiOrigin('https://sub.gui.example.com', ALLOW)).toBe(false)
    expect(isAllowedGuiOrigin('', ALLOW)).toBe(false)
    expect(isAllowedGuiOrigin('*', ALLOW)).toBe(false)
  })
})

describe('isValidGuiMessage（结构校验）', () => {
  it('符合约定的消息通过', () => {
    expect(
      isValidGuiMessage({
        type: 'kidscoding.gui.project-state',
        version: 1,
        project: { targets: [] },
      }),
    ).toBe(true)
  })

  it('不符合约定的消息拒绝', () => {
    expect(isValidGuiMessage(null)).toBe(false)
    expect(isValidGuiMessage('hello')).toBe(false)
    expect(isValidGuiMessage({ type: 'other', version: 1, project: {} })).toBe(false)
    expect(
      isValidGuiMessage({ type: 'kidscoding.gui.project-state', version: 2, project: {} }),
    ).toBe(false)
    expect(
      isValidGuiMessage({ type: 'kidscoding.gui.project-state', version: 1 }),
    ).toBe(false)
    expect(
      isValidGuiMessage({ type: 'kidscoding.gui.project-state', version: 1, project: 'x' }),
    ).toBe(false)
  })
})

describe('createGuiMessageListener（接收端）', () => {
  it('白名单来源 + 合规消息才处理，其余丢弃并计数', () => {
    const onValid = vi.fn()
    const onRejected = vi.fn()
    const cleanup = createGuiMessageListener({
      allowlist: ALLOW,
      onValidMessage: onValid,
      onRejectedMessage: onRejected,
    })
    // 合规消息（白名单来源）
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'http://localhost:8601',
        data: {
          type: 'kidscoding.gui.project-state',
          version: 1,
          project: { targets: [] },
        },
      }),
    )
    // 非白名单来源
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://evil.example.com',
        data: {
          type: 'kidscoding.gui.project-state',
          version: 1,
          project: { targets: [] },
        },
      }),
    )
    // 白名单来源但结构不合规
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'http://localhost:8601',
        data: { type: 'something-else' },
      }),
    )
    expect(onValid).toHaveBeenCalledTimes(1)
    expect(onRejected).toHaveBeenCalledTimes(2)
    cleanup()
    // 清理后不再接收
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'http://localhost:8601',
        data: {
          type: 'kidscoding.gui.project-state',
          version: 1,
          project: { targets: [] },
        },
      }),
    )
    expect(onValid).toHaveBeenCalledTimes(1)
  })
})

describe('postToGui（发送端禁止 *）', () => {
  it('targetOrigin 为 * 或不在白名单时拒绝发送', () => {
    const iframe = document.createElement('iframe')
    // 不挂载到 DOM：contentWindow 为 null，同样返回 false，不抛错。
    expect(postToGui(iframe, { a: 1 }, '*', ALLOW)).toBe(false)
    expect(postToGui(iframe, { a: 1 }, 'https://evil.example.com', ALLOW)).toBe(false)
    expect(postToGui(null, { a: 1 }, 'http://localhost:8601', ALLOW)).toBe(false)
  })
})
