export type DeepLinkPage =
  | { name: 'asset-detail'; id: string }
  | { name: 'scan' };

/** Hash deep-link for an asset detail page (works with phone camera QR scan). */
export function assetDeepLink(assetId: string, origin = typeof window !== 'undefined' ? window.location.origin : '') {
  const base = origin.replace(/\/$/, '');
  const path = typeof window !== 'undefined' ? window.location.pathname.replace(/\/$/, '') : '';
  return `${base}${path}#/asset/${encodeURIComponent(assetId)}`;
}

export function parseAppHash(hash = typeof window !== 'undefined' ? window.location.hash : ''): DeepLinkPage | null {
  const raw = hash.replace(/^#/, '').trim();
  if (!raw) return null;
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const assetMatch = path.match(/^\/asset\/([^/?#]+)/i);
  if (assetMatch?.[1]) {
    return { name: 'asset-detail', id: decodeURIComponent(assetMatch[1]) };
  }
  if (/^\/scan\/?$/i.test(path)) return { name: 'scan' };
  return null;
}

export function pageToHash(page: { name: string; id?: string }): string {
  if (page.name === 'asset-detail' && page.id) return `#/asset/${encodeURIComponent(page.id)}`;
  if (page.name === 'scan') return '#/scan';
  return `#/${page.name}`;
}
