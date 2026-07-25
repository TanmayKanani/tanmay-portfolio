# Internship Hunter

An outreach console for a job search. It finds remote companies that are
hiring, digs out the address they publish for hiring enquiries, writes a
personalised email for each one, sends it through **your own Gmail** with your
resume attached, tracks what happened, and nudges the silent ones after a week.

Everything runs locally. Your contacts, drafts and tokens never leave the
machine.

```
   Find remote companies          job boards → relevance scoring → domain resolution
        ↓
   Collect hiring contacts        careers/contact pages → verify → confidence score
        ↓
   Check if already emailed       enforced by UNIQUE constraints, not by hope
        ↓
   Personalise the email          Claude, with a template fallback
        ↓
   Attach the resume              RFC 2822 multipart/mixed
        ↓
   Send via YOUR Gmail            OAuth, throttled, capped, dry-run by default
        ↓
   Save status                    SQLite + an Excel tracker export
        ↓
   Follow up after 7 days         threaded reply, cancelled the moment they respond
        ↓
   Dashboard                      review every draft before it goes out
```

---

## Quick start

```bash
cd internship-hunter
npm install
node bin/hunter.js init --resume /path/to/your-resume.pdf
```

Start the dashboard:

```bash
npm run dev            # → http://127.0.0.1:4300
```

`npm start` and `npm run serve` do the same thing.

Then, in order:

1. **Edit `config/profile.json`.** This is the ground truth every email is built
   from. Vague input produces vague emails.
2. **Add your Google OAuth credentials to `.env`** (see below).
3. **Connect Gmail** — `node bin/hunter.js auth`
4. **Run the pipeline:**

```bash
node bin/hunter.js discover      # find companies
node bin/hunter.js contacts      # find their hiring addresses
node bin/hunter.js queue         # draft the emails
node bin/hunter.js review        # read every draft
node bin/hunter.js send          # dry run — prints what it would send
node bin/hunter.js send --live   # actually sends, after a confirmation prompt
```

Or open the dashboard and click through the same stages:

```bash
node bin/hunter.js serve         # http://127.0.0.1:4300
```

---

## Setting up Gmail

You need a Google Cloud project. It takes about three minutes and costs
nothing.

1. [console.cloud.google.com](https://console.cloud.google.com) → create a project
2. **APIs & Services → Library** → enable the **Gmail API**
3. **OAuth consent screen** → External → add yourself under **Test users**
4. **Credentials → Create credentials → OAuth client ID → Web application**
5. Add the redirect URI exactly:
   `http://localhost:4300/auth/google/callback`
6. Copy the client ID and secret into `.env`

The app requests two scopes: `gmail.send` (to send) and `gmail.readonly` (to
notice replies and bounces so it stops following up). Tokens are written to
`data/google-tokens.json` with `0600` permissions and are gitignored.

## Setting up Claude (optional)

Put an `ANTHROPIC_API_KEY` in `.env` and each email is written by
`claude-opus-5` against your profile and what's known about the company. Skip
it and the built-in templates are used instead — still personalised with the
company name and the role they posted, just not bespoke.

The model is explicitly instructed not to invent facts. If it has no real
detail about a company it writes a plain note and flags the draft as
ungrounded rather than inventing admiration for a product it knows nothing
about.

---

## The guardrails

This is a job-search assistant, not a bulk mailer, and the defaults enforce
that. Every one of these is in `.env`.

| Setting | Default | What it does |
|---|---|---|
| `DRY_RUN` | `true` | **Nothing sends until you turn this off.** A fresh clone cannot email anyone by accident. |
| `DAILY_SEND_CAP` | `25` | Hard ceiling per calendar day, across every run. |
| `PER_RUN_CAP` | `10` | Ceiling for a single batch. |
| `COMPANY_COOLDOWN_DAYS` | `30` | One person per company, once per month. No blasting five addresses at one employer. |
| `MIN_DELAY_MS` / `MAX_DELAY_MS` | `45s`–`90s` | Randomised human pacing between messages. |
| `MIN_CONFIDENCE` | `0.5` | Only email addresses the company actually published. |
| `ALLOW_PATTERN_GUESSES` | `false` | Guessed addresses (`careers@domain`) are opt-in, and only ever shared inboxes — never a guessed individual. |
| `REQUIRE_MX` | `true` | The domain must have a live MX record. |
| `RESPECT_ROBOTS` | `true` | robots.txt is honoured; requests to one host are spaced out. |

On top of those, always on:

- **Every message carries an opt-out line.** Anyone replying "stop" is
  suppressed permanently and automatically.
- **Bounces are detected** from Mail Delivery Subsystem messages and the
  address is suppressed.
- **Replies cancel follow-ups.** Reply sync runs before every follow-up batch,
  so nobody who answered gets a "just following up!".
- **Only addresses on the company's own domain** are collected — no vendors, no
  support widgets, no third parties who happened to appear on the page.
- **No SMTP mailbox probing.** An MX check proves the domain accepts mail; the
  tool never dials a mail server to guess whether a mailbox exists.
- **Blocked mailboxes are hard-coded:** `noreply@`, `abuse@`, `legal@`,
  `security@`, `billing@`, `press@` and friends are never contacted.

---

## Commands

```
Setup
  init [--resume <pdf>]   Create .env + config/profile.json, copy in your resume
  auth                    Connect Gmail (also: --status, --disconnect, --force)

Pipeline
  discover  [--limit 50] [--min-score 0.25]   Find remote companies hiring
  contacts  [--limit 20] [--allow-patterns]   Find HR / careers addresses
  queue     [--limit 10] [--min-confidence]   Draft emails into the outbox
  review    [--id N]                          Print queued drafts for review
  send      [--limit 10] [--live]             Send the outbox
  followup  [--limit 10]                      Draft the 7-day nudges
  sync                                        Pull replies and bounces from Gmail
  run       [--live]                          discover → contacts → queue → send

Data
  add       --name "Acme" --domain acme.io [--role "SWE Intern"]
  contact   --company acme.io --email careers@acme.io [--name "Jane Doe"]
  suppress  --email x@y.com | --domain y.com | --list
  export    [--out file.xlsx]                 Write the Excel tracker
  stats                                       Print the funnel

Dashboard
  serve     [--port 4300] [--host 127.0.0.1]
```

---

## How each stage works

**1 · Discovery.** Pulls postings from Remotive, RemoteOK, Arbeitnow and
Himalayas. Any board that is down or rate-limited is skipped with a warning —
the run continues on whatever the others returned, and no data is ever
fabricated to fill a gap. Postings are filtered to intern/junior/graduate
titles, scored against your profile's skills and target roles (seniority
markers are a near-disqualifier), and collapsed to the best single role per
company. Company names are resolved to a domain via Clearbit's public
autocomplete, falling back to a guess-and-verify pass that only accepts a
domain if the site actually resolves *and* names the company — otherwise you
end up mailing domain squatters.

**2 · Contacts.** Fetches robots.txt, then up to five pages a company publishes
in order to be contacted (`/careers`, `/contact`, `/about`, `/team`, …).
Extracts `mailto:` links and page text, decodes the common `[at]`/`[dot]`
obfuscations, and keeps only addresses on the company's own domain. Each hit is
scored by provenance — a `mailto:` on a careers page (0.90) outranks an address
buried in body text (0.60). Guessed inboxes score below 0.5, which is why they
are excluded by the default threshold.

**3 · Drafting.** Claude writes subject and body as a structured response, with
the profile carried in a cached system prompt so a 25-email batch pays for it
once. Every draft — AI or template — passes a validator that rejects unrendered
`{{variables}}`, leftover `[Company]` placeholders, and stray `undefined`s
before anything can be queued.

**4 · Sending.** Guardrails are re-checked at send time, not just at queue time,
so a suppression added a minute ago stops a draft written an hour ago. Messages
are built as RFC 2822 multipart/mixed with the resume attached, and header
values are stripped of CRLF to prevent header injection.

**5 · Follow-ups.** Threaded replies using the original `Message-ID` and Gmail
`threadId`, so they land in the same conversation rather than as a fresh email.
Capped at two, and the second is explicitly final.

**6 · Tracking.** `hunter export` writes a four-sheet workbook — Tracker,
Companies, Contacts, Summary — with frozen headers, autofilters and
colour-coded statuses.

---

## Project layout

```
internship-hunter/
├── bin/hunter.js              CLI entry point
├── config/
│   ├── profile.example.json   template — copied to profile.json by `init`
│   └── profile.json           yours (gitignored)
├── assets/resume.pdf          your resume (gitignored)
├── data/                      SQLite db, tokens, exports (gitignored)
├── public/                    dashboard — html, css, js, no build step
├── test/smoke.test.js         34 tests, no network required
└── src/
    ├── cli.js                 every command (bin/hunter.js is a thin launcher)
    ├── sqlite.js              driver selection: better-sqlite3 or node:sqlite
    ├── config.js              env parsing, paths, guardrails
    ├── db.js                  schema + every query; dedupe lives here
    ├── jobs.js                background job runner for the dashboard
    ├── server.js              JSON API + OAuth callback
    ├── scheduler.js           optional cron automation
    ├── discovery/             job boards, scoring, domain resolution
    ├── contacts/              scraping, patterns, verification
    ├── personalize/           Claude + templates + draft validation
    ├── mail/                  Gmail OAuth, MIME construction
    ├── pipeline/              queue, send, follow-up, reply sync
    └── export/xlsx.js         Excel tracker
```

## Tests

```bash
npm test
```

34 tests covering address policy, extraction, dedupe, MIME construction,
template rendering and the dry-run send path. Nothing touches the network and
nothing sends mail.

## Automation

`SCHEDULER_ENABLED=true` runs discovery and contact research on weekday
mornings, drafts follow-ups, and syncs replies every three hours. It
deliberately stops there: sending stays manual unless you also set
`AUTO_SEND=true`. Automating discovery is convenient; automating unattended
email is a decision worth making on purpose.

## If it won't start

Run the built-in check first — it reports exactly what is and isn't ready:

```bash
npm run doctor
```

**`npm run dev` says "Missing script"** — you're in the wrong folder. `cd` into
`internship-hunter` (the one containing `package.json`), not the folder you
unzipped it into.

**`Port 4300 is already in use`** — something else has the port, often an
earlier copy of this app still running. Use another:

```bash
node bin/hunter.js serve --port 4301
```

**`gyp ERR!` / `better-sqlite3` fails during `npm install`** — harmless, and
the app still runs. `better-sqlite3` is a compiled module with no prebuilt
binary for very new Node releases, so npm tries to compile it and fails
without a C++ toolchain. It's an *optional* dependency: when it's unavailable
the app uses the SQLite engine built into Node instead, which needs no
compiler. `npm run doctor` shows which one is active.

If you'd rather have the compiled one, either install Node 22 LTS (which has a
prebuilt binary) or add a toolchain: on Windows the *Desktop development with
C++* workload from the
[Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/);
on Linux `build-essential` and `python3`; on macOS `xcode-select --install`.

**`Cannot find package '...'`** — `npm install` didn't finish. Scroll up in
that install output; the *first* error is the real one. Then reinstall from
scratch: delete `node_modules` and `package-lock.json` and run `npm install`
again.

**Anything about `SyntaxError` or unsupported syntax** — you're on an old Node.
This needs Node 20+. Check with `node --version` and install the current LTS
from [nodejs.org](https://nodejs.org).

**The page loads but every panel is empty** — that's correct on a fresh
install. There's no data until you run `discover`, or add a company by hand
with `hunter add`.

## Notes

- The dashboard binds to `127.0.0.1`. If you expose it anywhere else, set
  `DASHBOARD_TOKEN` — the API can send mail on your behalf.
- `data/` holds real people's contact details. It's gitignored; keep it that
  way.
- Requires Node 20+ (developed on 22, tested on the built-in SQLite path too).
- The database engine is chosen at startup: `better-sqlite3` when it's
  installed, otherwise Node's built-in `node:sqlite`. Both pass the full test
  suite; `npm run doctor` tells you which is in use.
