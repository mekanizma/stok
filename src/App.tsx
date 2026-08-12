import { useState, useEffect, useCallback } from 'react';
import { type Session } from '@supabase/supabase-js';
import { supabase, type Asset, type UserRecord, type Category, type Manufacturer, type Location, type Accessory, type Consumable, type License } from '@/lib/supabase';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { LayoutDashboard, Users, MapPin, Tags, Building2, Settings, Package, KeyRound, PackageCheck, ScrollText, Menu, X, Globe, ClipboardCheck, ArchiveRestore, LogOut, Monitor } from 'lucide-react';
import { Button, Input, Modal } from '@/components/ui';
import {
  adminDisplayName,
  adminInitials,
  type AdminProfile,
} from '@/lib/adminProfile';
import Dashboard from '@/pages/Dashboard';
import AssetDetail from '@/pages/AssetDetail';
import UsersPage from '@/pages/Users';
import LocationsPage from '@/pages/Locations';
import CategoriesPage from '@/pages/Categories';
import ManufacturersPage from '@/pages/Manufacturers';
import AssetsPage from '@/pages/Assets';
import AccessoriesPage from '@/pages/Accessories';
import ConsumablesPage from '@/pages/Consumables';
import LicensesPage from '@/pages/Licenses';
import ActivityPage from '@/pages/Activity';
import SettingsPage from '@/pages/Settings';
import DeployedAssetsPage from '@/pages/DeployedAssets';
import CheckedInAssetsPage from '@/pages/CheckedInAssets';
import LoginPage from '@/pages/Login';
import ForcePasswordChange from '@/pages/ForcePasswordChange';
import { getSessionRole, roleFromDb, canAccessPage, defaultPageForRole, canEditDeployedAssets, canManageZimmet, canManageUsers, canDeleteRecords, type AppRole } from '@/lib/roles';
import { insertCheckoutHistory } from '@/lib/checkoutHistory';

function profileFromSession(session: Session | null): AdminProfile {
  const user = session?.user;
  const meta = (user?.user_metadata || {}) as Record<string, string | boolean>;
  return {
    firstName: (meta.first_name as string) || (meta.full_name as string)?.split(' ')[0] || 'Admin',
    lastName: (meta.last_name as string) || '',
    email: user?.email || 'admin@stoktakip.com',
  };
}

function mustChangePassword(session: Session | null) {
  return session?.user?.user_metadata?.must_change_password === true;
}

export type Page =
  | { name: 'dashboard' }
  | { name: 'deployed-assets' }
  | { name: 'checked-in-assets' }
  | { name: 'asset-detail'; id: string }
  | { name: 'users' }
  | { name: 'locations' }
  | { name: 'categories' }
  | { name: 'manufacturers' }
  | { name: 'assets' }
  | { name: 'accessories' }
  | { name: 'consumables' }
  | { name: 'licenses' }
  | { name: 'activity' }
  | { name: 'settings' };

interface NavItem {
  labelKey: TranslationKey;
  icon: typeof LayoutDashboard;
  page: Page['name'];
  group: TranslationKey;
}

const NAV_ITEMS: NavItem[] = [
  { labelKey: 'dashboard', icon: LayoutDashboard, page: 'dashboard', group: 'overview' },
  { labelKey: 'deployedAssets', icon: ClipboardCheck, page: 'deployed-assets', group: 'inventory' },
  { labelKey: 'checkedInAssets', icon: ArchiveRestore, page: 'checked-in-assets', group: 'inventory' },
  { labelKey: 'assets', icon: Monitor, page: 'assets', group: 'inventory' },
  { labelKey: 'accessories', icon: Package, page: 'accessories', group: 'inventory' },
  { labelKey: 'consumables', icon: PackageCheck, page: 'consumables', group: 'inventory' },
  { labelKey: 'licenses', icon: KeyRound, page: 'licenses', group: 'inventory' },
  { labelKey: 'users', icon: Users, page: 'users', group: 'peoplePlaces' },
  { labelKey: 'locations', icon: MapPin, page: 'locations', group: 'peoplePlaces' },
  { labelKey: 'categories', icon: Tags, page: 'categories', group: 'settingsGroup' },
  { labelKey: 'manufacturers', icon: Building2, page: 'manufacturers', group: 'settingsGroup' },
  { labelKey: 'activityLog', icon: ScrollText, page: 'activity', group: 'settingsGroup' },
  { labelKey: 'settings', icon: Settings, page: 'settings', group: 'settingsGroup' },
];

export default function App() {
  const { t, lang, setLang } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [page, setPage] = useState<Page>({ name: 'dashboard' });
  const [appRole, setAppRole] = useState<AppRole>('it');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile>(() => profileFromSession(null));
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssets = useCallback(async () => {
    const { data } = await supabase
      .from('assets')
      .select('*, manufacturer:manufacturers(*), category:categories(*), default_location:locations(*), assigned_to:users(*, location:locations(*))')
      .order('created_at', { ascending: false });
    setAssets((data as Asset[]) || []);
  }, []);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from('users')
      .select('*, location:locations(*)')
      .order('first_name');
    setUsers((data as UserRecord[]) || []);
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories((data as Category[]) || []);
  }, []);

  const fetchManufacturers = useCallback(async () => {
    const { data } = await supabase.from('manufacturers').select('*').order('name');
    setManufacturers((data as Manufacturer[]) || []);
  }, []);

  const fetchLocations = useCallback(async () => {
    const { data } = await supabase.from('locations').select('*').order('name');
    setLocations((data as Location[]) || []);
  }, []);

  const fetchAccessories = useCallback(async () => {
    const { data } = await supabase
      .from('accessories')
      .select('*, manufacturer:manufacturers(*), category:categories(*), location:locations(*)')
      .order('created_at', { ascending: false });
    setAccessories((data as Accessory[]) || []);
  }, []);

  const fetchConsumables = useCallback(async () => {
    const { data } = await supabase
      .from('consumables')
      .select('*, manufacturer:manufacturers(*), category:categories(*)')
      .order('created_at', { ascending: false });
    setConsumables((data as Consumable[]) || []);
  }, []);

  const fetchLicenses = useCallback(async () => {
    const { data } = await supabase
      .from('licenses')
      .select('*, manufacturer:manufacturers(*), category:categories(*)')
      .order('created_at', { ascending: false });
    setLicenses((data as License[]) || []);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchAssets(),
      fetchUsers(),
      fetchCategories(),
      fetchManufacturers(),
      fetchLocations(),
      fetchAccessories(),
      fetchConsumables(),
      fetchLicenses(),
    ]);
  }, [fetchAssets, fetchUsers, fetchCategories, fetchManufacturers, fetchLocations, fetchAccessories, fetchConsumables, fetchLicenses]);

  const resolveAppRole = useCallback(async (nextSession: Session | null): Promise<AppRole> => {
    if (!nextSession?.user?.email) return 'it';
    const email = nextSession.user.email;
    if (email.toLowerCase() === 'admin@stoktakip.com') return 'admin';
    const { data } = await supabase
      .from('users')
      .select('app_role')
      .ilike('email', email)
      .maybeSingle();
    if (data?.app_role) return roleFromDb(data.app_role, email);
    // Fallback: app_metadata.app_role (server-set), never trust client-writable user_metadata.role alone for admin
    const appMeta = (nextSession.user.app_metadata || {}) as Record<string, unknown>;
    const metaRole = String(appMeta.app_role || '').toLowerCase();
    if (metaRole === 'admin' || metaRole === 'hr' || metaRole === 'it') return metaRole;
    return getSessionRole(
      { role: nextSession.user.user_metadata?.role },
      email,
    );
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAdminProfile(profileFromSession(data.session));
      const role = await resolveAppRole(data.session);
      if (!mounted) return;
      setAppRole(role);
      if (data.session) setPage(defaultPageForRole(role));
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      void (async () => {
        setSession(next);
        setAdminProfile(profileFromSession(next));
        const role = await resolveAppRole(next);
        setAppRole(role);
        setAuthReady(true);
        if (event === 'SIGNED_IN' && next) {
          setPage(defaultPageForRole(role));
        }
        if (event === 'SIGNED_OUT') {
          setPage({ name: 'dashboard' });
        }
      })();
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [resolveAppRole]);

  useEffect(() => {
    if (!session) return;
    if (!canAccessPage(appRole, page.name)) {
      setPage(defaultPageForRole(appRole));
    }
  }, [session, appRole, page.name]);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      await refreshAll();
      setLoading(false);
    })();
  }, [session, refreshAll]);

  const navigate = (p: Page) => {
    if (!canAccessPage(appRole, p.name)) return;
    setPage(p);
    setSidebarOpen(false);
  };

  const openProfile = () => {
    const current = profileFromSession(session);
    setAdminProfile(current);
    setProfileForm({
      firstName: current.firstName,
      lastName: current.lastName,
      email: current.email,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setProfileError('');
    setProfileSuccess('');
    setProfileOpen(true);
  };

  const saveProfile = async () => {
    setProfileError('');
    setProfileSuccess('');
    setProfileSaving(true);

    const changingPassword = Boolean(profileForm.newPassword || profileForm.confirmPassword || profileForm.currentPassword);
    if (changingPassword) {
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        setProfileError(t('passwordMismatch'));
        setProfileSaving(false);
        return;
      }
      if (!profileForm.newPassword || !profileForm.currentPassword) {
        setProfileError(t('wrongCurrentPassword'));
        setProfileSaving(false);
        return;
      }
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: session?.user.email || profileForm.email,
        password: profileForm.currentPassword,
      });
      if (reauthError) {
        setProfileError(t('wrongCurrentPassword'));
        setProfileSaving(false);
        return;
      }
      const { error: pwError } = await supabase.auth.updateUser({ password: profileForm.newPassword });
      if (pwError) {
        setProfileError(pwError.message);
        setProfileSaving(false);
        return;
      }
    }

    const firstName = profileForm.firstName.trim() || 'Admin';
    const lastName = profileForm.lastName.trim();
    const email = profileForm.email.trim();

    const { error: metaError } = await supabase.auth.updateUser({
      email: email || undefined,
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: [firstName, lastName].filter(Boolean).join(' '),
      },
    });
    if (metaError) {
      setProfileError(metaError.message);
      setProfileSaving(false);
      return;
    }

    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    setAdminProfile(profileFromSession(data.session));
    setProfileForm((f) => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
    setProfileSuccess(t('profileSaved'));
    setProfileSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfileOpen(false);
    setPage({ name: 'dashboard' });
  };

  const handleCheckinFromList = async (asset: Asset, locationId?: string | null) => {
    const assigneeNote = asset.assignee_name
      ? `${asset.assignee_name}${asset.assignee_email ? ` (${asset.assignee_email})` : ''}`
      : null;
    const locName = locationId
      ? locations.find((l) => l.id === locationId)?.name
      : null;
    const noteBase = assigneeNote ? `${t('checkedInFromDeployed')} — ${assigneeNote}` : t('checkedInFromDeployed');
    await insertCheckoutHistory({
      asset_id: asset.id,
      assigned_to_id: asset.assigned_to_id,
      action: 'checkin',
      note: locName ? `${noteBase} → ${locName}` : noteBase,
    });
    await supabase.from('assets').update({
      assigned_to_id: null,
      assignee_name: null,
      assignee_email: null,
      status: 'ready',
      default_location_id: locationId || null,
    }).eq('id', asset.id);
    fetchAssets();
  };

  const groups = Array.from(new Set(NAV_ITEMS.map((i) => i.group)));
  const visibleNav = NAV_ITEMS.filter((i) => canAccessPage(appRole, i.page));
  const visibleGroups = groups.filter((g) => visibleNav.some((i) => i.group === g));
  const activePage = page.name === 'asset-detail'
    ? (assets.find((a) => a.id === (page as { id: string }).id)?.status === 'deployed' ? 'deployed-assets' : 'checked-in-assets')
    : page.name;
  const currentLabelKey = NAV_ITEMS.find((i) => i.page === activePage)?.labelKey || 'dashboard';

  const renderPage = () => {
    if (!canAccessPage(appRole, page.name)) {
      return (
        <div className="p-6 text-center text-sm text-gray-500">{t('accessDenied')}</div>
      );
    }
    switch (page.name) {
      case 'dashboard':
        return <Dashboard assets={assets} users={users} locations={locations} categories={categories} accessories={accessories} consumables={consumables} licenses={licenses} navigate={navigate} appRole={appRole} />;
      case 'deployed-assets':
        return (
          <DeployedAssetsPage
            assets={assets}
            accessories={accessories}
            categories={categories}
            manufacturers={manufacturers}
            locations={locations}
            loading={loading}
            canEdit={canEditDeployedAssets(appRole)}
            canManage={canManageZimmet(appRole)}
            canDelete={canDeleteRecords(appRole)}
            navigate={navigate}
            onCheckin={handleCheckinFromList}
            onRefresh={() => {
              fetchAssets();
              fetchAccessories();
              fetchUsers();
              fetchCategories();
              fetchManufacturers();
              fetchLocations();
            }}
          />
        );
      case 'checked-in-assets':
        return <CheckedInAssetsPage assets={assets} loading={loading} canManage={canManageZimmet(appRole)} canDelete={canDeleteRecords(appRole)} navigate={navigate} onRefresh={() => { fetchAssets(); fetchUsers(); }} />;
      case 'asset-detail':
        return <AssetDetail assetId={page.id} navigate={navigate} onRefresh={fetchAssets} users={users} locations={locations} canManage={canManageZimmet(appRole)} canDelete={canDeleteRecords(appRole)} />;
      case 'users':
        return <UsersPage users={users} locations={locations} assets={assets} onRefresh={fetchUsers} />;
      case 'locations':
        return <LocationsPage locations={locations} assets={assets} users={users} onRefresh={fetchLocations} />;
      case 'categories':
        return <CategoriesPage categories={categories} assets={assets} onRefresh={fetchCategories} canDelete={canDeleteRecords(appRole)} />;
      case 'manufacturers':
        return <ManufacturersPage manufacturers={manufacturers} assets={assets} onRefresh={fetchManufacturers} canDelete={canDeleteRecords(appRole)} />;
      case 'assets':
        return (
          <AssetsPage
            assets={assets}
            loading={loading}
            categories={categories}
            manufacturers={manufacturers}
            locations={locations}
            onRefresh={fetchAssets}
            canDelete={canDeleteRecords(appRole)}
          />
        );
      case 'accessories':
        return (
          <AccessoriesPage
            accessories={accessories}
            categories={categories}
            manufacturers={manufacturers}
            users={users}
            locations={locations}
            onRefresh={() => { fetchAccessories(); fetchAssets(); }}
            canDelete={canDeleteRecords(appRole)}
          />
        );
      case 'consumables':
        return <ConsumablesPage consumables={consumables} categories={categories} manufacturers={manufacturers} users={users} locations={locations} onRefresh={fetchConsumables} canDelete={canDeleteRecords(appRole)} />;
      case 'licenses':
        return <LicensesPage licenses={licenses} categories={categories} manufacturers={manufacturers} onRefresh={fetchLicenses} canDelete={canDeleteRecords(appRole)} />;
      case 'activity':
        return <ActivityPage />;
      case 'settings':
        return <SettingsPage canConfigureAlerts={canManageUsers(appRole)} />;
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <LoginPage onLoggedIn={() => { /* session via onAuthStateChange */ }} />;
  }

  if (mustChangePassword(session)) {
    return (
      <ForcePasswordChange
        onDone={async () => {
          const { data } = await supabase.auth.getSession();
          setSession(data.session);
          setAdminProfile(profileFromSession(data.session));
        }}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-800">
          <div className="flex items-center justify-center w-9 h-9 shrink-0">
            <img src="/final-logo.png" alt={t('universityName')} className="w-9 h-9 object-contain" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">{t('universityName')}</h1>
            <p className="text-xs text-slate-500">{t('itInventorySystem')}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3">
          {visibleGroups.map((group) => (
            <div key={group} className="mb-5">
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t(group)}</p>
              {visibleNav.filter((i) => i.group === group).map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.page;
                return (
                  <button
                    key={item.page}
                    onClick={() => navigate({ name: item.page } as Page)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    {t(item.labelKey)}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <button
            type="button"
            onClick={openProfile}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 cursor-pointer text-left"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-600 text-white text-sm font-semibold shrink-0">
              {adminInitials(adminProfile)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{adminDisplayName(adminProfile)}</p>
              <p className="text-xs text-slate-500 truncate">{adminProfile.email}</p>
            </div>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        <header className="flex items-center gap-3 h-16 px-4 lg:px-6 bg-white border-b border-gray-200 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <h2 className="text-lg font-semibold text-gray-900">{t(currentLabelKey)}</h2>

          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setLang('tr')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1 ${lang === 'tr' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Globe className="w-3.5 h-3.5" /> TR
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1 ${lang === 'en' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Globe className="w-3.5 h-3.5" /> EN
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="animate-fade-in">{renderPage()}</div>
        </main>
      </div>

      <Modal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title={t('adminProfile')}
        footer={
          <div className="flex w-full flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
            <Button variant="danger" onClick={handleSignOut} className="w-full sm:w-auto">
              <LogOut className="w-4 h-4" /> {t('signOut')}
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="secondary" onClick={() => setProfileOpen(false)} className="flex-1 sm:flex-none">{t('cancel')}</Button>
              <Button onClick={saveProfile} disabled={profileSaving} className="flex-1 sm:flex-none">{t('saveProfile')}</Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t('firstName')}
              value={profileForm.firstName}
              onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
              autoComplete="given-name"
            />
            <Input
              label={t('lastName')}
              value={profileForm.lastName}
              onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
              autoComplete="family-name"
            />
          </div>
          <Input
            label={t('email')}
            type="email"
            value={profileForm.email}
            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            autoComplete="email"
          />
          <div className="pt-2 border-t border-gray-100 space-y-3">
            <p className="text-xs text-gray-500">{t('changePasswordOptional')}</p>
            <Input
              label={t('currentPassword')}
              type="password"
              value={profileForm.currentPassword}
              onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
              autoComplete="current-password"
            />
            <Input
              label={t('newPassword')}
              type="password"
              value={profileForm.newPassword}
              onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
              autoComplete="new-password"
            />
            <Input
              label={t('confirmPassword')}
              type="password"
              value={profileForm.confirmPassword}
              onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
              autoComplete="new-password"
            />
          </div>
          {profileError ? <p className="text-sm text-red-600">{profileError}</p> : null}
          {profileSuccess ? <p className="text-sm text-emerald-600">{profileSuccess}</p> : null}
        </div>
      </Modal>
    </div>
  );
}
