/* Stage 3 — compose the message.

   Tries Claude first, falls back to a template. Either way the result passes
   through the same safety net so a draft can never go out with an unfilled
   placeholder or a missing opt-out line. */

import { loadProfile } from '../config.js';
import { log } from '../logger.js';
import { draftEmail, isAiEnabled } from './ai.js';
import { buildVars, renderTemplate } from './templates.js';
import { daysBetween } from '../util.js';

export const OPT_OUT_LINE =
  "P.S. If you'd rather not hear from me again, reply with \"stop\" and I won't follow up.";

/** Catch anything that must never reach a real inbox. */
export function validateDraft(draft) {
  const problems = [];
  const { subject = '', body = '' } = draft || {};

  if (!subject.trim()) problems.push('empty subject');
  if (!body.trim()) problems.push('empty body');
  if (subject.length > 140) problems.push('subject too long');
  if (body.length > 6000) problems.push('body too long');

  // An unrendered {{var}} or a leftover [Company] placeholder is the classic
  // mail-merge embarrassment. Refuse rather than send it.
  if (/\{\{|\}\}/.test(subject + body)) problems.push('unrendered template variable');
  if (/\[(company|name|role|your [a-z ]+)\]/i.test(subject + body)) problems.push('placeholder left in text');
  if (/\bundefined\b|\bnull\b|\bNaN\b/.test(body)) problems.push('undefined value in body');

  return { ok: problems.length === 0, problems };
}

function withOptOut(body) {
  return body.includes('reply with "stop"') || /\bstop\b.{0,24}\bfollow up\b/i.test(body)
    ? body
    : `${body.trimEnd()}\n\n${OPT_OUT_LINE}`;
}

/**
 * Compose an email for one contact.
 * @returns {Promise<{subject,body,personalizedBy,hook?,grounded?}>}
 */
export async function composeEmail({ company, contact, kind = 'initial', previous = null }) {
  const profile = loadProfile();
  const step = previous ? (previous.step || 0) + 1 : 0;
  const daysAgo = previous?.sent_at ? Math.max(1, Math.round(daysBetween(previous.sent_at))) : 7;

  let draft = null;
  if (isAiEnabled()) {
    draft = await draftEmail({ profile, company, contact, kind, previous, daysAgo });
  }

  if (draft) {
    const check = validateDraft(draft);
    if (!check.ok) {
      log.warn(`AI draft rejected for ${company.name} — using template`, { problems: check.problems });
      draft = null;
    }
  }

  if (!draft) {
    const vars = buildVars({ profile, company, contact, previous, step });
    // The last permitted nudge is softer and explicitly final.
    const templateKind =
      kind === 'followup' ? (step >= 2 ? 'followupFinal' : 'followup') : 'initial';
    draft = renderTemplate(templateKind, vars);

    const check = validateDraft(draft);
    if (!check.ok) throw new Error(`Template draft invalid: ${check.problems.join(', ')}`);
  }

  return { ...draft, body: withOptOut(draft.body), step, kind };
}
