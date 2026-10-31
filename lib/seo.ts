// Site-wide SEO constants. Everything that goes into <head> uses absolute URLs on the production domain,
// because social crawlers (LinkedIn, X, WhatsApp, Slack) do not resolve relative paths.
export const SITE_URL = 'https://itsyounes.com';
export const abs = (path: string) => new URL(path, SITE_URL).toString();

export const SEO = {
  en: {
    siteName: 'Younes Alturkey',
    ogAlt: 'Younes Alturkey, AI-Native Engineering Lead. 10 years of experience, leads engineering teams and builds AI agents. Riyadh, Saudi Arabia.',
    keywords: [
      'Younes Alturkey', 'AI-Native Engineering Lead', 'engineering leader', 'Engineering Manager', 'Tech Lead', 'Principal Engineer',
      'Staff Engineer', 'Head of Engineering', 'Founding Engineer', 'Tech Co-founder', 'AI agents', 'agentic AI', 'LLM', 'AI engineering',
      'software engineer Riyadh', 'Saudi Arabia', 'full-stack engineer', 'TypeScript', 'React', 'Next.js', 'Node.js', '.NET', 'Python',
      'technology strategy', 'engineering leadership', 'Scrum Master', 'Salla', 'National eLearning Center', 'Wolffish', 'portfolio',
    ],
  },
  ar: {
    siteName: 'يونس التركي',
    ogAlt: 'يونس التركي، قائد هندسي بعقلية الذكاء الاصطناعي. 10 سنوات من الخبرة، يقود فرق الهندسة ويبني وكلاء ذكاء اصطناعي. الرياض، المملكة العربية السعودية.',
    keywords: [
      'يونس التركي', 'قائد هندسي', 'مدير هندسة', 'قائد تقني', 'مهندس رئيسي', 'رئيس الهندسة', 'مهندس مؤسس', 'شريك مؤسس تقني',
      'وكلاء الذكاء الاصطناعي', 'الذكاء الاصطناعي', 'هندسة البرمجيات', 'مهندس برمجيات الرياض', 'المملكة العربية السعودية',
      'استراتيجية التقنية', 'قيادة الفرق الهندسية', 'سكرم ماستر', 'سلة', 'المركز الوطني للتعليم الإلكتروني', 'Younes Alturkey', 'Wolffish',
    ],
  },
} as const;

export function personJsonLd(locale: 'en' | 'ar') {
  const ar = locale === 'ar';
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: ar ? 'يونس التركي' : 'Younes Alturkey',
    alternateName: ar ? 'Younes Alturkey' : 'يونس التركي',
    url: abs(`/${locale}`),
    image: abs('/younes.jpg'),
    jobTitle: ar ? 'قائد هندسي بعقلية الذكاء الاصطناعي' : 'AI-Native Engineering Lead',
    description: ar
      ? 'عالم حاسب بخبرة 10 سنوات، يقود فرق الهندسة ويبني وكلاء ذكاء اصطناعي ينجزون عملًا حقيقيًا.'
      : 'Computer scientist with 10 years of experience. Leads engineering teams and builds AI agents that get real work done.',
    address: { '@type': 'PostalAddress', addressLocality: ar ? 'الرياض' : 'Riyadh', addressCountry: 'SA' },
    email: 'mailto:alturkeyy@gmail.com',
    telephone: '+966538654514',
    worksFor: { '@type': 'Organization', name: ar ? 'سلة' : 'Salla', url: 'https://salla.com' },
    alumniOf: { '@type': 'CollegeOrUniversity', name: ar ? 'جامعة الملك عبدالعزيز' : 'King Abdulaziz University' },
    knowsLanguage: ['ar', 'en'],
    knowsAbout: ['Engineering leadership', 'Agentic AI', 'AI agents', 'Software architecture', 'Technology strategy', 'TypeScript', 'React', 'Next.js', '.NET', 'Python'],
    sameAs: ['https://www.linkedin.com/in/younes-alturkey/', 'https://github.com/younes-alturkey', 'https://x.com/younes_alturkey', 'https://younes-alturkey.github.io/wolffish'],
  };
}
