/* A curated starting list of remote-friendly software companies.

   Job boards are noisy and their coverage of internships is thin, so a run can
   easily return nothing usable. This list gives the pipeline something real to
   work with on day one: known companies, correct domains, and a documented
   reason each one is here.

   What this list is NOT: a claim that any of them currently has an open
   internship, or that they hire from any particular country. It is a set of
   companies that publish hiring contact details and are known to work
   remotely — the contact stage then reads their actual careers pages, and
   nothing is sent until you have reviewed the draft.

   Categories:
     remote-first  — the company operates without offices by default
     dev-tools     — builds developer infrastructure; small, contactable teams
     open-source   — public contribution culture, usually reachable by email */

export const SEED_COMPANIES = [
  // Remote-first organisations
  { name: 'GitLab', domain: 'gitlab.com', why: 'remote-first' },
  { name: 'Zapier', domain: 'zapier.com', why: 'remote-first' },
  { name: 'Automattic', domain: 'automattic.com', why: 'remote-first' },
  { name: 'Doist', domain: 'doist.com', why: 'remote-first' },
  { name: 'Buffer', domain: 'buffer.com', why: 'remote-first' },
  { name: 'Toggl', domain: 'toggl.com', why: 'remote-first' },
  { name: 'Hotjar', domain: 'hotjar.com', why: 'remote-first' },
  { name: 'Remote', domain: 'remote.com', why: 'remote-first' },
  { name: 'Deel', domain: 'deel.com', why: 'remote-first' },
  { name: 'Aha!', domain: 'aha.io', why: 'remote-first' },
  { name: 'Close', domain: 'close.com', why: 'remote-first' },
  { name: 'Ghost', domain: 'ghost.org', why: 'remote-first' },

  // Developer infrastructure
  { name: 'Vercel', domain: 'vercel.com', why: 'dev-tools' },
  { name: 'Supabase', domain: 'supabase.com', why: 'dev-tools' },
  { name: 'Railway', domain: 'railway.app', why: 'dev-tools' },
  { name: 'Render', domain: 'render.com', why: 'dev-tools' },
  { name: 'Neon', domain: 'neon.tech', why: 'dev-tools' },
  { name: 'Turso', domain: 'turso.tech', why: 'dev-tools' },
  { name: 'PlanetScale', domain: 'planetscale.com', why: 'dev-tools' },
  { name: 'Fly.io', domain: 'fly.io', why: 'dev-tools' },
  { name: 'Linear', domain: 'linear.app', why: 'dev-tools' },
  { name: 'Resend', domain: 'resend.com', why: 'dev-tools' },
  { name: 'Clerk', domain: 'clerk.com', why: 'dev-tools' },
  { name: 'Sentry', domain: 'sentry.io', why: 'dev-tools' },
  { name: 'Grafana Labs', domain: 'grafana.com', why: 'dev-tools' },
  { name: 'HashiCorp', domain: 'hashicorp.com', why: 'dev-tools' },
  { name: 'Redis', domain: 'redis.io', why: 'dev-tools' },
  { name: 'Temporal', domain: 'temporal.io', why: 'dev-tools' },
  { name: 'Prefect', domain: 'prefect.io', why: 'dev-tools' },
  { name: 'Astronomer', domain: 'astronomer.io', why: 'dev-tools' },
  { name: 'Cockroach Labs', domain: 'cockroachlabs.com', why: 'dev-tools' },
  { name: 'Timescale', domain: 'timescale.com', why: 'dev-tools' },
  { name: 'ClickHouse', domain: 'clickhouse.com', why: 'dev-tools' },
  { name: 'Deno', domain: 'deno.com', why: 'dev-tools' },
  { name: 'Bun', domain: 'bun.sh', why: 'dev-tools' },
  { name: 'Hugging Face', domain: 'huggingface.co', why: 'dev-tools' },
  { name: 'Replicate', domain: 'replicate.com', why: 'dev-tools' },
  { name: 'Modal', domain: 'modal.com', why: 'dev-tools' },

  // Open-source organisations
  { name: 'Mozilla', domain: 'mozilla.org', why: 'open-source' },
  { name: 'Canonical', domain: 'canonical.com', why: 'open-source' },
  { name: 'Percona', domain: 'percona.com', why: 'open-source' },
  { name: 'Elastic', domain: 'elastic.co', why: 'open-source' },
  { name: 'DuckDuckGo', domain: 'duckduckgo.com', why: 'open-source' },
  { name: 'Igalia', domain: 'igalia.com', why: 'open-source' },
];

export const SEED_NOTE =
  'These are remote-friendly software companies with real domains, not a list of ' +
  'confirmed openings. The contact stage reads each one\'s own careers page, and ' +
  'nothing is sent until you have reviewed the draft.';
