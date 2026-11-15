/**
 * OPS-039: /studio/* does NOT inherit the /learn AppShell. StudioShell is
 * the only shell here — it owns the topbar, the save chip, the file menu
 * and the guidance drawer — so this layout returns only {children} and
 * never wraps AppShell (which would add a second topbar, a 222px sidebar
 * and a mobile bottom nav inside the fullscreen classroom).
 */

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
