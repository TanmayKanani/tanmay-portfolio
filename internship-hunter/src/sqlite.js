/* Database driver selection.

   better-sqlite3 is a compiled addon. It's fast and well-proven, but it only
   ships prebuilt binaries for Node versions that existed when it was released
   — install it on a brand-new Node major and npm falls back to compiling from
   source, which needs a C++ toolchain most people don't have.

   Node has shipped its own SQLite since 22.5 (unflagged from 22.13), so there
   is a perfectly good fallback with nothing to compile. We prefer
   better-sqlite3 when it loaded, and quietly use the built-in otherwise.

   Both expose the same small surface this project uses — prepare/exec/close
   and get/all/run on statements — with matching semantics: run() returns
   { changes, lastInsertRowid }, get() returns undefined when nothing matches,
   integers come back as numbers, and bare keys bind to @named parameters. */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** Which engine is in use — surfaced by `hunter doctor`. */
export let driver = 'unknown';

function openWithBetterSqlite3(file) {
  const Database = require('better-sqlite3');
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  driver = `better-sqlite3 ${require('better-sqlite3/package.json').version}`;
  return db;
}

function openWithNodeSqlite(file) {
  // Node 22/23 tag their SQLite as experimental; bin/hunter.js filters that
  // notice, since the subset used here is stable and the reader can't act on it.
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(file);

  // node:sqlite has no pragma() helper; everything else lines up already.
  db.pragma = (statement) => db.exec(`PRAGMA ${statement}`);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  driver = `node:sqlite (built into Node ${process.versions.node})`;
  return db;
}

export function openDatabase(file) {
  try {
    return openWithBetterSqlite3(file);
  } catch (betterSqliteError) {
    try {
      return openWithNodeSqlite(file);
    } catch {
      // Neither is usable — report the original failure, which is the
      // actionable one, rather than the fallback's "unknown module".
      const err = new Error(
        `No SQLite engine available.\n\n` +
          `  better-sqlite3 could not load:\n    ${betterSqliteError.message}\n\n` +
          `  and this Node (${process.versions.node}) has no built-in sqlite to fall back on.\n\n` +
          `  Fix either one:\n` +
          `    • Install Node 22 LTS or newer from https://nodejs.org  (recommended)\n` +
          `    • Or reinstall dependencies:  npm install`,
      );
      err.code = 'ENOSQLITE';
      throw err;
    }
  }
}
