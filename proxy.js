import { NextResponse } from 'next/server';
import { BIRTHDAY_COOKIE, verifyBirthdayToken } from './app/lib/birthdayAuth';

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const userRole = request.cookies.get('user_role')?.value;
  // Only a correctly signed token opens the birthday; user_role alone is forgeable.
  const birthdayRole = await verifyBirthdayToken(request.cookies.get(BIRTHDAY_COOKIE)?.value);

  // Public paths
  if (pathname === '/') {
    // Logged in: straight to the birthday. (A session from before the signed
    // token existed sees the login page again instead of looping.)
    if (birthdayRole) {
      return NextResponse.redirect(new URL('/birthday', request.url));
    }
    return NextResponse.next();
  }

  // Protected paths
  // /birthday holds private photos of Parshvi and Saket: it needs the signed token.
  if (pathname === '/birthday' || pathname.startsWith('/birthday/')) {
    if (!birthdayRole) {
      return pathname.startsWith('/birthday/media/')
        ? new NextResponse('Not found', { status: 404 })
        : NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

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
