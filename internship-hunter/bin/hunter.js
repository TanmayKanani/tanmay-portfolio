#!/usr/bin/env node
/* Launcher.

   This file imports nothing but Node builtins, on purpose. ESM resolves an
   entire import graph before it executes a single line, so a missing package
   anywhere in the tree aborts at link time — before any guard inside those
   modules could run. Keeping the real CLI behind a dynamic import means we
   reach the checks below first and can explain what went wrong.

   The actual commands live in ../src/cli.js. */

const MIN_NODE_MAJOR = 20;
const isWindows = process.platform === 'win32';

const C = process.stdout.isTTY
  ? { red: '\x1b[31m', dim: '\x1b[90m', bold: '\x1b[1m', reset: '\x1b[0m' }
  : { red: '', dim: '', bold: '', reset: '' };

function die(title, lines) {
  console.error(`\n  ${C.red}✗${C.reset} ${C.bold}${title}${C.reset}\n`);
  for (const line of lines) console.error(line ? `    ${line}` : '');
  console.error('');
  process.exit(1);
}

/* ------------------------------ Node version ---------------------------- */

const major = Number(process.versions.node.split('.')[0]);
if (Number.isNaN(major) || major < MIN_NODE_MAJOR) {
  die(`Node ${MIN_NODE_MAJOR} or newer is required — you are running ${process.versions.node}.`, [
    'Install the current LTS from https://nodejs.org, reopen your terminal,',
    'then confirm it took effect:',
    '',
    '    node --version',
  ]);
}

/* ------------------------------ warning noise --------------------------- */

/* Two warnings fire on every command and neither is actionable: Node tagging
   its built-in SQLite as experimental (the subset used here is stable), and a
   punycode deprecation raised from inside a transitive dependency. Filter
   exactly those; everything else still prints. */
const MUTED = [
  (w) => w.name === 'ExperimentalWarning' && /SQLite/i.test(w.message),
  (w) => w.name === 'DeprecationWarning' && /punycode/i.test(w.message),
];

process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (MUTED.some((match) => match(warning))) return;
  console.warn(`${warning.name}: ${warning.message}`);
});

/* ------------------------------- run the CLI ---------------------------- */

try {
  await import('../src/cli.js');
} catch (err) {
  // A package failed to resolve — almost always an npm install that didn't finish.
  if (err.code === 'ERR_MODULE_NOT_FOUND') {
    const missing = /Cannot find package '([^']+)'/.exec(err.message)?.[1];
    die(`A dependency is missing${missing ? `: ${missing}` : ''}.`, [
      'This usually means "npm install" did not finish successfully.',
      'Scroll up in that install output — the first error is the real one.',
      '',
      'Reinstall from scratch:',
      '',
      isWindows
        ? '    rmdir /s /q node_modules  &&  del package-lock.json  &&  npm install'
        : '    rm -rf node_modules package-lock.json && npm install',
      '',
      `${C.dim}Run it from the folder containing package.json.${C.reset}`,
    ]);
  }

  // No SQLite engine at all — sqlite.js already composed the explanation.
  if (err.code === 'ENOSQLITE') die('Cannot open the database.', err.message.split('\n'));

  throw err;
}
