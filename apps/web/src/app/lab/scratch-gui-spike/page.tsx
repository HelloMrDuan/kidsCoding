/**
 * OPS-037 Spike 实验页：独立加载原版 Scratch GUI（官方 scratch-gui）。
 *
 * 这不是正式产品页面，只做技术验证：
 * - 实验页通过 iframe 加载 scratch-editor 单体仓库的 standalone 开发版 GUI
 *   （默认 http://localhost:8601/，可用 NEXT_PUBLIC_SCRATCH_GUI_URL 覆盖）。
 * - 不修改任何 G2 课程适配器，不动受限教学沙箱白名单。
 * - 生产构建（build:dist-standalone）在本机 6GB 环境下会 OOM（见报告），
 *   故 Spike 阶段用开发服务器验证；npm 库方式因 React 19 与 GUI 的
 *   ReactDOM.render（React 18 API，已在 React 19 移除）不兼容，不可直接接入。
 *
 * 启动 GUI 开发服务器（在 scratch-editor 单体仓库内）：
 *   git clone --branch develop https://github.com/scratchfoundation/scratch-editor.git
 *   npm install && npm start   # 监听 :8601
 * 然后访问本页。
 *
 * 验证报告：~/workspace/kidscoding-next-phase/ops-037-spike-report.md
 */

'use client'

const GUI_URL =
  process.env.NEXT_PUBLIC_SCRATCH_GUI_URL ?? 'http://localhost:8601/'

export default function ScratchGuiSpikePage() {
  return (
    <main style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>
        OPS-037 Spike：原版 Scratch GUI 技术验证
      </h1>
      <p style={{ margin: '0 0 8px', color: '#444' }}>
        本页只做技术验证，不是正式产品页面。下方 iframe 加载的是官方
        scratch-gui（scratch-editor 单体仓库，AGPL-3.0-only）standalone
        开发版。源地址：
        <code style={{ marginLeft: 4 }}>{GUI_URL}</code>
      </p>
      <details style={{ marginBottom: 12 }}>
        <summary>如何启动 GUI（本地验证步骤）</summary>
        <ol style={{ margin: '8px 0 0 20px', color: '#444' }}>
          <li>
            克隆 scratch-editor（develop 分支）并安装依赖：
            <code>npm install</code>
          </li>
          <li>
            启动开发服务器：<code>npm start</code>（监听 :8601）
          </li>
          <li>刷新本页，iframe 内应出现完整 Scratch 编辑器。</li>
          <li>
            用 File → Load from your computer 导入 .sb3 验证（见验证报告）。
          </li>
        </ol>
        <p style={{ color: '#444' }}>
          已知限制：生产构建（build:dist-standalone）在本机 6GB
          环境下因 Terser 内存峰值被 OOM
          杀掉；npm 库方式与本仓库 React 19 不兼容（GUI 用
          ReactDOM.render，React 19 已移除）。正式接入前须解决这两项。
        </p>
      </details>
      <iframe
        title="Scratch GUI (OPS-037 Spike)"
        src={GUI_URL}
        data-testid="scratch-gui-spike-iframe"
        style={{
          width: '100%',
          height: 'calc(100vh - 220px)',
          minHeight: 600,
          border: '1px solid #ccc',
          borderRadius: 8,
          background: '#fff',
        }}
      />
      <p style={{ marginTop: 8, color: '#666', fontSize: 13 }}>
        实验结论与逐项验证见 ops-037-spike-report.md。未经 AGPL
        合规审查完成前，不得把官方 GUI 直接合入正式产品主线。
      </p>
    </main>
  )
}
