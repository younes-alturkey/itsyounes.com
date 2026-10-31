import type { Metadata, Viewport } from 'next';
import { Inter, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { notFound } from 'next/navigation';
import { getDict, isLocale, locales } from '@/lib/i18n';
import { SITE_URL, SEO, abs, personJsonLd } from '@/lib/seo';
import '../globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const arabic = IBM_Plex_Sans_Arabic({ subsets: ['arabic'], weight: ['400', '500', '600', '700'], variable: '--font-arabic', display: 'swap' });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: '#050b16',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDict(locale);
  const s = SEO[locale];
  const url = abs(`/${locale}`);
  const ogImage = { url: abs(`/og-${locale}.jpg`), width: 1200, height: 630, alt: s.ogAlt, type: 'image/jpeg' };
  return {
    metadataBase: new URL(SITE_URL),
    title: t.meta.title,
    description: t.meta.description,
    applicationName: s.siteName,
    keywords: [...s.keywords],
    authors: [{ name: 'Younes Alturkey', url: abs('/en') }],
    creator: 'Younes Alturkey',
    publisher: 'Younes Alturkey',
    category: 'technology',
    referrer: 'origin-when-cross-origin',
    formatDetection: { email: false, address: false, telephone: false },
    alternates: {
      canonical: url,
      languages: { en: abs('/en'), ar: abs('/ar'), 'x-default': abs('/en') },
    },
    openGraph: {
      type: 'profile',
      url,
      siteName: s.siteName,
      title: t.meta.title,
      description: t.meta.description,
      locale: locale === 'ar' ? 'ar_SA' : 'en_US',
      alternateLocale: locale === 'ar' ? ['en_US'] : ['ar_SA'],
      images: [ogImage],
      firstName: 'Younes',
      lastName: 'Alturkey',
      username: 'younes-alturkey',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@younes_alturkey',
      creator: '@younes_alturkey',
      title: t.meta.title,
      description: t.meta.description,
      images: [{ url: ogImage.url, alt: s.ogAlt }],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
    },
    icons: {
      icon: [
        { url: abs('/favicon.ico'), sizes: '16x16 32x32 48x48' },
        { url: abs('/icon-192.png'), type: 'image/png', sizes: '192x192' },
        { url: abs('/icon-512.png'), type: 'image/png', sizes: '512x512' },
      ],
      shortcut: abs('/favicon.ico'),
      apple: [{ url: abs('/apple-touch-icon.png'), sizes: '180x180', type: 'image/png' }],
    },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDict(locale);
  return (
    <html lang={locale} dir={t.dir} className={`${inter.variable} ${arabic.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd(locale)) }} />
        {children}
      </body>
    </html>
  );
}
