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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return NextResponse.next();
  const locale = preferredLocale(req.headers.get('accept-language') || '');
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  const res = NextResponse.redirect(url, 307); // temporary: the target depends on the visitor
  res.headers.set('Vary', 'Accept-Language');
  return res;
}

export const config = {
  // Everything except API routes, Next internals, metadata files and static files.
  matcher: ['/((?!api|_next|models|logos|sitemap.xml|robots.txt|.*\\..*).*)'],
};
