import type { MetadataRoute } from 'next';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/**
 * Sitemap for QuoteYard.
 *
 * Only the public, indexable surfaces ship to search engines:
 *   /           — homepage
 *   /quote      — public quote intake form
 *
 * Intentionally NOT included:
 *   /login            — noindex via page metadata
 *   /thank-you        — noindex via page metadata
 *   /dashboard/*      — noindex via page metadata + edge proxy gate
 *
 * Returning an absolute URL is required for sitemap entries.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${appUrl}/`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 1.0,
    },
    {
      url: `${appUrl}/quote`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
