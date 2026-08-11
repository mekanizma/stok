import * as XLSX from 'xlsx';
import { unzipSync, strFromU8 } from 'fflate';
import { repairTurkishName } from '@/lib/turkishNames';

export type ZimmetImportRow = {
  assignee_name: string;
  email: string;
  name: string;
  asset_tag: string;
  serial: string;
  model: string;
  category: string;
  manufacturer: string;
  location: string;
  notes: string;
  rowNumber: number;
};

export type ZimmetField = keyof Omit<ZimmetImportRow, 'rowNumber'>;

const HEADER_MAP: Record<string, ZimmetField> = {
  'ad soyad': 'assignee_name',
  adsoyad: 'assignee_name',
  assignee_name: 'assignee_name',
  assignee: 'assignee_name',
  full_name: 'assignee_name',
  'full name': 'assignee_name',
  name_surname: 'assignee_name',
  zimmetlenen: 'assignee_name',
  'zimmeti alan': 'assignee_name',
  kisi: 'assignee_name',
  kişi: 'assignee_name',
  person: 'assignee_name',
  kullanici: 'assignee_name',
  kullanıcı: 'assignee_name',
  user: 'assignee_name',

  email: 'email',
  'e-posta': 'email',
  eposta: 'email',
  mail: 'email',
  'e mail': 'email',

  'demirbaş adı': 'name',
  'demirbas adi': 'name',
  demirbas: 'name',
  demirbaş: 'name',
  asset_name: 'name',
  'asset name': 'name',
  cihaz: 'name',
  name: 'name',
  ürün: 'name',
  urun: 'name',
  product: 'name',
  cihazadi: 'name',
  'cihaz adı': 'name',

  etiket: 'asset_tag',
  asset_tag: 'asset_tag',
  'asset tag': 'asset_tag',
  tag: 'asset_tag',
  barkod: 'asset_tag',
  barcode: 'asset_tag',

  'seri no': 'serial',
  serino: 'serial',
  serial: 'serial',
  'serial number': 'serial',
  seri: 'serial',
  sn: 'serial',

  model: 'model',

  kategori: 'category',
  category: 'category',

  üretici: 'manufacturer',
  uretici: 'manufacturer',
  manufacturer: 'manufacturer',
  marka: 'manufacturer',
  brand: 'manufacturer',

  lokasyon: 'location',
  konum: 'location',
  location: 'location',
  yer: 'location',

  notlar: 'notes',
  notes: 'notes',
  not: 'notes',
  aciklama: 'notes',
  açıklama: 'notes',
  description: 'notes',
};

function normalizeHeader(h: string) {
  return h
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function mapHeader(h: string): ZimmetField | undefined {
  const n = normalizeHeader(h);
  if (HEADER_MAP[n]) return HEADER_MAP[n];
  const compact = n.replace(/\s+/g, '');
  for (const [key, field] of Object.entries(HEADER_MAP)) {
    if (key.replace(/\s+/g, '') === compact) return field;
  }
  return undefined;
}

function emptyRow(rowNumber: number): ZimmetImportRow {
  return {
    assignee_name: '',
    email: '',
    name: '',
    asset_tag: '',
    serial: '',
    model: '',
    category: '',
    manufacturer: '',
    location: '',
    notes: '',
    rowNumber,
  };
}

function hasAnyValue(row: Omit<ZimmetImportRow, 'rowNumber'>) {
  return Object.values(row).some((v) => String(v || '').trim().length > 0);
}

function rowFromRecord(rec: Partial<Record<ZimmetField, string>>, rowNumber: number): ZimmetImportRow | null {
  const row = emptyRow(rowNumber);
  (Object.keys(row) as Array<keyof ZimmetImportRow>).forEach((k) => {
    if (k === 'rowNumber') return;
    const v = rec[k];
    if (v != null) row[k] = String(v).trim();
  });
  return hasAnyValue(row) ? row : null;
}

function detectDelimiter(line: string) {
  const commas = (line.match(/,/g) || []).length;
  const semis = (line.match(/;/g) || []).length;
  const tabs = (line.match(/\t/g) || []).length;
  if (tabs > commas && tabs > semis) return '\t';
  return semis > commas ? ';' : ',';
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function rowsFromMatrix(matrix: string[][]): ZimmetImportRow[] {
  if (!matrix.length) return [];

  let headerIdx = -1;
  let fieldIndexes: Partial<Record<ZimmetField, number>> = {};

  for (let i = 0; i < Math.min(matrix.length, 20); i++) {
    const mapped: Partial<Record<ZimmetField, number>> = {};
    matrix[i].forEach((cell, idx) => {
      const key = mapHeader(cell || '');
      if (key && mapped[key] === undefined) mapped[key] = idx;
    });
    if (Object.keys(mapped).length >= 1) {
      headerIdx = i;
      fieldIndexes = mapped;
      break;
    }
  }

  const rows: ZimmetImportRow[] = [];

  if (headerIdx >= 0) {
    for (let i = headerIdx + 1; i < matrix.length; i++) {
      const cols = matrix[i];
      if (!cols.some((c) => String(c || '').trim())) continue;
      const rec: Partial<Record<ZimmetField, string>> = {};
      (Object.entries(fieldIndexes) as Array<[ZimmetField, number]>).forEach(([key, idx]) => {
        rec[key] = String(cols[idx] ?? '').trim();
      });
      const row = rowFromRecord(rec, i + 1);
      if (row) rows.push(row);
    }
    return rows;
  }

  // No recognizable headers — treat as key/value pairs (label | value) per row
  const kv: Partial<Record<ZimmetField, string>> = {};
  for (let i = 0; i < matrix.length; i++) {
    const cols = matrix[i].map((c) => String(c || '').trim()).filter(Boolean);
    if (cols.length < 2) continue;
    const key = mapHeader(cols[0]);
    if (key && !kv[key]) kv[key] = cols.slice(1).join(' ');
  }
  const single = rowFromRecord(kv, 1);
  return single ? [single] : [];
}

export function parseZimmetCsv(text: string): { rows: ZimmetImportRow[]; errors: string[] } {
  const cleaned = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!cleaned) return { rows: [], errors: ['empty'] };

  const lines = cleaned.split('\n').filter((l) => l.trim().length > 0);
  if (!lines.length) return { rows: [], errors: ['no_data'] };

  const delimiter = detectDelimiter(lines[0]);
  const matrix = lines.map((l) => splitCsvLine(l, delimiter));
  const rows = rowsFromMatrix(matrix);
  return { rows, errors: rows.length ? [] : ['no_data'] };
}

function parseZimmetExcel(buffer: ArrayBuffer): { rows: ZimmetImportRow[]; errors: string[] } {
  try {
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return { rows: [], errors: ['no_data'] };
    const sheet = wb.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    }) as string[][];
    const rows = rowsFromMatrix(matrix.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? '')) : [])));
    return { rows, errors: rows.length ? [] : ['no_data'] };
  } catch {
    return { rows: [], errors: ['empty'] };
  }
}

function textContent(el: Element | null): string {
  return (el?.textContent || '').replace(/\s+/g, ' ').trim();
}

function parseZimmetXml(text: string): { rows: ZimmetImportRow[]; errors: string[] } {
  const cleaned = text.replace(/^\uFEFF/, '').trim();
  if (!cleaned) return { rows: [], errors: ['empty'] };

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(cleaned, 'application/xml');
  } catch {
    return { rows: [], errors: ['empty'] };
  }
  if (doc.querySelector('parsererror')) return { rows: [], errors: ['empty'] };

  const rows: ZimmetImportRow[] = [];

  // SpreadsheetML / Excel XML: ss:Row / Row with Cell/Data
  const ssRows = Array.from(doc.getElementsByTagName('*')).filter(
    (el) => el.localName.toLowerCase() === 'row',
  );
  if (ssRows.length >= 1) {
    const matrix: string[][] = ssRows.map((rowEl) => {
      const cells = Array.from(rowEl.children).filter((c) => c.localName.toLowerCase() === 'cell');
      if (cells.length) {
        return cells.map((cell) => {
          const data = Array.from(cell.children).find((c) => c.localName.toLowerCase() === 'data');
          return textContent(data || cell);
        });
      }
      return Array.from(rowEl.children).map((c) => textContent(c));
    });
    const parsed = rowsFromMatrix(matrix);
    if (parsed.length) return { rows: parsed, errors: [] };
  }

  // Repeating record elements with child fields
  const all = Array.from(doc.getElementsByTagName('*'));
  const candidates = all.filter((el) => {
    if (!el.children.length) return false;
    let mapped = 0;
    Array.from(el.children).forEach((child) => {
      if (mapHeader(child.localName) || mapHeader(child.tagName)) mapped++;
    });
    Array.from(el.attributes).forEach((attr) => {
      if (mapHeader(attr.name)) mapped++;
    });
    return mapped >= 1;
  });

  // Prefer deepest/most specific repeating siblings
  const byParent = new Map<Element | null, Element[]>();
  candidates.forEach((el) => {
    const p = el.parentElement;
    const list = byParent.get(p) || [];
    list.push(el);
    byParent.set(p, list);
  });

  let bestGroup: Element[] = [];
  byParent.forEach((list) => {
    if (list.length > bestGroup.length) bestGroup = list;
  });

  if (bestGroup.length) {
    bestGroup.forEach((el, idx) => {
      const rec: Partial<Record<ZimmetField, string>> = {};
      Array.from(el.children).forEach((child) => {
        const key = mapHeader(child.localName) || mapHeader(child.tagName);
        if (key && !rec[key]) rec[key] = textContent(child);
      });
      Array.from(el.attributes).forEach((attr) => {
        const key = mapHeader(attr.name);
        if (key && !rec[key]) rec[key] = attr.value.trim();
      });
      const row = rowFromRecord(rec, idx + 1);
      if (row) rows.push(row);
    });
    if (rows.length) return { rows, errors: [] };
  }

  // Flat key/value under root
  const root = doc.documentElement;
  const kv: Partial<Record<ZimmetField, string>> = {};
  Array.from(root.children).forEach((child) => {
    const key = mapHeader(child.localName) || mapHeader(child.tagName);
    if (key && !kv[key]) kv[key] = textContent(child);
  });
  Array.from(root.attributes).forEach((attr) => {
    const key = mapHeader(attr.name);
    if (key && !kv[key]) kv[key] = attr.value.trim();
  });
  const single = rowFromRecord(kv, 1);
  return single ? { rows: [single], errors: [] } : { rows: [], errors: ['no_data'] };
}

function parseDocxXml(xml: string): { rows: ZimmetImportRow[]; errors: string[] } {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(xml, 'application/xml');
  } catch {
    return { rows: [], errors: ['empty'] };
  }

  const tables = Array.from(doc.getElementsByTagName('w:tbl'));
  for (const table of tables) {
    const trs = Array.from(table.getElementsByTagName('w:tr'));
    const matrix: string[][] = trs.map((tr) =>
      Array.from(tr.getElementsByTagName('w:tc')).map((tc) =>
        Array.from(tc.getElementsByTagName('w:t'))
          .map((t) => t.textContent || '')
          .join('')
          .trim(),
      ),
    );
    const rows = rowsFromMatrix(matrix);
    if (rows.length) return { rows, errors: [] };
  }

  // Paragraphs: "Label: Value" or "Label — Value"
  const paras = Array.from(doc.getElementsByTagName('w:p')).map((p) =>
    Array.from(p.getElementsByTagName('w:t'))
      .map((t) => t.textContent || '')
      .join('')
      .trim(),
  ).filter(Boolean);

  const kv: Partial<Record<ZimmetField, string>> = {};
  for (const line of paras) {
    const m = line.match(/^(.{2,40}?)\s*[:：\-–—|=]\s*(.+)$/);
    if (!m) continue;
    const key = mapHeader(m[1]);
    if (key && !kv[key]) kv[key] = m[2].trim();
  }

  // Two-column pseudo table from consecutive label/value lines
  if (!Object.keys(kv).length) {
    for (let i = 0; i < paras.length - 1; i++) {
      const key = mapHeader(paras[i]);
      if (key && !kv[key] && !mapHeader(paras[i + 1])) {
        kv[key] = paras[i + 1];
        i++;
      }
    }
  }

  const single = rowFromRecord(kv, 1);
  return single ? { rows: [single], errors: [] } : { rows: [], errors: ['no_data'] };
}

function parseZimmetDocx(buffer: ArrayBuffer): { rows: ZimmetImportRow[]; errors: string[] } {
  try {
    const files = unzipSync(new Uint8Array(buffer));
    const entry = files['word/document.xml'];
    if (!entry) return { rows: [], errors: ['empty'] };
    const xml = strFromU8(entry);
    return parseDocxXml(xml);
  } catch {
    return { rows: [], errors: ['empty'] };
  }
}

export const ZIMMET_IMPORT_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.docx', '.xml'] as const;

export function isZimmetImportFile(name: string) {
  const lower = name.toLowerCase();
  return ZIMMET_IMPORT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function parseZimmetFile(file: File): Promise<{ rows: ZimmetImportRow[]; errors: string[] }> {
  const lower = file.name.toLowerCase();

  if (lower.endsWith('.csv')) {
    return parseZimmetCsv(await file.text());
  }
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return parseZimmetExcel(await file.arrayBuffer());
  }
  if (lower.endsWith('.docx')) {
    return parseZimmetDocx(await file.arrayBuffer());
  }
  if (lower.endsWith('.xml')) {
    return parseZimmetXml(await file.text());
  }
  return { rows: [], errors: ['unsupported'] };
}

/** Apply defaults so DB NOT NULL constraints never fail on partial imports. */
/** Apply defaults so DB NOT NULL constraints never fail on partial imports. */
export function withZimmetDefaults(row: ZimmetImportRow, labels?: { unnamedAsset?: string; unknownPerson?: string }) {
  const unnamed = labels?.unnamedAsset || 'Adsız Demirbaş';
  const unknown = labels?.unknownPerson || 'Belirtilmedi';
  const assignee = repairTurkishName(row.assignee_name) || unknown;
  const name = repairTurkishName(row.name) || assignee || unnamed;
  return {
    ...row,
    name,
    assignee_name: assignee,
    email: row.email.trim().toLowerCase(),
    serial: row.serial.trim(),
    asset_tag: row.asset_tag.trim(),
    model: row.model.trim(),
    category: row.category.trim(),
    manufacturer: row.manufacturer.trim(),
    location: repairTurkishName(row.location) || row.location.trim(),
    notes: row.notes.trim(),
  };
}

export const ZIMMET_CSV_TEMPLATE =
  'Ad Soyad;E-posta;Demirbaş Adı;Etiket;Seri No;Model;Kategori;Üretici;Lokasyon;Notlar\n' +
  'Ahmet Yılmaz;ahmet@ornek.com;MacBook Pro 16;AST-1001;SN123456;M3 Pro;Laptops;Apple;Main Office;Örnek kayıt\n';

/** @deprecated Use ZimmetImportRow */
export type CsvZimmetRow = ZimmetImportRow;
