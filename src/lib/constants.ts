export const SITE = {
  name: 'QuoteYard',
  shortName: 'Leads',
  description: 'Capture and manage home improvement leads, end to end.',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  locale: 'en_CA',
  location: 'Vancouver, BC',
} as const;
