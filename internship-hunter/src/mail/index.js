/* Transport selection.

   Two ways to send as yourself, both first-party Google:

     app password  — SMTP + IMAP. Two minutes to set up: turn on 2-Step
                     Verification, generate a 16-character app password,
                     paste it into .env. No Google Cloud project.

     OAuth         — the Gmail API. More setup (a Cloud project, a consent
                     screen, a test-user entry) but no password stored, and
                     access is revocable from your Google account page.

   An app password wins when both are configured, because someone who set one
   up did it deliberately. Everything downstream imports from here and never
   needs to know which is active. */

import { config } from './../config.js';
import * as oauth from './gmail.js';
import * as smtp from './smtp.js';

/** 'app-password' | 'oauth' | null */
export function activeTransport() {
  if (smtp.isAuthorized()) return 'app-password';
  if (oauth.isAuthorized()) return 'oauth';
  return null;
}

/** Human-readable, for the dashboard and `hunter doctor`. */
export function transportLabel() {
  return {
    'app-password': 'Gmail app password (SMTP)',
    oauth: 'Gmail OAuth (API)',
  }[activeTransport()] ?? 'not connected';
}

function pick() {
  const which = activeTransport();
  if (which === 'app-password') return smtp;
  if (which === 'oauth') return oauth;
  return null;
}

export function isAuthorized() {
  return activeTransport() !== null;
}

export async function getAuthorizedProfile() {
  return pick()?.getAuthorizedProfile() ?? null;
}

export async function sendEmail(opts) {
  const transport = pick();
  if (!transport) {
    throw new Error(
      'Gmail is not connected. Add GMAIL_ADDRESS and GMAIL_APP_PASSWORD to .env ' +
        '(see Settings in the dashboard), or run: node bin/hunter.js auth',
    );
  }
  return transport.sendEmail(opts);
}

export async function checkThreadForReply(threadRef, selfEmail) {
  return pick()?.checkThreadForReply(threadRef, selfEmail) ?? null;
}

export async function findBounces(opts) {
  return pick()?.findBounces(opts) ?? [];
}

export function disconnect() {
  return pick()?.disconnect();
}

// OAuth-only helpers, used by `hunter auth`.
export const { getAuthUrl, exchangeCode } = oauth;
export const verifyAppPassword = smtp.verifyConnection;
export { config };
