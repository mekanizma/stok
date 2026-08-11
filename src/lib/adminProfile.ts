const STORAGE_KEY = 'stok_admin_profile';

export interface AdminProfile {
  firstName: string;
  lastName: string;
  email: string;
}

const DEFAULT_PROFILE: AdminProfile = {
  firstName: 'Admin',
  lastName: '',
  email: 'admin@company.com',
};

export function loadAdminProfile(): AdminProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw) as Partial<AdminProfile>;
    return {
      firstName: parsed.firstName?.trim() || DEFAULT_PROFILE.firstName,
      lastName: parsed.lastName?.trim() || '',
      email: parsed.email?.trim() || DEFAULT_PROFILE.email,
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveAdminProfile(profile: AdminProfile) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
    }),
  );
}

export function adminDisplayName(profile: AdminProfile) {
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || 'Admin';
}

export function adminInitials(profile: AdminProfile) {
  const first = profile.firstName?.[0] || 'A';
  const last = profile.lastName?.[0] || profile.firstName?.[1] || 'D';
  return (first + last).toUpperCase();
}
