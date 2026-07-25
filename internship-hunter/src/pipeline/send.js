/* Stage 5 — send, through the user's own Gmail.

   Every guardrail is re-checked at send time, not just at queue time: a
   suppression added five minutes ago must stop a message that was drafted an
   hour ago. DRY_RUN is the default, so a fresh clone cannot email anyone by
   accident. */

import fs from 'node:fs';
import { config, paths, loadProfile } from '../config.js';
import { log } from '../logger.js';
import { outreach, contacts, companies, suppressions } from '../db.js';
import { sendEmail, isAuthorized, getAuthorizedProfile } from '../mail/index.js';
import { sleep, jitter } from '../util.js';

/**
 * Flush the queue.
 * @param {{limit?:number, dryRun?:boolean}} opts
 */
export async function sendQueued(opts = {}) {
  const { limit = config.limits.perRunCap, dryRun = config.limits.dryRun } = opts;

  const result = { attempted: 0, sent: 0, failed: 0, skipped: 0, dryRun, results: [] };

  if (!dryRun && !isAuthorized()) {
    throw new Error('Gmail is not connected. Run "hunter auth" (or visit /auth/google) first.');
  }

  // The daily cap is a hard ceiling across every run in a calendar day.
  const alreadyToday = outreach.sentToday();
  const remainingToday = Math.max(0, config.limits.dailyCap - alreadyToday);
  if (!dryRun && remainingToday === 0) {
    log.warn(`Daily cap reached (${config.limits.dailyCap}) — nothing sent.`);
    return { ...result, capReached: true };
  }

  const batchSize = dryRun ? limit : Math.min(limit, remainingToday);
  const queue = outreach.pending(batchSize);
  if (!queue.length) {
    log.info('Outbox is empty.');
    return result;
  }

  const profile = loadProfile();
  const attachments = fs.existsSync(paths.resume) ? [paths.resume] : [];
  /* Send the resume under the candidate's name so it is identifiable once
     saved out of the inbox, whatever the file is called on disk. */
  const attachmentNames = attachments.length
    ? { [paths.resume]: `${String(profile.name || 'Resume').replace(/[^\w.-]+/g, '_')}_Resume.pdf` }
    : {};
  if (!attachments.length) log.warn(`No resume at ${paths.resume} — sending without an attachment.`);

  log.info(
    `${dryRun ? '[DRY RUN] ' : ''}Sending ${queue.length} email(s)` +
      (dryRun ? '' : ` — ${alreadyToday}/${config.limits.dailyCap} used today`),
  );

  for (const [i, item] of queue.entries()) {
    result.attempted += 1;

    // Re-check suppression at the last possible moment.
    if (suppressions.has(item.email, item.domain)) {
      outreach.markFailed(item.id, 'recipient suppressed before send');
      result.skipped += 1;
      log.warn(`Skipped suppressed recipient ${item.email}`);
      continue;
    }
    const contact = contacts.byId(item.contact_id);
    if (!contact || contact.status !== 'active') {
      outreach.markFailed(item.id, `contact status: ${contact?.status || 'missing'}`);
      result.skipped += 1;
      continue;
    }

    if (dryRun) {
      result.sent += 1;
      result.results.push({ id: item.id, to: item.email, company: item.company_name, subject: item.subject, dryRun: true });
      log.info(`[DRY RUN] → ${item.email} — "${item.subject}"`);
      continue;
    }

    try {
      const sent = await sendEmail({
        to: item.email,
        toName: item.contact_name,
        fromName: profile.name,
        subject: item.subject,
        body: item.body,
        attachments,
        attachmentNames,
        threadId: item.thread_id || undefined,
        inReplyTo: item.rfc_message_id || undefined,
        references: item.rfc_message_id ? [item.rfc_message_id] : [],
      });

      outreach.markSent(item.id, sent);
      companies.setStatus(item.company_id, 'contacted');
      result.sent += 1;
      result.results.push({ id: item.id, to: item.email, company: item.company_name, threadId: sent.threadId });
      log.ok(`Sent → ${item.company_name} <${item.email}>`);
    } catch (err) {
      outreach.markFailed(item.id, err.message);
      result.failed += 1;
      log.error(`Send failed → ${item.email}`, { error: err.message });

      // A hard rejection from Gmail means the address is bad — stop retrying it.
      if (/invalid.*(address|recipient)|550|no such user/i.test(err.message)) {
        suppressions.add(item.email, 'email', 'invalid address');
      }
    }

    // Human pacing between messages.
    if (i < queue.length - 1) {
      const wait = jitter(config.limits.minDelayMs, config.limits.maxDelayMs);
      log.debug(`Waiting ${Math.round(wait / 1000)}s before the next send`);
      await sleep(wait);
    }
  }

  log.ok(
    `${dryRun ? '[DRY RUN] ' : ''}Done — ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`,
  );
  return result;
}

/** Who are we sending as? Used by the dashboard header. */
export async function senderIdentity() {
  if (!isAuthorized()) return null;
  try {
    const p = await getAuthorizedProfile();
    return { email: p.emailAddress, messagesTotal: p.messagesTotal };
  } catch {
    return null;
  }
}
