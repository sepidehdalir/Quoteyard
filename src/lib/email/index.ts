import 'server-only';

/**
 * Resend transactional email helper.
 *
 * `Resend` is constructed lazily on first send so the module is
 * importable without env vars (e.g. during type-check / build).
 *
 * Emails are fire-and-forget at the call site. If Resend is down
 * or env vars are missing we log and return false; the caller
 * decides whether that's fatal. For the new-lead notification it
 * is NOT -- a customer's submission must still succeed.
 */
import { Resend } from 'resend';

let cached: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cached) cached = new Resend(key);
  return cached;
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function send(args: SendArgs): Promise<boolean> {
  const client = getClient();
  if (!client) {
    console.warn('[email] RESEND_API_KEY missing -- skipping email');
    return false;
  }
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    console.warn('[email] RESEND_FROM_EMAIL missing -- skipping email');
    return false;
  }

  try {
    const result = await client.emails.send({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    });
    if (result.error) {
      console.error('[email] resend error', {
        name: result.error.name,
        message: result.error.message,
      });
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] unexpected', err);
    return false;
  }
}

/**
 * Notify the configured admin address about a new lead.
 *
 * No personal data beyond what the customer just submitted; this is
 * the company's own admin getting their own incoming lead, so PII
 * leakage isn't a concern, but we still HTML-escape every field as
 * defense against header/template injection.
 */
export async function sendNewLeadNotification(input: {
  leadId: string;
  fullName: string;
  email: string;
  phone: string;
  city: string | null;
  service: string;
  projectDescription: string;
  fileCount: number;
}): Promise<boolean> {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!to) {
    console.warn('[email] ADMIN_NOTIFICATION_EMAIL missing -- skipping');
    return false;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const detailUrl = `${appUrl}/dashboard/leads/${encodeURIComponent(input.leadId)}`;

  const e = htmlEscape;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px">
      <h2 style="margin:0 0 16px">New lead: ${e(input.fullName)}</h2>
      <table style="border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Service</td><td>${e(input.service)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">City</td><td>${e(input.city ?? '-')}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Email</td><td>${e(input.email)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Phone</td><td>${e(input.phone)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Files</td><td>${input.fileCount}</td></tr>
      </table>
      <h3 style="margin:24px 0 8px;font-size:14px">Project description</h3>
      <p style="white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:4px;font-size:14px">${e(
        input.projectDescription,
      )}</p>
      <p style="margin-top:24px">
        <a href="${e(detailUrl)}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 16px;border-radius:4px;text-decoration:none">View in dashboard</a>
      </p>
    </div>
  `.trim();

  const text = [
    `New lead: ${input.fullName}`,
    '',
    `Service: ${input.service}`,
    `City:    ${input.city ?? '-'}`,
    `Email:   ${input.email}`,
    `Phone:   ${input.phone}`,
    `Files:   ${input.fileCount}`,
    '',
    'Project description:',
    input.projectDescription,
    '',
    `View: ${detailUrl}`,
  ].join('\n');

  return send({
    to,
    subject: sanitizeSubject(
      `New lead -- ${input.fullName} (${input.service})`,
    ),
    html,
    text,
  });
}

/**
 * Strip header-injection vectors and bound the length.
 *
 * Why this matters: SMTP headers are separated by CRLF. If a value
 * we interpolate into the Subject header contains a CR or LF, an
 * attacker can append forged headers (Bcc, Reply-To, ...). Even
 * though Resend's HTTP API performs its own validation, treating
 * this as our responsibility is the right posture -- defense in
 * depth, and it stops weird display artifacts in mail clients too.
 *
 * Steps:
 *   1. Remove all control characters (CR, LF, TAB, NUL, etc).
 *   2. Collapse runs of whitespace.
 *   3. Trim and truncate to 200 chars. RFC 5322 allows 998 octets
 *      per line; most clients display < 120 cleanly; 200 is a
 *      generous, safe cap.
 */
function sanitizeSubject(raw: string): string {
  const stripped = raw.replace(/[\u0000-\u001F\u007F]/g, ' ');
  const collapsed = stripped.replace(/\s+/g, ' ').trim();
  return collapsed.length > 200 ? collapsed.slice(0, 197) + '...' : collapsed;
}

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
