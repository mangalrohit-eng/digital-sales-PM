import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

const DEMO_USERS = [
  {
    id: "1",
    email: "admin@demo.app",
    password: "ACN2026",
    name: "Josh D",
    role: "admin",
    title: "Director, Digital Sales",
  },
  {
    id: "2",
    email: "analyst@demo.app",
    password: "ACN2026",
    name: "Alex M",
    role: "analyst",
    title: "CRO Analyst",
  },
]

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const user = DEMO_USERS.find(
          (u) =>
            u.email === credentials?.email &&
            u.password === credentials?.password
        )
        if (!user) return null
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          title: user.title,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role
        token.title = (user as { title: string }).title
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role: string }).role = token.role as string
        ;(session.user as { title: string }).title = token.title as string
        ;(session.user as { id: string }).id = token.sub as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
})
