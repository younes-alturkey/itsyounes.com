# Development notes · itsyounes.com

Next.js 15 (App Router) version of the portfolio. The DeepSeek key stays on the server; the browser only talks to `/api/agent/*`.
English at `/en`, Arabic (RTL) at `/ar`; `/` redirects by the browser's language.

## Run locally

```bash
npm install
```

Copy `.env.local.example` to `.env.local` and put your DeepSeek key in it, then:

```bash
npm run dev
```

Open http://localhost:3000.

## Deploy (Vercel, free)

GitHub Pages cannot run the server routes, so host this on Vercel (or any Node host).

1. Push this folder to a GitHub repository.
2. On vercel.com: New Project → import the repository. Framework is detected as Next.js; keep the defaults.
3. Project Settings → Environment Variables → add `DEEPSEEK_API_KEY` with your key. Redeploy.
4. Optional: Settings → Domains → add `younes.expert`.

The key is never sent to the browser. `lib/agent-server.ts` is marked `server-only`, so importing it from a client component fails the build.

## Where things live

| Path | What |
| --- | --- |
| `messages/en.ts`, `messages/ar.ts` | All copy, both languages. Edit text here. |
| `lib/agent-server.ts` | System prompt, profile of Younes, tool schemas, DeepSeek endpoints, rate limit. |
| `app/api/agent/chat/route.ts` | Streams the model reply. Builds the prompt server-side; the client sends only its message history. |
| `app/api/agent/search`, `.../fetch` | Proxies for DeepSeek Search and Fetch. |
| `components/agent-core.ts` | Browser side of the agent: loop, tool execution, file cards, downloads, print to PDF. |
| `components/scene/scene.js` | The 3D scene (island, humanoid agent, HUD hooks). Mirrors for RTL. |
| `components/*.tsx` | Scene canvas, chat, posts, try-me button. |
| `app/[locale]/page.tsx` | The page. `layout.tsx` sets `lang`, `dir` and fonts (Inter, IBM Plex Sans Arabic). |
| `public/models/Xbot.glb` | The humanoid model (2.9 MB). |

## SEO

- Production domain: `https://itsyounes.com` (set in `lib/seo.ts` as `SITE_URL`). Every canonical, hreflang, Open Graph and Twitter URL is absolute on that domain, because social crawlers ignore relative paths. Change it there if the domain changes.
- `/` follows the browser language: Arabic browsers go to `/ar`, everyone else (including crawlers) to `/en` (307, `Vary: Accept-Language`). `hreflang` links both, with `x-default` on English.
- Share images: `public/og-en.jpg` and `public/og-ar.jpg` (1200×630). Name, title, 10 years of experience, what you do, Riyadh, photo.
- Keywords, Person JSON-LD (job title, location, employer, school, profiles), `/sitemap.xml` and `/robots.txt` are generated from `lib/seo.ts`, `app/sitemap.ts` and `app/robots.ts`.
- After deploying, check previews with LinkedIn Post Inspector and the X card validator; LinkedIn caches old previews until you re-inspect.

## Notes

- The agent replies in Arabic on `/ar` and in the visitor's language on `/en`.
- Rate limit: 60 chat calls and 80 tool calls per IP per 10 minutes, in memory (best effort on serverless).
- DeepSeek Search and Fetch are billed per successful request (about $0.75 per 1,000). Set a spending limit on the key.
- Old static version (GitHub Pages, key in the page): `../younes-portfolio`. Prefer this one.
