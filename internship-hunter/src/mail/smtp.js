/* Gmail over SMTP + IMAP, authenticated with an app password.

   The OAuth transport in gmail.js is the "proper" integration, but it costs
   the user fifteen minutes in Google Cloud Console before a single email can
   be sent. An app password takes two minutes and needs no project, no consent
   screen and no test-user list — a materially better trade for one person
   emailing on their own behalf.

   This module implements the same interface as gmail.js so the pipeline does
   not care which one is in use:
     sendEmail, isAuthorized, getAuthorizedProfile, checkThreadForReply,
     findBounces

   Sending goes out over SMTP; reply and bounce detection read the mailbox
   over IMAP. */

import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { config } from '../config.js';
import { log } from '../logger.js';
import { buildMimeMessage } from './mime.js';

/* Explicit timeouts matter here: on a network that blocks these ports (office
   Wi-Fi, some ISPs, most CI sandboxes) the default is to hang indefinitely,
   which reads to the user as the app being broken. Fail fast and say why. */
const SMTP = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  connectionTimeout: 15_000,
  greetingTimeout: 15_000,
  socketTimeout: 30_000,
};
const IMAP = {
  host: 'imap.gmail.com',
  port: 993,
  secure: true,
  connectionTimeout: 15_000,
  greetingTimeout: 15_000,
  socketTimeout: 30_000,
};

/* Turns a connection-level failure into something a reader can act on. */
function explain(err) {
  const code = err?.code || '';
  if (['ETIMEDOUT', 'ESOCKET', 'ECONNREFUSED', 'EHOSTUNREACH'].includes(code) || /timeout/i.test(err?.message || '')) {
    return new Error(
      'Could not reach Gmail. The connection timed out, which usually means the ' +
        'network blocks outbound mail ports (465/993) — common on college, office ' +
        'and public Wi-Fi. Try a different network or a phone hotspot.',
    );
  }
  if (code === 'EAUTH' || /invalid credentials|username and password/i.test(err?.message || '')) {
    return new Error(
      'Google rejected the credentials. App passwords are 16 letters with no ' +
        'digits, and 2-Step Verification must be on for the account.',
    );
  }
  return err;
}

export function isAuthorized() {
  return Boolean(config.smtp.address && config.smtp.appPassword);
}

export async function getAuthorizedProfile() {
  if (!isAuthorized()) return null;
  return { emailAddress: config.smtp.address };
}

function auth() {
  return { user: config.smtp.address, pass: config.smtp.appPassword };
}

let transporter;
function getTransporter() {
  transporter ??= nodemailer.createTransport({ ...SMTP, auth: auth() });
  return transporter;
}

/** Confirms the credentials actually work, so setup fails at setup time. */
export async function verifyConnection() {
  try {
    await getTransporter().verify();
  } catch (err) {
    transporter = undefined; // don't cache a transport built on bad settings
    throw explain(err);
  }
  return { emailAddress: config.smtp.address };
}

/* --------------------------------- send --------------------------------- */

export async function sendEmail({ to, subject, body, attachments = [], inReplyTo, references, threadId }) {
  if (!isAuthorized()) throw new Error('No Gmail app password configured.');

  const from = { name: config.smtp.name || undefined, email: config.smtp.address };
  // Reuse the same MIME builder as the OAuth path so both transports produce
  // byte-identical messages — attachments, encoding and threading headers.
  const { raw, messageId } = buildMimeMessage({
    from, to, subject, body, attachments, inReplyTo, references,
  });

  let info;
  try {
    info = await getTransporter().sendMail({
      envelope: { from: config.smtp.address, to: to.email },
      raw: Buffer.from(raw, 'base64url'),
    });
  } catch (err) {
    throw explain(err);
  }

  return {
    // SMTP has no notion of Gmail's thread ids. The RFC Message-ID is what
    // actually threads a conversation, so it stands in for both.
    threadId: threadId || messageId,
    messageId: info.messageId || messageId,
    rfcMessageId: messageId,
  };
}

/* -------------------------------- reading -------------------------------- */

async function withMailbox(name, fn) {
  const client = new ImapFlow({
    ...IMAP,
    auth: auth(),
    logger: false,
    emitLogs: false,
  });
  try {
    await client.connect();
  } catch (err) {
    throw explain(err);
  }
  try {
    const lock = await client.getMailboxLock(name);
    try {
      return await fn(client);
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}

/** True when someone other than us has written into the thread. */
export async function checkThreadForReply(rfcMessageId, selfEmail) {
  if (!rfcMessageId) return null;

  return withMailbox('INBOX', async (client) => {
    // Gmail threads replies by In-Reply-To/References; search both.
    const uids = await client.search({
      or: [{ header: { 'in-reply-to': rfcMessageId } }, { header: { references: rfcMessageId } }],
    });
    if (!uids || !uids.length) return null;

    for await (const msg of client.fetch(uids, { envelope: true, internalDate: true })) {
      const from = msg.envelope?.from?.[0]?.address?.toLowerCase();
      if (from && from !== String(selfEmail).toLowerCase()) {
        return {
          repliedAt: (msg.internalDate || new Date()).toISOString(),
          from,
          snippet: msg.envelope?.subject || '',
        };
      }
    }
    return null;
  });
}

/** Addresses that bounced, read from delivery-failure notices. */
export async function findBounces({ sinceDays = 14 } = {}) {
  const since = new Date(Date.now() - sinceDays * 86_400_000);

  return withMailbox('INBOX', async (client) => {
    const uids = await client.search({ since, from: 'mailer-daemon' });
    if (!uids || !uids.length) return [];

    const found = [];
    for await (const msg of client.fetch(uids, { envelope: true, bodyParts: ['text'] })) {
      const text = msg.bodyParts?.get('text')?.toString('utf8') || msg.envelope?.subject || '';
      // Pull the address the notice is complaining about.
      for (const match of text.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]+/g)) {
        const address = match[0].toLowerCase();
        if (address.includes('mailer-daemon') || address === String(config.smtp.address).toLowerCase()) continue;
        if (!found.includes(address)) found.push(address);
      }
    }
    return found;
  });
}

export function disconnect() {
  transporter = undefined;
  log.info('SMTP transport reset — clear GMAIL_APP_PASSWORD in .env to fully disconnect.');
}
