/* Remote job-board adapters.

   Each adapter returns a normalized shape and is allowed to fail: a dead or
   rate-limited board logs a warning and the run continues with whatever the
   other boards returned. Nothing here is ever fabricated — if a field is
   missing upstream, it stays null and later stages deal with it. */

import { config } from '../config.js';
import { log } from '../logger.js';
import { fetchWithLimits, stripHtml, truncate, slugify, normalizeDomain } from '../util.js';

const JSON_HEADERS = {
  Accept: 'application/json',
  'User-Agent': config.scrape.userAgent,
};

async function getJson(url, timeoutMs = 15_000) {
  const res = await fetchWithLimits(url, {
    timeoutMs,
    maxBytes: 8_000_000,
    headers: JSON_HEADERS,
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}${res.error ? ` — ${res.error}` : ''}`);
  return JSON.parse(res.body);
}

function normalize(job) {
  if (!job.company || !job.title) return null;
  return {
    name: String(job.company).trim(),
    slug: slugify(job.company),
    domain: normalizeDomain(job.domain),
    website: job.website || null,
    careers_url: null,
    role_title: String(job.title).trim(),
    role_url: job.url || null,
    location: job.location || null,
    remote: job.remote !== false,
    tags: Array.isArray(job.tags) ? job.tags.filter(Boolean).map(String).slice(0, 12) : [],
    description: truncate(stripHtml(job.description), 1200) || null,
    posted_at: job.posted_at || null,
    source: job.source,
    source_id: job.source_id ? String(job.source_id) : null,
  };
}

/* ------------------------------- Remotive ------------------------------ */
async function remotive(limit) {
  const data = await getJson(`https://remotive.com/api/remote-jobs?limit=${limit}`);
  return (data.jobs || []).map((j) =>
    normalize({
      company: j.company_name,
      title: j.title,
      url: j.url,
      location: j.candidate_required_location,
      tags: j.tags,
      description: j.description,
      posted_at: j.publication_date,
      source: 'remotive',
      source_id: j.id,
    }),
  );
}

/* ------------------------------- RemoteOK ------------------------------ */
async function remoteok(limit) {
  const data = await getJson('https://remoteok.com/api');
  // The first element of the feed is a legal/attribution notice, not a job.
  const jobs = Array.isArray(data) ? data.filter((j) => j && j.id && j.position) : [];
  return jobs.slice(0, limit).map((j) =>
    normalize({
      company: j.company,
      title: j.position,
      url: j.url || j.apply_url,
      location: j.location || 'Remote',
      tags: j.tags,
      description: j.description,
      posted_at: j.date,
      source: 'remoteok',
      source_id: j.id,
    }),
  );
}

/* ------------------------------ Arbeitnow ------------------------------ */
async function arbeitnow(limit) {
  const data = await getJson('https://www.arbeitnow.com/api/job-board-api');
  return (data.data || []).slice(0, limit).map((j) =>
    normalize({
      company: j.company_name,
      title: j.title,
      url: j.url,
      location: j.location,
      remote: j.remote,
      tags: [...(j.tags || []), ...(j.job_types || [])],
      description: j.description,
      posted_at: j.created_at ? new Date(j.created_at * 1000).toISOString() : null,
      source: 'arbeitnow',
      source_id: j.slug,
    }),
  );
}

/* ------------------------------- Himalayas ----------------------------- */
async function himalayas(limit) {
  const data = await getJson(`https://himalayas.app/jobs/api?limit=${Math.min(limit, 100)}`);
  return (data.jobs || []).map((j) =>
    normalize({
      company: j.companyName,
      title: j.title,
      url: j.applicationLink || j.guid,
      // Himalayas sometimes exposes the company domain directly — a free hit
      // that saves a resolution round-trip later.
      domain: j.companyDomain || j.companyWebsite || null,
      website: j.companyWebsite || null,
      location: Array.isArray(j.locationRestrictions) ? j.locationRestrictions.join(', ') : null,
      tags: j.categories || j.seniority || [],
      description: j.excerpt || j.description,
      posted_at: j.pubDate ? new Date(j.pubDate * 1000).toISOString() : null,
      source: 'himalayas',
      source_id: j.guid || j.title,
    }),
  );
}

const ADAPTERS = { remotive, remoteok, arbeitnow, himalayas };

/** Run every configured board concurrently; partial failures are tolerated. */
export async function fetchAllSources({ sources = config.discovery.sources, limit = config.discovery.limitPerSource } = {}) {
  const chosen = sources.filter((s) => ADAPTERS[s]);
  const unknown = sources.filter((s) => !ADAPTERS[s]);
  if (unknown.length) log.warn(`Unknown discovery source(s) ignored: ${unknown.join(', ')}`);

  const settled = await Promise.allSettled(
    chosen.map(async (name) => {
      const t0 = Date.now();
      const jobs = (await ADAPTERS[name](limit)).filter(Boolean);
      log.info(`${name}: ${jobs.length} postings in ${Date.now() - t0}ms`);
      return jobs;
    }),
  );

  const jobs = [];
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') jobs.push(...r.value);
    else log.warn(`${chosen[i]} unavailable — skipped`, { error: r.reason?.message });
  });
  return jobs;
}

export const availableSources = Object.keys(ADAPTERS);
