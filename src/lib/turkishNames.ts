/** Known corrupted import strings → correct Turkish names. */
const NAME_FIXES: Record<string, string> = {
  '?BRAH?M BENTER': 'İBRAHİM BENTER',
  '?PEK ERGUR': 'İPEK ERGUR',
  '?brahim ADESHOLA': 'İbrahim ADESHOLA',
  'ASLI ENVER \uFFFDZEN': 'ASLI ENVER ÖZEN',
  'AY?E EK?NC?': 'AYŞE EKİNCİ',
  'BENG?SU TUKA\uFFFD': 'BENGİSU TUKAÇ',
  'CAN?Z TONYALI': 'CANİZ TONYALI',
  'CEM B?ROL': 'CEM BİROL',
  'DAMLA AK??T B?CAK': 'DAMLA AKŞIT BIÇAK',
  'DEN?Z JURKOV?\uFFFD': 'DENİZ JURKOVIÇ',
  'D\uFFFDNJA TERKAN': 'DÜNJA TERKAN',
  'ELZA DEM?RDA?': 'ELZA DEMİRDAĞ',
  'F?GEN SEMERC?O?LU': 'FİGEN SEMERCİOĞLU',
  'HASAN I?IMAN': 'HASAN IŞIMAN',
  'HAYR?YE  T\uFFFDMER': 'HAYRİYE TÜMER',
  'HUR? AKSOY': 'HURİ AKSOY',
  'JENNET \uFFFD?\uFFFDEK': 'JENNET ÇİÇEK',
  'KAN? B?LG?NAY': 'KANİ BİLGİNAY',
  'KEZ?BAN HAMMALO?LU': 'KEZİBAN HAMMALOĞLU',
  'K\uFFFDBRA YILDIRIM': 'KÜBRA YILDIRIM',
  'M?NE BEK?RO?LU': 'MİNE BEKİROĞLU',
  'MEL?S MISIRLI G\uFFFDLBE?': 'MELİS MISIRLI GÜLBEŞ',
  'MERYEM MALKO\uFFFD TEK?N': 'MERYEM MALKOÇ TEKİN',
  'MOHAMMEDALFATEH AHMED (STAJER ?T)': 'MOHAMMEDALFATEH AHMED (STAJER İT)',
  'MUSLU AKG\uFFFDNEY': 'MUSLU AKGÜNEY',
  'MUSTAFA ?ENOL T\uFFFDZ\uFFFDM': 'MUSTAFA ŞENOL TÜZÜM',
  'SAL?M ONGUN': 'SALİM ONGUN',
  'SUZAN KARAO?ULLARI': 'SUZAN KARAOĞULLARI',
  'VEL? EMRE KURT\uFFFDA': 'VELİ EMRE KURTÇA',
  '\uFFFD??DEM CANTA?': 'ÇİĞDEM CANTAŞ',
  '\uFFFDZGE \uFFFDAKMAK ???TMEZ': 'ÖZGE ÇAKMAK İŞİTMEZ',
  '\uFFFDZG\uFFFD ?LKCAN KARADAGLIOGLU': 'ÖZGÜ İLKCAN KARADAĞLIOĞLU',
  '\uFFFDi?dem canta?': 'Çiğdem Cantaş',
};

export function repairTurkishName(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (NAME_FIXES[trimmed]) return NAME_FIXES[trimmed];
  if (!trimmed.includes('\uFFFD') && !trimmed.includes('?')) return trimmed;

  // Light heuristics for remaining / future imports
  let s = trimmed;
  s = s.replace(/^(\uFFFD)\?\?DEM\b/i, 'ÇİĞDEM');
  s = s.replace(/\bCANTA\?$/i, 'CANTAŞ');
  s = s.replace(/\bAKG\uFFFDNEY\b/i, 'AKGÜNEY');
  s = s.replace(/\b\uFFFDZEN\b/i, 'ÖZEN');
  s = s.replace(/\bTUKA\uFFFD\b/i, 'TUKAÇ');
  s = s.replace(/\bMALKO\uFFFD\b/i, 'MALKOÇ');
  s = s.replace(/\bK\uFFFDBRA\b/i, 'KÜBRA');
  s = s.replace(/\bT\uFFFDZ\uFFFDM\b/i, 'TÜZÜM');
  s = s.replace(/\bT\uFFFDMER\b/i, 'TÜMER');
  s = s.replace(/\bG\uFFFDLBE\?/i, 'GÜLBEŞ');
  s = s.replace(/\b\uFFFD\?\uFFFDEK\b/i, 'ÇİÇEK');
  s = s.replace(/\b\?\b(?=T\b)/g, 'İ'); // STAJER ?T
  // Common İ replacements in ALL-CAPS tokens
  s = s.replace(/\b([A-ZÇĞİÖŞÜ]*?)\?([A-ZÇĞİÖŞÜ]+)\b/g, (_, a, b) => {
    // Prefer İ inside words for Turkish names
    return `${a}İ${b}`;
  });
  return s;
}
