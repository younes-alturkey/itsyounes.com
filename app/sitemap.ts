import type { MetadataRoute } from 'next';
import { abs } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const languages = { en: abs('/en'), ar: abs('/ar') };
  return [
    { url: abs('/en'), lastModified: now, changeFrequency: 'monthly', priority: 1, alternates: { languages } },
    { url: abs('/ar'), lastModified: now, changeFrequency: 'monthly', priority: 0.9, alternates: { languages } },
  ];
}
