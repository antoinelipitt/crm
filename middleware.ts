import { auth } from "@/lib/auth"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isAuthPage = nextUrl.pathname.startsWith('/login')
  const isPublicPage = nextUrl.pathname === '/'
  const isApiAuthRoute = nextUrl.pathname.startsWith('/api/auth')

  // Allow access to API auth routes
  if (isApiAuthRoute) {
    return
  }

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isAuthPage) {
    return Response.redirect(new URL('/dashboard', nextUrl))
  }

  // Redirect non-logged-in users to login from protected pages
  if (!isLoggedIn && !isAuthPage && !isPublicPage) {
    return Response.redirect(new URL('/login', nextUrl))
  }
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}