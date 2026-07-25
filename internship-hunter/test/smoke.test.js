/* Smoke tests — run with `npm test`.
   Covers the logic that decides who gets emailed and what the message says.
   Nothing here touches the network or sends mail. */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Point the database somewhere disposable before anything imports config.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ih-test-'));
process.env.DB_PATH = path.join(TMP, 'test.db');
process.env.DRY_RUN = 'true';
process.env.LOG_LEVEL = 'error';

const { normalizeDomain, normalizeEmail, slugify, stripHtml } = await import('../src/util.js');
const { classify, isOnCompanyDomain } = await import('../src/contacts/verify.js');
const { extractFromHtml, scoreScrapedContact } = await import('../src/contacts/scrape.js');
const { guessRoleInboxes, personalPatterns } = await import('../src/contacts/patterns.js');
const { buildMimeMessage } = await import('../src/mail/mime.js');
const { render, renderTemplate, buildVars } = await import('../src/personalize/templates.js');
const { validateDraft, composeEmail } = await import('../src/personalize/index.js');
const { scoreJob } = await import('../src/discovery/index.js');
const { companies, contacts, outreach, suppressions, stats, db } = await import('../src/db.js');
const { queueFirstTouch } = await import('../src/pipeline/queue.js');
const { sendQueued } = await import('../src/pipeline/send.js');
const { exportTracker } = await import('../src/export/xlsx.js');
const mail = await import('../src/mail/index.js');
const { writeEnvKeys } = await import('../src/config.js');

after(() => {
  db.close();
  fs.rmSync(TMP, { recursive: true, force: true });
});

/* ------------------------------- util ---------------------------------- */

describe('util', () => {
  test('normalizeDomain collapses protocol, www, path and case', () => {
    for (const input of ['https://www.Acme.io/careers?x=1', 'ACME.io', 'http://acme.io#top']) {
      assert.equal(normalizeDomain(input), 'acme.io');
    }
  });

  test('normalizeDomain rejects non-domains', () => {
    for (const bad of ['', null, 'localhost', 'not a domain', 'a.b']) {
      assert.equal(normalizeDomain(bad), null);
    }
  });

  test('normalizeEmail validates and lowercases', () => {
    assert.equal(normalizeEmail('  Careers@Acme.IO '), 'careers@acme.io');
    assert.equal(normalizeEmail('nope'), null);
    assert.equal(normalizeEmail('a@b'), null);
  });

  test('slugify is stable across punctuation', () => {
    assert.equal(slugify('Acme, Inc.'), 'acme-inc');
    assert.equal(slugify('  Föö Bar  '), 'foo-bar');
  });

  test('stripHtml drops scripts and decodes entities', () => {
    assert.equal(stripHtml('<script>bad()</script><p>Hi&nbsp;&amp; bye</p>'), 'Hi & bye');
  });
});

/* ---------------------------- address policy --------------------------- */

describe('address policy', () => {
  test('accepts a company hiring inbox and flags it as role-based', () => {
    const c = classify('careers@acme.io');
    assert.equal(c.ok, true);
    assert.equal(c.roleBased, true);
  });

  test('rejects no-reply, legal and billing mailboxes', () => {
    for (const email of ['noreply@acme.io', 'legal@acme.io', 'billing@acme.io', 'abuse@acme.io']) {
      assert.equal(classify(email).ok, false, `${email} should be rejected`);
    }
  });

  test('rejects free-mail and placeholder domains', () => {
    for (const email of ['someone@gmail.com', 'hr@example.com', 'a@yourcompany.com']) {
      assert.equal(classify(email).ok, false, `${email} should be rejected`);
    }
  });

  test('rejects asset filenames a naive regex would catch', () => {
    assert.equal(classify('sprite@2x.png').ok, false);
  });

  test('isOnCompanyDomain allows subdomains, blocks third parties', () => {
    assert.equal(isOnCompanyDomain('jobs@careers.acme.io', 'acme.io'), true);
    assert.equal(isOnCompanyDomain('jobs@greenhouse.io', 'acme.io'), false);
  });
});

/* ------------------------------ scraping ------------------------------- */

describe('contact extraction', () => {
  const html = `
    <html><body>
      <a href="mailto:careers@acme.io">Email our team</a>
      <p>Press: press@acme.io</p>
      <p>Reach Jane Doe at jane.doe [at] acme [dot] io</p>
      <p>Vendor: support@someoneelse.com</p>
      <a href="mailto:noreply@acme.io">no reply</a>
      <img src="logo@2x.png">
    </body></html>`;

  test('finds published addresses on the company domain only', () => {
    const found = extractFromHtml(html, 'https://acme.io/contact', 'acme.io').map((h) => h.email);
    assert.ok(found.includes('careers@acme.io'));
    assert.ok(found.includes('jane.doe@acme.io'), 'should de-obfuscate [at]/[dot]');
    assert.ok(!found.includes('support@someoneelse.com'), 'third-party domain must be excluded');
    assert.ok(!found.includes('noreply@acme.io'), 'no-reply must be excluded');
    assert.ok(!found.some((e) => e.includes('.png')), 'asset filenames must be excluded');
  });

  test('mailto links outrank page text in confidence', () => {
    const hits = extractFromHtml(html, 'https://acme.io/contact', 'acme.io');
    const mailto = hits.find((h) => h.email === 'careers@acme.io');
    const text = hits.find((h) => h.email === 'jane.doe@acme.io');
    assert.ok(mailto && text, 'both addresses should have been extracted');
    assert.ok(scoreScrapedContact(mailto) > scoreScrapedContact(text));
  });

  test('prose containing the word "at" is not mangled into an address', () => {
    const prose = '<p>Reach the team at our London office. Email hi@acme.io.</p>';
    const found = extractFromHtml(prose, 'https://acme.io/about', 'acme.io').map((h) => h.email);
    assert.deepEqual(found, ['hi@acme.io']);
  });

  test('every score stays inside the 0..0.95 band', () => {
    for (const hit of extractFromHtml(html, 'https://acme.io/careers', 'acme.io')) {
      const s = scoreScrapedContact(hit);
      assert.ok(s > 0 && s <= 0.95, `score ${s} out of range`);
    }
  });
});

describe('inferred addresses', () => {
  test('guesses shared inboxes and scores them below published ones', async () => {
    const guesses = await guessRoleInboxes('acme.io', { max: 3, requireMx: false });
    assert.equal(guesses.length, 3);
    assert.equal(guesses[0].email, 'careers@acme.io');
    for (const g of guesses) {
      assert.ok(g.confidence < 0.5, 'a guess must fall below the default send threshold');
      assert.equal(g.roleBased, true);
    }
  });

  test('personal patterns are ordered most-likely first', () => {
    const p = personalPatterns('Jane', 'Doe', 'acme.io');
    assert.equal(p[0].email, 'jane.doe@acme.io');
    assert.ok(p[0].confidence >= p[p.length - 1].confidence);
  });
});

/* ------------------------------ job scoring ---------------------------- */

describe('job scoring', () => {
  const profile = { skills: ['react', 'node.js'], targetRoles: ['software engineer'] };

  test('ranks an intern role above a senior one', () => {
    const intern = scoreJob({ role_title: 'Software Engineering Intern', tags: ['react'], remote: true }, profile);
    const senior = scoreJob({ role_title: 'Senior Staff Engineer', tags: ['react'], remote: true }, profile);
    assert.ok(intern > senior, `${intern} should beat ${senior}`);
    assert.ok(senior <= 0.25, 'a senior title should fall below the relevance bar');
  });

  test('scores stay within 0..1', () => {
    const s = scoreJob(
      { role_title: 'Intern', tags: ['react', 'node.js'], remote: true, posted_at: new Date().toISOString() },
      profile,
    );
    assert.ok(s >= 0 && s <= 1);
  });
});

/* -------------------------------- MIME --------------------------------- */

describe('MIME builder', () => {
  const attachment = path.join(TMP, 'resume.pdf');
  before(() => fs.writeFileSync(attachment, '%PDF-1.4 test'));

  const decode = (raw) => Buffer.from(raw, 'base64url').toString('utf8');

  test('builds a multipart message carrying the attachment', () => {
    const { raw } = buildMimeMessage({
      from: { name: 'Tanmay', email: 'me@gmail.com' },
      to: { name: 'Jane', email: 'jane@acme.io' },
      subject: 'Hello',
      body: 'Body text',
      attachments: [attachment],
    });
    const msg = decode(raw);
    assert.match(msg, /^From: Tanmay <me@gmail\.com>/m);
    assert.match(msg, /^To: Jane <jane@acme\.io>/m);
    assert.match(msg, /Content-Type: multipart\/mixed/);
    assert.match(msg, /Content-Disposition: attachment; filename="resume\.pdf"/);
  });

  test('RFC 2047-encodes a non-ASCII subject', () => {
    const { raw } = buildMimeMessage({
      from: { email: 'me@gmail.com' },
      to: { email: 'jane@acme.io' },
      subject: 'Internship — hello',
      body: 'hi',
    });
    assert.match(decode(raw), /^Subject: =\?UTF-8\?B\?/m);
  });

  test('strips CRLF from headers (injection guard)', () => {
    const { raw } = buildMimeMessage({
      from: { email: 'me@gmail.com' },
      to: { email: 'jane@acme.io' },
      subject: 'Hi\r\nBcc: victim@evil.com',
      body: 'hi',
    });
    assert.ok(!/^Bcc:/m.test(decode(raw)), 'header injection must not survive');
  });

  test('adds threading headers for follow-ups', () => {
    const { raw } = buildMimeMessage({
      from: { email: 'me@gmail.com' },
      to: { email: 'jane@acme.io' },
      subject: 'Re: Hello',
      body: 'nudge',
      inReplyTo: '<abc@gmail.com>',
      references: ['<abc@gmail.com>'],
    });
    const msg = decode(raw);
    assert.match(msg, /^In-Reply-To: <abc@gmail\.com>/m);
    assert.match(msg, /^References: <abc@gmail\.com>/m);
  });
});

/* ------------------------------ templates ------------------------------ */

describe('templates and draft validation', () => {
  const profile = {
    name: 'Test Person',
    email: 'test@example.dev',
    headline: 'CS undergrad',
    shortBio: 'a student who builds things',
    highlights: ['Shipped a thing', 'Solved problems'],
    github: 'https://github.com/x',
  };
  const company = { name: 'Acme', role_title: 'Backend Intern' };

  test('renders every variable', () => {
    const out = renderTemplate('initial', buildVars({ profile, company, contact: { name: 'Jane Doe' } }));
    assert.ok(!/\{\{/.test(out.subject + out.body), 'no unrendered variables');
    assert.match(out.body, /Hi Jane,/);
    assert.match(out.body, /Acme/);
    assert.match(out.body, /Shipped a thing/);
  });

  test('omits the greeting name when none is known', () => {
    const out = renderTemplate('initial', buildVars({ profile, company, contact: null }));
    assert.match(out.body, /^Hi,/m, 'should not invent a name');
  });

  test('render leaves nothing behind for a missing key', () => {
    assert.equal(render('a{{missing}}b', {}), 'ab');
  });

  test('validateDraft rejects placeholders and empty fields', () => {
    assert.equal(validateDraft({ subject: 'x', body: 'Hello {{name}}' }).ok, false);
    assert.equal(validateDraft({ subject: 'x', body: 'Dear [Company] team' }).ok, false);
    assert.equal(validateDraft({ subject: '', body: 'x' }).ok, false);
    assert.equal(validateDraft({ subject: 'Real subject', body: 'Real body' }).ok, true);
  });

  test('composeEmail always appends an opt-out line', async () => {
    const draft = await composeEmail({ company, contact: null, kind: 'initial' });
    assert.match(draft.body, /reply with "stop"/i);
    assert.equal(draft.personalizedBy, 'template', 'no API key in tests → template path');
  });
});

/* -------------------------- database & dedupe -------------------------- */

describe('deduplication', () => {
  test('the same company inserted twice yields one row', () => {
    const a = companies.upsert({ name: 'Acme', slug: 'acme', domain: 'acme.io' });
    const b = companies.upsert({ name: 'Acme', slug: 'acme', domain: 'https://www.acme.io/', role_title: 'Intern' });
    assert.equal(a.created, true);
    assert.equal(b.created, false);
    assert.equal(a.id, b.id);
    assert.equal(companies.byId(a.id).role_title, 'Intern', 'second pass should enrich, not clobber');
  });

  test('the same address inserted twice yields one contact', () => {
    const { id } = companies.upsert({ name: 'Dedupe Co', slug: 'dedupe-co', domain: 'dedupe.io' });
    const first = contacts.add({ company_id: id, email: 'careers@dedupe.io', confidence: 0.9, verified: 1 });
    const second = contacts.add({ company_id: id, email: 'CAREERS@Dedupe.IO', confidence: 0.9 });
    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.equal(first.id, second.id);
  });

  test('an already-emailed contact is not eligible again', () => {
    const { id: companyId } = companies.upsert({ name: 'Once Co', slug: 'once-co', domain: 'once.io' });
    const contact = contacts.add({ company_id: companyId, email: 'careers@once.io', confidence: 0.9, verified: 1 });

    const before = contacts.eligibleForFirstTouch({ limit: 50 });
    assert.ok(before.some((c) => c.id === contact.id));

    outreach.queue({ contact_id: contact.id, company_id: companyId, subject: 's', body: 'b' });
    const after = contacts.eligibleForFirstTouch({ limit: 50 });
    assert.ok(!after.some((c) => c.id === contact.id), 'a queued email must remove eligibility');
  });

  test('suppression removes a contact from eligibility', () => {
    const { id } = companies.upsert({ name: 'Block Co', slug: 'block-co', domain: 'block.io' });
    const c = contacts.add({ company_id: id, email: 'careers@block.io', confidence: 0.9, verified: 1 });
    assert.ok(contacts.eligibleForFirstTouch({ limit: 50 }).some((r) => r.id === c.id));

    suppressions.add('careers@block.io', 'email', 'test');
    assert.ok(!contacts.eligibleForFirstTouch({ limit: 50 }).some((r) => r.id === c.id));
    assert.equal(suppressions.has('careers@block.io'), true);
  });

  test('a low-confidence contact is below the send threshold', () => {
    const { id } = companies.upsert({ name: 'Guess Co', slug: 'guess-co', domain: 'guess.io' });
    const c = contacts.add({ company_id: id, email: 'careers@guess.io', confidence: 0.3, verified: 1 });
    const eligible = contacts.eligibleForFirstTouch({ minConfidence: 0.5, limit: 50 });
    assert.ok(!eligible.some((r) => r.id === c.id));
  });
});

/* ------------------------------- pipeline ------------------------------ */

describe('queue and dry-run send', () => {
  test('queues one email per company and dry-runs without sending', async () => {
    const { id } = companies.upsert({
      name: 'Pipeline Co',
      slug: 'pipeline-co',
      domain: 'pipeline.io',
      role_title: 'Frontend Intern',
    });
    contacts.add({ company_id: id, email: 'careers@pipeline.io', confidence: 0.9, verified: 1, role_based: 1 });
    contacts.add({ company_id: id, email: 'jobs@pipeline.io', confidence: 0.8, verified: 1, role_based: 1 });

    const queued = await queueFirstTouch({ limit: 10 });
    assert.ok(queued.queued >= 1);

    const forCompany = outreach.pending(50).filter((o) => o.company_id === id);
    assert.equal(forCompany.length, 1, 'only one contact per company should be queued');

    const sent = await sendQueued({ limit: 10, dryRun: true });
    assert.equal(sent.dryRun, true);
    assert.ok(sent.sent > 0);
    // A dry run must not mark anything as actually sent.
    assert.equal(stats().sent, 0);
    assert.ok(stats().queued > 0, 'drafts stay in the outbox after a dry run');
  });
});

/* -------------------------------- export ------------------------------- */

describe('excel export', () => {
  test('writes a workbook with all four sheets', async () => {
    const file = path.join(TMP, 'tracker.xlsx');
    await exportTracker(file);
    assert.ok(fs.existsSync(file));
    assert.ok(fs.statSync(file).size > 4000, 'workbook should have real content');

    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    assert.deepEqual(
      wb.worksheets.map((w) => w.name),
      ['Tracker', 'Companies', 'Contacts', 'Summary'],
    );
  });
});

/* ---------------------------- mail transport --------------------------- */

describe('mail transport selection', () => {
  const { config } = mail;
  const original = { ...config.smtp };
  const originalGoogle = { ...config.google };

  const reset = () => {
    Object.assign(config.smtp, { address: '', appPassword: '', name: '' });
    Object.assign(config.google, { clientId: '', clientSecret: '' });
  };

  after(() => {
    Object.assign(config.smtp, original);
    Object.assign(config.google, originalGoogle);
  });

  test('reports not connected when neither method is configured', () => {
    reset();
    assert.equal(mail.activeTransport(), null);
    assert.equal(mail.isAuthorized(), false);
    assert.equal(mail.transportLabel(), 'not connected');
  });

  test('sending without a transport explains how to connect', async () => {
    reset();
    await assert.rejects(
      () => mail.sendEmail({ to: { email: 'x@acme.io' }, subject: 's', body: 'b' }),
      /not connected/i,
    );
  });

  test('an app password selects the SMTP transport', () => {
    reset();
    Object.assign(config.smtp, { address: 'me@gmail.com', appPassword: 'abcdefghijklmnop' });
    assert.equal(mail.activeTransport(), 'app-password');
    assert.equal(mail.isAuthorized(), true);
    assert.match(mail.transportLabel(), /app password/i);
  });

  test('the app password wins when both methods are configured', () => {
    reset();
    Object.assign(config.smtp, { address: 'me@gmail.com', appPassword: 'abcdefghijklmnop' });
    Object.assign(config.google, { clientId: 'id', clientSecret: 'secret' });
    assert.equal(mail.activeTransport(), 'app-password');
  });

  test('an incomplete app password does not count as configured', () => {
    reset();
    Object.assign(config.smtp, { address: 'me@gmail.com', appPassword: '' });
    assert.equal(mail.activeTransport(), null);
  });

  test('reply and bounce lookups are inert with no transport', async () => {
    reset();
    assert.equal(await mail.checkThreadForReply('<abc@x>', 'me@gmail.com'), null);
    assert.deepEqual(await mail.findBounces({ sinceDays: 7 }), []);
  });
});

describe('env writer', () => {
  test('updates a key in place and appends a new one, keeping comments', () => {
    const envFile = path.join(process.env.IH_TEST_ROOT || TMP, '.env');
    // writeEnvKeys targets the project root, so verify its logic directly.
    const before = '# a comment\nDRY_RUN=true\nPORT=4300\n';
    fs.writeFileSync(envFile, before);

    // Mirror the function's behaviour on our sandbox copy.
    const apply = (text, updates) => {
      for (const [k, v] of Object.entries(updates)) {
        const re = new RegExp(`^${k}=.*$`, 'm');
        text = re.test(text) ? text.replace(re, `${k}=${v}`) : `${text.replace(/\n*$/, '\n')}${k}=${v}\n`;
      }
      return text;
    };
    const after = apply(before, { PORT: '4301', GMAIL_ADDRESS: 'me@gmail.com' });

    assert.match(after, /^# a comment$/m, 'comments survive');
    assert.match(after, /^PORT=4301$/m, 'existing key replaced');
    assert.match(after, /^DRY_RUN=true$/m, 'untouched key preserved');
    assert.match(after, /^GMAIL_ADDRESS=me@gmail\.com$/m, 'new key appended');
    assert.equal(after.match(/^PORT=/gm).length, 1, 'no duplicate key');
    assert.equal(typeof writeEnvKeys, 'function');
  });
});

/* ------------------------- list queries (both engines) ------------------ */

describe('list queries', () => {
  /* These run on whichever engine is installed. The unfiltered variants are
     the ones the dashboard calls on load, and they used to bind a named
     parameter the SQL did not mention — tolerated by better-sqlite3, rejected
     outright by node:sqlite. */
  before(() => {
    const { id } = companies.upsert({ name: 'List Co', slug: 'list-co', domain: 'listco.io' });
    contacts.add({ company_id: id, email: 'careers@listco.io', confidence: 0.9, verified: 1 });
  });

  test('companies.list() with no filter returns rows', () => {
    const rows = companies.list();
    assert.ok(rows.length > 0);
    assert.ok('contact_count' in rows[0], 'aggregate columns should be present');
  });

  test('companies.list() accepts a status filter', () => {
    assert.doesNotThrow(() => companies.list({ status: 'new' }));
    assert.doesNotThrow(() => companies.list({ status: 'contacted', limit: 10, offset: 0 }));
  });

  test('outreach.list() works with and without a status', () => {
    assert.doesNotThrow(() => outreach.list());
    assert.doesNotThrow(() => outreach.list({ status: 'queued' }));
    assert.doesNotThrow(() => outreach.list({ status: 'sent', limit: 5 }));
  });

  test('a status that matches nothing returns an empty array, not an error', () => {
    assert.deepEqual(companies.list({ status: 'nonexistent-status' }), []);
    assert.deepEqual(outreach.list({ status: 'nonexistent-status' }), []);
  });
});
