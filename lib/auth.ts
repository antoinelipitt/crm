import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { getOrCreateOrganization, getUserOrganization } from "@/lib/organization"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, user }) {
      // Store the initial tokens when user signs in
      if (account && user) {
        // Update the account with the latest tokens
        await prisma.account.update({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          data: {
            access_token: account.access_token,
            expires_at: account.expires_at,
            refresh_token: account.refresh_token,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
            session_state: account.session_state as string | null,
          },
        }).catch(console.error)
      }
      return true
    },
    async session({ token, session }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.name = token.name as string || session.user.name
        session.user.email = token.email as string
        session.user.image = token.picture as string
        
        // Add organization data to session
        if (token.organizationId && token.organizationName && token.role) {
          session.user.organization = {
            id: token.organizationId as string,
            name: token.organizationName as string,
            role: token.role as string,
          }
        }
      }

      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      
      // Always ensure user has organization (whether first login or subsequent)
      if (token.id && token.email && !token.organizationId) {
        try {
          console.log(`Checking organization for user ${token.id} with email ${token.email}`)
          
          // First check if user already has an organization
          const existingUserOrg = await getUserOrganization(token.id as string)
          if (existingUserOrg) {
            console.log(`Found existing organization: ${existingUserOrg.organization.name}`)
            token.organizationId = existingUserOrg.organization.id
            token.organizationName = existingUserOrg.organization.name
            token.role = existingUserOrg.role
          } else {
            console.log(`No organization found, creating one for email: ${token.email}`)
            // User doesn't have organization, create it
            const userOrg = await getOrCreateOrganization(token.email as string, token.id as string)
            console.log(`Created/assigned organization: ${userOrg.organization.name} with role: ${userOrg.userRole}`)
            token.organizationId = userOrg.organization.id
            token.organizationName = userOrg.organization.name
            token.role = userOrg.userRole
          }
        } catch (error) {
          console.error("Error handling organization:", error)
        }
      }

      return token
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
})