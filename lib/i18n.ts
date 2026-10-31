import { en } from '@/messages/en';
import { ar } from '@/messages/ar';

export const locales = ['en', 'ar'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export type Dict = typeof en;

export function isLocale(x: string): x is Locale {
  return (locales as readonly string[]).includes(x);
}

export function getDict(locale: Locale): Dict {
  return locale === 'ar' ? (ar as Dict) : en;
}
