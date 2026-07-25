/* Excel tracker export.

   Four sheets: a per-application tracker (the thing you actually keep open
   during a job search), plus companies, contacts, and a summary. */

import path from 'node:path';
import ExcelJS from 'exceljs';
import { paths } from '../config.js';
import { log } from '../logger.js';
import { db, stats } from '../db.js';

const ACCENT = 'FFE8C547'; // matches the portfolio's gold
const INK = 'FF141414';

function styleHeader(sheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true, color: { argb: INK }, size: 11 };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT } };
  row.alignment = { vertical: 'middle' };
  row.height = 22;
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
}

const STATUS_COLORS = {
  sent: 'FFE8F4FD',
  replied: 'FFE6F7E9',
  failed: 'FFFDECEA',
  queued: 'FFFFF8E1',
};

/**
 * Write the tracker workbook.
 * @returns {Promise<string>} absolute path to the file
 */
export async function exportTracker(outFile) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Internship Hunter';
  wb.created = new Date();

  /* ------------------------------ Tracker ------------------------------ */
  const tracker = wb.addWorksheet('Tracker');
  tracker.columns = [
    { header: 'Company', key: 'company', width: 26 },
    { header: 'Role', key: 'role', width: 30 },
    { header: 'Contact', key: 'contact', width: 28 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Type', key: 'kind', width: 11 },
    { header: 'Subject', key: 'subject', width: 44 },
    { header: 'Sent', key: 'sent_at', width: 18 },
    { header: 'Replied', key: 'replied_at', width: 18 },
    { header: 'Written by', key: 'personalized_by', width: 11 },
    { header: 'Role link', key: 'role_url', width: 34 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];

  const rows = db
    .prepare(
      `SELECT c.name AS company, c.role_title AS role, c.role_url, c.notes,
              ct.name AS contact, ct.email,
              o.status, o.kind, o.subject, o.sent_at, o.replied_at, o.personalized_by
       FROM outreach o
       JOIN contacts  ct ON ct.id = o.contact_id
       JOIN companies c  ON c.id  = o.company_id
       ORDER BY COALESCE(o.sent_at, o.queued_at) DESC`,
    )
    .all();

  for (const r of rows) {
    const row = tracker.addRow({
      ...r,
      contact: r.contact || '(shared inbox)',
      sent_at: r.sent_at ? new Date(r.sent_at) : null,
      replied_at: r.replied_at ? new Date(r.replied_at) : null,
    });
    const color = STATUS_COLORS[r.status];
    if (color) {
      row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    }
    for (const key of ['sent_at', 'replied_at']) {
      row.getCell(key).numFmt = 'yyyy-mm-dd hh:mm';
    }
  }
  styleHeader(tracker);

  /* ----------------------------- Companies ----------------------------- */
  const comp = wb.addWorksheet('Companies');
  comp.columns = [
    { header: 'Company', key: 'name', width: 26 },
    { header: 'Domain', key: 'domain', width: 26 },
    { header: 'Role seen', key: 'role_title', width: 30 },
    { header: 'Location', key: 'location', width: 22 },
    { header: 'Fit score', key: 'score', width: 10 },
    { header: 'Status', key: 'status', width: 13 },
    { header: 'Contacts', key: 'contact_count', width: 10 },
    { header: 'Emails sent', key: 'sent_count', width: 12 },
    { header: 'Source', key: 'source', width: 12 },
    { header: 'Found', key: 'created_at', width: 18 },
  ];
  for (const c of db
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM contacts ct WHERE ct.company_id = c.id) AS contact_count,
              (SELECT COUNT(*) FROM outreach o WHERE o.company_id = c.id AND o.status IN ('sent','replied')) AS sent_count
       FROM companies c ORDER BY c.score DESC`,
    )
    .all()) {
    const row = comp.addRow({ ...c, created_at: new Date(c.created_at) });
    row.getCell('created_at').numFmt = 'yyyy-mm-dd';
    row.getCell('score').numFmt = '0.00';
  }
  styleHeader(comp);

  /* ------------------------------ Contacts ----------------------------- */
  const cont = wb.addWorksheet('Contacts');
  cont.columns = [
    { header: 'Email', key: 'email', width: 32 },
    { header: 'Name', key: 'name', width: 22 },
    { header: 'Company', key: 'company', width: 26 },
    { header: 'Confidence', key: 'confidence', width: 11 },
    { header: 'MX verified', key: 'verified', width: 12 },
    { header: 'Shared inbox', key: 'role_based', width: 13 },
    { header: 'Source', key: 'source', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
  ];
  for (const c of db
    .prepare(
      `SELECT ct.*, co.name AS company FROM contacts ct
       JOIN companies co ON co.id = ct.company_id
       ORDER BY ct.confidence DESC`,
    )
    .all()) {
    const row = cont.addRow({
      ...c,
      verified: c.verified ? 'yes' : 'no',
      role_based: c.role_based ? 'yes' : 'no',
    });
    row.getCell('confidence').numFmt = '0.00';
  }
  styleHeader(cont);

  /* ------------------------------ Summary ------------------------------ */
  const s = stats();
  const sum = wb.addWorksheet('Summary');
  sum.columns = [
    { header: 'Metric', key: 'k', width: 30 },
    { header: 'Value', key: 'v', width: 16 },
  ];
  const entries = [
    ['Companies discovered', s.companies],
    ['Companies with a contact', s.companiesWithContacts],
    ['Contacts found', s.contacts],
    ['— MX verified', s.verifiedContacts],
    ['Emails queued', s.queued],
    ['Emails sent', s.sent],
    ['— follow-ups', s.followUpsSent],
    ['Replies', s.replied],
    ['Reply rate (%)', s.replyRate],
    ['Failed / bounced', s.failed],
    ['Suppressed addresses', s.suppressed],
    ['Exported', new Date().toISOString().slice(0, 16).replace('T', ' ')],
  ];
  entries.forEach(([k, v]) => sum.addRow({ k, v }));
  styleHeader(sum);
  sum.getColumn('k').font = { bold: false };

  const file = outFile || path.join(paths.exports, `internship-tracker-${new Date().toISOString().slice(0, 10)}.xlsx`);
  await wb.xlsx.writeFile(file);
  log.ok(`Tracker exported → ${file}`, { rows: rows.length });
  return file;
}
