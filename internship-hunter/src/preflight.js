/* Runtime checks that run before anything heavy is imported.

   Static ESM imports are evaluated in source order, so importing this module
   first in bin/hunter.js means a wrong Node version or a broken native build
   produces an explanation the reader can act on, rather than a stack trace
   from deep inside a dependency. */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const isWindows = process.platform === 'win32';

function die(title, lines) {
  console.error(`\n  ✗ ${title}\n`);
  for (const line of lines) console.error(`    ${line}`);
  console.error('');
  process.exit(1);
}

/* ------------------------------ Node version ---------------------------- */

const MIN_MAJOR = 20;
const major = Number(process.versions.node.split('.')[0]);

if (Number.isNaN(major) || major < MIN_MAJOR) {
  die(`Node ${MIN_MAJOR} or newer is required — you are on ${process.versions.node}.`, [
    'This project uses the built-in test runner and modern ESM features.',
    '',
    'Install the current LTS from https://nodejs.org and reopen your terminal,',
    'then check it took effect with:  node --version',
  ]);
}

/* --------------------------- native SQLite build ------------------------ */

/* better-sqlite3 is a compiled addon. It normally installs a prebuilt binary,
   but a Node version with no prebuild — or an interrupted install — leaves the
   package present and the .node file missing. Catch that here, where we can
   say what to do about it. */
try {
  require.resolve('better-sqlite3');
} catch {
  die('Dependencies are not installed.', [
    'Run this first, from inside the internship-hunter folder:',
    '',
    '    npm install',
  ]);
}

try {
  require('better-sqlite3');
} catch (err) {
  die('The SQLite database engine failed to load.', [
    'better-sqlite3 is a compiled module and its binary is missing or unusable.',
    '',
    'Try a clean reinstall first:',
    '',
    isWindows ? '    rmdir /s /q node_modules && del package-lock.json' : '    rm -rf node_modules package-lock.json',
    '    npm install',
    '',
    ...(isWindows
      ? [
          'If it still fails, npm needs a C++ toolchain to build it from source.',
          'Install the "Desktop development with C++" workload from the Visual',
          'Studio Build Tools, then run npm install again:',
          '',
          '    https://visualstudio.microsoft.com/visual-cpp-build-tools/',
        ]
      : [
          'If it still fails, you likely need build tools:',
          '',
          '    Debian/Ubuntu:  sudo apt-get install -y build-essential python3',
          '    macOS:          xcode-select --install',
        ]),
    '',
    `Original error: ${err.message}`,
  ]);
}
