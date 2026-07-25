/* Dashboard + JSON API + the Gmail OAuth callback.

   Binds to localhost by default. If you expose it anywhere else, set
   DASHBOARD_TOKEN — the API can send email on your behalf. */

import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { config, paths, configWarnings, loadProfile, writeEnvKeys } from './config.js';
import { log } from './logger.js';
import { companies, contacts, outreach, suppressions, stats, recentEvents, settings, db } from './db.js';
import { getAuthUrl, exchangeCode, isAuthorized, disconnect, transportLabel, verifyAppPassword } from './mail/index.js';
import { senderIdentity } from './pipeline/send.js';
import { runDiscovery } from './discovery/index.js';
import { runContactDiscovery } from './contacts/index.js';
import { queueFirstTouch } from './pipeline/queue.js';
import { sendQueued } from './pipeline/send.js';
import { queueFollowUps } from './pipeline/followup.js';
import { syncReplies, syncBounces } from './pipeline/replies.js';
import { exportTracker } from './export/xlsx.js';
import { startJob, getJob, listJobs, currentJob } from './jobs.js';
import { startScheduler } from './scheduler.js';

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  /* --- Optional shared-secret gate on everything except OAuth + assets --- */
  app.use((req, res, next) => {
    if (!config.dashboard.token) return next();
    if (req.path.startsWith('/auth/')) return next();
    const supplied = req.get('x-dashboard-token') || req.query.token;
    if (supplied === config.dashboard.token) return next();
    if (!req.path.startsWith('/api/')) return next(); // let the page load and prompt
    return res.status(401).json({ error: 'unauthorized' });
  });

  app.use(express.static(paths.public));

  const ok = (res, data) => res.json({ ok: true, ...data });
  const wrap = (handler) => async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      log.error(`API ${req.method} ${req.path} failed`, { error: err.message });
      res.status(err.code === 'JOB_BUSY' ? 409 : 500).json({ ok: false, error: err.message });
    }
  };

  /* ------------------------------- status ------------------------------ */

  app.get('/api/status', wrap(async (_req, res) => {
    const profile = loadProfile();
    ok(res, {
      stats: stats(),
      gmail: {
        connected: isAuthorized(),
        identity: await senderIdentity(),
        transport: transportLabel(),
        // Lets Settings show the right setup path instead of a dead link.
        oauthConfigured: Boolean(config.google.clientId && config.google.clientSecret),
      },
      ai: { enabled: Boolean(config.anthropic.apiKey), model: config.anthropic.model },
      limits: config.limits,
      followUp: config.followUp,
      scheduler: config.scheduler,
      profile: { name: profile.name, email: profile.email, headline: profile.headline },
      resume: { path: paths.resume, present: fs.existsSync(paths.resume) },
      warnings: configWarnings(),
      job: currentJob(),
    });
  }));

  app.get('/api/events', wrap((req, res) => ok(res, { events: recentEvents(Number(req.query.limit) || 60) })));
  app.get('/api/jobs', wrap((_req, res) => ok(res, { jobs: listJobs() })));
  app.get('/api/jobs/:id', wrap((req, res) => {
    const job = getJob(req.params.id);
    if (!job) return res.status(404).json({ ok: false, error: 'no such job' });
    return ok(res, { job });
  }));

  /* ------------------------------- data -------------------------------- */

  app.get('/api/companies', wrap((req, res) =>
    ok(res, { companies: companies.list({ status: req.query.status, limit: Number(req.query.limit) || 200 }) })));

  app.get('/api/companies/:id/contacts', wrap((req, res) =>
    ok(res, { contacts: contacts.forCompany(Number(req.params.id)) })));

  app.get('/api/contacts', wrap((req, res) => {
    const limit = Math.min(Number(req.query.limit) || 500, 2000);
    ok(res, {
      contacts: db
        .prepare(
          `SELECT ct.*, c.name AS company_name, c.domain AS company_domain
           FROM contacts ct JOIN companies c ON c.id = ct.company_id
           ORDER BY ct.confidence DESC, ct.id DESC LIMIT ?`,
        )
        .all(limit),
    });
  }));

  app.get('/api/outreach', wrap((req, res) =>
    ok(res, { outreach: outreach.list({ status: req.query.status, limit: Number(req.query.limit) || 200 }) })));

  app.get('/api/outreach/:id', wrap((req, res) => {
    const row = outreach.byId(Number(req.params.id));
    if (!row) return res.status(404).json({ ok: false, error: 'not found' });
    return ok(res, { draft: row });
  }));

  /* Edit a queued draft before it goes out — the whole point of the review step. */
  app.patch('/api/outreach/:id', wrap((req, res) => {
    const row = outreach.byId(Number(req.params.id));
    if (!row) return res.status(404).json({ ok: false, error: 'not found' });
    if (row.status !== 'queued') return res.status(400).json({ ok: false, error: 'only queued drafts can be edited' });

    const { subject, body } = req.body || {};
    db.prepare(`UPDATE outreach SET subject = COALESCE(?, subject), body = COALESCE(?, body), personalized_by = 'edited' WHERE id = ?`)
      .run(subject ?? null, body ?? null, row.id);
    return ok(res, { draft: outreach.byId(row.id) });
  }));

  app.delete('/api/outreach/:id', wrap((req, res) => {
    const row = outreach.byId(Number(req.params.id));
    if (!row) return res.status(404).json({ ok: false, error: 'not found' });
    if (row.status !== 'queued') return res.status(400).json({ ok: false, error: 'only queued drafts can be discarded' });
    db.prepare(`DELETE FROM outreach WHERE id = ?`).run(row.id);
    return ok(res, { deleted: row.id });
  }));

  /* ---------------------------- connect Gmail --------------------------- */

  /* Saves an app password to .env after proving it works, so the whole setup
     can happen in the browser. Localhost-only unless a token is configured. */
  app.post('/api/gmail/app-password', wrap(async (req, res) => {
    const address = String(req.body?.address || '').trim();
    const password = String(req.body?.password || '').replace(/\s+/g, '');
    if (!address || !password) {
      return res.status(400).json({ ok: false, error: 'Both the address and the app password are required.' });
    }

    const previous = { ...config.smtp };
    config.smtp.address = address;
    config.smtp.appPassword = password;
    try {
      await verifyAppPassword();
    } catch (err) {
      Object.assign(config.smtp, previous);
      // smtp.js already distinguishes a rejected password from a blocked
      // network; overriding it here would give the wrong advice.
      return res.status(400).json({ ok: false, error: err.message });
    }

    writeEnvKeys({ GMAIL_ADDRESS: address, GMAIL_APP_PASSWORD: password });
    log.ok(`Gmail connected as ${address}`);
    return ok(res, { connected: true, address });
  }));

  /* --------------------------- suppressions ---------------------------- */

  app.get('/api/suppressions', wrap((_req, res) => ok(res, { suppressions: suppressions.list() })));
  app.post('/api/suppressions', wrap((req, res) => {
    const { value, kind = 'email', reason = 'manual' } = req.body || {};
    if (!value) return res.status(400).json({ ok: false, error: 'value is required' });
    const added = suppressions.add(value, kind, reason);
    if (!added) return res.status(400).json({ ok: false, error: 'not a valid email or domain' });
    return ok(res, { suppressions: suppressions.list() });
  }));

  /* ------------------------------- runs -------------------------------- */

  const TASKS = {
    discovery: (body) => runDiscovery({ limit: body.limit, minScore: body.minScore }),
    contacts: (body) => runContactDiscovery({ limit: body.limit, allowPatterns: body.allowPatterns }),
    queue: (body) => queueFirstTouch({ limit: body.limit, minConfidence: body.minConfidence }),
    send: (body) => sendQueued({ limit: body.limit, dryRun: body.dryRun }),
    followup: (body) => queueFollowUps({ limit: body.limit }),
    sync: async () => ({ ...(await syncReplies()), ...(await syncBounces()) }),
    export: () => exportTracker().then((file) => ({ file })),
    /* One button that runs the whole chain, respecting every cap. */
    full: async (body) => {
      const discovery = await runDiscovery({ limit: body.limit });
      const contactsRun = await runContactDiscovery({ limit: body.contactLimit ?? 15 });
      const queued = await queueFirstTouch({});
      const sent = await sendQueued({ dryRun: body.dryRun });
      return { discovery, contacts: contactsRun, queued, sent };
    },
  };

  app.post('/api/run/:task', wrap((req, res) => {
    const task = TASKS[req.params.task];
    if (!task) return res.status(404).json({ ok: false, error: `unknown task: ${req.params.task}` });
    const job = startJob(req.params.task, () => task(req.body || {}));
    return ok(res, { job });
  }));

  app.get('/api/export/download', wrap(async (_req, res) => {
    const file = await exportTracker();
    res.download(file, path.basename(file));
  }));

  /* ------------------------------- OAuth ------------------------------- */

  /* Saves the OAuth client credentials so the whole of Google sign-in can be
     set up in the browser. Google requires every app that touches Gmail to
     have its own registered client — there is no way to ship one that works
     for everybody — but this is the last hand-editing of .env it costs. */
  app.post('/api/gmail/oauth-credentials', wrap((req, res) => {
    const clientId = String(req.body?.clientId || '').trim();
    const clientSecret = String(req.body?.clientSecret || '').trim();
    if (!clientId || !clientSecret) {
      return res.status(400).json({ ok: false, error: 'Both the client ID and the client secret are required.' });
    }
    if (!/\.apps\.googleusercontent\.com$/.test(clientId)) {
      return res.status(400).json({
        ok: false,
        error: 'That does not look like a Google client ID — they end in ".apps.googleusercontent.com".',
      });
    }

    config.google.clientId = clientId;
    config.google.clientSecret = clientSecret;
    writeEnvKeys({ GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret });
    log.ok('Google OAuth credentials saved');
    // The client redirects here to run the normal consent flow.
    return ok(res, { saved: true, authUrl: '/auth/google' });
  }));

  app.get('/auth/google', wrap((_req, res) => {
    if (!config.google.clientId || !config.google.clientSecret) {
      return res
        .status(400)
        .send(page('Google sign-in is not set up yet', 'Add your OAuth client ID and secret under Settings first.'));
    }
    return res.redirect(getAuthUrl());
  }));

  app.get('/auth/google/callback', wrap(async (req, res) => {
    if (req.query.error) return res.status(400).send(page('Authorization declined', String(req.query.error)));
    if (!req.query.code) return res.status(400).send(page('Missing code', 'Google did not return an authorization code.'));
    const profile = await exchangeCode(String(req.query.code));
    settings.set('gmail_email', profile.emailAddress);
    res.send(page('Gmail connected', `Sending as <strong>${profile.emailAddress}</strong>. You can close this tab.`));
  }));

  app.post('/auth/disconnect', wrap((_req, res) => {
    disconnect();
    ok(res, { connected: false });
  }));

  app.get('*', (_req, res) => res.sendFile(path.join(paths.public, 'index.html')));

  return app;
}

function page(title, message) {
  return `<!doctype html><meta charset="utf-8"><title>${title}</title>
<style>body{background:#0a0a0a;color:#fafaf9;font:16px/1.6 system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0}
.card{max-width:32rem;padding:2.5rem;border:1px solid rgba(255,255,255,.08);border-radius:14px;text-align:center}
h1{color:#e8c547;font-size:1.4rem;margin:0 0 .75rem}a{color:#e8c547}</style>
<div class="card"><h1>${title}</h1><p>${message}</p><p><a href="/">← Back to the dashboard</a></p></div>`;
}

/* Only start listening when run directly, so tests can import createApp(). */
if (process.argv[1] && import.meta.url === `file://${path.resolve(process.argv[1])}`) {
  const app = createApp();
  const host = process.env.HOST || '127.0.0.1';
  app.listen(config.port, host, () => {
    log.ok(`Internship Hunter → http://${host}:${config.port}`);
    for (const w of configWarnings()) log.warn(w);
    if (config.limits.dryRun) log.warn('DRY_RUN is on — no email will actually be sent.');
    if (config.scheduler.enabled) startScheduler();
  });
}
