import type { Asset } from '@/lib/supabase';
import { repairTurkishName } from '@/lib/turkishNames';

const UNNAMED_LABELS = new Set([
  'adsız demirbaş',
  'adsiz demirbas',
  'unnamed asset',
  'belirtilmedi',
  'not specified',
]);

export function getAssetAssignee(asset: Asset | null | undefined) {
  if (!asset) return null;
  if (asset.assigned_to) {
    const name = repairTurkishName(`${asset.assigned_to.first_name} ${asset.assigned_to.last_name || ''}`.trim());
    return {
      name,
      email: asset.assigned_to.email || null,
      jobTitle: asset.assigned_to.job_title || null,
      fromUser: true as const,
    };
  }
  if (asset.assignee_name?.trim()) {
    return {
      name: repairTurkishName(asset.assignee_name),
      email: asset.assignee_email?.trim() || null,
      jobTitle: null as string | null,
      fromUser: false as const,
    };
  }
  return null;
}

export function isUnnamedAssetName(name: string | null | undefined) {
  const trimmed = (name || '').trim();
  if (!trimmed) return true;
  return UNNAMED_LABELS.has(trimmed.toLocaleLowerCase('tr-TR'));
}

/** Prefer real asset name; if missing/Adsız Demirbaş, show assignee name. */
export function getAssetDisplayName(asset: Asset | null | undefined, fallback = '—') {
  if (!asset) return fallback;
  if (!isUnnamedAssetName(asset.name)) return repairTurkishName(asset.name);
  const assignee = getAssetAssignee(asset);
  if (assignee?.name) return assignee.name;
  if (asset.assignee_name?.trim()) return repairTurkishName(asset.assignee_name);
  return repairTurkishName(asset.name) || fallback;
}

/** Inventory card title: computer/model name, not the assignee. */
export function getAssetInventoryName(asset: Asset | null | undefined, fallback = '—') {
  if (!asset) return fallback;
  const model = asset.model?.trim();
  if (model) return model;
  if (!isUnnamedAssetName(asset.name)) return repairTurkishName(asset.name);
  return repairTurkishName(asset.name) || fallback;
}

export function isAssetDeployed(asset: Asset) {
  return asset.status === 'deployed' && Boolean(asset.assigned_to_id || asset.assignee_name?.trim());
}
