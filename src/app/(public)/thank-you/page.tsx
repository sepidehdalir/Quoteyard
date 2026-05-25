import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Thank You',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function ThankYouPage({ searchParams }: PageProps) {
  const { id } = await searchParams;
  // 'sink' is the honeypot's fake-success id — treat as a real
  // success page UI-wise so bots can't tell the difference.
  const reference = id && id !== 'sink' ? id : null;

  return (
    <section>
      <div className="mx-auto w-full max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          Request received
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Thanks — we&rsquo;ll be in touch.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          A team member will review your project details and follow up by
          phone or email within one business day. If your request is urgent,
          feel free to send a follow-up email referencing the number below.
        </p>

        {reference && (
          <div className="mt-8 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm">
            <span className="text-slate-500">Reference</span>
            <code className="ml-3 font-mono text-slate-900">{reference}</code>
          </div>
        )}

        <Link
          href="/"
          className="mt-10 inline-block text-sm font-medium text-slate-900 underline underline-offset-4"
        >
          &larr; Back to home
        </Link>
      </div>
    </section>
  );
}
