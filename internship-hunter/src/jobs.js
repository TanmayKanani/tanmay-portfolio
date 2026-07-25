/* A tiny in-process job runner.

   Discovery and sending take minutes, which is far too long to hold an HTTP
   request open. The dashboard starts a job, gets an id back, and polls. One
   job at a time — running two send batches concurrently would blow past the
   daily cap. */

import crypto from 'node:crypto';
import { log } from './logger.js';

const jobs = new Map();
let active = null;

export function currentJob() {
  return active ? jobs.get(active) : null;
}

export function getJob(id) {
  return jobs.get(id) || null;
}

export function listJobs(limit = 20) {
  return [...jobs.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit);
}

/**
 * Start a named task in the background.
 * @throws if another job is already running
 */
export function startJob(name, fn) {
  if (active) {
    const running = jobs.get(active);
    const err = new Error(`"${running.name}" is already running`);
    err.code = 'JOB_BUSY';
    throw err;
  }

  const id = crypto.randomUUID();
  const job = { id, name, status: 'running', startedAt: new Date().toISOString(), finishedAt: null, result: null, error: null };
  jobs.set(id, job);
  active = id;

  Promise.resolve()
    .then(fn)
    .then((result) => {
      job.status = 'done';
      job.result = result ?? null;
    })
    .catch((err) => {
      job.status = 'error';
      job.error = err.message;
      log.error(`Job "${name}" failed`, { error: err.message });
    })
    .finally(() => {
      job.finishedAt = new Date().toISOString();
      active = null;
      // Keep the log short.
      if (jobs.size > 50) {
        const oldest = [...jobs.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt))[0];
        jobs.delete(oldest.id);
      }
    });

  return job;
}
