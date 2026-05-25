import type { MetadataRoute } from 'next';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/**
 * Robots policy for QuoteYard.
 *
 * Belt-and-suspenders with page-level `robots: { index: false }`
 * metadata: this is the protocol-level signal that supplements the
 * per-page meta tags. Both should agree.
 *
 * The /dashboard/* tree is also protected by an edge proxy that
 * redirects unauthenticated requests to /login, so crawlers
 * physically cannot reach the content even if they tried. But
 * disallowing in robots.txt is still the right hygiene — it tells
 * well-behaved crawlers not to even attempt the URL.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/quote'],
        disallow: ['/dashboard', '/dashboard/', '/login', '/thank-you', '/api'],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
