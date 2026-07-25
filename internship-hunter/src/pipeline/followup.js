/* Stage 6b — the 7-day nudge.

   Follow-ups are threaded replies to the original message (In-Reply-To +
   Gmail threadId), capped at MAX_FOLLOWUPS, and skipped entirely the moment a
   reply, bounce, or opt-out is recorded. */

import { config } from '../config.js';
import { log } from '../logger.js';
import { outreach, companies, contacts, suppressions } from '../db.js';
import { composeEmail } from '../personalize/index.js';
import { syncReplies } from './replies.js';

/**
 * Queue follow-ups that are due.
 * @param {{limit?:number, skipSync?:boolean}} opts
 */
export async function queueFollowUps(opts = {}) {
  const { limit = config.limits.perRunCap, skipSync = false } = opts;

  if (!config.followUp.enabled) {
    log.info('Follow-ups are disabled (FOLLOWUP_ENABLED=false).');
    return { queued: 0 };
  }

  // Never nudge someone who already answered.
  if (!skipSync) await syncReplies();

  const [firstGap, secondGap] = config.followUp.steps;
  const result = { queued: 0, skipped: 0, drafts: [] };

  // Step 1 uses the first gap; step 2 waits the second gap after step 1.
  const rounds = [
    { afterDays: firstGap ?? 7, maxSteps: 1 },
    { afterDays: secondGap ?? 14, maxSteps: config.followUp.maxFollowUps },
  ];

  for (const round of rounds) {
    if (result.queued >= limit) break;
    if (round.maxSteps > config.followUp.maxFollowUps) continue;

    const due = outreach.dueForFollowUp({
      afterDays: round.afterDays,
      maxSteps: round.maxSteps,
      limit: limit - result.queued,
    });

    for (const prev of due) {
      if (suppressions.has(prev.email, prev.domain)) {
        result.skipped += 1;
        continue;
      }
      const contact = contacts.byId(prev.contact_id);
      if (!contact || contact.status !== 'active') {
        result.skipped += 1;
        continue;
      }

      const company = companies.byId(prev.company_id);
      try {
        const draft = await composeEmail({
          company,
          contact: { name: contact.name, title: contact.title, role_based: contact.role_based },
          kind: 'followup',
          previous: prev,
        });

        const id = outreach.queue({
          contact_id: prev.contact_id,
          company_id: prev.company_id,
          kind: 'followup',
          step: draft.step,
          subject: draft.subject,
          body: draft.body,
          personalized_by: draft.personalizedBy,
          // Threading data so the reply lands in the same conversation.
          thread_id: prev.thread_id,
          rfc_message_id: prev.rfc_message_id,
        });

        result.queued += 1;
        result.drafts.push({ id, to: prev.email, company: company.name, step: draft.step });
        log.info(`Queued follow-up #${draft.step} → ${company.name} <${prev.email}>`);
      } catch (err) {
        result.skipped += 1;
        log.error(`Follow-up draft failed for ${prev.email}`, { error: err.message });
      }
    }
  }

  log.ok(`${result.queued} follow-up(s) queued, ${result.skipped} skipped`);
  return result;
}
