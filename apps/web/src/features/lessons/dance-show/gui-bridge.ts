import type {
  RunObservations,
  ScratchProject,
} from './evaluate-project'

/**
 * OPS-038《我的舞蹈秀》GUI ↔ 课程层安全接口。
 *
 * 背景：官方 Scratch GUI（standalone 独立部署）是唯一真实项目编辑环境，
 * KidsCoding 的学习层只做引导与评价。作品状态要从 GUI 传给课程层，
 * 必须走受控接口，绝对不允许用不受约束的 postMessage('*') 接收或处理
 * 非可信消息。
 *
 * 本文件规定两条真实存在的数据通道（按优先级）：
 *
 * 通道一（当前样板实际使用）：用户主动导出文件。
 *   孩子在 GUI 里用自带的“文件 → 保存到你的电脑”导出 .sb3，再在学习层
 *   用文件选择器选中该文件；学习层在浏览器本地解析 project.json 并评价。
 *   安全属性：完全由用户主动发起；不经过任何跨源消息；解析只在本地进行，
 *   不上传、不落库；.sb3 内容只被当作数据解析，不当作代码执行。
 *
 * 通道二（正式产品接入的受控消息接口，本样板已实现接收端并实测）：
 *   未来正式的 GUI 宿主页面（用官方 createStandaloneRoot + EditorState
 *   搭建，不改 GUI 源码）会向课程层发送作品状态消息。接收端必须：
 *   1) 只接受白名单里的来源 origin（严格相等比较，不用子串、不含通配符）；
 *   2) 只接受符合约定 schema 的消息（type + version + project）；
 *   3) 发送端必须用明确的 targetOrigin，禁止 '*';
 *   4) 不符合以上任一条的消息直接丢弃，不处理、不回传、不记录敏感内容。
 *   官方 standalone 构建本身不提供 postMessage 接口（实测：源码中无
 *   postMessage、无 window.vm），所以本样板不伪造“GUI 已在发消息”的假象：
 *   接收端已实现并经测试验证，但当前 GUI 不主动发消息，实际数据走通道一。
 *
 * 禁止：postMessage('*') 发送或接收；event.origin 不校验就处理消息；
 * 把收到的消息内容当作代码执行（eval / new Function / innerHTML 注入）。
 */

/** GUI 消息的约定格式（正式桥接时发送端与接收端共同遵守）。 */
export interface GuiProjectMessage {
  type: 'kidscoding.gui.project-state'
  version: 1
  /** 作品的 project.json 对象（角色、造型、背景、声音、脚本）。 */
  project: unknown
  /** 发送端声称的来源（接收端仍以 event.origin 为准，不信任本字段）。 */
  source?: 'scratch-gui'
}

/**
 * 默认允许的 GUI 来源。只读环境变量，未配置时返回空白名单（fail-closed）：
 * 没有配置的 GUI 地址，就不接受任何来源的消息，也不渲染指向 localhost
 * 的 iframe。生产部署必须用环境变量配好真实地址。
 * 支持 NEXT_PUBLIC_SCRATCH_GUI_ORIGINS（逗号分隔多来源）或单个
 * NEXT_PUBLIC_SCRATCH_GUI_URL。
 */
export function defaultGuiOriginAllowlist(): string[] {
  const fromEnv =
    process.env.NEXT_PUBLIC_SCRATCH_GUI_ORIGINS ??
    process.env.NEXT_PUBLIC_SCRATCH_GUI_URL ??
    ''
  return fromEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      try {
        return new URL(s).origin
      } catch {
        return s
      }
    })
}

/**
 * 严格的来源校验：只有与白名单某一项严格相等才算通过。
 * 不用 includes/startsWith/通配符，避免把攻击者子域或相似域名放进来。
 */
export function isAllowedGuiOrigin(
  origin: string,
  allowlist: string[],
): boolean {
  if (!origin || typeof origin !== 'string') return false
  return allowlist.some((allowed) => allowed !== '' && origin === allowed)
}

/** 严格的消息结构校验：type 与 version 必须完全匹配，project 必须是对象。 */
export function isValidGuiMessage(data: unknown): data is GuiProjectMessage {
  if (!data || typeof data !== 'object') return false
  const msg = data as Record<string, unknown>
  if (msg.type !== 'kidscoding.gui.project-state') return false
  if (msg.version !== 1) return false
  if (!msg.project || typeof msg.project !== 'object') return false
  return true
}

export interface GuiMessageListenerOptions {
  allowlist: string[]
  onValidMessage: (msg: GuiProjectMessage, origin: string) => void
  /** 收到不合规消息时的回调（默认静默丢弃；测试时可用来计数）。 */
  onRejectedMessage?: (reason: string, origin: string) => void
}

/**
 * 创建 GUI 消息接收端。返回清理函数（移除监听器）。
 * 安全要点：
 * - 只处理 event.origin 在白名单里的消息；
 * - 只处理符合 schema 的消息；
 * - 其余一律丢弃，不处理、不回传。
 * 发送端必须用明确的 targetOrigin 调用 postMessage，禁止 '*'。
 */
export function createGuiMessageListener(
  options: GuiMessageListenerOptions,
): () => void {
  const { allowlist, onValidMessage, onRejectedMessage } = options
  const handler = (event: MessageEvent) => {
    if (!isAllowedGuiOrigin(event.origin, allowlist)) {
      onRejectedMessage?.('origin-not-allowed', event.origin)
      return
    }
    if (!isValidGuiMessage(event.data)) {
      onRejectedMessage?.('invalid-schema', event.origin)
      return
    }
    onValidMessage(event.data, event.origin)
  }
  window.addEventListener('message', handler)
  return () => window.removeEventListener('message', handler)
}

/**
 * 向 GUI iframe 发送消息。targetOrigin 必须是白名单里的明确来源，禁止 '*'。
 * 若目标来源不在白名单里，直接拒绝发送并返回 false。
 */
export function postToGui(
  iframe: HTMLIFrameElement | null,
  message: unknown,
  targetOrigin: string,
  allowlist: string[],
): boolean {
  if (!iframe?.contentWindow) return false
  if (targetOrigin === '*') return false
  if (!isAllowedGuiOrigin(targetOrigin, allowlist)) return false
  iframe.contentWindow.postMessage(message, targetOrigin)
  return true
}

/**
 * 同源时读取 GUI iframe 的 DOM 文本（用于实时提示，非权威评价）。
 * 跨源时浏览器会抛错，返回 null（调用方改走通道一的文件评价）。
 * 本函数只读不写，不向 iframe 注入脚本。
 */
export function readGuiDomText(iframe: HTMLIFrameElement | null): string | null {
  if (!iframe) return null
  try {
    const doc = iframe.contentDocument
    if (!doc) return null
    return doc.body?.textContent ?? null
  } catch {
    // 跨源 iframe：按同源策略无法读取，属预期行为，不是错误。
    return null
  }
}

/* =====================================================================
 * OPS-038 Round 2（P1）：桥接发送端。
 *
 * 与 P1 桥接原型（back-instabox /data/home/ops-038-bridge-test/，
 * 端到端 8/8 PASS）同一协议。GUI 宿主页面（bridge-host.html +
 * bridge.js，用官方 dist 库构建，不改 GUI 源码）是发送端的对端：
 * 它从 EditorState.store.getState().scratchGui.vm 取作品，
 * 课程层（本文件）是请求方。
 *
 * 信封：{protocol: 'kidscoding-scratch-bridge', version: 1,
 *   type, requestId, payload?}
 * 父 → 桥：get-project（取当前作品）、load-project（载入作品）。
 * 桥 → 父：ready（加载后宣告）、project（.sb3 ArrayBuffer +
 *   projectJson 字符串，用 transfer 传递）、loaded、error。
 * 安全（与接收端同一标准）：
 * - 回复只接受 origin 与 targetOrigin 严格相等、且 event.source
 *   是该 iframe 的 contentWindow 的消息；
 * - 信封结构校验（protocol/version/type/requestId，requestId ≤128 字符）；
 * - 单条载荷上限 5MB（5242880 字节），超限拒绝；
 * - 发送一律 postMessage(msg, targetOrigin)，永不 '*'；
 *   targetOrigin 不在白名单里时拒绝发送。
 * 已知局限（原型报告 §5，如实记录，不冒充已解决）：
 * - 原型 bridge.js 在 window load 时宣告 ready，早于默认作品加载
 *   完成约 1–3 秒（此时 get-project 返回空作品 0 targets）。
 *   本客户端收到 ready 后会轮询 get-project 直到 targets 非空
 *   才启用“检查我的作品”（waitUntilProjectNonEmpty）；且轮询不等 ready
 *   ——ready 只发一次，若在监听挂载前就已发出，单靠它会永远等不到。
 * - get-project 同一时间只允许一个在途（对端 busy 时回 error）；
 *   load-project 并发未加锁，调用方不要并发调用。
 * ===================================================================== */

export const BRIDGE_PROTOCOL = 'kidscoding-scratch-bridge'
export const BRIDGE_VERSION = 1
/** 单条消息载荷上限（与原型 bridge.js 的 MAX_PAYLOAD_BYTES 一致）。 */
export const BRIDGE_MAX_PAYLOAD_BYTES = 5 * 1024 * 1024
export const BRIDGE_MAX_REQUEST_ID_LEN = 128

export type BridgeRequestType = 'get-project' | 'load-project'
export type BridgeResponseType = 'ready' | 'project' | 'loaded' | 'error'
export type BridgeMessageType = BridgeRequestType | BridgeResponseType

export interface BridgeEnvelope {
  protocol: string
  version: number
  type: BridgeMessageType
  requestId: string
  payload?: Record<string, unknown>
}

/** 桥回传的当前作品（project 消息的 payload）。 */
export interface BridgeProjectPayload {
  format: 'sb3'
  byteLength: number
  /** project.json 字符串（不是对象；调用方自行 JSON.parse 并校验）。 */
  projectJson: string
  /** 完整 .sb3 二进制（transfer 传递，接收后即归属本页）。 */
  data: ArrayBuffer
  /**
   * 可选的真实运行观测值（原型 bridge.js 不发本字段，见局限说明）。
   * 只有对端明确发来时才有；没有时评价按“未观测到实际运行过程”标注，
   * 不伪造。
   */
  observations?: RunObservations
}

export interface BridgeLoadedPayload {
  targets: string[]
}

export interface BridgeErrorPayload {
  code: string
  detail: string
}

const BRIDGE_TYPES: readonly string[] = [
  'get-project',
  'load-project',
  'ready',
  'project',
  'loaded',
  'error',
]

/** 严格的桥接信封校验：protocol/version/type/requestId 必须全部合规。 */
export function isValidBridgeEnvelope(data: unknown): data is BridgeEnvelope {
  if (!data || typeof data !== 'object') return false
  const msg = data as Record<string, unknown>
  if (msg.protocol !== BRIDGE_PROTOCOL) return false
  if (msg.version !== BRIDGE_VERSION) return false
  if (typeof msg.type !== 'string' || !BRIDGE_TYPES.includes(msg.type)) {
    return false
  }
  if (
    typeof msg.requestId !== 'string' ||
    msg.requestId.length === 0 ||
    msg.requestId.length > BRIDGE_MAX_REQUEST_ID_LEN
  ) {
    return false
  }
  return true
}

/**
 * 估算一条桥接消息的载荷字节数（保守上界）：
 * - load-project：payload.data 是 base64 字符串，用其长度作上界；
 * - project 回复：payload.byteLength 是 .sb3 真实字节数。
 * 其余消息载荷记为 0。
 */
export function bridgePayloadSize(data: unknown): number {
  if (!data || typeof data !== 'object') return 0
  const msg = data as Record<string, unknown>
  const payload = msg.payload as Record<string, unknown> | undefined
  if (!payload || typeof payload !== 'object') return 0
  if (msg.type === 'load-project' && typeof payload.data === 'string') {
    return payload.data.length
  }
  if (msg.type === 'project' && typeof payload.byteLength === 'number') {
    return payload.byteLength
  }
  if (typeof payload.projectJson === 'string') {
    return payload.projectJson.length
  }
  return 0
}

/** 载荷是否超过单条 5MB 上限（超过即拒绝，不处理）。 */
export function isBridgeMessageOversized(data: unknown): boolean {
  return bridgePayloadSize(data) > BRIDGE_MAX_PAYLOAD_BYTES
}

/** ArrayBuffer → base64 字符串（分块转换，避免大字符串栈溢出）。 */
export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  const CHUNK = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + CHUNK)),
    )
  }
  return btoa(binary)
}

/** base64 字符串 → ArrayBuffer（load-project 发出前的自检用，测试亦用）。 */
export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

export interface BridgeProjectResult {
  project: ScratchProject
  projectJson: string
  sb3: ArrayBuffer
  byteLength: number
  observations?: RunObservations
}

export interface ScratchBridgeClientOptions {
  iframe: HTMLIFrameElement
  /** 桥接宿主页面（GUI）的准确 origin，例如 GUI iframe 地址的 origin。 */
  targetOrigin: string
  allowlist: string[]
  /** 单次请求超时（毫秒），默认 30000。 */
  requestTimeoutMs?: number
}

interface PendingRequest {
  resolve: (msg: BridgeEnvelope) => void
  reject: (err: Error) => void
  timer: ReturnType<typeof setTimeout>
}

/**
 * 桥接客户端（课程层 → GUI 宿主页面）。
 * 构造时即做 fail-closed 校验：targetOrigin 为 '*'、或不在白名单里，
 * 直接抛错，不创建半个能用的客户端。
 */
export class ScratchBridgeClient {
  private readonly iframe: HTMLIFrameElement
  private readonly targetOrigin: string
  private readonly requestTimeoutMs: number
  private readonly pending = new Map<string, PendingRequest>()
  private readonly readyWaiters: Array<() => void> = []
  private readyReceived = false
  private listening = false
  private requestCounter = 0
  private readonly handler: (event: MessageEvent) => void

  constructor(options: ScratchBridgeClientOptions) {
    const { iframe, targetOrigin, allowlist } = options
    if (!iframe?.contentWindow) {
      throw new Error('桥接客户端需要一个已挂载的 GUI iframe')
    }
    if (targetOrigin === '*') {
      throw new Error('桥接 targetOrigin 禁止使用 *')
    }
    if (!isAllowedGuiOrigin(targetOrigin, allowlist)) {
      throw new Error(`桥接 targetOrigin 不在白名单里：${targetOrigin}`)
    }
    this.iframe = iframe
    this.targetOrigin = targetOrigin
    this.requestTimeoutMs = options.requestTimeoutMs ?? 30000
    this.handler = (event: MessageEvent) => this.onMessage(event)
  }

  /** 开始监听桥接回复。重复调用无副作用。 */
  start(): void {
    if (this.listening) return
    window.addEventListener('message', this.handler)
    this.listening = true
  }

  /** 停止监听，并以“已关闭”拒绝全部在途请求。 */
  dispose(): void {
    if (this.listening) {
      window.removeEventListener('message', this.handler)
      this.listening = false
    }
    for (const [id, p] of this.pending) {
      clearTimeout(p.timer)
      p.reject(new Error('桥接客户端已关闭'))
      this.pending.delete(id)
    }
  }

  /** 对端宣告 ready 后兑现；若已收到过 ready，立即兑现。 */
  get ready(): Promise<void> {
    if (this.readyReceived) return Promise.resolve()
    return new Promise<void>((resolve) => {
      this.readyWaiters.push(resolve)
    })
  }

  get isReady(): boolean {
    return this.readyReceived
  }

  private newRequestId(): string {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      return crypto.randomUUID()
    }
    this.requestCounter += 1
    return `req-${Date.now()}-${this.requestCounter}`
  }

  private onMessage(event: MessageEvent): void {
    // 1. 来源必须精确等于 targetOrigin，且必须是该 iframe 发来的。
    if (event.origin !== this.targetOrigin) return
    if (event.source !== this.iframe.contentWindow) return
    // 2. 信封结构校验；畸形消息静默丢弃（与对端同一标准）。
    if (!isValidBridgeEnvelope(event.data)) return
    // 3. 载荷大小边界：超过 5MB 单条上限的回复直接丢弃（纵深防御，与发送端同一上限）。
    if (isBridgeMessageOversized(event.data)) return
    const msg = event.data as BridgeEnvelope
    if (msg.type === 'ready') {
      this.readyReceived = true
      const waiters = this.readyWaiters.splice(0)
      for (const w of waiters) w()
      return
    }
    const pending = this.pending.get(msg.requestId)
    if (!pending) return
    this.pending.delete(msg.requestId)
    clearTimeout(pending.timer)
    if (msg.type === 'error') {
      const err = msg.payload as unknown as BridgeErrorPayload | undefined
      pending.reject(
        new Error(
          `GUI 桥接返回错误：${err?.code ?? 'unknown'}${
            err?.detail ? `（${err.detail}）` : ''
          }`,
        ),
      )
      return
    }
    // 任何一次成功的请求/回复也是对端存活的证明：ready 宣告只有一次，
    // 若在监听挂载前就已发出，单靠它会永远等不到；这里一并兑现 ready。
    if (msg.type === 'project' || msg.type === 'loaded') {
      this.readyReceived = true
      const waiters = this.readyWaiters.splice(0)
      for (const w of waiters) w()
    }
    pending.resolve(msg)
  }

  private request(
    type: BridgeRequestType,
    payload?: Record<string, unknown>,
    timeoutMs?: number,
  ): Promise<BridgeEnvelope> {
    if (!this.listening) {
      return Promise.reject(new Error('桥接客户端未启动（未调用 start）'))
    }
    const requestId = this.newRequestId()
    const envelope: BridgeEnvelope = {
      protocol: BRIDGE_PROTOCOL,
      version: BRIDGE_VERSION,
      type,
      requestId,
      payload,
    }
    return new Promise<BridgeEnvelope>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId)
        reject(new Error(`桥接请求超时：${type}`))
      }, timeoutMs ?? this.requestTimeoutMs)
      this.pending.set(requestId, { resolve, reject, timer })
      try {
        this.iframe.contentWindow?.postMessage(envelope, this.targetOrigin)
      } catch (e) {
        clearTimeout(timer)
        this.pending.delete(requestId)
        reject(e instanceof Error ? e : new Error(String(e)))
      }
    })
  }

  /**
   * 向 GUI 请求当前作品（get-project）。
   * 返回解析后的 project.json + 完整 .sb3 二进制（调用方可直接存 IndexedDB）。
   * 校验：回复必须是 project 类型；projectJson 必须能解析且含 targets 数组；
   * data 必须是 ArrayBuffer；byteLength 不得超过 5MB 上限。
   */
  async getProject(timeoutMs?: number): Promise<BridgeProjectResult> {
    const msg = await this.request('get-project', undefined, timeoutMs)
    if (msg.type !== 'project') {
      throw new Error(`桥接回复类型异常：${msg.type}`)
    }
    const payload = msg.payload as unknown as
      | Partial<BridgeProjectPayload>
      | undefined
    if (!payload || payload.format !== 'sb3') {
      throw new Error('桥接回复的作品格式异常（不是 sb3）')
    }
    if (typeof payload.byteLength !== 'number') {
      throw new Error('桥接回复缺少 byteLength')
    }
    if (payload.byteLength > BRIDGE_MAX_PAYLOAD_BYTES) {
      throw new Error(
        `桥接回复的作品超过 5MB 上限（${payload.byteLength} 字节），已拒绝`,
      )
    }
    if (!(payload.data instanceof ArrayBuffer)) {
      throw new Error('桥接回复的作品数据不是 ArrayBuffer')
    }
    if (payload.data.byteLength !== payload.byteLength) {
      throw new Error(
        `桥接回复的作品长度不一致（声明 ${payload.byteLength}，实际 ${payload.data.byteLength}）`,
      )
    }
    if (typeof payload.projectJson !== 'string') {
      throw new Error('桥接回复缺少 projectJson')
    }
    // 纵深防御：byteLength 是对端声明值，可能被伪装得很小；projectJson
    // 字符串本身也须在 5MB 上限内，超限拒绝（解析前校验，避免解析超大串）。
    if (payload.projectJson.length > BRIDGE_MAX_PAYLOAD_BYTES) {
      throw new Error(
        `桥接回复的 projectJson 超过 5MB 上限（${payload.projectJson.length} 字符），已拒绝`,
      )
    }
    let project: ScratchProject
    try {
      project = JSON.parse(payload.projectJson) as ScratchProject
    } catch {
      throw new Error('桥接回复的 projectJson 解析失败')
    }
    if (!project || !Array.isArray(project.targets)) {
      throw new Error('桥接回复的作品没有 targets 数组')
    }
    let observations: RunObservations | undefined
    if (
      payload.observations &&
      typeof payload.observations === 'object'
    ) {
      observations = payload.observations as RunObservations
    }
    return {
      project,
      projectJson: payload.projectJson,
      sb3: payload.data,
      byteLength: payload.byteLength,
      observations,
    }
  }

  /**
   * 把作品载入 GUI（load-project）。
   * .sb3 以 base64 字符串传（对端协议要求）；发出前先做 5MB 载荷自检。
   * project.json 字符串直传亦可（format 'project.json'）。
   */
  async loadProject(
    input:
      | { format: 'sb3'; data: ArrayBuffer }
      | { format: 'project.json'; data: string },
  ): Promise<string[]> {
    const data =
      input.format === 'sb3'
        ? arrayBufferToBase64(input.data)
        : input.data
    if (data.length > BRIDGE_MAX_PAYLOAD_BYTES) {
      throw new Error(
        `要载入的作品超过 5MB 单条载荷上限（${data.length} 字符），已拒绝发送`,
      )
    }
    const msg = await this.request('load-project', {
      format: input.format,
      data,
    })
    if (msg.type !== 'loaded') {
      throw new Error(`桥接载入回复类型异常：${msg.type}`)
    }
    const payload = msg.payload as unknown as
      | Partial<BridgeLoadedPayload>
      | undefined
    return Array.isArray(payload?.targets) ? payload.targets : []
  }

  /**
   * 等作品非空：轮询 get-project，直到 targets 非空。
   * 不等 ready 宣告：ready 只发一次，若在监听挂载前就已发出
   * （iframe 先加载完成，或 StrictMode 二次挂载），单靠它会永远等不到；
   * 而 get-project 在桥接就绪后随发随回（实测验证），轮询本身就是就绪探测。
   * 原因另见本文件顶部局限说明：原型 bridge.js 在 window load 时宣告
   * ready，早于默认作品加载完成约 1–3 秒，此时 get-project 返回
   * 空作品（0 targets）。单次请求超时/报错不直接失败，继续轮询到总超时；
   * 超时未出现非空作品时抛错，不启用检查按钮。
   */
  async waitUntilProjectNonEmpty(
    timeoutMs = 30000,
    intervalMs = 500,
    attemptTimeoutMs = 5000,
  ): Promise<BridgeProjectResult> {
    const started = Date.now()
    let lastError: Error | null = null
    for (;;) {
      try {
        const res = await this.getProject(attemptTimeoutMs)
        if (res.project.targets.length > 0) return res
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e))
      }
      if (Date.now() - started > timeoutMs) {
        throw new Error(
          `GUI 作品一直为空或无响应（${lastError?.message ?? '默认作品未加载完成'}），请刷新页面重试`,
        )
      }
      await new Promise((r) => setTimeout(r, intervalMs))
    }
  }
}
