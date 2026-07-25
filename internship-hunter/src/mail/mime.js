/* RFC 2822 message construction.

   Gmail's API takes a raw, base64url-encoded MIME message, so we build one:
   multipart/mixed with a text/plain part and the resume as an attachment. */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/** RFC 2047 encoded-word — needed the moment a subject contains an em dash. */
function encodeHeader(value) {
  const s = String(value ?? '');
  // eslint-disable-next-line no-control-regex
  if (/^[\x20-\x7E]*$/.test(s)) return s;
  return `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`;
}

/** Header values must not contain raw CR/LF — that is header injection. */
function sanitizeHeader(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

function formatAddress(name, email) {
  const addr = sanitizeHeader(email);
  if (!name) return addr;
  return `${encodeHeader(sanitizeHeader(name))} <${addr}>`;
}

function base64Lines(buffer) {
  return buffer.toString('base64').replace(/(.{76})/g, '$1\r\n');
}

const MIME_TYPES = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

export function generateMessageId(domain = 'mail.gmail.com') {
  return `<${crypto.randomUUID()}@${domain}>`;
}

/**
 * Build a raw MIME message.
 * @param {{from:{name?:string,email:string}, to:{name?:string,email:string},
 *          subject:string, body:string, attachments?:string[],
 *          inReplyTo?:string, references?:string[], messageId?:string}} opts
 * @returns {{raw:string, messageId:string}} raw is base64url for the Gmail API
 */
export function buildMimeMessage(opts) {
  const {
    from,
    to,
    subject,
    body,
    attachments = [],
    inReplyTo = null,
    references = [],
    messageId = generateMessageId(),
  } = opts;

  const boundary = `--=_ih_${crypto.randomBytes(12).toString('hex')}`;
  const headers = [
    `From: ${formatAddress(from.name, from.email)}`,
    `To: ${formatAddress(to.name, to.email)}`,
    `Subject: ${encodeHeader(sanitizeHeader(subject))}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    'MIME-Version: 1.0',
  ];

  // Threading headers make a follow-up land inside the original conversation
  // rather than as a fresh, easy-to-ignore email.
  if (inReplyTo) headers.push(`In-Reply-To: ${sanitizeHeader(inReplyTo)}`);
  if (references.length) headers.push(`References: ${references.map(sanitizeHeader).join(' ')}`);

  const present = attachments.filter((f) => f && fs.existsSync(f));

  if (!present.length) {
    headers.push('Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64');
    const raw = `${headers.join('\r\n')}\r\n\r\n${base64Lines(Buffer.from(body, 'utf8'))}`;
    return { raw: Buffer.from(raw, 'utf8').toString('base64url'), messageId };
  }

  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);

  const parts = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    base64Lines(Buffer.from(body, 'utf8')),
  ];

  for (const file of present) {
    const name = path.basename(file);
    const type = MIME_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    parts.push(
      `--${boundary}`,
      `Content-Type: ${type}; name="${name}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${name}"`,
      '',
      base64Lines(fs.readFileSync(file)),
    );
  }
  parts.push(`--${boundary}--`, '');

  const raw = `${headers.join('\r\n')}\r\n\r\n${parts.join('\r\n')}`;
  return { raw: Buffer.from(raw, 'utf8').toString('base64url'), messageId };
}
