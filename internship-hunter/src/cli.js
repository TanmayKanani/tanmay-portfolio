/* Command-line implementation.

   Every pipeline stage is available as a subcommand so you can run the whole
   thing without opening the dashboard:

     hunter init | auth | discover | contacts | queue | review
     hunter send | followup | sync | export | stats | suppress | serve
*/

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import { config, paths, configWarnings, loadProfile } from './config.js';
import { log } from './logger.js';
import { stats, outreach, suppressions, companies, contacts, db } from './db.js';
import { verifyEmail } from './contacts/verify.js';
import { runDiscovery } from './discovery/index.js';
import { runContactDiscovery } from './contacts/index.js';
import { queueFirstTouch } from './pipeline/queue.js';
import { sendQueued, senderIdentity } from './pipeline/send.js';
import { queueFollowUps } from './pipeline/followup.js';
import { syncReplies, syncBounces } from './pipeline/replies.js';
import { exportTracker } from './export/xlsx.js';
import { getAuthUrl, exchangeCode, isAuthorized, disconnect } from './mail/gmail.js';
import { createApp } from './server.js';
import { startScheduler } from './scheduler.js';
import { slugify, normalizeDomain } from './util.js';
import { driver } from './sqlite.js';

const [, , rawCommand = 'help', ...rest] = process.argv;
const command = rawCommand.toLowerCase();

/* Parse `--key value` and `--flag` into an options object. */
const flags = {};
for (let i = 0; i < rest.length; i += 1) {
  const arg = rest[i];
  if (!arg.startsWith('--')) continue;
  const key = arg.slice(2);
  const next = rest[i + 1];
  if (next && !next.startsWith('--')) {
    flags[key] = /^\d+(\.\d+)?$/.test(next) ? Number(next) : next;
    i += 1;
  } else {
    flags[key] = true;
  }
}

const C = { dim: '\x1b[90m', gold: '\x1b[33m', green: '\x1b[32m', red: '\x1b[31m', bold: '\x1b[1m', reset: '\x1b[0m' };
const say = (s = '') => process.stdout.write(`${s}\n`);
const ask = async (q) => {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(q);
  rl.close();
  return answer.trim();
};

function banner() {
  say(`${C.gold}${C.bold}
  ┌─────────────────────────────────┐
  │   Internship Hunter             │
  └─────────────────────────────────┘${C.reset}`);
}

const HELP = `
${C.bold}Usage${C.reset}  node bin/hunter.js <command> [options]

${C.bold}Setup${C.reset}
  init [--resume <pdf>]   Create .env + config/profile.json, copy in your resume
  doctor                  Check your setup and report what is not ready
  auth                    Connect your Gmail account (OAuth)
  auth --status           Show the connected account
  auth --disconnect       Forget the stored tokens

${C.bold}Pipeline${C.reset}
  discover  [--limit 50] [--min-score 0.25]   Find remote companies hiring
  contacts  [--limit 20] [--allow-patterns]   Find HR / careers addresses
  queue     [--limit 10] [--min-confidence]   Draft emails into the outbox
  review    [--id N]                          Print queued drafts for review
  send      [--limit 10] [--live]             Send the outbox (dry run unless --live)
  followup  [--limit 10]                      Draft the 7-day nudges
  sync                                        Pull replies and bounces from Gmail
  run       [--live]                          discover → contacts → queue → send

${C.bold}Data${C.reset}
  add       --name "Acme" --domain acme.io [--role "SWE Intern"]
  contact   --company acme.io --email careers@acme.io [--name "Jane Doe"]
  suppress  --email x@y.com | --domain y.com [--reason "..."]
  export    [--out file.xlsx]                 Write the Excel tracker
  stats                                       Print the funnel

${C.bold}Dashboard${C.reset}
  serve     [--port 4300]                     Start the web dashboard

${C.dim}Nothing is sent unless you pass --live (or set DRY_RUN=false).${C.reset}
`;

async function cmdInit() {
  banner();
  const envFile = path.join(paths.root, '.env');
  if (!fs.existsSync(envFile)) {
    fs.copyFileSync(path.join(paths.root, '.env.example'), envFile);
    say(`${C.green}✓${C.reset} Created .env — add your Google and Anthropic keys.`);
  } else {
    say(`${C.dim}·${C.reset} .env already exists — left alone.`);
  }

  if (!fs.existsSync(paths.profile)) {
    fs.copyFileSync(paths.profileExample, paths.profile);
    say(`${C.green}✓${C.reset} Created config/profile.json — edit it before sending anything.`);
  } else {
    say(`${C.dim}·${C.reset} config/profile.json already exists — left alone.`);
  }

  // --resume copies a PDF into assets/ so the project stays self-contained.
  if (flags.resume) {
    const src = path.resolve(String(flags.resume));
    if (!fs.existsSync(src)) {
      say(`${C.red}✗${C.reset} No file at ${src}`);
    } else {
      fs.copyFileSync(src, paths.resume);
      say(`${C.green}✓${C.reset} Resume copied to assets/${path.basename(paths.resume)}`);
    }
  } else if (!fs.existsSync(paths.resume)) {
    say(`${C.dim}·${C.reset} No resume yet — drop a PDF at ${path.relative(process.cwd(), paths.resume)}`);
    say(`${C.dim}  or re-run: node bin/hunter.js init --resume /path/to/resume.pdf${C.reset}`);
  }

  say(`${C.green}✓${C.reset} Database ready at ${paths.db}`);
  say('');
  say(`${C.bold}Next:${C.reset}`);
  say('  1. Edit config/profile.json (your name, bio, highlights, links)');
  say('  2. Put your resume at assets/resume.pdf');
  say('  3. Put your Google OAuth client id/secret in .env');
  say('  4. node bin/hunter.js auth');
  say('  5. node bin/hunter.js discover && node bin/hunter.js contacts');
  say('  6. node bin/hunter.js queue && node bin/hunter.js review');
  say('  7. node bin/hunter.js send        (add --live when you are happy)');
}

async function cmdAuth() {
  if (flags.disconnect) {
    disconnect();
    say(`${C.green}✓${C.reset} Disconnected.`);
    return;
  }
  if (flags.status) {
    const id = await senderIdentity();
    say(id ? `${C.green}✓${C.reset} Connected as ${id.email}` : `${C.red}✗${C.reset} Not connected.`);
    return;
  }
  if (isAuthorized() && !flags.force) {
    const id = await senderIdentity();
    say(`${C.green}✓${C.reset} Already connected as ${id?.email || 'unknown'} (use --force to re-authorize).`);
    return;
  }

  say('Open this URL, approve access, then paste the "code" query parameter back here:\n');
  say(`${C.gold}${getAuthUrl()}${C.reset}\n`);
  const input = await ask('code: ');
  if (!input) return say(`${C.red}✗${C.reset} No code entered.`);

  // Accept either the bare code or the whole redirect URL.
  let code = input;
  try {
    if (input.startsWith('http')) code = new URL(input).searchParams.get('code') || input;
  } catch {
    /* treat as a bare code */
  }

  const profile = await exchangeCode(code);
  say(`${C.green}✓${C.reset} Connected as ${profile.emailAddress}`);
}

function cmdReview() {
  const rows = flags.id
    ? [outreach.byId(Number(flags.id))].filter(Boolean)
    : outreach.pending(Number(flags.limit) || 20);

  if (!rows.length) return say(`${C.dim}Outbox is empty.${C.reset}`);

  for (const r of rows) {
    say(`\n${C.gold}${'─'.repeat(64)}${C.reset}`);
    say(`${C.bold}#${r.id}${C.reset}  →  ${r.company_name || ''} <${r.email}>`);
    say(`${C.dim}kind: ${r.kind} · written by: ${r.personalized_by}${C.reset}`);
    say(`${C.bold}Subject:${C.reset} ${r.subject}\n`);
    say(r.body);
  }
  say(`\n${C.gold}${'─'.repeat(64)}${C.reset}`);
  say(`${rows.length} draft(s) in the outbox. Send with: node bin/hunter.js send --live`);
}

function cmdStats() {
  const s = stats();
  const identity = isAuthorized() ? '' : `  ${C.red}(Gmail not connected)${C.reset}`;
  banner();
  say(`${C.bold}Pipeline${C.reset}${identity}`);
  const line = (label, value, note = '') =>
    say(`  ${String(label).padEnd(26)} ${C.bold}${String(value).padStart(5)}${C.reset} ${C.dim}${note}${C.reset}`);

  line('Companies discovered', s.companies);
  line('· with a contact', s.companiesWithContacts);
  line('Contacts found', s.contacts, `${s.verifiedContacts} MX-verified`);
  line('Queued (outbox)', s.queued);
  line('Sent', s.sent, `${s.followUpsSent} follow-ups`);
  line('Replies', s.replied, `${s.replyRate}% reply rate`);
  line('Failed / bounced', s.failed);
  line('Suppressed', s.suppressed);
  say('');
  line('Sent today', s.sentToday, `cap ${config.limits.dailyCap}`);
  if (config.limits.dryRun) say(`\n  ${C.gold}DRY_RUN is on — send is simulated.${C.reset}`);

  if (s.byDay.length) {
    say(`\n${C.bold}Recent activity${C.reset}`);
    for (const d of s.byDay.slice(0, 7)) {
      say(`  ${d.day}  ${C.gold}${'▄'.repeat(Math.min(d.n, 40))}${C.reset} ${d.n}`);
    }
  }
  for (const w of configWarnings()) say(`\n  ${C.dim}! ${w}${C.reset}`);
}

function cmdAdd() {
  const name = flags.name;
  if (!name) return say(`${C.red}✗${C.reset} --name is required.`);
  const domain = normalizeDomain(flags.domain);
  const { id, created } = companies.upsert({
    name,
    slug: slugify(name),
    domain,
    website: domain ? `https://${domain}` : null,
    role_title: flags.role || null,
    role_url: flags.url || null,
    location: flags.location || null,
    source: 'manual',
    score: 0.6,
  });
  say(`${C.green}✓${C.reset} ${created ? 'Added' : 'Updated'} ${name} (#${id})${domain ? ` — ${domain}` : ''}`);
  if (!domain) say(`  ${C.dim}No domain given — contact discovery will skip this one.${C.reset}`);
}

/* Prints what is and isn't ready, so "it didn't run" becomes answerable. */
async function cmdDoctor() {
  banner();
  const ok = (s) => `${C.green}✓${C.reset} ${s}`;
  const no = (s) => `${C.red}✗${C.reset} ${s}`;
  const meh = (s) => `${C.gold}•${C.reset} ${s}`;

  say(`${C.bold}Runtime${C.reset}`);
  say(`  ${ok(`Node ${process.versions.node} on ${process.platform}`)}`);
  say(`  ${ok(`SQLite engine: ${driver}`)}`);
  say(`  ${ok(`Database at ${paths.db}`)}`);

  say('');
  say(`${C.bold}Configuration${C.reset}`);
  say(`  ${fs.existsSync(path.join(paths.root, '.env')) ? ok('.env present') : no('.env missing — run: node bin/hunter.js init')}`);
  say(`  ${fs.existsSync(paths.profile) ? ok('config/profile.json present') : meh('config/profile.json missing — using the example profile')}`);
  say(`  ${fs.existsSync(paths.resume) ? ok(`Resume at ${path.relative(paths.root, paths.resume)}`) : meh('No resume — emails will send without an attachment')}`);
  say(`  ${config.anthropic.apiKey ? ok(`Claude enabled (${config.anthropic.model})`) : meh('No ANTHROPIC_API_KEY — emails use the built-in templates')}`);

  const gmail = config.google.clientId && config.google.clientSecret;
  say(`  ${gmail ? ok('Google OAuth credentials set') : no('No Google OAuth credentials — sending is disabled')}`);
  if (gmail) {
    say(`  ${(await isAuthorized()) ? ok('Gmail connected') : meh('Gmail not connected — run: node bin/hunter.js auth')}`);
  }

  say('');
  say(`${C.bold}Network${C.reset}  ${C.dim}(discovery needs these)${C.reset}`);
  for (const host of ['https://remotive.com/api/remote-jobs?limit=1', 'https://remoteok.com/api']) {
    const name = new URL(host).hostname;
    try {
      const res = await fetch(host, { signal: AbortSignal.timeout(8000) });
      say(`  ${res.ok ? ok(`${name} reachable`) : meh(`${name} responded ${res.status}`)}`);
    } catch (err) {
      say(`  ${no(`${name} unreachable — ${err.message}`)}`);
    }
  }

  say('');
  say(`${C.bold}Dashboard${C.reset}`);
  say(`  ${ok(`Will serve on http://${process.env.HOST || '127.0.0.1'}:${config.port}`)}`);
  say(`  ${C.dim}Start it with:  npm run dev${C.reset}`);
  say('');
}

async function cmdContact() {
  const email = String(flags.email || '');
  const key = String(flags.company || '');
  if (!email || !key) return say(`${C.red}✗${C.reset} Both --company and --email are required.`);

  // --company accepts a numeric id, a domain, or a name.
  const company =
    (/^\d+$/.test(key) && companies.byId(Number(key))) ||
    db.prepare(`SELECT * FROM companies WHERE domain = ?`).get(normalizeDomain(key) || '') ||
    db.prepare(`SELECT * FROM companies WHERE slug = ?`).get(slugify(key));

  if (!company) return say(`${C.red}✗${C.reset} No company matches "${key}". Add it first with: hunter add --name … --domain …`);

  const v = await verifyEmail(email, { requireMx: config.limits.requireMx });
  if (!v.ok) return say(`${C.red}✗${C.reset} ${email} rejected — ${v.reason}`);

  const row = contacts.add({
    company_id: company.id,
    email: v.email,
    name: flags.name || null,
    title: flags.title || (v.roleBased ? 'Hiring inbox' : null),
    source: 'manual',
    // An address you supplied by hand is the most trustworthy input there is.
    confidence: 0.95,
    verified: v.verified,
    role_based: v.roleBased,
  });

  companies.setStatus(company.id, 'researched');
  say(
    row.created
      ? `${C.green}✓${C.reset} Added ${v.email} → ${company.name}${v.verified ? '' : `  ${C.dim}(no MX record)${C.reset}`}`
      : `${C.dim}·${C.reset} ${v.email} already on file.`,
  );
}

function cmdSuppress() {
  if (flags.list) {
    const rows = suppressions.list();
    if (!rows.length) return say(`${C.dim}Nothing suppressed.${C.reset}`);
    for (const r of rows) say(`  ${r.kind.padEnd(7)} ${r.value.padEnd(34)} ${C.dim}${r.reason || ''}${C.reset}`);
    return;
  }
  const value = flags.email || flags.domain;
  if (!value) return say(`${C.red}✗${C.reset} Pass --email, --domain, or --list.`);
  const okAdded = suppressions.add(value, flags.email ? 'email' : 'domain', flags.reason || 'manual');
  say(okAdded ? `${C.green}✓${C.reset} Suppressed ${value}` : `${C.red}✗${C.reset} "${value}" is not a valid email or domain.`);
}

async function main() {
  switch (command) {
    case 'init':
      return cmdInit();

    case 'auth':
      return cmdAuth();

    case 'discover':
      return void (await runDiscovery({
        limit: flags.limit,
        minScore: flags['min-score'],
        resolveDomains: flags['no-resolve'] ? false : true,
      }));

    case 'contacts':
      return void (await runContactDiscovery({
        limit: flags.limit,
        allowPatterns: flags['allow-patterns'] || undefined,
      }));

    case 'queue':
      return void (await queueFirstTouch({
        limit: flags.limit,
        minConfidence: flags['min-confidence'],
      }));

    case 'review':
      return cmdReview();

    case 'send': {
      const dryRun = flags.live ? false : config.limits.dryRun;
      if (!dryRun) {
        const pending = outreach.pending(Number(flags.limit) || config.limits.perRunCap).length;
        const answer = await ask(
          `${C.gold}About to send ${pending} real email(s) from your Gmail. Type "send" to confirm: ${C.reset}`,
        );
        if (answer.toLowerCase() !== 'send') return say('Aborted.');
      }
      return void (await sendQueued({ limit: flags.limit, dryRun }));
    }

    case 'followup':
      return void (await queueFollowUps({ limit: flags.limit }));

    case 'sync':
      await syncReplies();
      await syncBounces();
      return;

    case 'run': {
      const dryRun = flags.live ? false : config.limits.dryRun;
      await runDiscovery({ limit: flags.limit });
      await runContactDiscovery({ limit: flags['contact-limit'] || 15 });
      await queueFirstTouch({});
      await sendQueued({ dryRun });
      return cmdStats();
    }

    case 'add':
      return cmdAdd();

    case 'contact':
      return cmdContact();

    case 'doctor':
      return cmdDoctor();

    case 'suppress':
      return cmdSuppress();

    case 'export': {
      const file = await exportTracker(flags.out ? path.resolve(String(flags.out)) : undefined);
      return say(`${C.green}✓${C.reset} ${file}`);
    }

    case 'stats':
      return cmdStats();

    case 'serve': {
      const port = Number(flags.port) || config.port;
      const host = flags.host || process.env.HOST || '127.0.0.1';
      const server = createApp().listen(port, host, () => {
        banner();
        say(`  ${C.green}→${C.reset} http://${host}:${port}\n`);
        for (const w of configWarnings()) log.warn(w);
        if (config.limits.dryRun) log.warn('DRY_RUN is on — no email will actually be sent.');
        if (config.scheduler.enabled) startScheduler();
      });

      // Without this, a taken port throws an unhandled 'error' event and the
      // reader gets a stack trace instead of the one-line fix.
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          say(`\n  ${C.red}✗${C.reset} Port ${port} is already in use.\n`);
          say(`    Something else is on that port — possibly an earlier copy of this app.`);
          say(`    Start it somewhere else instead:\n`);
          say(`        node bin/hunter.js serve --port 4301\n`);
          say(`    ${C.dim}Or change PORT in your .env file.${C.reset}\n`);
        } else if (err.code === 'EACCES') {
          say(`\n  ${C.red}✗${C.reset} Not allowed to bind port ${port}.\n`);
          say(`    Ports below 1024 need admin rights. Pick a higher one:\n`);
          say(`        node bin/hunter.js serve --port 4300\n`);
        } else {
          say(`\n  ${C.red}✗${C.reset} Could not start the server — ${err.message}\n`);
        }
        process.exit(1);
      });
      return;
    }

    case 'help':
    case '--help':
    case '-h':
      banner();
      return say(HELP);

    default:
      say(`${C.red}Unknown command: ${command}${C.reset}`);
      return say(HELP);
  }
}

main()
  .then(() => {
    // `serve` keeps the event loop alive on its own; everything else can exit.
    if (!['serve'].includes(command)) db.close();
  })
  .catch((err) => {
    log.error(err.message);
    if (process.env.LOG_LEVEL === 'debug') console.error(err);
    process.exitCode = 1;
  });
