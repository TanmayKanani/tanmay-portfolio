/* Stage 4 — build the outbox.

   Queueing is separated from sending on purpose: it gives you a review step.
   Drafts sit in the dashboard as `queued`, you read them, and only then does
   anything leave the machine. */

import { config } from '../config.js';
import { log } from '../logger.js';
import { contacts, companies, outreach, suppressions } from '../db.js';
import { composeEmail } from '../personalize/index.js';

/**
 * Draft first-touch emails for eligible contacts.
 * @param {{limit?:number, minConfidence?:number}} opts
 */
export async function queueFirstTouch(opts = {}) {
  const {
    limit = config.limits.perRunCap,
    minConfidence = config.limits.minConfidence,
    cooldownDays = config.limits.companyCooldownDays,
  } = opts;

  const eligible = contacts.eligibleForFirstTouch({ minConfidence, cooldownDays, limit });
  if (!eligible.length) {
    /* The usual cause is a shelf full of guessed addresses. They sit just under
       the default bar on purpose — a guess is a plausible inbox, not a
       published one — so say what the trade-off is rather than naming a
       variable and leaving the reader to work it out. */
    const belowBar = contacts.eligibleForFirstTouch({ minConfidence: 0, cooldownDays, limit: 200 }).length;

    if (belowBar) {
      log.info(
        `${belowBar} contact(s) are on file but below the confidence bar of ${minConfidence}. ` +
          `Those are inferred addresses like careers@ rather than ones the company published. ` +
          `To write to them anyway:  hunter queue --min-confidence 0.4`,
      );
    } else {
      log.info('Nothing eligible to queue — run discovery and contacts first.');
    }
    return { queued: 0, skipped: 0, drafts: [] };
  }

  const result = { queued: 0, skipped: 0, aiDrafts: 0, drafts: [] };
  // Guard against two contacts at the same company slipping into one batch.
  const companiesThisRun = new Set();

  for (const row of eligible) {
    if (companiesThisRun.has(row.company_id)) {
      result.skipped += 1;
      continue;
    }
    if (suppressions.has(row.email, row.company_domain)) {
      result.skipped += 1;
      continue;
    }

    const company = companies.byId(row.company_id);
    try {
      const draft = await composeEmail({
        company,
        contact: { name: row.name, title: row.title, role_based: row.role_based },
        kind: 'initial',
      });

      const id = outreach.queue({
        contact_id: row.id,
        company_id: row.company_id,
        kind: 'initial',
        step: 0,
        subject: draft.subject,
        body: draft.body,
        personalized_by: draft.personalizedBy,
      });

      companiesThisRun.add(row.company_id);
      result.queued += 1;
      if (draft.personalizedBy === 'ai') result.aiDrafts += 1;
      result.drafts.push({ id, to: row.email, company: company.name, subject: draft.subject });
      log.info(`Queued → ${company.name} <${row.email}>`, { by: draft.personalizedBy });
    } catch (err) {
      result.skipped += 1;
      log.error(`Failed to draft for ${company?.name || row.company_id}`, { error: err.message });
    }
  }

  log.ok(`Queued ${result.queued} email(s) (${result.aiDrafts} AI-written, ${result.skipped} skipped)`);
  return result;
}
