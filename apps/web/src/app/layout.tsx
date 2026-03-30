import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: '孩子编程星球',
  description: '通过动画和故事，让孩子一步一步学会编程。',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
