import { description } from './products';

export interface DeliveryNote {
  receiver: string;
  date: string;
  temperature: number | undefined;
  items: { product: string; quantity: number }[];
}

export function noteTotal(note: DeliveryNote) {
  return note.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
}

const danishDate = new Intl.DateTimeFormat('da-DK', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatDate(date: string) {
  const parts = Object.fromEntries(
    danishDate.formatToParts(new Date(date)).map((part) => [part.type, part.value]),
  );
  const month = parts['month'].replace('.', '');
  return `${parts['day']} ${month[0].toUpperCase()}${month.slice(1)} ${parts['year']}`;
}

const PAGE_HEIGHT = 841.89;
const LEFT = 56;
const RIGHT = 539;
const VALUE_X = 230;
const GRAY = 0.45;

const winAnsi: Record<string, string> = {
  '€': '\x80', '‘': '\x91', '’': '\x92', '“': '\x93', '”': '\x94', '–': '\x96', '—': '\x97',
};

const measure = document.createElement('canvas').getContext('2d')!;

function textWidth(text: string, size: number, bold: boolean) {
  measure.font = `${bold ? 'bold ' : ''}100px "Times New Roman", Times, serif`;
  return (measure.measureText(text).width * size) / 100;
}

function wrap(text: string, size: number, maxWidth: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.trim().split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && textWidth(next, size, false) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  return [...lines, line];
}

class Page {
  private ops: string[] = [];

  text(
    text: string,
    x: number,
    y: number,
    size: number,
    { bold = false, align = 'left', color = 0 }: { bold?: boolean; align?: 'left' | 'right'; color?: number } = {},
  ) {
    if (align === 'right') x -= textWidth(text, size, bold);
    const encoded = text
      .replace(/./gu, (c) => winAnsi[c] ?? (c.charCodeAt(0) > 0xff ? '?' : c))
      .replace(/[\\()]/g, '\\$&');
    this.ops.push(
      `BT ${color} g /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${PAGE_HEIGHT - y} Td (${encoded}) Tj ET`,
    );
  }

  line(y: number, lineWidth = 0.5, color = 0.75) {
    this.ops.push(`${lineWidth} w ${color} G ${LEFT} ${PAGE_HEIGHT - y} m ${RIGHT} ${PAGE_HEIGHT - y} l S`);
  }

  band(y: number, height: number) {
    this.ops.push(`0.93 g ${LEFT} ${PAGE_HEIGHT - y - height} ${RIGHT - LEFT} ${height} re f`);
  }

  toPdf(autoPrint: boolean) {
    const content = this.ops.join('\n');
    const objects = [
      `<< /Type /Catalog /Pages 2 0 R ${autoPrint ? '/OpenAction 7 0 R' : ''} >>`,
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 ${PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>',
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
      '<< /S /JavaScript /JS (this.print();) >>',
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = objects.map((object, i) => {
      const offset = pdf.length;
      pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
      return offset;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([Uint8Array.from(pdf, (c) => c.charCodeAt(0))], { type: 'application/pdf' });
  }
}

export function deliveryNotePdf(note: DeliveryNote, autoPrint = false) {
  const page = new Page();

  page.text('Følgeseddel', LEFT, 82, 26, { bold: true });
  page.text('Delivery Note', LEFT, 104, 14, { color: GRAY });

  page.text('The Mo Mo', RIGHT, 74, 14, { bold: true, align: 'right' });
  page.text('Farverland 4, 2600 Glostrup', RIGHT, 90, 11, { align: 'right' });
  page.text('CVR. Nr.: 43319229', RIGHT, 104, 11, { align: 'right' });
  page.line(124, 1.2, 0);

  let y = 158;
  const field = (label: string, value: string, bold = false) => {
    page.text(label, LEFT, y, 11, { color: GRAY });
    page.text(value, VALUE_X, y, 11, { bold });
    y += 22;
  };
  field('Modtager / Receiver:', note.receiver, true);
  field('Dato / Date:', formatDate(note.date));
  field('Udkørsel temperatur:', `${note.temperature}°`);

  y += 10;
  page.text('Produktbeskrivelse / Description of the product', LEFT, y, 11, { bold: true });
  y += 18;
  for (const line of wrap(description(note), 11, RIGHT - LEFT)) {
    page.text(line, LEFT, y, 11);
    y += 15;
  }

  y += 20;
  page.band(y, 24);
  page.text('Produkt / Product', LEFT + 10, y + 16, 11, { bold: true });
  page.text('Antal / Quantity', RIGHT - 10, y + 16, 11, { bold: true, align: 'right' });
  y += 24;

  for (const item of note.items) {
    page.text(item.product, LEFT + 10, y + 16, 11);
    page.text(`${item.quantity || 0} stk.`, RIGHT - 10, y + 16, 11, { align: 'right' });
    y += 24;
    page.line(y);
  }

  page.line(y, 1.2, 0);
  page.text('Total', LEFT + 10, y + 18, 12, { bold: true });
  page.text(`${noteTotal(note)} stk.`, RIGHT - 10, y + 18, 12, { bold: true, align: 'right' });

  return page.toPdf(autoPrint);
}
