/* Address hygiene: syntax, throwaway/no-reply filtering, and an MX check.

   An MX record proves the domain can receive mail. It does not prove the
   mailbox exists — we deliberately do NOT probe mailboxes over SMTP (that is
   what spam tooling does, and it gets your IP blocked). Anything unproven is
   reflected in the confidence score instead. */

import dns from 'node:dns/promises';
import { normalizeEmail, domainFromEmail } from '../util.js';

/* Shared inboxes that are appropriate to contact about a job. */
export const ROLE_PREFIXES = new Set([
  'careers', 'career', 'jobs', 'job', 'hiring', 'recruiting', 'recruitment',
  'recruiter', 'hr', 'talent', 'people', 'apply', 'work', 'workwithus',
  'joinus', 'join', 'internships', 'internship',
]);

/* Mailboxes that are never right for outreach. */
const BLOCKED_PREFIXES = new Set([
  'noreply', 'no-reply', 'donotreply', 'do-not-reply', 'postmaster', 'abuse',
  'security', 'privacy', 'legal', 'dmca', 'unsubscribe', 'bounce', 'mailer-daemon',
  'billing', 'invoices', 'accounts', 'payments', 'sales', 'press', 'media',
]);

const BLOCKED_DOMAINS = new Set([
  'example.com', 'example.org', 'test.com', 'localhost', 'sentry.io',
  'wixpress.com', 'sentry-next.wixpress.com', 'domain.com', 'email.com',
  'yourcompany.com', 'company.com', 'gmail.com', 'yahoo.com', 'hotmail.com',
  'outlook.com', 'icloud.com', 'protonmail.com', 'mail.com', 'aol.com',
]);

/* Filenames that look like emails once a naive regex gets hold of them. */
const ASSET_LIKE = /\.(png|jpe?g|gif|svg|webp|css|js|woff2?|ttf|ico|mp4|pdf|json)$/i;

const mxCache = new Map();

export async function hasMx(domain) {
  if (!domain) return false;
  if (mxCache.has(domain)) return mxCache.get(domain);
  let ok = false;
  try {
    const records = await dns.resolveMx(domain);
    ok = Array.isArray(records) && records.length > 0;
  } catch {
    ok = false;
  }
  mxCache.set(domain, ok);
  return ok;
}

export function classify(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return { ok: false, reason: 'invalid-syntax' };
  if (ASSET_LIKE.test(normalized)) return { ok: false, reason: 'asset-filename' };

  const [local, domain] = normalized.split('@');
  if (BLOCKED_DOMAINS.has(domain)) return { ok: false, reason: 'blocked-or-personal-domain' };

  const base = local.split('+')[0];
  if (BLOCKED_PREFIXES.has(base)) return { ok: false, reason: 'blocked-mailbox' };
  // Hashed/encoded addresses embedded in tracking pixels and CDN URLs.
  if (/^[0-9a-f]{16,}$/i.test(base)) return { ok: false, reason: 'looks-machine-generated' };
  if (local.length > 64 || normalized.length > 254) return { ok: false, reason: 'too-long' };

  return {
    ok: true,
    email: normalized,
    local,
    domain,
    roleBased: ROLE_PREFIXES.has(base),
  };
}

/** Full check: syntax + policy + MX. */
export async function verifyEmail(email, { requireMx = true } = {}) {
  const c = classify(email);
  if (!c.ok) return { ...c, verified: false };

  const mx = await hasMx(c.domain);
  if (requireMx && !mx) return { ok: false, reason: 'no-mx-record', email: c.email, verified: false };

  return { ...c, verified: mx };
}

/** True when the address's domain matches the company we think it belongs to. */
export function isOnCompanyDomain(email, companyDomain) {
  const d = domainFromEmail(email);
  if (!d || !companyDomain) return false;
  return d === companyDomain || d.endsWith(`.${companyDomain}`) || companyDomain.endsWith(`.${d}`);
}
