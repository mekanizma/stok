import { useState, useEffect, useCallback } from 'react';
import { supabase, type Asset, type UserRecord, type Category, type Manufacturer, type Location, type Accessory, type Consumable, type License } from '@/lib/supabase';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { LayoutDashboard, Boxes, Users, MapPin, Tags, Building2, Settings, Package, KeyRound, PackageCheck, ScrollText, Search, Menu, X, Globe, ClipboardCheck } from 'lucide-react';
import Dashboard from '@/pages/Dashboard';
import AssetsPage from '@/pages/Assets';
import AssetDetail from '@/pages/AssetDetail';
import UsersPage from '@/pages/Users';
import LocationsPage from '@/pages/Locations';
import CategoriesPage from '@/pages/Categories';
import ManufacturersPage from '@/pages/Manufacturers';
import AccessoriesPage from '@/pages/Accessories';
import ConsumablesPage from '@/pages/Consumables';
import LicensesPage from '@/pages/Licenses';
import ActivityPage from '@/pages/Activity';
import SettingsPage from '@/pages/Settings';
import DeployedAssetsPage from '@/pages/DeployedAssets';

export type Page =
  | { name: 'dashboard' }
  | { name: 'assets' }
  | { name: 'deployed-assets' }
  | { name: 'asset-detail'; id: string }
  | { name: 'users' }
  | { name: 'locations' }
  | { name: 'categories' }
  | { name: 'manufacturers' }
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
  { labelKey: 'assets', icon: Boxes, page: 'assets', group: 'inventory' },
  { labelKey: 'deployedAssets', icon: ClipboardCheck, page: 'deployed-assets', group: 'inventory' },
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
  const [page, setPage] = useState<Page>({ name: 'dashboard' });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
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
      .select('*, manufacturer:manufacturers(*), category:categories(*)')
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

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refreshAll();
      setLoading(false);
    })();
  }, [refreshAll]);

  const navigate = (p: Page) => {
    setPage(p);
    setSidebarOpen(false);
  };

  const handleCheckinFromList = async (asset: Asset) => {
    if (!asset.assigned_to_id) return;
    await supabase.from('checkout_history').insert({
      asset_id: asset.id,
      assigned_to_id: asset.assigned_to_id,
      action: 'checkin',
      note: 'Checked in from deployed list',
    });
    await supabase.from('assets').update({ assigned_to_id: null, status: 'ready' }).eq('id', asset.id);
    fetchAssets();
  };

  const groups = Array.from(new Set(NAV_ITEMS.map((i) => i.group)));
  const activePage = page.name === 'asset-detail' ? 'assets' : page.name;
  const currentLabelKey = NAV_ITEMS.find((i) => i.page === activePage)?.labelKey || 'dashboard';

  const renderPage = () => {
    switch (page.name) {
      case 'dashboard':
        return <Dashboard assets={assets} users={users} locations={locations} categories={categories} accessories={accessories} consumables={consumables} licenses={licenses} navigate={navigate} />;
      case 'assets':
        return <AssetsPage assets={assets} loading={loading} categories={categories} manufacturers={manufacturers} locations={locations} users={users} onRefresh={fetchAssets} navigate={navigate} globalSearch={globalSearch} />;
      case 'deployed-assets':
        return <DeployedAssetsPage assets={assets} users={users} loading={loading} navigate={navigate} onCheckin={handleCheckinFromList} />;
      case 'asset-detail':
        return <AssetDetail assetId={page.id} navigate={navigate} onRefresh={fetchAssets} users={users} locations={locations} />;
      case 'users':
        return <UsersPage users={users} locations={locations} assets={assets} onRefresh={fetchUsers} />;
      case 'locations':
        return <LocationsPage locations={locations} assets={assets} users={users} onRefresh={fetchLocations} />;
      case 'categories':
        return <CategoriesPage categories={categories} assets={assets} onRefresh={fetchCategories} />;
      case 'manufacturers':
        return <ManufacturersPage manufacturers={manufacturers} assets={assets} onRefresh={fetchManufacturers} />;
      case 'accessories':
        return <AccessoriesPage accessories={accessories} categories={categories} manufacturers={manufacturers} onRefresh={fetchAccessories} />;
      case 'consumables':
        return <ConsumablesPage consumables={consumables} categories={categories} manufacturers={manufacturers} onRefresh={fetchConsumables} />;
      case 'licenses':
        return <LicensesPage licenses={licenses} categories={categories} manufacturers={manufacturers} onRefresh={fetchLicenses} />;
      case 'activity':
        return <ActivityPage />;
      case 'settings':
        return <SettingsPage />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-800">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-600 text-white">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">{t('assetTracker')}</h1>
            <p className="text-xs text-slate-500">{t('itInventorySystem')}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3">
          {groups.map((group) => (
            <div key={group} className="mb-5">
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t(group)}</p>
              {NAV_ITEMS.filter((i) => i.group === group).map((item) => {
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
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 cursor-pointer">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-600 text-white text-sm font-semibold">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{t('admin')}</p>
              <p className="text-xs text-slate-500 truncate">admin@company.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-3 h-16 px-4 lg:px-6 bg-white border-b border-gray-200 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <h2 className="text-lg font-semibold text-gray-900">{t(currentLabelKey)}</h2>

          <div className="ml-auto flex items-center gap-3">
            {/* Language toggle */}
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

            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('searchAssets')}
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  if (page.name !== 'assets') navigate({ name: 'assets' });
                }}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors"
              />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="animate-fade-in">{renderPage()}</div>
        </main>
      </div>
    </div>
  );
}
