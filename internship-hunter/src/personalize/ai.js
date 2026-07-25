/* AI-written outreach, via the Anthropic Messages API.

   Two design choices worth noting:
     - Structured output (`output_config.format`) so we get a subject and body
       as separate typed fields instead of parsing prose.
     - The system prompt is stable across every company in a run and carries a
       cache breakpoint, so a 25-email batch pays for the profile once. */

import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { log } from '../logger.js';
import { truncate } from '../util.js';

let client = null;
function getClient() {
  if (!config.anthropic.apiKey) return null;
  if (!client) client = new Anthropic({ apiKey: config.anthropic.apiKey });
  return client;
}

export const isAiEnabled = () => Boolean(config.anthropic.apiKey);

const EMAIL_SCHEMA = {
  type: 'object',
  properties: {
    subject: { type: 'string', description: 'Email subject line, under 70 characters, no emoji.' },
    body: {
      type: 'string',
      description:
        'Plain-text email body including greeting and sign-off. No markdown, no placeholders, no subject line.',
    },
    hook: {
      type: 'string',
      description: 'The single specific detail about this company the email is built around.',
    },
    grounded: {
      type: 'boolean',
      description: 'True only if the hook is drawn from the supplied company context rather than assumed.',
    },
  },
  required: ['subject', 'body', 'hook', 'grounded'],
  additionalProperties: false,
};

function systemPrompt(profile) {
  return `You write short, specific internship outreach emails on behalf of one candidate. You are writing as the candidate, in first person.

CANDIDATE
Name: ${profile.name}
Headline: ${profile.headline}
Bio: ${profile.shortBio}
Education: ${profile.education || 'not specified'}
Skills: ${(profile.skills || []).join(', ')}
Highlights:
${(profile.highlights || []).map((h) => `- ${h}`).join('\n')}
Target roles: ${(profile.targetRoles || []).join(', ')}
Portfolio: ${profile.portfolio || 'n/a'}
GitHub: ${profile.github || 'n/a'}
LinkedIn: ${profile.linkedin || 'n/a'}
Email: ${profile.email}
Availability: ${profile.availability || 'not specified'}
Location: ${profile.location || 'not specified'}

RULES
1. Never invent facts. Only use the candidate details above and the company context supplied in the user turn. If you have no real detail about the company, write a straightforward note and set "grounded" to false — do not fabricate admiration for a product you were told nothing about.
2. 110-170 words in the body. Short paragraphs. No bullet lists longer than three items.
3. Open with why this company specifically, using one concrete detail. That detail is your "hook".
4. Say plainly that the candidate is looking for an internship, and that a resume is attached.
5. Plain text only — no markdown, no headers, no signature block art, no emoji, no tracking language.
6. Sound like a capable student writing to a person: direct, warm, not servile. No "I hope this email finds you well", no "I am writing to express my keen interest", no superlatives about the company.
7. Include exactly one clear, low-friction ask (a short call, or a take-home task).
8. Sign off with the candidate's name and email only. Do not add an unsubscribe line — the sending system appends one.
9. Subject line: specific and human, under 70 characters. Not clickbait, not all-lowercase-cutesy, no "Re:" on a first email.`;
}

function userPrompt({ company, contact, kind, previous, daysAgo }) {
  const lines = [
    `COMPANY: ${company.name}`,
    company.domain ? `WEBSITE: ${company.domain}` : null,
    company.role_title ? `OPEN ROLE THEY POSTED: ${company.role_title}` : null,
    company.role_url ? `ROLE LINK: ${company.role_url}` : null,
    company.location ? `LOCATION: ${company.location}` : null,
    company.company_description || company.description
      ? `WHAT THEY DO (from their job posting, may be partial):\n${truncate(
          company.company_description || company.description,
          900,
        )}`
      : 'WHAT THEY DO: unknown — no description was available.',
    '',
    `RECIPIENT: ${
      contact?.name
        ? `${contact.name}${contact.title ? `, ${contact.title}` : ''}`
        : contact?.role_based
          ? 'a shared hiring inbox (no individual name known — do not invent one, and do not write "Dear Hiring Manager" more than once)'
          : 'unknown individual (no name known — open without a name rather than guessing)'
    }`,
  ].filter(Boolean);

  if (kind === 'followup') {
    lines.push(
      '',
      `TASK: Write follow-up #${(previous?.step || 0) + 1}. The previous email was sent ${daysAgo} days ago and got no reply.`,
      `PREVIOUS SUBJECT: ${previous?.subject || 'Internship opportunities'}`,
      `PREVIOUS BODY:\n${truncate(previous?.body || '', 700)}`,
      '',
      'Keep it under 90 words. Do not repeat the original pitch — add one new angle or a concrete offer. Be graceful about the silence and make it easy to say no. Subject must start with "Re: " followed by the previous subject.',
    );
  } else {
    lines.push('', 'TASK: Write the first outreach email.');
  }

  return lines.join('\n');
}

/**
 * Draft one email. Returns null on any failure so the caller can fall back to
 * a template — a failed API call must never block the pipeline.
 */
export async function draftEmail({ profile, company, contact, kind = 'initial', previous = null, daysAgo = 7 }) {
  const anthropic = getClient();
  if (!anthropic) return null;

  try {
    const response = await anthropic.messages.create({
      model: config.anthropic.model,
      max_tokens: config.anthropic.maxTokens,
      system: [
        {
          type: 'text',
          text: systemPrompt(profile),
          // Stable across the whole batch — cache it once, read it 24 more times.
          cache_control: { type: 'ephemeral' },
        },
      ],
      output_config: {
        effort: config.anthropic.effort,
        format: { type: 'json_schema', schema: EMAIL_SCHEMA },
      },
      messages: [{ role: 'user', content: userPrompt({ company, contact, kind, previous, daysAgo }) }],
    });

    if (response.stop_reason === 'refusal') {
      log.warn(`Model declined to draft for ${company.name}`, {
        category: response.stop_details?.category ?? null,
      });
      return null;
    }
    if (response.stop_reason === 'max_tokens') {
      log.warn(`Draft for ${company.name} hit max_tokens — falling back to template`);
      return null;
    }

    const text = response.content.find((b) => b.type === 'text')?.text;
    if (!text) return null;

    const draft = JSON.parse(text);
    if (!draft.subject?.trim() || !draft.body?.trim()) return null;

    log.debug(`Drafted for ${company.name}`, {
      hook: truncate(draft.hook, 80),
      grounded: draft.grounded,
      cacheRead: response.usage?.cache_read_input_tokens ?? 0,
      out: response.usage?.output_tokens ?? 0,
    });

    return {
      subject: draft.subject.trim(),
      body: draft.body.trim(),
      hook: draft.hook || null,
      grounded: draft.grounded !== false,
      personalizedBy: 'ai',
    };
  } catch (err) {
    log.warn(`AI draft failed for ${company.name} — using template`, { error: err.message });
    return null;
  }
}
