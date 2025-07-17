import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make your server
  // vulnerable to CSRF attacks.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname === '/login'
  const isPublicPage = pathname === '/'
  const isAuthCallback = pathname.startsWith('/api/auth/callback')
  const isApiRoute = pathname.startsWith('/api/')
  const isDashboardRoute = pathname.startsWith('/dashboard')
  
  // Skip auth checks for API routes (except auth callbacks)
  if (isApiRoute && !isAuthCallback) {
    return supabaseResponse
  }
  
  // If user is not authenticated and trying to access protected routes
  // Protected routes: /dashboard, /login (if not public), and any other non-public routes
  if (!user && !isAuthPage && !isPublicPage && !isAuthCallback) {
    console.log(`🔒 Accès refusé à ${pathname} - utilisateur non authentifié, redirection vers login`)
    const url = request.nextUrl.clone()
    url.pathname = '/login' // Rediriger vers la page de login
    return NextResponse.redirect(url)
  }

  // If user is authenticated
  if (user) {
    // If user is authenticated and trying to access login page
    if (isAuthPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // If user is authenticated and on landing page, redirect to dashboard
    if (isPublicPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}