import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
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

  // Rafraîchir la session si elle a expiré
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
                     request.nextUrl.pathname.startsWith('/signup') || 
                     request.nextUrl.pathname.startsWith('/reset')

  const isAppPage = request.nextUrl.pathname.startsWith('/dashboard') ||
                    request.nextUrl.pathname.startsWith('/regles') ||
                    request.nextUrl.pathname.startsWith('/repartir') ||
                    request.nextUrl.pathname.startsWith('/destinataires') ||
                    request.nextUrl.pathname.startsWith('/historique') ||
                    request.nextUrl.pathname.startsWith('/rapports') ||
                    request.nextUrl.pathname.startsWith('/connexions') ||
                    request.nextUrl.pathname.startsWith('/parametres') ||
                    request.nextUrl.pathname.startsWith('/admin')

  // Redirection : Utilisateur non connecté essaie d'accéder à l'app
  if (!user && isAppPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirection : Utilisateur connecté essaie d'accéder aux pages d'auth
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
