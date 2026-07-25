/* SQLite schema + every query the app runs. Duplicate detection is enforced
   here by UNIQUE constraints rather than by application logic, so a race or a
   re-run can never produce two emails to the same person. */

import Database from 'better-sqlite3';
import { paths } from './config.js';
import { log, setEventSink } from './logger.js';
import { normalizeEmail, normalizeDomain, nowIso, daysAgoIso, todayKey } from './util.js';

export const db = new Database(paths.db);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS companies (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  domain        TEXT UNIQUE,
  website       TEXT,
  careers_url   TEXT,
  location      TEXT,
  remote        INTEGER DEFAULT 1,
  tags          TEXT,
  role_title    TEXT,
  role_url      TEXT,
  description   TEXT,
  source        TEXT,
  source_id     TEXT,
  score         REAL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'new',
  notes         TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

CREATE TABLE IF NOT EXISTS contacts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id    INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  title         TEXT,
  source        TEXT,
  confidence    REAL DEFAULT 0,
  verified      INTEGER DEFAULT 0,
  role_based    INTEGER DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);

CREATE TABLE IF NOT EXISTS outreach (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id      INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL DEFAULT 'initial',
  step            INTEGER NOT NULL DEFAULT 0,
  subject         TEXT,
  body            TEXT,
  personalized_by TEXT,
  status          TEXT NOT NULL DEFAULT 'queued',
  thread_id       TEXT,
  message_id      TEXT,
  rfc_message_id  TEXT,
  error           TEXT,
  queued_at       TEXT,
  sent_at         TEXT,
  replied_at      TEXT,
  created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach(status);
CREATE INDEX IF NOT EXISTS idx_outreach_contact ON outreach(contact_id);
CREATE INDEX IF NOT EXISTS idx_outreach_company ON outreach(company_id);
CREATE INDEX IF NOT EXISTS idx_outreach_thread ON outreach(thread_id);

/* Opt-outs and bounces. Checked before every single send. */
CREATE TABLE IF NOT EXISTS suppressions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  value       TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'email',
  reason      TEXT,
  created_at  TEXT NOT NULL,
  UNIQUE(value, kind)
);

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  level       TEXT NOT NULL,
  message     TEXT NOT NULL,
  meta        TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TEXT NOT NULL
);
`);

/* ------------------------------- events -------------------------------- */

const insertEvent = db.prepare(
  `INSERT INTO events (level, message, meta, created_at) VALUES (?, ?, ?, ?)`,
);
setEventSink((level, message, meta) =>
  insertEvent.run(level, message, meta ? JSON.stringify(meta) : null, nowIso()),
);

export function recentEvents(limit = 60) {
  return db
    .prepare(`SELECT * FROM events ORDER BY id DESC LIMIT ?`)
    .all(limit)
    .map((e) => ({ ...e, meta: e.meta ? JSON.parse(e.meta) : null }));
}

/* ------------------------------ settings ------------------------------- */

export const settings = {
  get(key, fallback = null) {
    const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key);
    if (!row) return fallback;
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  },
  set(key, value) {
    db.prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ).run(key, JSON.stringify(value), nowIso());
    return value;
  },
  all() {
    return Object.fromEntries(
      db.prepare(`SELECT key, value FROM settings`).all().map((r) => {
        try {
          return [r.key, JSON.parse(r.value)];
        } catch {
          return [r.key, r.value];
        }
      }),
    );
  },
};

/* ------------------------------ companies ------------------------------ */

export const companies = {
  /** Insert, or enrich the existing row without clobbering good data. */
  upsert(c) {
    const now = nowIso();
    const domain = normalizeDomain(c.domain || c.website);
    const existing =
      (domain && db.prepare(`SELECT * FROM companies WHERE domain = ?`).get(domain)) ||
      db.prepare(`SELECT * FROM companies WHERE slug = ?`).get(c.slug);

    if (existing) {
      db.prepare(
        `UPDATE companies SET
           domain      = COALESCE(domain, @domain),
           website     = COALESCE(website, @website),
           careers_url = COALESCE(careers_url, @careers_url),
           location    = COALESCE(location, @location),
           role_title  = COALESCE(role_title, @role_title),
           role_url    = COALESCE(role_url, @role_url),
           description = COALESCE(description, @description),
           tags        = COALESCE(tags, @tags),
           score       = MAX(score, @score),
           updated_at  = @updated_at
         WHERE id = @id`,
      ).run({
        id: existing.id,
        domain,
        website: c.website || null,
        careers_url: c.careers_url || null,
        location: c.location || null,
        role_title: c.role_title || null,
        role_url: c.role_url || null,
        description: c.description || null,
        tags: c.tags ? JSON.stringify(c.tags) : null,
        score: c.score || 0,
        updated_at: now,
      });
      return { id: existing.id, created: false };
    }

    const info = db
      .prepare(
        `INSERT INTO companies
           (name, slug, domain, website, careers_url, location, remote, tags, role_title,
            role_url, description, source, source_id, score, status, created_at, updated_at)
         VALUES
           (@name, @slug, @domain, @website, @careers_url, @location, @remote, @tags, @role_title,
            @role_url, @description, @source, @source_id, @score, 'new', @created_at, @updated_at)`,
      )
      .run({
        name: c.name,
        slug: c.slug,
        domain,
        website: c.website || null,
        careers_url: c.careers_url || null,
        location: c.location || null,
        remote: c.remote === false ? 0 : 1,
        tags: c.tags ? JSON.stringify(c.tags) : null,
        role_title: c.role_title || null,
        role_url: c.role_url || null,
        description: c.description || null,
        source: c.source || 'manual',
        source_id: c.source_id || null,
        score: c.score || 0,
        created_at: now,
        updated_at: now,
      });
    return { id: info.lastInsertRowid, created: true };
  },

  byId: (id) => db.prepare(`SELECT * FROM companies WHERE id = ?`).get(id),

  setStatus(id, status, notes) {
    db.prepare(`UPDATE companies SET status = ?, notes = COALESCE(?, notes), updated_at = ? WHERE id = ?`)
      .run(status, notes ?? null, nowIso(), id);
  },

  /** Companies discovered but not yet researched for contacts. */
  needingContacts(limit = 25) {
    return db
      .prepare(
        `SELECT c.* FROM companies c
         WHERE c.status = 'new'
           AND c.domain IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM contacts ct WHERE ct.company_id = c.id)
         ORDER BY c.score DESC, c.id ASC
         LIMIT ?`,
      )
      .all(limit);
  },

  list({ status, limit = 200, offset = 0 } = {}) {
    const where = status ? `WHERE c.status = @status` : '';
    return db
      .prepare(
        `SELECT c.*,
                (SELECT COUNT(*) FROM contacts ct WHERE ct.company_id = c.id) AS contact_count,
                (SELECT COUNT(*) FROM outreach o WHERE o.company_id = c.id AND o.status = 'sent') AS sent_count,
                (SELECT MAX(o.sent_at) FROM outreach o WHERE o.company_id = c.id AND o.status = 'sent') AS last_sent_at
         FROM companies c ${where}
         ORDER BY c.updated_at DESC
         LIMIT @limit OFFSET @offset`,
      )
      .all({ status, limit, offset });
  },
};

/* ------------------------------- contacts ------------------------------ */

export const contacts = {
  /** Returns null when the email already exists — that *is* the dedupe. */
  add(c) {
    const email = normalizeEmail(c.email);
    if (!email) return null;
    try {
      const info = db
        .prepare(
          `INSERT INTO contacts (company_id, email, name, title, source, confidence, verified, role_based, status, created_at)
           VALUES (@company_id, @email, @name, @title, @source, @confidence, @verified, @role_based, 'active', @created_at)`,
        )
        .run({
          company_id: c.company_id,
          email,
          name: c.name || null,
          title: c.title || null,
          source: c.source || 'manual',
          confidence: c.confidence ?? 0,
          verified: c.verified ? 1 : 0,
          role_based: c.role_based ? 1 : 0,
          created_at: nowIso(),
        });
      return { id: info.lastInsertRowid, email, created: true };
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        const existing = db.prepare(`SELECT id, email FROM contacts WHERE email = ?`).get(email);
        return { ...existing, created: false };
      }
      throw err;
    }
  },

  byId: (id) => db.prepare(`SELECT * FROM contacts WHERE id = ?`).get(id),
  byEmail: (email) => db.prepare(`SELECT * FROM contacts WHERE email = ?`).get(normalizeEmail(email)),

  setStatus(id, status) {
    db.prepare(`UPDATE contacts SET status = ? WHERE id = ?`).run(status, id);
  },

  forCompany: (companyId) =>
    db.prepare(`SELECT * FROM contacts WHERE company_id = ? ORDER BY confidence DESC`).all(companyId),

  /**
   * Contacts eligible for a first email. Every exclusion below is a hard rule:
   *   - never emailed before (any status, including failures we haven't retried)
   *   - not suppressed by email or by domain
   *   - company not contacted within the cooldown window
   *   - confidence bar met
   */
  eligibleForFirstTouch({ minConfidence = 0.5, cooldownDays = 30, limit = 10 } = {}) {
    return db
      .prepare(
        `SELECT ct.*, c.name AS company_name, c.domain AS company_domain,
                c.role_title, c.role_url, c.description AS company_description,
                c.location, c.careers_url, c.website
         FROM contacts ct
         JOIN companies c ON c.id = ct.company_id
         WHERE ct.status = 'active'
           AND ct.confidence >= @minConfidence
           AND NOT EXISTS (SELECT 1 FROM outreach o WHERE o.contact_id = ct.id)
           AND NOT EXISTS (
                 SELECT 1 FROM suppressions s
                 WHERE (s.kind = 'email'  AND s.value = ct.email)
                    OR (s.kind = 'domain' AND s.value = c.domain))
           AND NOT EXISTS (
                 SELECT 1 FROM outreach o2
                 WHERE o2.company_id = ct.company_id
                   AND o2.status IN ('sent', 'replied')
                   AND o2.sent_at > @cooldownCutoff)
         ORDER BY ct.confidence DESC, c.score DESC, ct.id ASC
         LIMIT @limit`,
      )
      .all({ minConfidence, cooldownCutoff: daysAgoIso(cooldownDays), limit });
  },
};

/* ------------------------------- outreach ------------------------------ */

export const outreach = {
  queue(o) {
    const now = nowIso();
    const info = db
      .prepare(
        `INSERT INTO outreach (contact_id, company_id, kind, step, subject, body,
                               personalized_by, status, thread_id, rfc_message_id, queued_at, created_at)
         VALUES (@contact_id, @company_id, @kind, @step, @subject, @body,
                 @personalized_by, 'queued', @thread_id, @rfc_message_id, @queued_at, @created_at)`,
      )
      .run({
        contact_id: o.contact_id,
        company_id: o.company_id,
        kind: o.kind || 'initial',
        step: o.step || 0,
        subject: o.subject,
        body: o.body,
        personalized_by: o.personalized_by || 'template',
        thread_id: o.thread_id || null,
        rfc_message_id: o.rfc_message_id || null,
        queued_at: now,
        created_at: now,
      });
    return info.lastInsertRowid;
  },

  byId: (id) => db.prepare(`SELECT * FROM outreach WHERE id = ?`).get(id),

  pending(limit = 25) {
    return db
      .prepare(
        `SELECT o.*, ct.email, ct.name AS contact_name, c.name AS company_name, c.domain
         FROM outreach o
         JOIN contacts ct ON ct.id = o.contact_id
         JOIN companies c ON c.id = o.company_id
         WHERE o.status = 'queued'
         ORDER BY o.id ASC
         LIMIT ?`,
      )
      .all(limit);
  },

  markSent(id, { threadId, messageId, rfcMessageId }) {
    db.prepare(
      `UPDATE outreach SET status = 'sent', sent_at = ?, thread_id = ?, message_id = ?, rfc_message_id = ?, error = NULL
       WHERE id = ?`,
    ).run(nowIso(), threadId || null, messageId || null, rfcMessageId || null, id);
  },

  markFailed(id, error) {
    db.prepare(`UPDATE outreach SET status = 'failed', error = ? WHERE id = ?`).run(String(error).slice(0, 500), id);
  },

  markReplied(id, at) {
    db.prepare(`UPDATE outreach SET status = 'replied', replied_at = ? WHERE id = ?`).run(at || nowIso(), id);
  },

  sentToday() {
    return db
      .prepare(`SELECT COUNT(*) AS n FROM outreach WHERE status IN ('sent','replied') AND substr(sent_at,1,10) = ?`)
      .get(todayKey()).n;
  },

  /** Live threads we should poll Gmail about. */
  awaitingReply() {
    return db
      .prepare(
        `SELECT o.*, ct.email FROM outreach o
         JOIN contacts ct ON ct.id = o.contact_id
         WHERE o.status = 'sent' AND o.thread_id IS NOT NULL
         ORDER BY o.sent_at DESC`,
      )
      .all();
  },

  /**
   * Threads due for a nudge: last message sent >= `afterDays` ago, no reply,
   * and fewer than `maxSteps` follow-ups already sent on that thread.
   */
  dueForFollowUp({ afterDays = 7, maxSteps = 2, limit = 10 } = {}) {
    return db
      .prepare(
        `SELECT o.*, ct.email, ct.name AS contact_name, ct.status AS contact_status,
                c.name AS company_name, c.domain, c.role_title
         FROM outreach o
         JOIN contacts ct ON ct.id = o.contact_id
         JOIN companies c ON c.id = o.company_id
         WHERE o.status = 'sent'
           AND ct.status = 'active'
           AND o.sent_at <= @cutoff
           AND o.id = (SELECT MAX(o2.id) FROM outreach o2
                        WHERE o2.contact_id = o.contact_id AND o2.status IN ('sent','replied'))
           AND NOT EXISTS (SELECT 1 FROM outreach o3
                            WHERE o3.contact_id = o.contact_id AND o3.status = 'replied')
           AND NOT EXISTS (SELECT 1 FROM outreach o4
                            WHERE o4.contact_id = o.contact_id AND o4.status = 'queued')
           AND (SELECT COUNT(*) FROM outreach o5
                 WHERE o5.contact_id = o.contact_id AND o5.kind = 'followup' AND o5.status IN ('sent','replied')) < @maxSteps
           AND NOT EXISTS (SELECT 1 FROM suppressions s WHERE s.kind='email' AND s.value = ct.email)
         ORDER BY o.sent_at ASC
         LIMIT @limit`,
      )
      .all({ cutoff: daysAgoIso(afterDays), maxSteps, limit });
  },

  list({ status, limit = 200 } = {}) {
    const where = status ? `WHERE o.status = @status` : '';
    return db
      .prepare(
        `SELECT o.*, ct.email, ct.name AS contact_name, c.name AS company_name, c.domain
         FROM outreach o
         JOIN contacts ct ON ct.id = o.contact_id
         JOIN companies c ON c.id = o.company_id
         ${where}
         ORDER BY COALESCE(o.sent_at, o.queued_at) DESC
         LIMIT @limit`,
      )
      .all({ status, limit });
  },
};

/* ----------------------------- suppressions ---------------------------- */

export const suppressions = {
  add(value, kind = 'email', reason = 'manual') {
    const v = kind === 'email' ? normalizeEmail(value) : normalizeDomain(value);
    if (!v) return false;
    db.prepare(
      `INSERT INTO suppressions (value, kind, reason, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(value, kind) DO UPDATE SET reason = excluded.reason`,
    ).run(v, kind, reason, nowIso());
    if (kind === 'email') {
      db.prepare(`UPDATE contacts SET status = 'suppressed' WHERE email = ?`).run(v);
    }
    log.warn(`Suppressed ${kind}: ${v}`, { reason });
    return true;
  },
  has(email, domain) {
    const row = db
      .prepare(
        `SELECT 1 FROM suppressions WHERE (kind='email' AND value=?) OR (kind='domain' AND value=?) LIMIT 1`,
      )
      .get(normalizeEmail(email) || '', normalizeDomain(domain) || '');
    return !!row;
  },
  list: () => db.prepare(`SELECT * FROM suppressions ORDER BY id DESC`).all(),
};

/* --------------------------------- stats -------------------------------- */

export function stats() {
  const one = (sql, ...args) => db.prepare(sql).get(...args);
  return {
    companies: one(`SELECT COUNT(*) n FROM companies`).n,
    companiesWithContacts: one(
      `SELECT COUNT(DISTINCT company_id) n FROM contacts WHERE status='active'`,
    ).n,
    contacts: one(`SELECT COUNT(*) n FROM contacts WHERE status='active'`).n,
    verifiedContacts: one(`SELECT COUNT(*) n FROM contacts WHERE status='active' AND verified=1`).n,
    queued: one(`SELECT COUNT(*) n FROM outreach WHERE status='queued'`).n,
    sent: one(`SELECT COUNT(*) n FROM outreach WHERE status IN ('sent','replied')`).n,
    failed: one(`SELECT COUNT(*) n FROM outreach WHERE status='failed'`).n,
    replied: one(`SELECT COUNT(*) n FROM outreach WHERE status='replied'`).n,
    followUpsSent: one(`SELECT COUNT(*) n FROM outreach WHERE kind='followup' AND status IN ('sent','replied')`).n,
    sentToday: outreach.sentToday(),
    suppressed: one(`SELECT COUNT(*) n FROM suppressions`).n,
    replyRate: (() => {
      const sent = one(`SELECT COUNT(DISTINCT contact_id) n FROM outreach WHERE status IN ('sent','replied')`).n;
      const rep = one(`SELECT COUNT(DISTINCT contact_id) n FROM outreach WHERE status='replied'`).n;
      return sent ? Math.round((rep / sent) * 1000) / 10 : 0;
    })(),
    byDay: db
      .prepare(
        `SELECT substr(sent_at,1,10) AS day, COUNT(*) AS n
         FROM outreach WHERE sent_at IS NOT NULL
         GROUP BY day ORDER BY day DESC LIMIT 30`,
      )
      .all(),
  };
}
