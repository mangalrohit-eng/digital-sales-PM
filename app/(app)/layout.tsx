import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

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
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header
        userName={user.name ?? "User"}
        userRole={user.role ?? "analyst"}
        userTitle={user.title ?? ""}
      />
      <main className="ml-[220px] pt-16 min-h-screen app-bg">
        <div className="p-7 max-w-7xl">{children}</div>
      </main>
    </div>
  )
}
