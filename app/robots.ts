import type { MetadataRoute } from 'next';
import { SITE_URL, abs } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: '/api/' }],
    sitemap: abs('/sitemap.xml'),
    host: SITE_URL,
  };
}
