import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Younes Alturkey · AI-Native Engineering Lead',
    short_name: 'Younes',
    description: 'Younes Alturkey, AI-Native Engineering Lead in Riyadh. Leads engineering teams and builds AI agents.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#050b16',
    theme_color: '#050b16',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
