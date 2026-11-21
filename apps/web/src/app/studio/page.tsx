/**
 * OPS-039: the /studio landing page. OPS-040 connected the first real
 * lesson (《我的舞蹈秀》); other lessons still arrive one at a time,
 * so this page lists only what is actually connected and says so
 * plainly — no fake lesson entries.
 */

import Link from 'next/link'

export default function StudioHomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>全屏课堂</h1>
      <p>全屏课堂已接入的课程：</p>
      <ul>
        <li>
          <Link href="/studio/scratch/free">
            Scratch 创作工坊（自由创作：新建 / 导入 / 保存自己的作品）
          </Link>
        </li>
        <li>
          <Link href="/studio/scratch/dance-show">
            我的舞蹈秀（Scratch GUI 全屏创作）
          </Link>
        </li>
        <li>
          <Link href="/studio/scratch/g2-u3-l02">
            接住掉落水果（Scratch GUI 全屏课堂）
          </Link>
        </li>
      </ul>
      <p>其他课程还在逐课接入中，这里先不列出。</p>
      <p>
        <Link href="/">返回学习中心</Link>
      </p>
    </main>
  )
}
