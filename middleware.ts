import { NextRequest, NextResponse } from 'next/server';

const LOCALES = ['en', 'ar'];

// Pick the visitor's language from the browser: Arabic browsers go to /ar, everyone else to /en.
// English stays the default (crawlers and unknown languages get /en, and hreflang x-default points there).
function preferredLocale(header: string): 'en' | 'ar' {
  const langs = header
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag: tag.toLowerCase(), q: q ? parseFloat(q) || 0 : 1 };
    })
    .filter((l) => l.tag)
    .sort((a, b) => b.q - a.q);
  for (const l of langs) {
    if (l.tag.startsWith('ar')) return 'ar';
    if (l.tag.startsWith('en')) return 'en';
  }
  return 'en';
}

// Behind nginx the app listens on 127.0.0.1:3000, so req.nextUrl carries that internal address.
// Build redirects from the public Host header instead, limited to known hosts (no open redirect).
const KNOWN_HOSTS = new Set(['itsyounes.com', 'www.itsyounes.com', 'localhost:3000', '127.0.0.1:3000']);
function publicOrigin(req: NextRequest): string {
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').toLowerCase();
  if (!KNOWN_HOSTS.has(host)) return 'https://itsyounes.com';
  const local = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const proto = req.headers.get('x-forwarded-proto') || (local ? 'http' : 'https');
  return `${proto}://${host}`;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return NextResponse.next();
  const locale = preferredLocale(req.headers.get('accept-language') || '');
  const url = new URL(`/${locale}${pathname === '/' ? '' : pathname}${search}`, publicOrigin(req));
  const res = NextResponse.redirect(url, 307); // temporary: the target depends on the visitor
  res.headers.set('Vary', 'Accept-Language');
  return res;
}

export const config = {
  // Everything except API routes, Next internals, metadata files and static files.
  matcher: ['/((?!api|_next|models|logos|llm|sitemap.xml|robots.txt|.*\\..*).*)'],
};
