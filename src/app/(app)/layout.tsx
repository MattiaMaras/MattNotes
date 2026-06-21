import { AppShell } from "@/components/layout/app-shell";

/**
 * Layout for the authenticated app surface. The `(app)` route group keeps the
 * URL clean (`/`, `/note/[id]`) while letting us slot a separate `(auth)`
 * group beside it once Clerk is added. The shell itself is a Client Component
 * (resizable panels, hotkeys); this layout stays a Server Component.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
