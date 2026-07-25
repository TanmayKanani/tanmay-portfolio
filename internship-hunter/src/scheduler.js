/* Optional cron automation.

   Off by default. When enabled it only *drafts* — discovery, contact research
   and follow-up queueing run on a schedule, but sending stays manual unless
   AUTO_SEND is explicitly turned on. Automating discovery is convenient;
   automating unattended email is a decision you should make deliberately. */

import cron from 'node-cron';
import { config } from './config.js';
import { log } from './logger.js';
import { startJob } from './jobs.js';
import { runDiscovery } from './discovery/index.js';
import { runContactDiscovery } from './contacts/index.js';
import { queueFollowUps } from './pipeline/followup.js';
import { syncReplies, syncBounces } from './pipeline/replies.js';
import { sendQueued } from './pipeline/send.js';

const autoSend = /^(1|true|yes|on)$/i.test(process.env.AUTO_SEND || '');
const tasks = [];

function schedule(name, expression, fn) {
  if (!cron.validate(expression)) {
    log.error(`Invalid cron expression for ${name}: "${expression}" — not scheduled`);
    return;
  }
  tasks.push(
    cron.schedule(expression, () => {
      try {
        startJob(name, fn);
        log.info(`Scheduled job "${name}" started`);
      } catch (err) {
        // JOB_BUSY just means the previous run is still going — skip this tick.
        log.warn(`Scheduled job "${name}" skipped`, { reason: err.message });
      }
    }),
  );
  log.info(`Scheduled ${name} — ${expression}`);
}

export function startScheduler() {
  if (!config.scheduler.enabled) {
    log.info('Scheduler disabled (SCHEDULER_ENABLED=false).');
    return [];
  }

  schedule('scheduled:discovery', config.scheduler.discoveryCron, async () => {
    const discovery = await runDiscovery({});
    const contacts = await runContactDiscovery({ limit: 15 });
    return { discovery, contacts };
  });

  schedule('scheduled:followup', config.scheduler.followUpCron, async () => {
    const queued = await queueFollowUps({});
    const sent = autoSend ? await sendQueued({}) : { skipped: 'AUTO_SEND is off — drafts left in the outbox' };
    return { queued, sent };
  });

  schedule('scheduled:sync', config.scheduler.replySyncCron, async () => ({
    ...(await syncReplies()),
    ...(await syncBounces()),
  }));

  log.ok(`Scheduler running (${tasks.length} jobs, auto-send ${autoSend ? 'ON' : 'off'})`);
  return tasks;
}

export function stopScheduler() {
  tasks.forEach((t) => t.stop());
  tasks.length = 0;
}
