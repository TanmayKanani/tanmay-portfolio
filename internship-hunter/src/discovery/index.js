/* Stage 1 — find remote companies worth writing to.

   Pull postings from every configured board, keep the ones that look like
   entry-level/intern roles, score them against the candidate profile, resolve
   each company to a domain, and upsert. Dedupe happens in the DB layer. */

import { config, loadProfile } from '../config.js';
import { log } from '../logger.js';
import { companies } from '../db.js';
import { fetchAllSources } from './sources.js';
import { resolveDomain } from './domain.js';
import { sleep, slugify, daysBetween } from '../util.js';

/** Does the posting look like something a student can actually apply to? */
function matchesKeywords(job, keywords) {
  const hay = `${job.role_title} ${(job.tags || []).join(' ')}`.toLowerCase();
  return keywords.some((k) => hay.includes(k));
}

const SENIOR_MARKERS = /\b(senior|sr\.?|staff|principal|lead|head of|director|vp|manager|architect|10\+? years|expert)\b/i;

/** 0..1 fit score. Drives ordering, so the best leads get contacted first. */
export function scoreJob(job, profile) {
  const title = (job.role_title || '').toLowerCase();
  const tags = (job.tags || []).map((t) => String(t).toLowerCase());
  const text = `${title} ${tags.join(' ')} ${(job.description || '').toLowerCase()}`;
  let score = 0;

  if (/\bintern(ship)?\b/.test(title)) score += 0.35;
  else if (/\b(junior|entry[- ]level|graduate|new ?grad|trainee|apprentice)\b/.test(title)) score += 0.28;
  else if (/\b(associate|early career)\b/.test(title)) score += 0.15;

  // A senior title is a near-disqualifier for an internship search.
  if (SENIOR_MARKERS.test(title)) score -= 0.45;

  const skills = (profile.skills || []).map((s) => String(s).toLowerCase());
  const hits = skills.filter((s) => s.length > 1 && text.includes(s));
  score += Math.min(hits.length * 0.06, 0.3);

  const wantedRoles = (profile.targetRoles || []).map((r) => String(r).toLowerCase());
  if (wantedRoles.some((r) => title.includes(r))) score += 0.15;

  if (job.remote) score += 0.1;

  // Freshness: a two-week-old posting is worth less than yesterday's.
  const age = job.posted_at ? daysBetween(job.posted_at) : 14;
  if (age <= 3) score += 0.12;
  else if (age <= 10) score += 0.06;
  else if (age > 45) score -= 0.1;

  return Math.max(0, Math.min(1, Number(score.toFixed(3))));
}

/**
 * Run discovery.
 * @param {{limit?: number, sources?: string[], minScore?: number, resolveDomains?: boolean}} opts
 */
export async function runDiscovery(opts = {}) {
  const profile = loadProfile();
  const {
    limit = config.discovery.limitPerSource,
    sources = config.discovery.sources,
    minScore = 0.25,
    resolveDomains = true,
  } = opts;

  log.info(`Discovery starting — sources: ${sources.join(', ')}`);
  const jobs = await fetchAllSources({ sources, limit });
  log.info(`Fetched ${jobs.length} postings`);

  const relevant = jobs
    .filter((j) => matchesKeywords(j, config.discovery.keywords))
    .map((j) => ({ ...j, score: scoreJob(j, profile) }))
    .filter((j) => j.score >= minScore);

  // Collapse multiple postings from the same company into their best role.
  const best = new Map();
  for (const job of relevant) {
    const key = job.domain || slugify(job.name);
    if (!key) continue;
    const prev = best.get(key);
    if (!prev || job.score > prev.score) best.set(key, job);
  }

  log.info(`${best.size} companies pass the relevance bar (>= ${minScore})`);

  const result = { fetched: jobs.length, relevant: relevant.length, created: 0, updated: 0, unresolved: 0 };

  for (const job of best.values()) {
    let domain = job.domain;
    if (!domain && resolveDomains) {
      domain = await resolveDomain(job.name, job.website);
      // Be gentle with the lookup service.
      await sleep(250);
    }
    if (!domain) {
      result.unresolved += 1;
      log.debug(`No domain resolved for "${job.name}" — stored without one`);
    }

    const { created } = companies.upsert({ ...job, domain, slug: job.slug || slugify(job.name) });
    if (created) result.created += 1;
    else result.updated += 1;
  }

  log.ok(
    `Discovery done — ${result.created} new, ${result.updated} updated, ${result.unresolved} without a domain`,
    result,
  );
  return result;
}
