/* Stage 2b — inferred addresses, used only when nothing was published.

   These are *guesses*. They are scored low, gated behind
   ALLOW_PATTERN_GUESSES, and restricted to shared hiring inboxes
   (careers@, jobs@, hr@) rather than individuals — guessing a named person's
   address is both less accurate and a lot more intrusive. */

import { hasMx, classify } from './verify.js';

/* Ordered by how commonly companies actually publish them. */
const ROLE_INBOXES = [
  { local: 'careers', base: 0.45 },
  { local: 'jobs', base: 0.42 },
  { local: 'hiring', base: 0.36 },
  { local: 'hr', base: 0.34 },
  { local: 'talent', base: 0.3 },
  { local: 'recruiting', base: 0.3 },
  { local: 'people', base: 0.26 },
  { local: 'hello', base: 0.22 },
  { local: 'contact', base: 0.2 },
  { local: 'info', base: 0.18 },
];

/** Name-based patterns — available for completeness, off by default. */
export function personalPatterns(firstName, lastName, domain) {
  const f = String(firstName || '').toLowerCase().replace(/[^a-z]/g, '');
  const l = String(lastName || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!f || !domain) return [];

  const locals = l
    ? [`${f}.${l}`, `${f}${l}`, `${f}`, `${f[0]}${l}`, `${f}_${l}`, `${f}-${l}`]
    : [f];

  return locals.map((local, i) => ({
    email: `${local}@${domain}`,
    confidence: Number(Math.max(0.15, 0.35 - i * 0.04).toFixed(2)),
    roleBased: false,
    source: 'pattern',
  }));
}

/**
 * Generate shared-inbox guesses for a domain.
 * @param {string} domain
 * @param {{max?: number, requireMx?: boolean}} opts
 */
export async function guessRoleInboxes(domain, { max = 3, requireMx = true } = {}) {
  if (!domain) return [];

  // One MX lookup covers every candidate on the domain.
  const mx = await hasMx(domain);
  if (requireMx && !mx) return [];

  const out = [];
  for (const { local, base } of ROLE_INBOXES) {
    if (out.length >= max) break;
    const c = classify(`${local}@${domain}`);
    if (!c.ok) continue;
    out.push({
      email: c.email,
      // A guess is a guess: MX only proves the domain accepts mail at all.
      confidence: Number((mx ? base : base * 0.6).toFixed(2)),
      roleBased: true,
      verified: mx,
      source: 'pattern',
    });
  }
  return out;
}
