import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Restrict API routes to localhost-only access.
 * This is a local developer tool — API endpoints should not be
 * accessible from external networks.
 *
 * SECURITY NOTES:
 * - x-forwarded-for is client-controllable. An attacker can spoof
 *   "X-Forwarded-For: 127.0.0.1" to bypass this check. This proxy
 *   is defense-in-depth, not the sole security boundary. The primary
 *   control is binding the server to 127.0.0.1 at the network level.
 * - When request.ip is undefined (common in Next.js dev mode) and no
 *   x-forwarded-for header is present, the proxy fails open to
 *   avoid breaking local development. This is an accepted trade-off
 *   for a developer tool that is not exposed to the public internet.
 */
export function proxy(request: NextRequest): NextResponse | undefined {
  // Only gate /api/ routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return undefined;
  }

  // Allow loopback addresses (IPv4 and IPv6)
  // Next.js 16 removed request.ip; use x-forwarded-for or host header
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() ?? '';

  const loopbackAddresses = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost']);

  if (ip && !loopbackAddresses.has(ip)) {
    return NextResponse.json(
      { error: 'Access denied: API is only accessible from localhost' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
