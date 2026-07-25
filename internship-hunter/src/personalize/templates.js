/* Deterministic fallback templates.

   These run whenever the AI path is unavailable (no API key, API error, or a
   refusal). They are intentionally plain: a short, specific, honest note. The
   opt-out line is appended by the sender for every message, so it is not
   repeated here. */

/** Minimal {{var}} interpolation with dotted-path support. */
export function render(template, vars) {
  return String(template).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const value = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), vars);
    return value == null ? '' : String(value);
  });
}

export const TEMPLATES = {
  initial: {
    // Kept short deliberately — anything past ~60 chars is truncated in most
    // inbox list views, and the headline belongs in the body, not the subject.
    subject: '{{role}} — {{profile.name}}',
    body: `Hi{{greetingName}},

I'm {{profile.name}}, {{profile.shortBio}}. I came across {{company}}{{roleClause}} and wanted to reach out directly about internship opportunities on your team.

A little about what I bring:
{{highlightsBlock}}

I've attached my resume, and you can see my work at {{profile.portfolio}}. If there's an opening — now or later this year — I'd love to be considered. Happy to send code samples or do a short task if that's more useful than a CV.

Thanks for reading,
{{profile.name}}
{{profile.email}}{{linksLine}}`,
  },

  followup: {
    subject: 'Re: {{previousSubject}}',
    body: `Hi{{greetingName}},

Following up on my note from {{daysAgo}} days ago about internship opportunities at {{company}} — I know hiring inboxes get busy.

Still very interested, and still happy to do a short take-home or a quick call. {{sinceLine}}

If internships aren't something you're running right now, just say so and I'll stop following up.

Thanks,
{{profile.name}}
{{profile.email}}`,
  },

  followupFinal: {
    subject: 'Re: {{previousSubject}}',
    body: `Hi{{greetingName}},

Last note from me on this — I don't want to clutter your inbox.

If {{company}} opens up an internship or entry-level engineering role later on, my details are below and I'd genuinely appreciate being kept in mind. My resume is attached again for convenience.

Either way, thanks for your time.

{{profile.name}}
{{profile.email}}{{linksLine}}`,
  },
};

/** Shared variable bag used by both the template and AI paths. */
export function buildVars({ profile, company, contact, previous, step = 0 }) {
  const highlights = (profile.highlights || []).slice(0, 4);
  const links = [profile.github, profile.linkedin].filter(Boolean);

  return {
    profile,
    company: company.name,
    role: company.role_title || 'Software Engineering Internship',
    roleClause: company.role_title ? ` and your ${company.role_title} posting` : '',
    // A first name only if we actually have one — never a fake "Hi there,".
    greetingName: contact?.name ? ` ${String(contact.name).split(' ')[0]}` : '',
    highlightsBlock: highlights.map((h) => `• ${h}`).join('\n'),
    linksLine: links.length ? `\n${links.join(' · ')}` : '',
    previousSubject: previous?.subject?.replace(/^Re:\s*/i, '') || 'Internship opportunities',
    daysAgo: previous?.sent_at
      ? Math.max(1, Math.round((Date.now() - new Date(previous.sent_at)) / 86_400_000))
      : 7,
    sinceLine: (profile.recentWins || [])[0]
      ? `Since I wrote, ${profile.recentWins[0]}.`
      : '',
    step,
  };
}

export function renderTemplate(kind, vars) {
  const t = TEMPLATES[kind] || TEMPLATES.initial;
  return {
    subject: render(t.subject, vars).trim(),
    body: render(t.body, vars).trim(),
    personalizedBy: 'template',
  };
}
