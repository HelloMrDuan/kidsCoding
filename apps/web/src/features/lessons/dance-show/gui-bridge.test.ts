/**
 * OPS-038 安全接口单元测试：来源校验与消息结构校验。
 * 核心纪律：postMessage('*') 禁止；event.origin 必须严格在白名单内；
 * 消息必须符合约定 schema，否则丢弃。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  BRIDGE_MAX_PAYLOAD_BYTES,
  ScratchBridgeClient,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  bridgePayloadSize,
  createGuiMessageListener,
  isAllowedGuiOrigin,
  isBridgeMessageOversized,
  isValidBridgeEnvelope,
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

describe('isValidBridgeEnvelope（桥接信封校验）', () => {
  const good = {
    protocol: 'kidscoding-scratch-bridge',
    version: 1,
    type: 'get-project',
    requestId: 'req-1',
  }

  it('合规的请求与回复信封通过', () => {
    expect(isValidBridgeEnvelope(good)).toBe(true)
    expect(
      isValidBridgeEnvelope({
        protocol: 'kidscoding-scratch-bridge',
        version: 1,
        type: 'project',
        requestId: 'req-2',
        payload: {},
      }),
    ).toBe(true)
    for (const type of ['load-project', 'ready', 'loaded', 'error']) {
      expect(
        isValidBridgeEnvelope({ ...good, type, requestId: 'r' }),
      ).toBe(true)
    }
  })

  it('畸形信封拒绝', () => {
    expect(isValidBridgeEnvelope(null)).toBe(false)
    expect(isValidBridgeEnvelope('hello')).toBe(false)
    // 协议不对
    expect(isValidBridgeEnvelope({ ...good, protocol: 'other' })).toBe(false)
    // 版本不对
    expect(isValidBridgeEnvelope({ ...good, version: 2 })).toBe(false)
    // 未知 type 拒绝
    expect(isValidBridgeEnvelope({ ...good, type: 'explode' })).toBe(false)
    expect(
      isValidBridgeEnvelope({ ...good, type: 'kidscoding.gui.project-state' }),
    ).toBe(false)
    // requestId 缺失、为空、超长都拒绝
    expect(isValidBridgeEnvelope({ ...good, requestId: '' })).toBe(false)
    expect(
      isValidBridgeEnvelope({
        protocol: 'kidscoding-scratch-bridge',
        version: 1,
        type: 'get-project',
      }),
    ).toBe(false)
    expect(
      isValidBridgeEnvelope({ ...good, requestId: 'x'.repeat(129) }),
    ).toBe(false)
    expect(
      isValidBridgeEnvelope({ ...good, requestId: 'x'.repeat(128) }),
    ).toBe(true)
  })
})

describe('bridgePayloadSize / isBridgeMessageOversized（5MB 单条上限）', () => {
  it('小载荷不超限', () => {
    expect(
      bridgePayloadSize({
        protocol: 'kidscoding-scratch-bridge',
        version: 1,
        type: 'load-project',
        requestId: 'r',
        payload: { format: 'sb3', data: 'a'.repeat(100) },
      }),
    ).toBe(100)
    expect(
      isBridgeMessageOversized({
        protocol: 'kidscoding-scratch-bridge',
        version: 1,
        type: 'load-project',
        requestId: 'r',
        payload: { format: 'sb3', data: 'a'.repeat(100) },
      }),
    ).toBe(false)
  })

  it('超过 5MB 的载荷拒绝，恰好 5MB 不拒绝', () => {
    const over = {
      protocol: 'kidscoding-scratch-bridge',
      version: 1,
      type: 'load-project',
      requestId: 'r',
      payload: { format: 'sb3', data: 'a'.repeat(BRIDGE_MAX_PAYLOAD_BYTES + 1) },
    }
    expect(isBridgeMessageOversized(over)).toBe(true)
    const exact = {
      ...over,
      payload: { format: 'sb3', data: 'a'.repeat(BRIDGE_MAX_PAYLOAD_BYTES) },
    }
    expect(isBridgeMessageOversized(exact)).toBe(false)
    // project 回复按 byteLength 计
    expect(
      isBridgeMessageOversized({
        protocol: 'kidscoding-scratch-bridge',
        version: 1,
        type: 'project',
        requestId: 'r',
        payload: { byteLength: BRIDGE_MAX_PAYLOAD_BYTES + 1 },
      }),
    ).toBe(true)
  })
})

describe('arrayBufferToBase64 / base64ToArrayBuffer（往返）', () => {
  it('二进制往返不变', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255, 80, 75, 3, 4])
    const b64 = arrayBufferToBase64(bytes.buffer as ArrayBuffer)
    const back = new Uint8Array(base64ToArrayBuffer(b64))
    expect(Array.from(back)).toEqual(Array.from(bytes))
    expect(b64).toBe(Buffer.from(bytes).toString('base64'))
  })
})

describe('ScratchBridgeClient（桥接发送端）', () => {
  const ORIGIN = 'http://localhost:8903'
  const ALLOWLIST = [ORIGIN]

  /** 挂载一个真 iframe（contentWindow 非空），并截获它发出的 postMessage。 */
  function setupClient() {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    const posted: Array<{ msg: unknown; target: string }> = []
    const win = iframe.contentWindow
    if (!win) throw new Error('测试环境没有 iframe contentWindow')
    win.postMessage = ((msg: unknown, target: string) => {
      posted.push({ msg, target })
    }) as typeof win.postMessage
    const client = new ScratchBridgeClient({
      iframe,
      targetOrigin: ORIGIN,
      allowlist: ALLOWLIST,
      requestTimeoutMs: 5000,
    })
    client.start()
    // 用 jsdom 的 MessageEvent 把“对端回复”发给客户端；source 必须是该 iframe。
    const reply = (data: unknown, origin = ORIGIN) => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin,
          source: win,
          data,
        }),
      )
    }
    const cleanup = () => {
      client.dispose()
      iframe.remove()
    }
    return { iframe, posted, client, reply, cleanup }
  }

  it('构造时 targetOrigin 为 * 或不在白名单时直接抛错（fail-closed）', () => {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    expect(
      () =>
        new ScratchBridgeClient({
          iframe,
          targetOrigin: '*',
          allowlist: ALLOWLIST,
        }),
    ).toThrow(/\*/)
    expect(
      () =>
        new ScratchBridgeClient({
          iframe,
          targetOrigin: 'https://evil.example.com',
          allowlist: ALLOWLIST,
        }),
    ).toThrow(/白名单/)
    iframe.remove()
  })

  it('ready 宣告后兑现；get-project 收到 project 回复后解析作品', async () => {
    const { posted, client, reply, cleanup } = setupClient()
    try {
      const readyP = client.ready
      let readyDone = false
      void readyP.then(() => {
        readyDone = true
      })
      reply({
        protocol: 'kidscoding-scratch-bridge',
        version: 1,
        type: 'ready',
        requestId: 'bridge-ready',
        payload: { vmFound: true },
      })
      await readyP
      expect(readyDone).toBe(true)
      expect(client.isReady).toBe(true)

      const projectJson = JSON.stringify({
        targets: [{ isStage: true, name: 'Stage', costumes: [], sounds: [], blocks: {} }],
      })
      const sb3 = new Uint8Array([80, 75, 3, 4, 1, 2, 3]).buffer as ArrayBuffer
      const p = client.getProject()
      // 发送端用明确的 targetOrigin，永不 '*'
      expect(posted).toHaveLength(1)
      expect(posted[0].target).toBe(ORIGIN)
      const sent = posted[0].msg as Record<string, unknown>
      expect(sent.protocol).toBe('kidscoding-scratch-bridge')
      expect(sent.version).toBe(1)
      expect(sent.type).toBe('get-project')
      const requestId = sent.requestId as string
      reply({
        protocol: 'kidscoding-scratch-bridge',
        version: 1,
        type: 'project',
        requestId,
        payload: {
          format: 'sb3',
          byteLength: sb3.byteLength,
          projectJson,
          data: sb3,
        },
      })
      const res = await p
      expect(res.project.targets).toHaveLength(1)
      expect(res.byteLength).toBe(sb3.byteLength)
      expect(new Uint8Array(res.sb3)).toEqual(new Uint8Array(sb3))
    } finally {
      cleanup()
    }
  })

  it('非白名单来源与错误来源的消息被丢弃，不影响在途请求', async () => {
    const { posted, client, reply, cleanup } = setupClient()
    try {
      const p = client.getProject()
      const requestId = (posted[0].msg as Record<string, unknown>)
        .requestId as string
      // 攻击者来源的回复：丢弃
      reply(
        {
          protocol: 'kidscoding-scratch-bridge',
          version: 1,
          type: 'project',
          requestId,
          payload: { format: 'sb3', byteLength: 1, projectJson: '{}', data: new ArrayBuffer(1) },
        },
        'https://evil.example.com',
      )
      // 畸形消息：丢弃
      reply({ type: 'project', requestId })
      // 未知 type：丢弃（不兑现、不拒绝）
      reply({
        protocol: 'kidscoding-scratch-bridge',
        version: 1,
        type: 'explode',
        requestId,
        payload: {},
      })
      // 正确的回复随后到达，请求正常兑现
      const sb3 = new ArrayBuffer(3)
      reply({
        protocol: 'kidscoding-scratch-bridge',
        version: 1,
        type: 'project',
        requestId,
        payload: {
          format: 'sb3',
          byteLength: 3,
          projectJson: JSON.stringify({ targets: [] }),
          data: sb3,
        },
      })
      const res = await p
      expect(res.byteLength).toBe(3)
    } finally {
      cleanup()
    }
  })

  it('error 回复转为拒绝；超大作品回复在接收路径丢弃，不影响在途请求', async () => {
    const { posted, client, reply, cleanup } = setupClient()
    try {
      const p1 = client.getProject()
      const id1 = (posted[0].msg as Record<string, unknown>).requestId as string
      reply({
        protocol: 'kidscoding-scratch-bridge',
        version: 1,
        type: 'error',
        requestId: id1,
        payload: { code: 'busy', detail: 'another get-project is in flight' },
      })
      await expect(p1).rejects.toThrow(/busy/)

      // 超过 5MB 的回复在 onMessage 接收路径即被丢弃（纵深防御），
      // 不兑现也不拒绝在途请求；随后正确的回复仍可兑现。
      const p2 = client.getProject()
      const id2 = (posted[1].msg as Record<string, unknown>).requestId as string
      let p2Settled = false
      void p2.then(
        () => {
          p2Settled = true
        },
        () => {
          p2Settled = true
        },
      )
      reply({
        protocol: 'kidscoding-scratch-bridge',
        version: 1,
        type: 'project',
        requestId: id2,
        payload: {
          format: 'sb3',
          byteLength: BRIDGE_MAX_PAYLOAD_BYTES + 1,
          projectJson: JSON.stringify({ targets: [] }),
          data: new ArrayBuffer(1),
        },
      })
      // MessageEvent 分发是同步的：丢弃后请求仍在途，未兑现。
      await new Promise((r) => setTimeout(r, 0))
      expect(p2Settled).toBe(false)
      const sb3 = new ArrayBuffer(3)
      reply({
        protocol: 'kidscoding-scratch-bridge',
        version: 1,
        type: 'project',
        requestId: id2,
        payload: {
          format: 'sb3',
          byteLength: 3,
          projectJson: JSON.stringify({ targets: [] }),
          data: sb3,
        },
      })
      const res = await p2
      expect(res.byteLength).toBe(3)
    } finally {
      cleanup()
    }
  })

  it('get-project 回复 projectJson 超过 5MB 时拒绝（byteLength 伪装很小也不行）', async () => {
    const { posted, client, reply, cleanup } = setupClient()
    try {
      const p = client.getProject()
      const requestId = (posted[0].msg as Record<string, unknown>)
        .requestId as string
      // byteLength 声明很小（能通过接收路径的载荷检查），
      // 但 projectJson 字符串实际超大：getProject 须在解析前拒绝。
      reply({
        protocol: 'kidscoding-scratch-bridge',
        version: 1,
        type: 'project',
        requestId,
        payload: {
          format: 'sb3',
          byteLength: 3,
          projectJson: 'x'.repeat(BRIDGE_MAX_PAYLOAD_BYTES + 1),
          data: new ArrayBuffer(3),
        },
      })
      await expect(p).rejects.toThrow(/5MB/)
    } finally {
      cleanup()
    }
  })

  it('load-project 发 base64 载荷，收到 loaded 后返回 targets', async () => {
    const { posted, client, reply, cleanup } = setupClient()
    try {
      const bytes = new Uint8Array([80, 75, 3, 4, 9, 9, 9])
      const p = client.loadProject({ format: 'sb3', data: bytes.buffer as ArrayBuffer })
      expect(posted).toHaveLength(1)
      const sent = posted[0].msg as Record<string, unknown>
      expect(sent.type).toBe('load-project')
      const payload = sent.payload as Record<string, unknown>
      expect(payload.format).toBe('sb3')
      expect(new Uint8Array(base64ToArrayBuffer(payload.data as string))).toEqual(bytes)
      const requestId = sent.requestId as string
      reply({
        protocol: 'kidscoding-scratch-bridge',
        version: 1,
        type: 'loaded',
        requestId,
        payload: { targets: ['Stage', 'Abby'] },
      })
      await expect(p).resolves.toEqual(['Stage', 'Abby'])
    } finally {
      cleanup()
    }
  })

  it('load-project 超过 5MB 时发出前拒绝，不发消息', async () => {
    const { posted, client, cleanup } = setupClient()
    try {
      const big = new Uint8Array(BRIDGE_MAX_PAYLOAD_BYTES + 1)
      await expect(
        client.loadProject({ format: 'sb3', data: big.buffer as ArrayBuffer }),
      ).rejects.toThrow(/5MB/)
      expect(posted).toHaveLength(0)
    } finally {
      cleanup()
    }
  })

  it('waitUntilProjectNonEmpty 不等 ready：空作品后轮询到非空即返回', async () => {
    const { posted, client, reply, cleanup } = setupClient()
    try {
      // 全程不发 ready：先回空作品（0 targets），再回非空作品。
      const p = client.waitUntilProjectNonEmpty(5000, 10)
      // 第一次 get-project → 空作品
      await vi.waitFor(() => expect(posted.length).toBeGreaterThanOrEqual(1))
      const id1 = (posted[0].msg as Record<string, unknown>).requestId as string
      reply({
        protocol: 'kidscoding-scratch-bridge',
        version: 1,
        type: 'project',
        requestId: id1,
        payload: {
          format: 'sb3',
          byteLength: 3,
          projectJson: JSON.stringify({ targets: [] }),
          data: new ArrayBuffer(3),
        },
      })
      // 第二次 get-project → 非空作品
      await vi.waitFor(() => expect(posted.length).toBeGreaterThanOrEqual(2))
      const id2 = (posted[1].msg as Record<string, unknown>).requestId as string
      reply({
        protocol: 'kidscoding-scratch-bridge',
        version: 1,
        type: 'project',
        requestId: id2,
        payload: {
          format: 'sb3',
          byteLength: 3,
          projectJson: JSON.stringify({ targets: [{ name: 'Stage' }] }),
          data: new ArrayBuffer(3),
        },
      })
      const res = await p
      expect(res.project.targets).toHaveLength(1)
      // 一次成功的 project 回复也是存活证明，ready 同样兑现。
      await expect(client.ready).resolves.toBeUndefined()
      expect(client.isReady).toBe(true)
    } finally {
      cleanup()
    }
  })

  it('waitUntilProjectNonEmpty 单次超时后重试，不直接失败', async () => {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    const posted: Array<{ msg: unknown; target: string }> = []
    const win = iframe.contentWindow
    if (!win) throw new Error('测试环境没有 iframe contentWindow')
    win.postMessage = ((msg: unknown, target: string) => {
      posted.push({ msg, target })
    }) as typeof win.postMessage
    const client = new ScratchBridgeClient({
      iframe,
      targetOrigin: ORIGIN,
      allowlist: ALLOWLIST,
      requestTimeoutMs: 50,
    })
    client.start()
    const reply = (data: unknown) => {
      window.dispatchEvent(
        new MessageEvent('message', { origin: ORIGIN, source: win, data }),
      )
    }
    try {
      // 第一次请求故意不回（50ms 后超时），第二次回非空作品。
      const p = client.waitUntilProjectNonEmpty(5000, 10, 50)
      await vi.waitFor(() => expect(posted.length).toBeGreaterThanOrEqual(2))
      const id2 = (posted[1].msg as Record<string, unknown>).requestId as string
      reply({
        protocol: 'kidscoding-scratch-bridge',
        version: 1,
        type: 'project',
        requestId: id2,
        payload: {
          format: 'sb3',
          byteLength: 3,
          projectJson: JSON.stringify({ targets: [{ name: 'Stage' }] }),
          data: new ArrayBuffer(3),
        },
      })
      const res = await p
      expect(res.project.targets).toHaveLength(1)
    } finally {
      client.dispose()
      iframe.remove()
    }
  })
})
