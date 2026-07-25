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

/* A posting has to actually be a software job. Without this, "junior" alone
   was enough to rank a Procurement Specialist above a real internship —
   general job boards carry far more non-technical roles than technical ones,
   and "entry level + remote" describes most of them. */
const TECH_ROLE =
  /\b(software|engineer(ing)?|developer|programmer|programming|full[- ]?stack|front[- ]?end|back[- ]?end|web dev|mobile dev|android|ios|devops|sre|site reliability|platform|infrastructure|cloud|data (scientist|engineer|analyst)|machine learning|ml|ai|computer (science|vision)|qa|test automation|security engineer|systems?|embedded|firmware|database|dba|api|sdet)\b/i;

/* Explicitly non-technical functions. A title can contain "engineer" and
   still be a sales role ("Sales Engineer"), so these are checked too. */
const NON_TECH_ROLE =
  /\b(sales|account (executive|manager)|business development|bdr|sdr|marketing|seo|content writer|copywriter|social media|recruit(er|ing)|talent acquisition|human resources|hr\b|people ops|procurement|purchasing|supply chain|logistics|warehouse|compliance|legal|paralegal|accountant|accounting|bookkeep|payroll|finance|audit|insurance|customer (service|support|success)|call ?cent(er|re)|receptionist|administrat(or|ive) assistant|office (manager|admin)|operations coordinator|teacher|tutor|nurse|driver|cleaner|barista|retail|cashier|translator|transcription|virtual assistant|data entry)\b/i;

/* Language-specific tokens that indicate the posting is not in English.
   Not a disqualifier by itself, but a German or Spanish marketing posting is
   almost never an English-language software internship. */
const NON_ENGLISH_MARKERS = /\b(praktikant|werkstudent|mitarbeiter|vertrieb|stellenangebot|homeoffice|asesor|ventas|empleo|remoto|sin experiencia|stage|alternance|développeur)\b/i;

/** Word-boundary match, so the skill "git" does not match "digital". */
function mentionsSkill(text, skill) {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Skills like "c++" or "node.js" end in punctuation; only add \b where the
  // edge character is a word character, otherwise the boundary never matches.
  const left = /^\w/.test(skill) ? '\\b' : '';
  const right = /\w$/.test(skill) ? '\\b' : '';
  return new RegExp(`${left}${escaped}${right}`, 'i').test(text);
}

/** 0..1 fit score. Drives ordering, so the best leads get contacted first. */
export function scoreJob(job, profile) {
  const title = (job.role_title || '').toLowerCase();
  const tags = (job.tags || []).map((t) => String(t).toLowerCase());
  const text = `${title} ${tags.join(' ')} ${(job.description || '').toLowerCase()}`;
  let score = 0;

  /* Gate before scoring: a role that is not a software job is not a lead,
     however junior and remote it happens to be. */
  if (NON_TECH_ROLE.test(title)) return 0;
  if (!TECH_ROLE.test(title) && !TECH_ROLE.test(tags.join(' '))) return 0;
  if (NON_ENGLISH_MARKERS.test(`${title} ${job.location || ''}`)) return 0;

  if (/\bintern(ship)?\b/.test(title)) score += 0.35;
  else if (/\b(junior|entry[- ]level|graduate|new ?grad|trainee|apprentice)\b/.test(title)) score += 0.28;
  else if (/\b(associate|early career)\b/.test(title)) score += 0.15;

  // A senior title is a near-disqualifier for an internship search.
  if (SENIOR_MARKERS.test(title)) score -= 0.45;

  const skills = (profile.skills || []).map((s) => String(s).toLowerCase());
  const hits = skills.filter((s) => s.length > 1 && mentionsSkill(text, s));
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

  /* Track why postings fall away. Silent filtering is what made an earlier
     run look broken: five companies were stored, none of them software. */
  const junior = jobs.filter((j) => matchesKeywords(j, config.discovery.keywords));
  const scored = junior.map((j) => ({ ...j, score: scoreJob(j, profile) }));
  const relevant = scored.filter((j) => j.score >= minScore);
  const notTechnical = scored.filter((j) => j.score === 0).length;

  log.info(
    `${jobs.length} fetched → ${junior.length} entry-level → ${relevant.length} software roles` +
      (notTechnical ? ` (${notTechnical} dropped as non-technical)` : ''),
  );

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
      // Worth saying out loud: a company with no domain cannot be researched
      // for contacts, so it is a dead end until one is supplied by hand.
      log.warn(`No website found for "${job.name}" — contact discovery will skip it`);
    }

    const { created } = companies.upsert({ ...job, domain, slug: job.slug || slugify(job.name) });
    if (created) result.created += 1;
    else result.updated += 1;
  }

  if (result.unresolved) {
    log.info(
      `${result.unresolved} compan${result.unresolved === 1 ? 'y has' : 'ies have'} no website. ` +
        `Add one by hand with:  hunter add --name "<name>" --domain <domain>`,
    );
  }

  log.ok(
    `Discovery done — ${result.created} new, ${result.updated} updated, ${result.unresolved} without a domain`,
    result,
  );
  return result;
}
