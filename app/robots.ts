import type { MetadataRoute } from 'next';
import { SITE_URL, abs } from '@/lib/seo';

// Search engines and AI crawlers are all welcome. Only the agent API is off limits (it costs money per call).
// AI crawlers are listed by name so the permission is explicit; the full CV for them is at /llms.txt.
const AI_BOTS = [
  'GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai',
  'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot', 'Applebot-Extended', 'Amazonbot',
  'meta-externalagent', 'DuckAssistBot', 'cohere-ai', 'MistralAI-User', 'CCBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: '/api/' },
      { userAgent: AI_BOTS, allow: ['/', '/llms.txt', '/llms-full.txt', '/llm'], disallow: '/api/' },
    ],
    sitemap: abs('/sitemap.xml'),
    host: SITE_URL,
  };
}
