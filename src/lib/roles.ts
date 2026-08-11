export type AppRole = 'admin' | 'hr' | 'it';

export type AppPageName =
  | 'dashboard'
  | 'deployed-assets'
  | 'checked-in-assets'
  | 'asset-detail'
  | 'users'
  | 'locations'
  | 'categories'
  | 'manufacturers'
  | 'accessories'
  | 'consumables'
  | 'licenses'
  | 'activity'
  | 'settings';

export const ASSIGNABLE_ROLES: AppRole[] = ['admin', 'hr', 'it'];

/** @deprecated use ASSIGNABLE_ROLES */
export const STAFF_ROLES: AppRole[] = ASSIGNABLE_ROLES;

const HR_PAGES: AppPageName[] = ['deployed-assets', 'checked-in-assets', 'asset-detail'];

/** Pages IT cannot open (admin-only people/places). */
const IT_BLOCKED_PAGES: AppPageName[] = ['users', 'locations'];

export function getSessionRole(meta: Record<string, unknown> | undefined, email?: string | null): AppRole {
  if (email?.toLowerCase() === 'admin@stoktakip.com') return 'admin';
  const role = String(meta?.role || '').toLowerCase();
  // Never elevate to admin from client-writable metadata alone
  if (role === 'hr') return 'hr';
  if (role === 'it') return 'it';
  return 'it';
}

/** Resolve role from public.users.app_role (authoritative for UI). */
export function roleFromDb(appRole: string | null | undefined, email?: string | null): AppRole {
  if (email?.toLowerCase() === 'admin@stoktakip.com') return 'admin';
  const role = String(appRole || '').toLowerCase();
  if (role === 'admin' || role === 'hr' || role === 'it') return role;
  return 'it';
}

export function canAccessPage(role: AppRole, pageName: AppPageName): boolean {
  if (role === 'admin') return true;
  if (role === 'hr') return HR_PAGES.includes(pageName);
  // IT: all except users & locations
  return !IT_BLOCKED_PAGES.includes(pageName);
}

export function defaultPageForRole(role: AppRole): { name: 'dashboard' } | { name: 'deployed-assets' } {
  if (role === 'hr') return { name: 'deployed-assets' };
  return { name: 'dashboard' };
}

export function canManageUsers(role: AppRole): boolean {
  return role === 'admin';
}

/** Only admin can edit deployed (zimmet) records. */
export function canEditDeployedAssets(role: AppRole): boolean {
  return role === 'admin';
}

/** Admin and IT can add / check-in / check-out. HR is view-only. */
export function canManageZimmet(role: AppRole): boolean {
  return role === 'admin' || role === 'it';
}
