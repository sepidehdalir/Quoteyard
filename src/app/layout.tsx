import type { Metadata, Viewport } from 'next';
import './globals.css';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/**
 * Root metadata. Every page-level `metadata` export inherits these
 * defaults and can override the fields it cares about (title,
 * description, robots, canonical, OG image).
 *
 * `metadataBase` is the absolute URL used by Next.js to expand any
 * relative URL in og:image / twitter:image / canonical. In
 * production this should match the deployed Vercel domain via
 * NEXT_PUBLIC_APP_URL.
 */
export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'QuoteYard — Lead & Quote Management for Contractors',
    template: '%s | QuoteYard',
  },
  description:
    'QuoteYard is a lead and quote management platform for contractors. ' +
    'Capture quote requests, manage leads, and track jobs in one private dashboard.',
  applicationName: 'QuoteYard',
  authors: [{ name: 'QuoteYard' }],
  generator: 'Next.js',
  keywords: [
    'contractor lead management',
    'quote management dashboard',
    'contractor CRM',
    'home services lead tracking',
    'trades quote software',
    'job quote management',
    'contractor quote request form',
  ],
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'QuoteYard',
    title: 'QuoteYard — Lead & Quote Management for Contractors',
    description:
      'A clean, private dashboard where contractors capture quote requests, ' +
      'manage leads, and track jobs end to end.',
    url: appUrl,
    locale: 'en_CA',
    images: [
      {
        url: '/brand/raster/lockup-light-1600.png',
        width: 1600,
        height: 700,
        alt: 'QuoteYard — Lead & Quote Management',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QuoteYard — Lead & Quote Management for Contractors',
    description:
      'A clean, private dashboard where contractors capture quote requests, ' +
      'manage leads, and track jobs end to end.',
    images: ['/brand/raster/lockup-light-1600.png'],
  },
  alternates: {
    canonical: '/',
  },
};

export const viewport: Viewport = {
  themeColor: '#0F172A',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
