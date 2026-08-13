export type EntityPair = { tr: string; en: string };

const STORAGE_KEY = 'stok_entity_i18n_pairs_v1';

/** Known mock/seed entity names → localized labels */
export const entityNames: Record<string, EntityPair> = {
  Laptops: { tr: 'Dizüstü Bilgisayar', en: 'Laptops' },
  NOTEBOOK: { tr: 'Dizüstü Bilgisayar', en: 'Laptops' },
  Notebook: { tr: 'Dizüstü Bilgisayar', en: 'Laptops' },
  Desktops: { tr: 'Masaüstü Bilgisayar', en: 'Desktops' },
  Monitors: { tr: 'Monitörler', en: 'Monitors' },
  Phones: { tr: 'Telefonlar', en: 'Phones' },
  'CEP TELEFONU': { tr: 'Telefonlar', en: 'Phones' },
  Tablets: { tr: 'Tabletler', en: 'Tablets' },
  Networking: { tr: 'Ağ Ekipmanları', en: 'Networking' },
  Peripherals: { tr: 'Çevre Birimleri', en: 'Peripherals' },
  WEBCAM: { tr: 'Çevre Birimleri', en: 'Peripherals' },
  Audio: { tr: 'Ses', en: 'Audio' },
  MIKROFON: { tr: 'Ses', en: 'Audio' },
  Cables: { tr: 'Kablolar', en: 'Cables' },
  'Toner & Ink': { tr: 'Toner & Mürekkep', en: 'Toner & Ink' },
  Software: { tr: 'Yazılım', en: 'Software' },
  'Operating Systems': { tr: 'İşletim Sistemleri', en: 'Operating Systems' },
  'Main Office': { tr: 'Merkez Ofis', en: 'Main Office' },
  'Branch Office - Ankara': { tr: 'Şube Ofisi - Ankara', en: 'Branch Office - Ankara' },
  'Data Center': { tr: 'Veri Merkezi', en: 'Data Center' },
  Warehouse: { tr: 'Depo', en: 'Warehouse' },
  Turkey: { tr: 'Türkiye', en: 'Turkey' },
  'IT Manager': { tr: 'IT Müdürü', en: 'IT Manager' },
  'Software Developer': { tr: 'Yazılım Geliştirici', en: 'Software Developer' },
  'System Administrator': { tr: 'Sistem Yöneticisi', en: 'System Administrator' },
  'Network Engineer': { tr: 'Ağ Mühendisi', en: 'Network Engineer' },
  'DevOps Engineer': { tr: 'DevOps Mühendisi', en: 'DevOps Engineer' },
  'Primary development laptop': { tr: 'Ana geliştirme dizüstüsü', en: 'Primary development laptop' },
  'Screen flickering - sent for repair': { tr: 'Ekran titriyor - onarıma gönderildi', en: 'Screen flickering - sent for repair' },
  'Initial deployment': { tr: 'İlk dağıtım', en: 'Initial deployment' },
  'Checked in': { tr: 'İade edildi', en: 'Checked in' },
  'Checked in from deployed list': { tr: 'Zimmetli listesinden iade edildi', en: 'Checked in from deployed list' },
  'USB-C Cable 2m': { tr: 'USB-C Kablo 2m', en: 'USB-C Cable 2m' },
  'HP 414A Black Toner': { tr: 'HP 414A Siyah Toner', en: 'HP 414A Black Toner' },
  'Microsoft 365 Business Standard': { tr: 'Microsoft 365 Business Standard', en: 'Microsoft 365 Business Standard' },
  'Adobe Creative Cloud All Apps': { tr: 'Adobe Creative Cloud Tüm Uygulamalar', en: 'Adobe Creative Cloud All Apps' },
};

/** Common inventory vocabulary for auto TR↔EN. */
const WORD_MAP: Array<[RegExp, EntityPair]> = [
  [/\bdizüstü\s*bilgisayar(lar)?\b/gi, { tr: 'Dizüstü Bilgisayar', en: 'Laptops' }],
  [/\blaptops?\b/gi, { tr: 'Dizüstü Bilgisayar', en: 'Laptops' }],
  [/\bnotebooks?\b/gi, { tr: 'Dizüstü Bilgisayar', en: 'Laptops' }],
  [/\bmasaüstü\s*bilgisayar(lar)?\b/gi, { tr: 'Masaüstü Bilgisayar', en: 'Desktops' }],
  [/\bdesktops?\b/gi, { tr: 'Masaüstü Bilgisayar', en: 'Desktops' }],
  [/\bmonitör(ler)?\b/gi, { tr: 'Monitörler', en: 'Monitors' }],
  [/\bmonitors?\b/gi, { tr: 'Monitörler', en: 'Monitors' }],
  [/\btelefon(lar)?\b/gi, { tr: 'Telefonlar', en: 'Phones' }],
  [/\bphones?\b/gi, { tr: 'Telefonlar', en: 'Phones' }],
  [/\bcep\s*telefonu\b/gi, { tr: 'Telefonlar', en: 'Phones' }],
  [/\btablet(ler)?\b/gi, { tr: 'Tabletler', en: 'Tablets' }],
  [/\btablets?\b/gi, { tr: 'Tabletler', en: 'Tablets' }],
  [/\bağ\s*ekipman(ları|lari)?\b/gi, { tr: 'Ağ Ekipmanları', en: 'Networking' }],
  [/\bnetworking\b/gi, { tr: 'Ağ Ekipmanları', en: 'Networking' }],
  [/\bçevre\s*birim(leri)?\b/gi, { tr: 'Çevre Birimleri', en: 'Peripherals' }],
  [/\bperipherals?\b/gi, { tr: 'Çevre Birimleri', en: 'Peripherals' }],
  [/\baksesuar(lar)?\b/gi, { tr: 'Aksesuarlar', en: 'Accessories' }],
  [/\baccessories\b/gi, { tr: 'Aksesuarlar', en: 'Accessories' }],
  [/\bkablo(lar)?\b/gi, { tr: 'Kablolar', en: 'Cables' }],
  [/\bcables?\b/gi, { tr: 'Kablolar', en: 'Cables' }],
  [/\btoner\b/gi, { tr: 'Toner', en: 'Toner' }],
  [/\bmürekkep\b/gi, { tr: 'Mürekkep', en: 'Ink' }],
  [/\bink\b/gi, { tr: 'Mürekkep', en: 'Ink' }],
  [/\byazılım\b/gi, { tr: 'Yazılım', en: 'Software' }],
  [/\bsoftware\b/gi, { tr: 'Yazılım', en: 'Software' }],
  [/\bişletim\s*sistem(i|leri)?\b/gi, { tr: 'İşletim Sistemleri', en: 'Operating Systems' }],
  [/\boperating\s*systems?\b/gi, { tr: 'İşletim Sistemleri', en: 'Operating Systems' }],
  [/\bmerkez\s*ofis\b/gi, { tr: 'Merkez Ofis', en: 'Main Office' }],
  [/\bmain\s*office\b/gi, { tr: 'Merkez Ofis', en: 'Main Office' }],
  [/\bşube\s*ofis(i)?\b/gi, { tr: 'Şube Ofisi', en: 'Branch Office' }],
  [/\bbranch\s*office\b/gi, { tr: 'Şube Ofisi', en: 'Branch Office' }],
  [/\bveri\s*merkezi\b/gi, { tr: 'Veri Merkezi', en: 'Data Center' }],
  [/\bdata\s*cent(er|re)\b/gi, { tr: 'Veri Merkezi', en: 'Data Center' }],
  [/\bdepo\b/gi, { tr: 'Depo', en: 'Warehouse' }],
  [/\bwarehouse\b/gi, { tr: 'Depo', en: 'Warehouse' }],
  [/\btürkiye\b/gi, { tr: 'Türkiye', en: 'Turkey' }],
  [/\bturkey\b/gi, { tr: 'Türkiye', en: 'Turkey' }],
  [/\bklavye\b/gi, { tr: 'Klavye', en: 'Keyboard' }],
  [/\bkeyboard\b/gi, { tr: 'Klavye', en: 'Keyboard' }],
  [/\bfare\b/gi, { tr: 'Fare', en: 'Mouse' }],
  [/\bmouse\b/gi, { tr: 'Fare', en: 'Mouse' }],
  [/\bkulaklık\b/gi, { tr: 'Kulaklık', en: 'Headset' }],
  [/\bheadset\b/gi, { tr: 'Kulaklık', en: 'Headset' }],
  [/\bhoparlör\b/gi, { tr: 'Hoparlör', en: 'Speaker' }],
  [/\bspeaker\b/gi, { tr: 'Hoparlör', en: 'Speaker' }],
  [/\bbatarya\b/gi, { tr: 'Batarya', en: 'Battery' }],
  [/\bbattery\b/gi, { tr: 'Batarya', en: 'Battery' }],
  [/\byazıcı\b/gi, { tr: 'Yazıcı', en: 'Printer' }],
  [/\bprinter\b/gi, { tr: 'Yazıcı', en: 'Printer' }],
  [/\bprojeksiyon\b/gi, { tr: 'Projeksiyon', en: 'Projector' }],
  [/\bprojector\b/gi, { tr: 'Projeksiyon', en: 'Projector' }],
  [/\bsarf\s*malzeme(ler)?\b/gi, { tr: 'Sarf Malzemeler', en: 'Consumables' }],
  [/\bconsumables?\b/gi, { tr: 'Sarf Malzemeler', en: 'Consumables' }],
  [/\blisans(lar)?\b/gi, { tr: 'Lisanslar', en: 'Licenses' }],
  [/\blicenses?\b/gi, { tr: 'Lisanslar', en: 'Licenses' }],
];

function normKey(value: string) {
  return value.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');
}

function loadCustomPairs(): EntityPair[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EntityPair[];
    return Array.isArray(parsed) ? parsed.filter((p) => p?.tr && p?.en) : [];
  } catch {
    return [];
  }
}

function saveCustomPairs(pairs: EntityPair[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pairs.slice(0, 500)));
  } catch {
    /* ignore quota */
  }
}

function builtinPairs(): EntityPair[] {
  const out: EntityPair[] = [];
  const seen = new Set<string>();
  for (const [key, pair] of Object.entries(entityNames)) {
    const p = { tr: pair.tr, en: pair.en || key };
    const k = `${normKey(p.tr)}||${normKey(p.en)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

function allPairs(): EntityPair[] {
  return [...builtinPairs(), ...loadCustomPairs()];
}

export function findEntityPair(name: string | null | undefined): EntityPair | null {
  if (!name?.trim()) return null;
  const key = normKey(name);
  for (const p of allPairs()) {
    if (normKey(p.tr) === key || normKey(p.en) === key) return p;
  }
  return null;
}

/** Detect likely language of free text (rough heuristic). */
export function detectNameLang(input: string): 'tr' | 'en' | 'neutral' {
  const s = input.trim();
  if (!s) return 'neutral';
  if (/[çğıöşüÇĞİÖŞÜ]/.test(s)) return 'tr';
  if (/\b(the|and|office|laptop|desktop|monitor|phone|cable|warehouse|branch|main)\b/i.test(s)) return 'en';
  if (/\b(bilgisayar|ofis|merkez|depo|kablo|telefon|monitör|yazılım|lisans)\b/i.test(s)) return 'tr';
  return 'neutral';
}

function applyWordMap(input: string, to: 'tr' | 'en'): string {
  let out = input.trim();
  if (!out) return '';
  for (const [re, pair] of WORD_MAP) {
    out = out.replace(re, pair[to]);
  }
  // collapse leftover duplicate spaces
  return out.replace(/\s+/g, ' ').trim();
}

/** Build TR/EN pair from one side (or both). */
export function resolveEntityPair(opts: { tr?: string; en?: string; source?: string }): EntityPair {
  const source = (opts.source || opts.tr || opts.en || '').trim();
  let tr = (opts.tr || '').trim();
  let en = (opts.en || '').trim();

  const known = findEntityPair(source) || findEntityPair(tr) || findEntityPair(en);
  if (known) {
    return {
      tr: tr || known.tr,
      en: en || known.en,
    };
  }

  if (tr && !en) {
    const mapped = applyWordMap(tr, 'en');
    en = mapped && mapped !== tr ? mapped : tr;
  } else if (en && !tr) {
    const mapped = applyWordMap(en, 'tr');
    tr = mapped && mapped !== en ? mapped : en;
  } else if (!tr && !en && source) {
    const lang = detectNameLang(source);
    if (lang === 'en') {
      en = source;
      tr = applyWordMap(source, 'tr') || source;
    } else {
      tr = source;
      en = applyWordMap(source, 'en') || source;
    }
  }

  if (!tr) tr = en || source;
  if (!en) en = tr || source;
  return { tr, en };
}

/** Persist custom pair so language switch works app-wide. */
export function registerEntityPair(tr: string, en: string) {
  const pair = resolveEntityPair({ tr, en });
  if (!pair.tr.trim() && !pair.en.trim()) return { tr: '', en: '' };
  if (!pair.tr || !pair.en) return pair;
  const existing = loadCustomPairs().filter(
    (p) => normKey(p.tr) !== normKey(pair.tr) && normKey(p.en) !== normKey(pair.en),
  );
  existing.unshift(pair);
  saveCustomPairs(existing);
  return pair;
}

/** Stable identity for duplicate detection (TR/EN equivalents match). */
export function entityIdentityKey(name: string): string {
  const pair = findEntityPair(name) || resolveEntityPair({ source: name });
  return [normKey(pair.tr), normKey(pair.en)].filter(Boolean).sort().join('|');
}

export function categoryIdentityKey(category: { name: string; type: string }): string {
  return `${category.type}::${entityIdentityKey(category.name)}`;
}

/** Canonical DB name: prefer Turkish label (readable in TR-first app). */
export function canonicalEntityName(pair: EntityPair) {
  return pair.tr || pair.en;
}
