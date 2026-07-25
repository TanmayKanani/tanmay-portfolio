/* Stage 2 — turn companies into contactable addresses.

   Order of preference:
     1. Addresses the company published on its own site (scraped).
     2. Shared hiring inboxes inferred from the domain — only when nothing was
        published, and only if ALLOW_PATTERN_GUESSES is on.

   Every candidate is verified and deduped before it is stored. */

import { config } from '../config.js';
import { log } from '../logger.js';
import { companies, contacts, suppressions } from '../db.js';
import { scrapeCompanySite, scoreScrapedContact } from './scrape.js';
import { guessRoleInboxes } from './patterns.js';
import { verifyEmail } from './verify.js';
import { sleep } from '../util.js';

/** Find and store contacts for a single company. */
export async function findContactsForCompany(company, opts = {}) {
  const {
    allowPatterns = config.limits.allowPatternGuesses,
    requireMx = config.limits.requireMx,
    maxPerCompany = 3,
  } = opts;

  if (!company.domain) {
    companies.setStatus(company.id, 'skipped', 'no domain resolved');
    return { company: company.name, added: 0, skipped: 'no-domain' };
  }
  if (suppressions.has(null, company.domain)) {
    companies.setStatus(company.id, 'skipped', 'domain suppressed');
    return { company: company.name, added: 0, skipped: 'suppressed' };
  }

  const candidates = [];

  // --- 1. Published addresses -------------------------------------------
  let scraped = [];
  try {
    scraped = await scrapeCompanySite(company);
  } catch (err) {
    log.warn(`Scrape failed for ${company.domain}`, { error: err.message });
  }
  for (const hit of scraped) {
    candidates.push({
      email: hit.email,
      name: hit.name,
      source: 'scrape',
      confidence: scoreScrapedContact(hit),
      roleBased: hit.roleBased,
    });
  }

  // --- 2. Inferred inboxes (only if we found nothing) --------------------
  if (!candidates.length && allowPatterns) {
    const guesses = await guessRoleInboxes(company.domain, { max: 3, requireMx });
    for (const g of guesses) {
      candidates.push({
        email: g.email,
        name: null,
        source: 'pattern',
        confidence: g.confidence,
        roleBased: g.roleBased,
      });
    }
  }

  // --- 3. Verify, rank, store -------------------------------------------
  const verified = [];
  for (const c of candidates) {
    const v = await verifyEmail(c.email, { requireMx });
    if (!v.ok) {
      log.debug(`Rejected ${c.email}`, { reason: v.reason });
      continue;
    }
    verified.push({ ...c, email: v.email, verified: v.verified, roleBased: c.roleBased ?? v.roleBased });
  }

  verified.sort((a, b) => b.confidence - a.confidence);

  let added = 0;
  for (const c of verified.slice(0, maxPerCompany)) {
    const row = contacts.add({
      company_id: company.id,
      email: c.email,
      name: c.name,
      title: c.roleBased ? 'Hiring inbox' : null,
      source: c.source,
      confidence: c.confidence,
      verified: c.verified,
      role_based: c.roleBased,
    });
    if (row?.created) added += 1;
  }

  companies.setStatus(company.id, added ? 'researched' : 'skipped', added ? null : 'no contact found');
  return { company: company.name, domain: company.domain, found: verified.length, added };
}

/** Batch driver over companies that don't have contacts yet. */
/* Companies are researched in parallel. Six keeps a 44-company run to about a
   minute and a half without ever putting two requests on the same host at
   once — the throttle in scrape.js is keyed by hostname. */
const CONCURRENCY = Number(process.env.CONTACT_CONCURRENCY) || 6;

export async function runContactDiscovery({ limit = 20, ...opts } = {}) {
  const targets = companies.needingContacts(limit);
  if (!targets.length) {
    log.info('No companies awaiting contact research.');
    return { processed: 0, added: 0, withContacts: 0 };
  }

  /* A company with no website cannot be researched — there are no pages to
     read. Saying so up front beats reporting "0 contacts" and leaving the
     reader to work out why nothing happened. */
  const withDomain = targets.filter((c) => c.domain);
  const withoutDomain = targets.length - withDomain.length;

  if (withoutDomain) {
    log.warn(
      `${withoutDomain} of ${targets.length} compan${withoutDomain === 1 ? 'y has' : 'ies have'} no website on file — skipping ` +
        `${withoutDomain === 1 ? 'it' : 'them'}. Add one with:  hunter add --name "<name>" --domain <domain>`,
    );
  }

  if (!withDomain.length) {
    log.info('Nothing to research — no company on the list has a website yet.');
    return { processed: 0, added: 0, withContacts: 0, skippedNoDomain: withoutDomain };
  }

  log.info(
    `Researching ${withDomain.length} compan${withDomain.length === 1 ? 'y' : 'ies'} ` +
      `(${CONCURRENCY} at a time — each takes a few seconds)…`,
  );
  const result = { processed: 0, added: 0, withContacts: 0, skippedNoDomain: withoutDomain, details: [] };

  /* Work on several companies at once. Politeness is per-host and each company
     is a different host, so nothing here hits anyone harder — it just stops
     44 companies taking nine minutes of mostly waiting. */
  const queue = [...withDomain];
  const worker = async () => {
    for (;;) {
      const company = queue.shift();
      if (!company) return;

      const r = await findContactsForCompany(company, opts).catch((err) => {
        log.warn(`${company.name}: ${err.message}`);
        return { company: company.name, added: 0 };
      });

      result.processed += 1;
      result.added += r.added;
      if (r.added) result.withContacts += 1;
      result.details.push(r);

      log.info(
        `[${result.processed}/${withDomain.length}] ${company.name} (${company.domain}) → ` +
          `${r.added} contact(s)`,
      );
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));

  if (!result.added) {
    const patternsOn = opts.allowPatterns ?? config.limits.allowPatternGuesses;
    if (!patternsOn) {
      /* Naming the flag alone is not enough: an .env written before the
         default changed still sets it to false, and the flag looks like it
         should already be working. Name the file too. */
      log.info(
        'None of these companies publish a hiring address on their site, and inferred ' +
          'inboxes are switched off. Turn them on for one run with --allow-patterns, ' +
          'or permanently by setting ALLOW_PATTERN_GUESSES=true in your .env file.',
      );
    } else {
      log.info(
        'No addresses found. These companies publish none on their sites, and their ' +
          'domains rejected the usual shared inboxes. Add one by hand with:  ' +
          'hunter contact --company <domain> --email <address>',
      );
    }
  }

  log.ok(`Contact discovery done — ${result.added} contacts across ${result.withContacts} companies`, {
    processed: result.processed,
  });
  return result;
}
