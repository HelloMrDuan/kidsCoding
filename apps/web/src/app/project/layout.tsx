import { AppShell } from '@/features/ui/app-shell'

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
