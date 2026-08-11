/** Resolve a sample product image from category / asset name. */
export function getAssetTypeImage(categoryName?: string | null, assetName?: string | null): string {
  const haystack = `${categoryName || ''} ${assetName || ''}`.toLowerCase();

  const rules: { keys: string[]; file: string }[] = [
    { keys: ['laptop', 'notebook', 'macbook', 'thinkpad', 'dizüstü', 'dizustu'], file: 'laptop.png' },
    { keys: ['desktop', 'pc', 'prodesk', 'imac', 'masaüstü', 'masaustu', 'tower'], file: 'desktop.png' },
    { keys: ['monitor', 'display', 'screen', 'odyssey', 'monitör', 'monitor'], file: 'monitor.png' },
    { keys: ['phone', 'iphone', 'android', 'mobile', 'telefon', 'smartphone'], file: 'phone.png' },
    { keys: ['tablet', 'ipad'], file: 'tablet.png' },
    { keys: ['network', 'networking', 'switch', 'router', 'cisco', 'catalyst', 'ağ', 'ag'], file: 'network.png' },
  ];

  for (const rule of rules) {
    if (rule.keys.some((k) => haystack.includes(k))) {
      return `/asset-types/${rule.file}`;
    }
  }

  return '/asset-types/generic.png';
}
