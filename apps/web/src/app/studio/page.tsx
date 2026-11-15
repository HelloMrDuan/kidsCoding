/**
 * OPS-039: the /studio landing page. Honest empty state — no lesson is
 * connected here yet, so there is no editor and no claim that the page is
 * usable as a classroom. Real lessons arrive one at a time (OPS-041 is
 * the first migration); until then this page says so plainly.
 */

import Link from 'next/link'

export default function StudioHomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>全屏课堂</h1>
      <p>全屏课堂正在接入课程，这里还没有可上的课。</p>
      <p>
        <Link href="/">返回学习中心</Link>
      </p>
    </main>
  )
}
