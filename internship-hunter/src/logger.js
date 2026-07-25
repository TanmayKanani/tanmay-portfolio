/* Console logger + a durable event trail in the database, so the dashboard can
   show what the last run actually did. */

const COLORS = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  ok: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  reset: '\x1b[0m',
};

const LEVELS = { debug: 10, info: 20, ok: 20, warn: 30, error: 40 };
const threshold = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

let sink = null;
/** Wire the DB in once it exists (avoids a circular import at module load). */
export function setEventSink(fn) {
  sink = fn;
}

function emit(level, msg, meta) {
  if ((LEVELS[level] ?? 20) >= threshold) {
    const stamp = new Date().toISOString().slice(11, 19);
    const tail = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    // eslint-disable-next-line no-console
    console.log(`${COLORS[level]}${stamp} ${level.toUpperCase().padEnd(5)}${COLORS.reset} ${msg}${tail}`);
  }
  if (sink && level !== 'debug') {
    try {
      sink(level, msg, meta || null);
    } catch {
      /* logging must never break the run */
    }
  }
}

export const log = {
  debug: (m, meta) => emit('debug', m, meta),
  info: (m, meta) => emit('info', m, meta),
  ok: (m, meta) => emit('ok', m, meta),
  warn: (m, meta) => emit('warn', m, meta),
  error: (m, meta) => emit('error', m, meta),
};
