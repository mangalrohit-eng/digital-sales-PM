import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const user = session.user as {
    name: string
    role: string
    title: string
  }

  return (
    <AppShell
      userName={user.name ?? "User"}
      userRole={user.role ?? "analyst"}
      userTitle={user.title ?? ""}
    >
      {children}
    </AppShell>
  )
}
