/* Gmail OAuth + send.

   Mail goes out through the user's own Gmail account using an OAuth token they
   granted — there is no third-party relay, and no credentials beyond the
   client ID/secret pair from their own Google Cloud project. Tokens are stored
   locally in data/ (gitignored) and refreshed automatically. */

import fs from 'node:fs';
import { google } from 'googleapis';
import { config, paths } from '../config.js';
import { log } from '../logger.js';
import { buildMimeMessage, generateMessageId } from './mime.js';

let oauthClient = null;
let cachedProfile = null;

function loadTokens() {
  try {
    return JSON.parse(fs.readFileSync(paths.tokens, 'utf8'));
  } catch {
    return null;
  }
}

function saveTokens(tokens) {
  const merged = { ...(loadTokens() || {}), ...tokens };
  fs.writeFileSync(paths.tokens, JSON.stringify(merged, null, 2), { mode: 0o600 });
  return merged;
}

export function getOAuthClient() {
  if (oauthClient) return oauthClient;

  const { clientId, clientSecret, redirectUri } = config.google;
  if (!clientId || !clientSecret) {
    throw new Error('Gmail OAuth is not configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
  }

  oauthClient = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const tokens = loadTokens();
  if (tokens) oauthClient.setCredentials(tokens);

  // Google hands back a refreshed access token silently — persist it or the
  // next process start is unauthenticated again.
  oauthClient.on('tokens', (t) => {
    saveTokens(t);
    log.debug('Google tokens refreshed');
  });

  return oauthClient;
}

export function getAuthUrl() {
  return getOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // force a refresh_token even on re-auth
    scope: config.google.scopes,
  });
}

export async function exchangeCode(code) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  saveTokens(tokens);
  cachedProfile = null;
  const profile = await getAuthorizedProfile();
  log.ok(`Gmail connected as ${profile.emailAddress}`);
  return profile;
}

export function isAuthorized() {
  const t = loadTokens();
  return Boolean(t?.refresh_token || t?.access_token);
}

export function disconnect() {
  try {
    fs.unlinkSync(paths.tokens);
  } catch {
    /* already gone */
  }
  oauthClient = null;
  cachedProfile = null;
}

function gmailApi() {
  return google.gmail({ version: 'v1', auth: getOAuthClient() });
}

export async function getAuthorizedProfile() {
  if (cachedProfile) return cachedProfile;
  const { data } = await gmailApi().users.getProfile({ userId: 'me' });
  cachedProfile = data;
  return data;
}

/**
 * Send one email.
 * @param {{to:string, toName?:string, subject:string, body:string,
 *          attachments?:string[], threadId?:string, inReplyTo?:string,
 *          references?:string[], fromName?:string}} opts
 */
export async function sendEmail(opts) {
  const { to, toName, subject, body, attachments = [], threadId, inReplyTo, references = [], fromName } = opts;

  const profile = await getAuthorizedProfile();
  const messageId = generateMessageId(profile.emailAddress.split('@')[1] || 'gmail.com');

  const { raw } = buildMimeMessage({
    from: { name: fromName, email: profile.emailAddress },
    to: { name: toName, email: to },
    subject,
    body,
    attachments,
    inReplyTo,
    references,
    messageId,
  });

  const { data } = await gmailApi().users.messages.send({
    userId: 'me',
    requestBody: threadId ? { raw, threadId } : { raw },
  });

  return { messageId: data.id, threadId: data.threadId, rfcMessageId: messageId };
}

/**
 * Has anyone other than us written in this thread?
 * @returns {Promise<{replied:boolean, at?:string, from?:string}>}
 */
export async function checkThreadForReply(threadId, selfEmail) {
  try {
    const { data } = await gmailApi().users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'metadata',
      metadataHeaders: ['From', 'Date', 'Subject'],
    });

    const me = String(selfEmail || '').toLowerCase();
    for (const msg of data.messages || []) {
      const headers = msg.payload?.headers || [];
      const from = headers.find((h) => h.name.toLowerCase() === 'from')?.value || '';
      if (from.toLowerCase().includes(me)) continue;
      // Gmail files our own sent mail in the thread too; a SENT label means ours.
      if ((msg.labelIds || []).includes('SENT')) continue;

      return {
        replied: true,
        from,
        at: msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : new Date().toISOString(),
        snippet: msg.snippet || '',
      };
    }
    return { replied: false };
  } catch (err) {
    // A 404 means the thread is gone (deleted); anything else is transient.
    log.warn(`Could not read thread ${threadId}`, { error: err.message });
    return { replied: false, error: err.message };
  }
}

/** Bounce detection: Mail Delivery Subsystem messages naming our recipient. */
export async function findBounces({ sinceDays = 14 } = {}) {
  try {
    const { data } = await gmailApi().users.messages.list({
      userId: 'me',
      q: `from:(mailer-daemon OR postmaster) newer_than:${Math.max(1, Math.round(sinceDays))}d`,
      maxResults: 50,
    });
    if (!data.messages?.length) return [];

    const bounced = [];
    for (const ref of data.messages) {
      const { data: msg } = await gmailApi().users.messages.get({
        userId: 'me',
        id: ref.id,
        format: 'metadata',
        metadataHeaders: ['Subject'],
      });
      const text = `${msg.snippet || ''} ${
        msg.payload?.headers?.find((h) => h.name === 'Subject')?.value || ''
      }`;
      for (const email of text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || []) {
        bounced.push(email.toLowerCase());
      }
    }
    return [...new Set(bounced)];
  } catch (err) {
    log.warn('Bounce scan failed', { error: err.message });
    return [];
  }
}
