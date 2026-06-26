import { NextResponse } from 'next/server';

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const userRole = request.cookies.get('user_role')?.value;

  // Public paths
  if (pathname === '/') {
    // If already logged in, redirect to home
    if (userRole) {
      return NextResponse.redirect(new URL('/home', request.url));
    }
    return NextResponse.next();
  }

  // Protected paths
  const protectedPaths = ['/home', '/admin', '/notes', '/album', '/diary'];
  const isProtectedPath = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtectedPath) {
    if (!userRole) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Admin only check
    if (pathname.startsWith('/admin') && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/home', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
