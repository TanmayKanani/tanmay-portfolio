/* Company name → primary domain.

   Job boards almost never publish a company's website, but every later stage
   (contact discovery, dedupe, MX checks) needs it. Two strategies, best first:

     1. Clearbit's public autocomplete endpoint — no key, returns real domains.
     2. A guess-and-verify fallback: try <slug>.<tld>, then confirm the site
        actually resolves *and* names the company. The verification step is the
        important half — without it you end up mailing domain squatters. */

import dns from 'node:dns/promises';
import { config } from '../config.js';
import { log } from '../logger.js';
import { fetchWithLimits, normalizeDomain, slugify, stripHtml, sleep } from '../util.js';

const TLDS = ['com', 'io', 'ai', 'co', 'dev', 'app'];
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

async function clearbitSuggest(name) {
  const url = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(name)}`;
  const res = await fetchWithLimits(url, {
    timeoutMs: 8_000,
    maxBytes: 200_000,
    headers: { Accept: 'application/json', 'User-Agent': config.scrape.userAgent },
  });
  if (!res.ok || !res.body) return null;

  let list;
  try {
    list = JSON.parse(res.body);
  } catch {
    return null;
  }
  if (!Array.isArray(list) || !list.length) return null;

  // Only accept a suggestion whose name is a real match — the endpoint is
  // fuzzy and will happily return "Apple" for "Appleseed Labs".
  const want = slugify(name);
  const hit =
    list.find((c) => slugify(c.name) === want) ||
    list.find((c) => slugify(c.name).startsWith(want) || want.startsWith(slugify(c.name)));
  return hit ? normalizeDomain(hit.domain) : null;
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

async function guessAndVerify(name) {
  const slug = slugify(name).replace(/-/g, '');
  if (slug.length < 3) return null;

  for (const tld of TLDS) {
    const candidate = `${slug}.${tld}`;
    if (!(await resolvesToHost(candidate))) continue;
    if (await pageConfirmsCompany(candidate, name)) return candidate;
    await sleep(150);
  }
  return null;
}

/** Resolve one company's domain, or null if we can't establish it confidently. */
export async function resolveDomain(name, hint) {
  const fromHint = normalizeDomain(hint);
  if (fromHint) return fromHint;

  const key = slugify(name);
  if (!key) return null;
  if (cache.has(key)) return cache.get(key);

  let domain = null;
  try {
    domain = await clearbitSuggest(name);
  } catch (err) {
    log.debug(`domain lookup failed for "${name}"`, { error: err.message });
  }
  if (!domain) {
    try {
      domain = await guessAndVerify(name);
    } catch {
      /* fall through to null */
    }
  }

  cache.set(key, domain);
  return domain;
}
