/* Central configuration. Everything tunable lives here so the rest of the code
   never reads process.env directly — that keeps the guardrails (daily caps,
   throttling, dry-run) in one auditable place. */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');

dotenv.config({ path: path.join(ROOT, '.env') });

const bool = (v, fallback) => {
  if (v === undefined || v === '') return fallback;
  return /^(1|true|yes|on)$/i.test(String(v).trim());
};
const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const paths = {
  root: ROOT,
  data: path.join(ROOT, 'data'),
  db: process.env.DB_PATH || path.join(ROOT, 'data', 'hunter.db'),
  tokens: path.join(ROOT, 'data', 'google-tokens.json'),
  exports: path.join(ROOT, 'data', 'exports'),
  profile: process.env.PROFILE_PATH || path.join(ROOT, 'config', 'profile.json'),
  profileExample: path.join(ROOT, 'config', 'profile.example.json'),
  assets: path.join(ROOT, 'assets'),
  // Self-contained by default. Point RESUME_PATH anywhere if you keep it elsewhere.
  resume: process.env.RESUME_PATH
    ? path.resolve(ROOT, process.env.RESUME_PATH)
    : path.join(ROOT, 'assets', 'resume.pdf'),
  public: path.join(ROOT, 'public'),
};

for (const dir of [paths.data, paths.exports, paths.assets]) {
  fs.mkdirSync(dir, { recursive: true });
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: num(process.env.PORT, 4300),
  baseUrl: process.env.BASE_URL || `http://localhost:${num(process.env.PORT, 4300)}`,

  /* The quick path: a Gmail app password, used over SMTP and IMAP. Needs
     2-Step Verification on the account but no Google Cloud project. */
  smtp: {
    address: (process.env.GMAIL_ADDRESS || '').trim(),
    // Google displays app passwords in four groups of four; the spaces are
    // presentational and must not reach the SMTP handshake.
    appPassword: (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, ''),
    name: (process.env.GMAIL_SENDER_NAME || '').trim(),
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.BASE_URL || `http://localhost:${num(process.env.PORT, 4300)}`}/auth/google/callback`,
    scopes: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-opus-5',
    // Thinking is on by default on Opus 5 and counts against max_tokens, so
    // leave real headroom above the ~200 words of email we actually want.
    maxTokens: num(process.env.ANTHROPIC_MAX_TOKENS, 8000),
    effort: process.env.ANTHROPIC_EFFORT || 'medium',
  },

  /* ---- Guardrails. These exist so the tool stays a job-search assistant and
     never turns into a bulk mailer. Raising them is a deliberate act. ---- */
  limits: {
    // Nothing is actually sent unless this is explicitly turned off.
    dryRun: bool(process.env.DRY_RUN, true),
    dailyCap: num(process.env.DAILY_SEND_CAP, 25),
    perRunCap: num(process.env.PER_RUN_CAP, 10),
    // Never contact the same company again inside this window.
    companyCooldownDays: num(process.env.COMPANY_COOLDOWN_DAYS, 30),
    // Human-paced sending: random gap between two messages.
    minDelayMs: num(process.env.MIN_DELAY_MS, 45_000),
    maxDelayMs: num(process.env.MAX_DELAY_MS, 90_000),
    /* Most companies no longer publish a hiring address — they route
       applications through an ATS form — so scraping alone finds very little.
       An inferred role inbox on a domain with live MX is a legitimate lead:
       it is always a shared mailbox rather than a guessed individual, a wrong
       guess costs a bounce (which auto-suppresses), and every draft is
       reviewed before it is sent. The bar sits just under those guesses so
       they are usable, and well above the weakest ones. */
    minConfidence: Number(process.env.MIN_CONFIDENCE ?? 0.4),
    allowPatternGuesses: bool(process.env.ALLOW_PATTERN_GUESSES, true),
    requireMx: bool(process.env.REQUIRE_MX, true),
  },

  followUp: {
    enabled: bool(process.env.FOLLOWUP_ENABLED, true),
    // Days after the previous message before the next nudge is due.
    steps: (process.env.FOLLOWUP_DAYS || '7,14')
      .split(',')
      .map((s) => num(s.trim(), 0))
      .filter((n) => n > 0),
    maxFollowUps: num(process.env.MAX_FOLLOWUPS, 2),
  },

  discovery: {
    sources: (process.env.DISCOVERY_SOURCES || 'remotive,remoteok,arbeitnow,himalayas')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    keywords: (process.env.DISCOVERY_KEYWORDS || 'intern,internship,junior,entry level,graduate,new grad')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    limitPerSource: num(process.env.DISCOVERY_LIMIT, 50),
  },

  scrape: {
    userAgent:
      process.env.SCRAPE_USER_AGENT ||
      'InternshipHunter/1.0 (+personal job-search assistant; contact via the email in the message)',
    timeoutMs: num(process.env.SCRAPE_TIMEOUT_MS, 12_000),
    maxBytes: num(process.env.SCRAPE_MAX_BYTES, 1_500_000),
    respectRobots: bool(process.env.RESPECT_ROBOTS, true),
    // Politeness gap between two requests to the same host.
    perHostDelayMs: num(process.env.SCRAPE_HOST_DELAY_MS, 2_000),
  },

  scheduler: {
    enabled: bool(process.env.SCHEDULER_ENABLED, false),
    // Cron expressions, server local time.
    discoveryCron: process.env.DISCOVERY_CRON || '0 9 * * 1-5',
    followUpCron: process.env.FOLLOWUP_CRON || '0 10 * * 1-5',
    replySyncCron: process.env.REPLY_SYNC_CRON || '0 */3 * * *',
  },

  dashboard: {
    // Optional shared secret for the dashboard/API when exposed beyond localhost.
    token: process.env.DASHBOARD_TOKEN || '',
  },
};

export function loadProfile() {
  const file = fs.existsSync(paths.profile) ? paths.profile : paths.profileExample;
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { ...raw, _source: file };
}

export function configWarnings() {
  const warn = [];
  // Either transport counts as connected; only complain when neither is set up.
  const hasAppPassword = config.smtp.address && config.smtp.appPassword;
  const hasOAuth = config.google.clientId && config.google.clientSecret;
  if (!hasAppPassword && !hasOAuth) {
    warn.push('Gmail is not connected — run "node bin/hunter.js auth" (about two minutes).');
  }
  if (!config.anthropic.apiKey) {
    warn.push('ANTHROPIC_API_KEY is not set — emails will fall back to templates.');
  }
  if (!fs.existsSync(paths.profile)) {
    warn.push(`No config/profile.json — using the example profile. Run "hunter init".`);
  }
  if (!fs.existsSync(paths.resume)) {
    warn.push(
      `No resume at ${paths.resume} — emails will send without an attachment. ` +
        `Drop a PDF there, or run "hunter init --resume <path>".`,
    );
  }
  return warn;
}

/* Set keys in .env in place, preserving comments, ordering and anything the
   reader customised. Only the named keys are touched. Used by `hunter auth`
   and by the dashboard's Gmail setup, so neither has to hand-edit the file. */
export function writeEnvKeys(updates) {
  const file = path.join(ROOT, '.env');
  let text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';

  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    const existing = new RegExp(`^${key}=.*$`, 'm');
    text = existing.test(text) ? text.replace(existing, line) : `${text.replace(/\n*$/, '\n')}${line}\n`;
  }

  // Contains a password once Gmail is connected — keep it owner-readable only.
  fs.writeFileSync(file, text, { mode: 0o600 });
}
