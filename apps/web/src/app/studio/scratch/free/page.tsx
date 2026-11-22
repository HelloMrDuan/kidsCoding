// The standalone workshop is retired: OPS-050's /create is the single
// creation centre (Scratch + Python, one owner-scoped work library).
// Keep the old URL as a permanent entry point for bookmarks.
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: '创作中心 · KidsCoding',
  robots: { index: false },
}

export default function Page() {
  redirect('/create')
}
