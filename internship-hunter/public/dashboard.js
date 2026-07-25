/* Internship Hunter — dashboard client.
   No framework, no build step. One state object, one render pass per view. */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* --------------------------------- api ---------------------------------- */

// Set by ?token=… when the server has DASHBOARD_TOKEN configured.
const TOKEN = new URLSearchParams(location.search).get('token') || '';

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(TOKEN ? { 'x-dashboard-token': TOKEN } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/* -------------------------------- helpers -------------------------------- */

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function timeAgo(iso) {
  if (!iso) return '—';
  const secs = (Date.now() - new Date(iso)) / 1000;
  if (secs < 60) return 'just now';
  const units = [['m', 60], ['h', 60], ['d', 24], ['w', 7]];
  let v = secs / 60;
  let label = 'm';
  for (let i = 1; i < units.length; i += 1) {
    if (v < units[i][1]) break;
    v /= units[i][1];
    label = units[i][0];
  }
  return `${Math.floor(v)}${label} ago`;
}

let toastTimer;
function toast(message, kind = 'info') {
  clearTimeout(toastTimer);
  $('#toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.id = 'toast';
  el.dataset.kind = kind;
  el.setAttribute('role', 'status');
  el.textContent = message;
  document.body.append(el);
  toastTimer = setTimeout(() => el.remove(), kind === 'error' ? 7000 : 4000);
}

/* --------------------------------- state --------------------------------- */

const state = {
  status: null,
  outbox: [],
  sent: [],
  companies: [],
  contacts: [],
  events: [],
  blocked: [],
  view: 'overview',
  job: null,
};

/* --------------------------------- theme --------------------------------- */

$('#themeBtn').addEventListener('click', () => {
  const root = document.documentElement;
  const current = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try {
    localStorage.setItem('ih-theme', next);
  } catch { /* private mode */ }
});

/* ------------------------------- navigation ------------------------------ */

const TITLES = {
  overview: 'Overview',
  outbox: 'Outbox',
  sent: 'Sent',
  companies: 'Companies',
  contacts: 'Contacts',
  activity: 'Activity',
  blocked: 'Blocked',
  settings: 'Settings',
};

function showView(name) {
  state.view = name;
  $$('.nav-item').forEach((b) => b.classList.toggle('is-active', b.dataset.view === name));
  $$('.view').forEach((v) => v.classList.toggle('is-active', v.id === `view-${name}`));
  $('#viewTitle').textContent = TITLES[name] || name;
  $('#sidebar').classList.remove('is-open');
  $('.scrim')?.remove();
  refreshView(name);
}

$$('.nav-item').forEach((btn) => btn.addEventListener('click', () => showView(btn.dataset.view)));

$('#menuBtn').addEventListener('click', () => {
  const bar = $('#sidebar');
  bar.classList.toggle('is-open');
  if (bar.classList.contains('is-open')) {
    const scrim = document.createElement('div');
    scrim.className = 'scrim';
    scrim.addEventListener('click', () => {
      bar.classList.remove('is-open');
      scrim.remove();
    });
    document.body.append(scrim);
  } else {
    $('.scrim')?.remove();
  }
});

/* -------------------------------- rendering ------------------------------ */

function renderStatus() {
  const s = state.status;
  if (!s) return;

  const { stats, gmail, ai, limits } = s;

  // header chips
  const mode = $('#chipMode');
  mode.textContent = limits.dryRun ? 'Dry run' : 'LIVE';
  mode.className = `chip ${limits.dryRun ? 'chip-warn' : 'chip-live'}`;

  const g = $('#chipGmail');
  g.textContent = gmail.connected ? gmail.identity?.email || 'Gmail connected' : 'Gmail off';
  g.className = `chip ${gmail.connected ? 'chip-ok' : 'chip-bad'}`;

  const a = $('#chipAi');
  a.textContent = ai.enabled ? ai.model : 'Templates only';
  a.className = `chip ${ai.enabled ? 'chip-ok' : ''}`;

  $('#who').innerHTML = gmail.connected
    ? `<strong>${esc(gmail.identity?.email || 'Connected')}</strong>Sending as ${esc(s.profile.name)}`
    : `<strong>Not connected</strong><a href="/auth/google">Connect Gmail →</a>`;

  // warnings
  const notice = $('#notice');
  if (s.warnings?.length) {
    notice.hidden = false;
    notice.innerHTML = `<ul>${s.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>`;
  } else {
    notice.hidden = true;
  }

  // sidebar tallies
  $('#tallyOutbox').textContent = stats.queued;
  $('#tallySent').textContent = stats.sent;
  $('#tallyCompanies').textContent = stats.companies;
  $('#tallyContacts').textContent = stats.contacts;
  $('#tallyBlocked').textContent = stats.suppressed;

  // stat tiles
  $('#stats').innerHTML = [
    { k: 'Companies', v: stats.companies, s: `${stats.companiesWithContacts} with a contact` },
    { k: 'Contacts', v: stats.contacts, s: `${stats.verifiedContacts} MX-verified` },
    { k: 'In outbox', v: stats.queued, s: 'awaiting your review', cls: 'stat-info' },
    { k: 'Sent', v: stats.sent, s: `${stats.followUpsSent} follow-ups` },
    { k: 'Replies', v: stats.replied, s: `${stats.replyRate}% reply rate`, cls: 'stat-brand' },
    { k: 'Today', v: `${stats.sentToday}/${limits.dailyCap}`, s: 'daily cap' },
  ]
    .map(
      (t) => `<div class="stat ${t.cls || ''}">
        <div class="stat-k">${esc(t.k)}</div>
        <div class="stat-v">${esc(t.v)}</div>
        <div class="stat-s">${esc(t.s)}</div>
      </div>`,
    )
    .join('');

  // funnel
  const steps = [
    ['Discovered', stats.companies, false],
    ['Contact found', stats.companiesWithContacts, false],
    ['Drafted', stats.queued + stats.sent, false],
    ['Sent', stats.sent, false],
    ['Replied', stats.replied, false],
    ['Bounced / failed', stats.failed, true],
  ];
  const max = Math.max(1, ...steps.map(([, n]) => n));
  $('#funnel').innerHTML = steps
    .map(
      ([label, n, muted]) => `<div class="f-row">
        <span class="f-label">${esc(label)}</span>
        <span class="f-track"><span class="f-fill ${muted ? 'is-muted' : ''}" style="width:${(n / max) * 100}%"></span></span>
        <span class="f-num">${n}</span>
      </div>`,
    )
    .join('');

  $('#capNote').textContent =
    `${stats.sentToday} of ${limits.dailyCap} sent today · ${limits.minDelayMs / 1000}–${limits.maxDelayMs / 1000}s between messages`;

  // live-send switch reflects the server default on first load
  const live = $('#liveSend');
  if (!live.dataset.touched) live.checked = !limits.dryRun;
  updateLiveHint();
}

function updateLiveHint() {
  const on = $('#liveSend').checked;
  $('#liveHint').textContent = on
    ? 'On — “Send outbox” will deliver real email from your Gmail account.'
    : 'Off — “Send outbox” only simulates delivery.';
  $('#liveHint').style.color = on ? 'var(--danger)' : '';
}

$('#liveSend').addEventListener('change', (e) => {
  e.target.dataset.touched = '1';
  updateLiveHint();
});

const EMPTY = (icon, title, hint = '') =>
  `<div class="empty"><span class="big">${icon}</span><span>${esc(title)}</span>${hint ? `<span>${esc(hint)}</span>` : ''}</div>`;

function renderOutbox() {
  const box = $('#outboxRows');
  if (!state.outbox.length) {
    box.innerHTML = EMPTY('✎', 'Nothing drafted yet', 'Run “Draft emails” on the Overview tab.');
    return;
  }
  box.innerHTML = state.outbox
    .map(
      (d) => `<button class="row" data-id="${d.id}">
        <span class="row-top">
          <span class="row-title">${esc(d.company_name)}</span>
          <span class="row-addr">${esc(d.email)}</span>
          <span class="tag tag-${esc(d.personalized_by === 'ai' ? 'ai' : 'queued')}">${esc(d.personalized_by)}</span>
          ${d.kind === 'followup' ? `<span class="tag tag-follow">follow-up ${d.step}</span>` : ''}
        </span>
        <span class="row-sub">${esc(d.subject)}</span>
        <span class="row-meta"><span>drafted ${esc(timeAgo(d.queued_at))}</span><span>click to review</span></span>
      </button>`,
    )
    .join('');
  $$('#outboxRows .row').forEach((r) => r.addEventListener('click', () => openEditor(Number(r.dataset.id))));
}

function renderSent() {
  const box = $('#sentRows');
  if (!state.sent.length) {
    box.innerHTML = EMPTY('↗', 'Nothing sent yet');
    return;
  }
  box.innerHTML = state.sent
    .map(
      (d) => `<button class="row" data-id="${d.id}">
        <span class="row-top">
          <span class="row-title">${esc(d.company_name)}</span>
          <span class="row-addr">${esc(d.email)}</span>
          <span class="tag tag-${esc(d.status)}">${esc(d.status)}</span>
          ${d.kind === 'followup' ? `<span class="tag tag-follow">follow-up ${d.step}</span>` : ''}
        </span>
        <span class="row-sub">${esc(d.subject)}</span>
        <span class="row-meta">
          <span>sent ${esc(timeAgo(d.sent_at))}</span>
          ${d.replied_at ? `<span>replied ${esc(timeAgo(d.replied_at))}</span>` : ''}
          ${d.error ? `<span style="color:var(--danger)">${esc(d.error)}</span>` : ''}
        </span>
      </button>`,
    )
    .join('');
  $$('#sentRows .row').forEach((r) => r.addEventListener('click', () => openViewer(Number(r.dataset.id))));
}

function renderCompanies() {
  const body = $('#companiesTable tbody');
  if (!state.companies.length) {
    body.innerHTML = `<tr><td colspan="7">${EMPTY('▦', 'No companies yet', 'Run “Find companies”.')}</td></tr>`;
    return;
  }
  body.innerHTML = state.companies
    .map(
      (c) => `<tr>
        <td>${esc(c.name)}</td>
        <td class="mono">${c.domain ? esc(c.domain) : '<span class="dim">—</span>'}</td>
        <td>${esc(c.role_title || '—')}</td>
        <td class="num">${Number(c.score || 0).toFixed(2)}</td>
        <td class="num">${c.contact_count}</td>
        <td class="num">${c.sent_count}</td>
        <td><span class="tag">${esc(c.status)}</span></td>
      </tr>`,
    )
    .join('');
}

function renderContacts() {
  const body = $('#contactsTable tbody');
  if (!state.contacts.length) {
    body.innerHTML = `<tr><td colspan="7">${EMPTY('@', 'No contacts yet', 'Run “Find HR emails”.')}</td></tr>`;
    return;
  }
  body.innerHTML = state.contacts
    .map(
      (c) => `<tr>
        <td class="mono">${esc(c.email)}</td>
        <td>${esc(c.name || '—')}</td>
        <td>${esc(c.company_name || '—')}</td>
        <td class="num">${Number(c.confidence).toFixed(2)}</td>
        <td>${c.verified ? '✓' : '<span class="dim">—</span>'}</td>
        <td><span class="tag">${esc(c.source)}</span></td>
        <td><span class="tag ${c.status === 'active' ? '' : 'tag-failed'}">${esc(c.status)}</span></td>
      </tr>`,
    )
    .join('');
}

function renderActivity() {
  const box = $('#activityLog');
  if (!state.events.length) {
    box.innerHTML = EMPTY('≡', 'Nothing logged yet');
    return;
  }
  box.innerHTML = state.events
    .map(
      (e) => `<div class="log-row">
        <span class="log-t">${esc(new Date(e.created_at).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }))}</span>
        <span class="log-l l-${esc(e.level)}">${esc(e.level)}</span>
        <span class="log-m">${esc(e.message)}</span>
      </div>`,
    )
    .join('');
}

function renderBlocked() {
  const box = $('#blockedRows');
  if (!state.blocked.length) {
    box.innerHTML = EMPTY('⊘', 'Nothing blocked', 'Anyone who replies “stop” lands here automatically.');
    return;
  }
  box.innerHTML = state.blocked
    .map(
      (b) => `<div class="row">
        <span class="row-top">
          <span class="row-addr">${esc(b.value)}</span>
          <span class="tag">${esc(b.kind)}</span>
        </span>
        <span class="row-meta"><span>${esc(b.reason || 'manual')}</span><span>${esc(timeAgo(b.created_at))}</span></span>
      </div>`,
    )
    .join('');
}

function renderSettings() {
  const s = state.status;
  if (!s) return;

  $('#gmailBox').innerHTML = s.gmail.connected
    ? `<dl class="kv">
         <dt>Account</dt><dd>${esc(s.gmail.identity?.email || 'connected')}</dd>
         <dt>Scopes</dt><dd>gmail.send, gmail.readonly</dd>
       </dl>
       <div style="margin-top:1rem"><button class="btn btn-danger btn-sm" id="disconnectBtn">Disconnect Gmail</button></div>`
    : `<p class="sub" style="margin-bottom:.9rem">Mail is sent through your own Gmail account over OAuth. Nothing is relayed through a third party.</p>
       <a class="btn btn-primary" href="/auth/google">Connect Gmail</a>`;

  $('#disconnectBtn')?.addEventListener('click', async () => {
    if (!confirm('Forget the stored Gmail tokens?')) return;
    await api('/auth/disconnect', { method: 'POST' });
    toast('Gmail disconnected', 'ok');
    load();
  });

  const l = s.limits;
  $('#limitsBox').innerHTML = [
    ['Mode', l.dryRun ? 'dry run (nothing is sent)' : 'LIVE'],
    ['Daily cap', l.dailyCap],
    ['Per run', l.perRunCap],
    ['Company cooldown', `${l.companyCooldownDays} days`],
    ['Send spacing', `${l.minDelayMs / 1000}–${l.maxDelayMs / 1000}s`],
    ['Min confidence', l.minConfidence],
    ['Guessed addresses', l.allowPatternGuesses ? 'allowed' : 'blocked'],
    ['Require MX', l.requireMx ? 'yes' : 'no'],
    ['Follow-ups', s.followUp.enabled ? `after ${s.followUp.steps.join(' and ')} days (max ${s.followUp.maxFollowUps})` : 'disabled'],
    ['Scheduler', s.scheduler.enabled ? 'enabled' : 'disabled'],
  ]
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
    .join('');

  $('#profileBox').innerHTML = [
    ['Name', s.profile.name],
    ['Reply-to', s.profile.email],
    ['Headline', s.profile.headline],
    ['Resume', s.resume.present ? s.resume.path : `MISSING — ${s.resume.path}`],
  ]
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
    .join('');
}

/* --------------------------------- editor -------------------------------- */

let editingId = null;

async function openEditor(id) {
  const { draft } = await api(`/api/outreach/${id}`);
  editingId = id;
  $('#editorTo').textContent = `${draft.subject ? '' : 'Draft '}→ ${state.outbox.find((d) => d.id === id)?.email || ''}`;
  $('#editorSubject').value = draft.subject || '';
  $('#editorBody').value = draft.body || '';
  $('#editor').showModal();
}

$('#editorSave').addEventListener('click', async () => {
  try {
    await api(`/api/outreach/${editingId}`, {
      method: 'PATCH',
      body: { subject: $('#editorSubject').value, body: $('#editorBody').value },
    });
    $('#editor').close();
    toast('Draft saved', 'ok');
    load();
  } catch (err) {
    toast(err.message, 'error');
  }
});

$('#editorDiscard').addEventListener('click', async () => {
  if (!confirm('Delete this draft? The contact stays and can be re-drafted later.')) return;
  try {
    await api(`/api/outreach/${editingId}`, { method: 'DELETE' });
    $('#editor').close();
    toast('Draft discarded', 'ok');
    load();
  } catch (err) {
    toast(err.message, 'error');
  }
});

$('#editorCancel').addEventListener('click', () => $('#editor').close());
$('#editorClose').addEventListener('click', () => $('#editor').close());

async function openViewer(id) {
  const { draft } = await api(`/api/outreach/${id}`);
  const row = state.sent.find((d) => d.id === id) || {};
  $('#viewerTo').textContent = `${row.company_name || 'Message'} → ${row.email || ''}`;
  $('#viewerMeta').innerHTML = [
    ['Subject', draft.subject],
    ['Status', draft.status],
    ['Type', draft.kind === 'followup' ? `follow-up ${draft.step}` : 'first touch'],
    ['Written by', draft.personalized_by],
    ['Sent', draft.sent_at ? new Date(draft.sent_at).toLocaleString() : '—'],
    ['Replied', draft.replied_at ? new Date(draft.replied_at).toLocaleString() : '—'],
    ...(draft.error ? [['Error', draft.error]] : []),
  ]
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
    .join('');
  $('#viewerBody').value = draft.body || '';
  $('#viewer').showModal();
}

$('#viewerDone').addEventListener('click', () => $('#viewer').close());
$('#viewerClose').addEventListener('click', () => $('#viewer').close());

/* ---------------------------------- jobs --------------------------------- */

const JOB_LABELS = {
  discovery: 'Searching job boards for remote companies…',
  contacts: 'Reading company careers pages for contact addresses…',
  queue: 'Drafting personalised emails…',
  send: 'Sending — paced, this takes a while…',
  followup: 'Drafting follow-ups…',
  sync: 'Checking Gmail for replies and bounces…',
  export: 'Building the Excel tracker…',
};

function setBusy(busy, label) {
  $('#job').hidden = !busy;
  if (label) $('#jobLabel').textContent = label;
  $$('[data-task]').forEach((b) => { b.disabled = busy; });
  $('#exportBtn').disabled = busy;
}

async function runTask(task) {
  if (task === 'send' && $('#liveSend').checked) {
    const n = state.outbox.length;
    if (!confirm(`Send ${n} real email${n === 1 ? '' : 's'} from your Gmail account now?`)) return;
  }
  try {
    setBusy(true, JOB_LABELS[task] || 'Working…');
    const { job } = await api(`/api/run/${task}`, {
      method: 'POST',
      body: { dryRun: task === 'send' ? !$('#liveSend').checked : undefined },
    });
    pollJob(job.id, task);
  } catch (err) {
    setBusy(false);
    toast(err.message, 'error');
  }
}

async function pollJob(id, task) {
  try {
    const { job } = await api(`/api/jobs/${id}`);
    if (job.status === 'running') {
      setTimeout(() => pollJob(id, task), 1500);
      return;
    }
    setBusy(false);
    if (job.status === 'error') {
      toast(job.error, 'error');
    } else {
      toast(summarise(task, job.result), 'ok');
    }
    load();
  } catch (err) {
    setBusy(false);
    toast(err.message, 'error');
  }
}

function summarise(task, r) {
  if (!r) return 'Done.';
  switch (task) {
    case 'discovery': return `${r.created} new compan${r.created === 1 ? 'y' : 'ies'}, ${r.updated} updated.`;
    case 'contacts': return `${r.added} contact${r.added === 1 ? '' : 's'} across ${r.withContacts} compan${r.withContacts === 1 ? 'y' : 'ies'}.`;
    case 'queue': return `${r.queued} draft${r.queued === 1 ? '' : 's'} queued (${r.aiDrafts} AI-written).`;
    case 'send': return r.dryRun
      ? `Dry run — ${r.sent} message${r.sent === 1 ? '' : 's'} would have been sent.`
      : `${r.sent} sent, ${r.failed} failed, ${r.skipped} skipped.`;
    case 'followup': return `${r.queued} follow-up${r.queued === 1 ? '' : 's'} queued.`;
    case 'sync': return `${r.replies || 0} repl${r.replies === 1 ? 'y' : 'ies'}, ${r.bounced || 0} bounce(s).`;
    case 'export': return `Tracker written to ${r.file}`;
    default: return 'Done.';
  }
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-task]');
  if (btn && !btn.disabled) runTask(btn.dataset.task);
});

$('#exportBtn').addEventListener('click', () => {
  const url = TOKEN ? `/api/export/download?token=${encodeURIComponent(TOKEN)}` : '/api/export/download';
  window.location.href = url;
  toast('Building your tracker…');
});

$('#blockForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const value = $('#blockValue').value.trim();
  if (!value) return;
  try {
    await api('/api/suppressions', { method: 'POST', body: { value, kind: $('#blockKind').value } });
    $('#blockValue').value = '';
    toast('Blocked', 'ok');
    load();
  } catch (err) {
    toast(err.message, 'error');
  }
});

/* --------------------------------- loading ------------------------------- */

async function load() {
  try {
    const [status, outbox, sent, blocked] = await Promise.all([
      api('/api/status'),
      api('/api/outreach?status=queued'),
      api('/api/outreach?status=sent&limit=100'),
      api('/api/suppressions'),
    ]);
    state.status = status;
    state.outbox = outbox.outreach;
    state.blocked = blocked.suppressions;

    // "Sent" also shows replies and failures, which are separate statuses.
    const [replied, failed] = await Promise.all([
      api('/api/outreach?status=replied&limit=100'),
      api('/api/outreach?status=failed&limit=50'),
    ]);
    state.sent = [...sent.outreach, ...replied.outreach, ...failed.outreach].sort((a, b) =>
      String(b.sent_at || b.queued_at).localeCompare(String(a.sent_at || a.queued_at)),
    );

    renderStatus();
    renderOutbox();
    renderSent();
    renderBlocked();
    if (state.view === 'settings') renderSettings();

    // A job may have been kicked off from the CLI while the tab was open.
    if (status.job?.status === 'running') {
      setBusy(true, JOB_LABELS[status.job.name] || 'Working…');
      pollJob(status.job.id, status.job.name);
    }
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function refreshView(name) {
  try {
    if (name === 'companies') {
      state.companies = (await api('/api/companies')).companies;
      renderCompanies();
    } else if (name === 'contacts') {
      state.contacts = (await api('/api/contacts')).contacts;
      renderContacts();
    } else if (name === 'activity') {
      state.events = (await api('/api/events?limit=120')).events;
      renderActivity();
    } else if (name === 'settings') {
      renderSettings();
    }
  } catch (err) {
    toast(err.message, 'error');
  }
}

$('#refreshBtn').addEventListener('click', () => {
  load();
  refreshView(state.view);
  toast('Refreshed');
});

load();
// Keep the numbers honest without hammering the server.
setInterval(() => {
  if (!$('#job').hidden) return; // the job poller is already refreshing
  load();
}, 30_000);
