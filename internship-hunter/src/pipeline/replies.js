/* Stage 6a — close the loop.

   Before any follow-up is drafted we ask Gmail whether the person already
   answered. Sending a "just following up!" to someone who replied yesterday is
   the single worst failure mode this tool could have, so reply sync runs first
   in every follow-up cycle. */

import { log } from '../logger.js';
import { outreach, contacts, companies, suppressions, db } from '../db.js';
import { checkThreadForReply, findBounces, isAuthorized, getAuthorizedProfile } from '../mail/index.js';
import { sleep } from '../util.js';

/* Someone asking to be left alone, in the wording people actually use. */
const OPT_OUT_RE =
  /\b(unsubscribe|stop emailing|stop contacting|remove me|take me off|do not contact|don'?t contact me|no longer interested|please stop)\b/i;

/** Poll every open thread and record replies. */
export async function syncReplies({ limit = 200 } = {}) {
  if (!isAuthorized()) {
    log.warn('Gmail not connected — skipping reply sync.');
    return { checked: 0, replies: 0 };
  }

  const me = (await getAuthorizedProfile()).emailAddress;
  const open = outreach.awaitingReply().slice(0, limit);
  const result = { checked: 0, replies: 0, optOuts: 0 };

  for (const row of open) {
    result.checked += 1;
    const reply = await checkThreadForReply(row.thread_id, me);
    if (!reply.replied) {
      await sleep(120);
      continue;
    }

    // Mark the whole thread replied so no step gets a follow-up.
    db.prepare(
      `UPDATE outreach SET status = 'replied', replied_at = ? WHERE thread_id = ? AND status = 'sent'`,
    ).run(reply.at, row.thread_id);
    companies.setStatus(row.company_id, 'replied');
    result.replies += 1;
    log.ok(`Reply from ${row.email} — ${row.thread_id}`);

    // Honour an opt-out immediately and permanently.
    if (OPT_OUT_RE.test(reply.snippet || '')) {
      suppressions.add(row.email, 'email', 'recipient asked to stop');
      result.optOuts += 1;
    }
    await sleep(150);
  }

  log.info(`Reply sync — ${result.checked} thread(s) checked, ${result.replies} reply/replies found`);
  return result;
}

/** Scan for bounce notifications and suppress the dead addresses. */
export async function syncBounces({ sinceDays = 14 } = {}) {
  if (!isAuthorized()) return { bounced: 0 };

  const me = (await getAuthorizedProfile()).emailAddress.toLowerCase();
  const addresses = (await findBounces({ sinceDays })).filter((e) => e !== me);

  let bounced = 0;
  for (const email of addresses) {
    // Only act on addresses we actually wrote to.
    if (!contacts.byEmail(email)) continue;
    suppressions.add(email, 'email', 'bounced');
    db.prepare(
      `UPDATE outreach SET status='failed', error='bounced'
       WHERE status='sent' AND contact_id = (SELECT id FROM contacts WHERE email = ?)`,
    ).run(email);
    bounced += 1;
  }

  if (bounced) log.warn(`${bounced} bounced address(es) suppressed`);
  return { bounced };
}
