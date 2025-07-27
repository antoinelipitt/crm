import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      organization?: {
        id: string
        name: string
        role: string
      }
    } & DefaultSession["user"]
  }

  interface User {
    id: string
  }
}