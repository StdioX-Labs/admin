import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/** Mirrors the payload signed by /api/events/[id]/report — keep the two in step. */
export interface CertifiedReport {
  reference: string;
  issuedAt: string;
  issuedBy: string;
  event: {
    eventId: number;
    eventName: string;
    eventLocation: string;
    eventStartDate: string;
    eventEndDate: string;
    status: string;
    companyId: number;
    companyName: string;
    currency: string;
  };
  performance: {
    ticketTypes: number;
    ticketsIssued: number;
    ticketsPaid: number;
    ticketsComplimentary: number;
    grossRevenue: number;
    commissionRate: number;
    platformFee: number;
    netToOrganiser: number;
  };
  lines: Array<{
    ticketId: number;
    ticketName: string;
    unitPrice: number;
    ticketsIssued: number;
    ticketsPaid: number;
    ticketsComplimentary: number;
    revenue: number;
    allocated: number;
    remaining: number;
  }>;
}

export interface ReportCertificate {
  algorithm: string;
  keyId: string;
  payloadHash: string;
  signature: string;
  signedAt: string;
}

const INK = [32, 30, 29] as const;
const CLAY = [198, 113, 57] as const;
const MUTED = [120, 112, 102] as const;

const money = (n: number, ccy: string) =>
  `${ccy} ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const when = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
};

export function reportFileStem(report: CertifiedReport) {
  const slug = report.event.eventName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `${report.reference}-${slug || 'event'}`;
}

/**
 * The certified PDF.
 *
 * The signature block is the reason this document exists, so it is printed in
 * full — algorithm, key id, payload hash and the signature itself — along with
 * the address that will check it. A recipient who cannot verify the document
 * has only a nicely typeset claim.
 */
export function buildReportPdf(
  report: CertifiedReport,
  certificate: ReportCertificate,
  verifyUrl: string
): Blob {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const page = doc.internal.pageSize;
  const M = 48;
  let y = M;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...INK);
  doc.text('Certified Event Performance Report', M, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('SoldOutAfrica — issued from the admin console', M, y);
  y += 22;

  doc.setDrawColor(...CLAY);
  doc.setLineWidth(1.5);
  doc.line(M, y, page.getWidth() - M, y);
  y += 22;

  const meta: Array<[string, string]> = [
    ['Reference', report.reference],
    ['Event', `${report.event.eventName}  (#${report.event.eventId})`],
    ['Organiser', report.event.companyName || '—'],
    ['Location', report.event.eventLocation || '—'],
    ['Runs', `${when(report.event.eventStartDate)} to ${when(report.event.eventEndDate)}`],
    ['Status', report.event.status || '—'],
    ['Issued', `${when(report.issuedAt)} by ${report.issuedBy}`],
  ];
  doc.setFontSize(9.5);
  for (const [label, value] of meta) {
    doc.setTextColor(...MUTED);
    doc.text(label, M, y);
    doc.setTextColor(...INK);
    doc.text(String(value), M + 92, y, { maxWidth: page.getWidth() - M * 2 - 92 });
    y += 15;
  }
  y += 10;

  const ccy = report.event.currency || 'KES';
  autoTable(doc, {
    startY: y,
    head: [['Ticket tier', 'Unit price', 'Allocated', 'Paid', 'Comp', 'Issued', 'Revenue']],
    body: report.lines.map((l) => [
      l.ticketName,
      money(l.unitPrice, ccy),
      String(l.allocated),
      String(l.ticketsPaid),
      String(l.ticketsComplimentary),
      String(l.ticketsIssued),
      money(l.revenue, ccy),
    ]),
    foot: [[
      'Total',
      '',
      '',
      String(report.performance.ticketsPaid),
      String(report.performance.ticketsComplimentary),
      String(report.performance.ticketsIssued),
      money(report.performance.grossRevenue, ccy),
    ]],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 5, textColor: [...INK] },
    headStyles: { fillColor: [235, 221, 197], textColor: [...INK], fontStyle: 'bold' },
    footStyles: { fillColor: [245, 234, 216], textColor: [...INK], fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' },
      4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' },
    },
    margin: { left: M, right: M },
  });

  // @ts-expect-error autoTable records its finishing position on the document
  y = (doc.lastAutoTable?.finalY ?? y) + 26;

  const settle: Array<[string, string]> = [
    [
      'Tickets issued',
      `${report.performance.ticketsIssued} (${report.performance.ticketsPaid} paid, ` +
        `${report.performance.ticketsComplimentary} complimentary)`,
    ],
    ['Gross revenue', money(report.performance.grossRevenue, ccy)],
    [`Platform commission (${report.performance.commissionRate}%)`, `- ${money(report.performance.platformFee, ccy)}`],
    ['Net to organiser', money(report.performance.netToOrganiser, ccy)],
  ];
  doc.setFontSize(10);
  for (const [label, value] of settle) {
    const last = label === 'Net to organiser';
    doc.setFont('helvetica', last ? 'bold' : 'normal');
    const tone = last ? INK : MUTED;
    doc.setTextColor(tone[0], tone[1], tone[2]);
    doc.text(label, page.getWidth() - M - 300, y);
    doc.setTextColor(...INK);
    doc.text(value, page.getWidth() - M, y, { align: 'right' });
    y += 17;
  }
  y += 16;

  if (y > page.getHeight() - 190) { doc.addPage(); y = M; }

  doc.setDrawColor(210, 203, 191);
  doc.setLineWidth(0.8);
  doc.line(M, y, page.getWidth() - M, y);
  y += 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text('Digital signature', M, y);
  y += 15;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    'These figures were read from the platform and signed on the server. Any alteration to this ' +
      'document invalidates the signature below.',
    M, y, { maxWidth: page.getWidth() - M * 2 }
  );
  y += 22;

  const sig: Array<[string, string]> = [
    ['Algorithm', certificate.algorithm],
    ['Key ID', certificate.keyId],
    ['Signed at', when(certificate.signedAt)],
    ['Payload SHA-256', certificate.payloadHash],
    ['Signature', certificate.signature],
  ];
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  for (const [label, value] of sig) {
    doc.setTextColor(...MUTED);
    doc.text(label, M, y);
    doc.setTextColor(...INK);
    const wrapped = doc.splitTextToSize(String(value), page.getWidth() - M * 2 - 92);
    doc.text(wrapped, M + 92, y);
    y += 11 * wrapped.length + 3;
  }
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Verify at ${verifyUrl}`, M, y, { maxWidth: page.getWidth() - M * 2 });

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`${report.reference}   ·   page ${i} of ${total}`, M, page.getHeight() - 24);
  }

  return doc.output('blob');
}

/** The same numbers as a spreadsheet, with the certificate in the header rows so the file stays self-describing. */
export function buildReportCsv(report: CertifiedReport, certificate: ReportCertificate): Blob {
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const row = (...cells: unknown[]) => cells.map(esc).join(',');
  const ccy = report.event.currency || 'KES';

  const out = [
    row('Certified Event Performance Report'),
    row('Reference', report.reference),
    row('Event', report.event.eventName, `#${report.event.eventId}`),
    row('Organiser', report.event.companyName),
    row('Location', report.event.eventLocation),
    row('Runs', report.event.eventStartDate, report.event.eventEndDate),
    row('Issued at', report.issuedAt),
    row('Issued by', report.issuedBy),
    row('Currency', ccy),
    row(),
    row('Ticket tier', 'Unit price', 'Allocated', 'Paid', 'Complimentary', 'Issued', 'Remaining', 'Revenue'),
    ...report.lines.map((l) =>
      row(l.ticketName, l.unitPrice, l.allocated, l.ticketsPaid, l.ticketsComplimentary,
          l.ticketsIssued, l.remaining, l.revenue)
    ),
    row('Total', '', '', report.performance.ticketsPaid, report.performance.ticketsComplimentary,
        report.performance.ticketsIssued, '', report.performance.grossRevenue),
    row(),
    row('Tickets issued', report.performance.ticketsIssued),
    row('  of which paid', report.performance.ticketsPaid),
    row('  of which complimentary', report.performance.ticketsComplimentary),
    row('Gross revenue', report.performance.grossRevenue),
    row('Commission rate (%)', report.performance.commissionRate),
    row('Platform fee', report.performance.platformFee),
    row('Net to organiser', report.performance.netToOrganiser),
    row(),
    row('Signature algorithm', certificate.algorithm),
    row('Key ID', certificate.keyId),
    row('Signed at', certificate.signedAt),
    row('Payload SHA-256', certificate.payloadHash),
    row('Signature', certificate.signature),
  ].join('\r\n');

  return new Blob(['﻿' + out], { type: 'text/csv;charset=utf-8' });
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
