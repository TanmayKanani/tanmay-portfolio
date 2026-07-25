/* Stage 2a — find publicly published hiring contacts on a company's own site.

   Scope is deliberately narrow: the handful of pages a company publishes *in
   order to be contacted* (careers, contact, about, team). We honour robots.txt,
   throttle per host, cap page size, and never follow arbitrary links. */

import * as cheerio from 'cheerio';
import { config } from '../config.js';
import { log } from '../logger.js';
import { fetchWithLimits, createHostThrottle, stripHtml, titleCase } from '../util.js';
import { classify, isOnCompanyDomain } from './verify.js';

const throttle = createHostThrottle(config.scrape.perHostDelayMs);

const CANDIDATE_PATHS = [
  '/',
  '/careers',
  '/careers/',
  '/jobs',
  '/contact',
  '/contact-us',
  '/about',
  '/about-us',
  '/team',
  '/company/careers',
  '/join-us',
];

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}/gi;

/* ------------------------------ robots.txt ----------------------------- */

const robotsCache = new Map();

async function getRobots(origin) {
  if (robotsCache.has(origin)) return robotsCache.get(origin);

  const res = await fetchWithLimits(`${origin}/robots.txt`, {
    timeoutMs: 8_000,
    maxBytes: 200_000,
    headers: { 'User-Agent': config.scrape.userAgent },
  });

  // No robots.txt (or unreachable) means no restrictions were published.
  const rules = { disallow: [], allow: [] };
  if (res.ok && res.body) {
    let applies = false;
    for (const raw of res.body.split('\n')) {
      const line = raw.split('#')[0].trim();
      if (!line) continue;
      const [rawKey, ...rest] = line.split(':');
      const key = rawKey.trim().toLowerCase();
      const value = rest.join(':').trim();
      if (key === 'user-agent') {
        applies = value === '*' || config.scrape.userAgent.toLowerCase().includes(value.toLowerCase());
      } else if (applies && key === 'disallow' && value) {
        rules.disallow.push(value);
      } else if (applies && key === 'allow' && value) {
        rules.allow.push(value);
      }
    }
  }
  robotsCache.set(origin, rules);
  return rules;
}

function pathAllowed(rules, pathname) {
  if (!config.scrape.respectRobots) return true;
  const match = (patterns) =>
    patterns
      .filter((p) => pathname.startsWith(p.replace(/\*$/, '')))
      .sort((a, b) => b.length - a.length)[0];
  const allow = match(rules.allow);
  const disallow = match(rules.disallow);
  if (!disallow) return true;
  // Longest matching rule wins, per the robots.txt convention.
  return !!allow && allow.length >= disallow.length;
}

/* ------------------------------ extraction ----------------------------- */

/* Common obfuscations used to hide addresses from naive scrapers ("jane [at]
   acme [dot] io"). Decoding a deliberately published contact address is fine;
   every policy filter still applies afterwards.

   This matches the *whole* obfuscated shape in one pass rather than replacing
   the words "at" and "dot" globally — a blanket replace mangles ordinary prose
   ("Reach Jane at ...") and destroys the address it was meant to recover. */
const OBFUSCATED_EMAIL =
  /([a-z0-9._%+-]+)\s*(?:\[\s*at\s*\]|\(\s*at\s*\)|\{\s*at\s*\}|\s+at\s+)\s*([a-z0-9-]+(?:\s*(?:\[\s*dot\s*\]|\(\s*dot\s*\)|\{\s*dot\s*\}|\s+dot\s+|\.)\s*[a-z0-9-]+)*)\s*(?:\[\s*dot\s*\]|\(\s*dot\s*\)|\{\s*dot\s*\}|\s+dot\s+)\s*([a-z]{2,24})/gi;

function deobfuscate(text) {
  return String(text)
    .replace(OBFUSCATED_EMAIL, (_m, local, domain, tld) => {
      const cleanDomain = domain.replace(/\s*(?:\[\s*dot\s*\]|\(\s*dot\s*\)|\{\s*dot\s*\}|\s+dot\s+)\s*/gi, '.');
      return `${local}@${cleanDomain}.${tld}`;
    })
    // "name @ domain.com" — spacing around a real @ is common and safe to fix.
    .replace(/([a-z0-9._%+-])\s+@\s+([a-z0-9-])/gi, '$1@$2');
}

function guessNameFor(email, $, node) {
  // Prefer a human name sitting next to the link; fall back to the local part.
  const nearby = node ? stripHtml($(node).parent().text()).slice(0, 120) : '';
  const m = nearby.match(/\b([A-Z][a-z]{1,15})\s+([A-Z][a-z]{1,20})\b/);
  if (m) return `${m[1]} ${m[2]}`;

  const local = email.split('@')[0];
  if (/^[a-z]+[._][a-z]+$/i.test(local)) return titleCase(local.replace(/[._]/g, ' '));
  return null;
}

export function extractFromHtml(html, pageUrl, companyDomain) {
  const $ = cheerio.load(html);
  const found = new Map();

  const add = (rawEmail, { node, weight, context }) => {
    const c = classify(rawEmail);
    if (!c.ok) return;
    // Only accept addresses on the company's own domain — anything else is a
    // vendor, a support widget, or somebody else's business entirely.
    if (companyDomain && !isOnCompanyDomain(c.email, companyDomain)) return;

    const prev = found.get(c.email);
    if (prev && prev.weight >= weight) return;
    found.set(c.email, {
      email: c.email,
      roleBased: c.roleBased,
      weight,
      context,
      pageUrl,
      name: guessNameFor(c.email, $, node),
    });
  };

  // mailto: links are the strongest signal — someone deliberately published it.
  $('a[href^="mailto:" i]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const email = decodeURIComponent(href.replace(/^mailto:/i, '')).split('?')[0].trim();
    add(email, { node: el, weight: 3, context: 'mailto' });
  });

  // Then plain text, including lightly obfuscated forms.
  const text = deobfuscate(stripHtml(html));
  for (const match of text.match(EMAIL_RE) || []) {
    add(match, { node: null, weight: 1, context: 'page-text' });
  }

  return [...found.values()];
}

/* -------------------------------- driver ------------------------------- */

/** Crawl a company's public contact surface. Returns candidate contacts. */
export async function scrapeCompanySite(company, { maxPages = 5 } = {}) {
  const domain = company.domain;
  if (!domain) return [];

  const origin = `https://${domain}`;
  let rules;
  try {
    rules = await getRobots(origin);
  } catch {
    rules = { allow: [], disallow: [] };
  }

  /* Read the homepage first and take the careers/contact links it actually
     offers. Guessing paths misses everything behind /company/careers,
     /work-with-us, /en/jobs and the rest — and a link the site publishes is
     by definition the page it wants people to use. */
  const discovered = [];
  try {
    await throttle(domain);
    const home = await fetchWithLimits(origin, {
      timeoutMs: config.scrape.timeoutMs,
      maxBytes: config.scrape.maxBytes,
      headers: { 'User-Agent': config.scrape.userAgent, Accept: 'text/html,application/xhtml+xml' },
    });
    if (home.ok && home.body) {
      const $ = cheerio.load(home.body);
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const label = `${$(el).text()} ${href}`;
        if (!/career|job|hiring|join|work.?with|contact|about|team|people/i.test(label)) return;
        try {
          const u = new URL(href, origin);
          if (u.hostname.endsWith(domain) && !discovered.includes(u.pathname)) discovered.push(u.pathname);
        } catch {
          /* not a usable href */
        }
      });
    }
  } catch (err) {
    log.debug(`Could not read the homepage of ${domain}`, { error: err.message });
  }

  // Known careers URL first, then what the site links to, then the guesses.
  const paths = [
    ...new Set([
      ...(company.careers_url ? [company.careers_url] : []),
      ...discovered.slice(0, 6),
      ...CANDIDATE_PATHS,
    ]),
  ];

  const results = new Map();
  let visited = 0;

  for (const p of paths) {
    if (visited >= maxPages) break;

    let url;
    try {
      url = p.startsWith('http') ? new URL(p) : new URL(p, origin);
    } catch {
      continue;
    }
    // Never wander off the company's own host.
    if (!url.hostname.endsWith(domain)) continue;
    if (!pathAllowed(rules, url.pathname)) {
      log.debug(`robots.txt disallows ${url.pathname} on ${domain}`);
      continue;
    }

    await throttle(url.hostname);
    const res = await fetchWithLimits(url.toString(), {
      timeoutMs: config.scrape.timeoutMs,
      maxBytes: config.scrape.maxBytes,
      headers: { 'User-Agent': config.scrape.userAgent, Accept: 'text/html,application/xhtml+xml' },
    });
    visited += 1;
    if (!res.ok || !res.body) continue;

    const isCareersPage = /career|job|hiring|join|work-with/i.test(url.pathname);
    for (const hit of extractFromHtml(res.body, url.toString(), domain)) {
      const existing = results.get(hit.email);
      const boosted = { ...hit, weight: hit.weight + (isCareersPage ? 1 : 0) };
      if (!existing || boosted.weight > existing.weight) results.set(hit.email, boosted);
    }
  }

  log.debug(`Scraped ${domain}: ${results.size} address(es) across ${visited} page(s)`);
  return [...results.values()];
}

/**
 * Turn a scrape hit into a confidence score.
 *   mailto on a careers page  → 0.90
 *   mailto elsewhere          → 0.80
 *   plain text on careers     → 0.70
 *   plain text elsewhere      → 0.60
 * A role-based inbox (careers@, hr@) gets a small bump: it is unambiguously
 * the right place to send an application.
 */
export function scoreScrapedContact(hit) {
  let score = hit.context === 'mailto' ? 0.8 : 0.6;
  if (hit.weight >= 4) score += 0.1; // mailto found on a careers page
  else if (hit.weight === 2) score += 0.1; // page text on a careers page
  if (hit.roleBased) score += 0.05;
  return Math.min(0.95, Number(score.toFixed(2)));
}
