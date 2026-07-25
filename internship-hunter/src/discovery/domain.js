/* Company name → primary domain.

   Job boards rarely publish a company's website, but every later stage —
   contact discovery, dedupe, MX checks — needs one. Strategies, best first:

     1. A website the board itself supplied. Free and authoritative.
     2. The name is already a domain ("UBQ.io", "Turso.tech"). Common for
        developer-tool companies and trivially checkable.
     3. Guess-and-verify: try <variant>.<tld>, then confirm the site resolves
        *and* names the company. The verification half is the important one —
        without it you end up mailing domain squatters.

   Clearbit's public autocomplete used to be step one. HubSpot retired it, and
   a dead endpoint cost eight seconds of timeout per company before the
   fallback even started, so it is gone. */

import dns from 'node:dns/promises';
import { config } from '../config.js';
import { log } from '../logger.js';
import { fetchWithLimits, normalizeDomain, slugify, stripHtml, sleep } from '../util.js';

const TLDS = ['com', 'io', 'ai', 'co', 'dev', 'app', 'tech', 'net'];

/* Legal and structural suffixes that are never part of the domain. */
const SUFFIXES =
  /\b(inc|llc|ltd|limited|corp|corporation|company|co|gmbh|ag|bv|nv|sa|srl|pty|plc|group|holdings|labs?|technologies|technology|tech|software|solutions|systems|services|digital|studio|studios|agency|consulting|global|international)\b/gi;

const cache = new Map();

async function resolvesToHost(domain) {
  try {
    await dns.resolve4(domain);
    return true;
  } catch {
    try {
      await dns.resolve6(domain);
      return true;
    } catch {
      return false;
    }
  }
}

/** Does this page actually belong to the company we're looking for? */
async function pageConfirmsCompany(domain, name) {
  const res = await fetchWithLimits(`https://${domain}`, {
    timeoutMs: config.scrape.timeoutMs,
    maxBytes: 400_000,
    headers: { 'User-Agent': config.scrape.userAgent, Accept: 'text/html' },
  });
  if (!res.ok || !res.body) return false;

  const text = stripHtml(res.body).toLowerCase().slice(0, 6000);
  const needle = String(name).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim();
  if (!needle) return false;

  // Parked/for-sale pages are a common false positive.
  if (/(domain (is )?for sale|buy this domain|parked (free )?courtesy|godaddy)/i.test(text)) return false;

  const tokens = needle.split(/\s+/).filter((t) => t.length > 2);
  if (!tokens.length) return text.includes(needle);
  return tokens.every((t) => text.includes(t));
}

/* Domain shapes worth trying, most likely first. "Work Force Nexus" yields
   workforcenexus, work-force-nexus and workforce; "Acme Labs Inc" also yields
   acme once the suffixes are stripped. */
function candidateStems(name) {
  const base = slugify(name);
  if (!base) return [];

  const stripped = slugify(String(name).replace(SUFFIXES, ' '));
  const stems = [
    base.replace(/-/g, ''),
    base,
    stripped.replace(/-/g, ''),
    stripped,
    // First two words — "Work Force Nexus" → workforce
    base.split('-').slice(0, 2).join(''),
  ];

  return [...new Set(stems.filter((s) => s && s.length >= 3 && s.length <= 40))];
}

async function guessAndVerify(name) {
  for (const stem of candidateStems(name)) {
    for (const tld of TLDS) {
      const candidate = `${stem}.${tld}`;
      if (!(await resolvesToHost(candidate))) continue;
      if (await pageConfirmsCompany(candidate, name)) return candidate;
      await sleep(120);
    }
  }
  return null;
}

/** Resolve one company's domain, or null if it can't be established confidently. */
export async function resolveDomain(name, hint) {
  // 1 — whatever the board gave us.
  const fromHint = normalizeDomain(hint);
  if (fromHint) return fromHint;

  const key = slugify(name);
  if (!key) return null;
  if (cache.has(key)) return cache.get(key);

  let domain = null;

  // 2 — the name is itself a domain. Verify rather than assume.
  const asDomain = normalizeDomain(name);
  if (asDomain && (await resolvesToHost(asDomain))) domain = asDomain;

  // 3 — guess and verify.
  if (!domain) {
    try {
      domain = await guessAndVerify(name);
    } catch (err) {
      log.debug(`domain lookup failed for "${name}"`, { error: err.message });
    }
  }

  cache.set(key, domain);
  return domain;
}
