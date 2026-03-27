import type { Metadata } from "next"
import { APP_NAME } from "@/lib/brand"

export const metadata: Metadata = {
  title: `Demo overview · ${APP_NAME}`,
  description:
    "Purpose, scope, and limitations of this vision prototype for stakeholders.",
}

export default function WelcomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
