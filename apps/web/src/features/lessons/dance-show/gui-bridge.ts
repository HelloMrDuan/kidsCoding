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

/** 默认允许的 GUI 来源（本地开发）。生产部署时必须用环境变量覆盖。 */
export function defaultGuiOriginAllowlist(): string[] {
  const fromEnv =
    process.env.NEXT_PUBLIC_SCRATCH_GUI_ORIGINS ??
    process.env.NEXT_PUBLIC_SCRATCH_GUI_URL ??
    'http://localhost:8601'
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
