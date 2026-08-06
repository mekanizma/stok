import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type Lang = 'tr' | 'en';

export const translations = {
  // ---- Navigation ----
  dashboard: { tr: 'Panel', en: 'Dashboard' },
  assets: { tr: 'Demirbaşlar', en: 'Assets' },
  deployedAssets: { tr: 'Zimmetli', en: 'Deployed' },
  accessories: { tr: 'Aksesuarlar', en: 'Accessories' },
  consumables: { tr: 'Sarf Malzemeler', en: 'Consumables' },
  licenses: { tr: 'Lisanslar', en: 'Licenses' },
  users: { tr: 'Kullanıcılar', en: 'Users' },
  locations: { tr: 'Konumlar', en: 'Locations' },
  categories: { tr: 'Kategoriler', en: 'Categories' },
  manufacturers: { tr: 'Üreticiler', en: 'Manufacturers' },
  activityLog: { tr: 'Aktivite Kaydı', en: 'Activity Log' },
  settings: { tr: 'Ayarlar', en: 'Settings' },

  // ---- Groups ----
  overview: { tr: 'Genel Bakış', en: 'Overview' },
  inventory: { tr: 'Envanter', en: 'Inventory' },
  peoplePlaces: { tr: 'Kişiler & Yerler', en: 'People & Places' },
  settingsGroup: { tr: 'Ayarlar', en: 'Settings' },

  // ---- Common ----
  add: { tr: 'Ekle', en: 'Add' },
  edit: { tr: 'Düzenle', en: 'Edit' },
  delete: { tr: 'Sil', en: 'Delete' },
  save: { tr: 'Kaydet', en: 'Save' },
  cancel: { tr: 'İptal', en: 'Cancel' },
  search: { tr: 'Ara', en: 'Search' },
  filter: { tr: 'Filtrele', en: 'Filter' },
  filters: { tr: 'Filtreler', en: 'Filters' },
  all: { tr: 'Tümü', en: 'All' },
  none: { tr: 'Yok', en: 'None' },
  saving: { tr: 'Kaydediliyor...', en: 'Saving...' },
  loading: { tr: 'Yükleniyor...', en: 'Loading...' },
  confirm: { tr: 'Onayla', en: 'Confirm' },
  yes: { tr: 'Evet', en: 'Yes' },
  no: { tr: 'Hayır', en: 'No' },
  back: { tr: 'Geri', en: 'Back' },
  viewAll: { tr: 'Tümünü Gör', en: 'View all' },
  actions: { tr: 'İşlemler', en: 'Actions' },
  name: { tr: 'Ad', en: 'Name' },
  type: { tr: 'Tip', en: 'Type' },
  color: { tr: 'Renk', en: 'Color' },
  status: { tr: 'Durum', en: 'Status' },
  category: { tr: 'Kategori', en: 'Category' },
  manufacturer: { tr: 'Üretici', en: 'Manufacturer' },
  location: { tr: 'Konum', en: 'Location' },
  serial: { tr: 'Seri No', en: 'Serial' },
  model: { tr: 'Model', en: 'Model' },
  quantity: { tr: 'Adet', en: 'Quantity' },
  seats: { tr: 'Lisans Adedi', en: 'Seats' },
  notes: { tr: 'Notlar', en: 'Notes' },
  email: { tr: 'E-posta', en: 'Email' },
  phone: { tr: 'Telefon', en: 'Phone' },
  address: { tr: 'Adres', en: 'Address' },
  city: { tr: 'Şehir', en: 'City' },
  country: { tr: 'Ülke', en: 'Country' },
  website: { tr: 'Web Sitesi', en: 'Website' },
  supportUrl: { tr: 'Destek URL', en: 'Support URL' },
  jobTitle: { tr: 'Ünvan', en: 'Job Title' },
  employeeNum: { tr: 'Çalışan No', en: 'Employee #' },
  firstName: { tr: 'Ad', en: 'First Name' },
  lastName: { tr: 'Soyad', en: 'Last Name' },
  assetTag: { tr: 'Demirbaş Etiketi', en: 'Asset Tag' },
  purchaseDate: { tr: 'Satın Alma Tarihi', en: 'Purchase Date' },
  purchaseCost: { tr: 'Satın Alma Bedeli', en: 'Purchase Cost' },
  warranty: { tr: 'Garanti', en: 'Warranty' },
  warrantyMonths: { tr: 'Garanti (ay)', en: 'Warranty (months)' },
  expirationDate: { tr: 'Bitiş Tarihi', en: 'Expiration Date' },
  assignedTo: { tr: 'Atanan Kişi', en: 'Assigned To' },
  defaultLocation: { tr: 'Varsayılan Konum', en: 'Default Location' },
  notAssigned: { tr: 'Atanmamış', en: 'Not assigned' },
  employee: { tr: 'Çalışan', en: 'Employee' },

  // ---- Statuses ----
  ready: { tr: 'Hazır', en: 'Ready' },
  deployed: { tr: 'Zimmetli', en: 'Deployed' },
  pending: { tr: 'Beklemede', en: 'Pending' },
  broken: { tr: 'Bozuk', en: 'Broken' },
  lost: { tr: 'Kayıp', en: 'Lost' },
  allStatuses: { tr: 'Tüm Durumlar', en: 'All Statuses' },
  allCategories: { tr: 'Tüm Kategoriler', en: 'All Categories' },

  // ---- Actions ----
  addAsset: { tr: 'Demirbaş Ekle', en: 'Add Asset' },
  addAccessory: { tr: 'Aksesuar Ekle', en: 'Add Accessory' },
  addConsumable: { tr: 'Sarf Malzeme Ekle', en: 'Add Consumable' },
  addLicense: { tr: 'Lisans Ekle', en: 'Add License' },
  addUser: { tr: 'Kullanıcı Ekle', en: 'Add User' },
  addLocation: { tr: 'Konum Ekle', en: 'Add Location' },
  addCategory: { tr: 'Kategori Ekle', en: 'Add Category' },
  addManufacturer: { tr: 'Üretici Ekle', en: 'Add Manufacturer' },
  editAsset: { tr: 'Demirbaş Düzenle', en: 'Edit Asset' },
  editAccessory: { tr: 'Aksesuar Düzenle', en: 'Edit Accessory' },
  editConsumable: { tr: 'Sarf Malzeme Düzenle', en: 'Edit Consumable' },
  editLicense: { tr: 'Lisans Düzenle', en: 'Edit License' },
  editUser: { tr: 'Kullanıcı Düzenle', en: 'Edit User' },
  editLocation: { tr: 'Konum Düzenle', en: 'Edit Location' },
  editCategory: { tr: 'Kategori Düzenle', en: 'Edit Category' },
  editManufacturer: { tr: 'Üretici Düzenle', en: 'Edit Manufacturer' },
  checkOut: { tr: 'Zimmetle', en: 'Check Out' },
  checkIn: { tr: 'Geri Al', en: 'Check In' },
  checkout: { tr: 'Zimmet', en: 'checkout' },
  checkin: { tr: 'İade', en: 'checkin' },
  audit: { tr: 'Denetim', en: 'audit' },
  assignTo: { tr: 'Atanan Kişi', en: 'Assign to' },
  selectUser: { tr: 'Kullanıcı seç...', en: 'Select a user...' },

  // ---- Dashboard ----
  itAssetDashboard: { tr: 'IT Demirbaş Paneli', en: 'IT Asset Dashboard' },
  dashboardSubtitle: { tr: 'Tüm IT envanterinizi tek bir yerden takip edin', en: 'Track and manage all your IT inventory in one place' },
  totalAssets: { tr: 'Toplam Demirbaş', en: 'Total Assets' },
  readyToDeploy: { tr: 'Kullanıma Hazır', en: 'Ready to Deploy' },
  brokenLost: { tr: 'Bozuk / Kayıp', en: 'Broken / Lost' },
  assetsByCategory: { tr: 'Kategoriye Göre Demirbaşlar', en: 'Assets by Category' },
  inventoryValue: { tr: 'Envanter Değeri', en: 'Inventory Value' },
  totalPurchaseCost: { tr: 'Toplam satın alma bedeli', en: 'Total purchase cost' },
  avgCostPerAsset: { tr: 'Demirbaş başına ort. maliyet', en: 'Avg. cost per asset' },
  pendingSetup: { tr: 'Kurulum bekleyen', en: 'Pending setup' },
  needsRepair: { tr: 'Onarım gereken', en: 'Needs repair' },
  recentlyAdded: { tr: 'Son Eklenenler', en: 'Recently Added' },
  recentActivity: { tr: 'Son Aktiviteler', en: 'Recent Activity' },
  noDataYet: { tr: 'Henüz veri yok', en: 'No data yet' },
  noAssetsYet: { tr: 'Henüz demirbaş yok', en: 'No assets yet' },
  noActivityYet: { tr: 'Henüz aktivite yok', en: 'No activity yet' },
  assetsAssigned: { tr: 'demirbaş atandı', en: 'assets assigned' },

  // ---- Assets page ----
  deployedAssetsDesc: { tr: 'Zimmetli cihazlar ve atanan kişiler', en: 'Deployed assets and their assignees' },
  noDeployedAssets: { tr: 'Zimmetli cihaz yok', en: 'No deployed assets' },
  noDeployedAssetsDesc: { tr: 'Henüz kimseye zimmetlenmiş cihaz bulunmuyor.', en: 'No assets have been checked out to anyone yet.' },
  searchPlaceholder: { tr: 'İsim, etiket, seri no ile ara...', en: 'Search by name, tag, serial...' },
  ofAssets: { tr: 'demirbaşın', en: 'of assets' },
  noAssetsFound: { tr: 'Demirbaş bulunamadı', en: 'No assets found' },
  addFirstAsset: { tr: 'Başlamak için ilk demirbaşınızı ekleyin.', en: 'Add your first asset to get started.' },
  adjustFilters: { tr: 'Arama veya filtrelerinizi ayarlamayı deneyin.', en: 'Try adjusting your search or filters.' },
  autoGenerated: { tr: 'Boş bırakılırsa otomatik oluşturulur', en: 'Auto-generated if empty' },

  // ---- Delete confirmations ----
  deleteAsset: { tr: 'Demirbaş Sil', en: 'Delete Asset' },
  deleteAssetMsg: { tr: ' silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.', en: 'Are you sure you want to delete "' },
  deleteAssetMsgEnd: { tr: '"? Bu işlem geri alınamaz.', en: '"? This action cannot be undone.' },
  deleteUser: { tr: 'Kullanıcı Sil', en: 'Delete User' },
  deleteUserMsg: { tr: ' silmek istediğinizden emin misiniz? Atanmış demirbaşları atanmamış duruma gelecektir.', en: 'Are you sure you want to delete "' },
  deleteUserMsgEnd: { tr: '"? Their assigned assets will become unassigned.', en: '"? Their assigned assets will become unassigned.' },
  deleteLocation: { tr: 'Konum Sil', en: 'Delete Location' },
  deleteCategory: { tr: 'Kategori Sil', en: 'Delete Category' },
  deleteManufacturer: { tr: 'Üretici Sil', en: 'Delete Manufacturer' },
  deleteAccessory: { tr: 'Aksesuar Sil', en: 'Delete Accessory' },
  deleteConsumable: { tr: 'Sarf Malzeme Sil', en: 'Delete Consumable' },
  deleteLicense: { tr: 'Lisans Sil', en: 'Delete License' },
  deleteConfirm: { tr: ' silmek istediğinizden emin misiniz?', en: 'Are you sure you want to delete "' },

  // ---- Empty states ----
  noUsersYet: { tr: 'Henüz kullanıcı yok', en: 'No users yet' },
  addUsersToAssign: { tr: 'Demirbaş atamak için kullanıcı ekleyin.', en: 'Add users to assign assets to.' },
  noLocationsYet: { tr: 'Henüz konum yok', en: 'No locations yet' },
  addLocationsToTrack: { tr: 'Demirbaşların nerede saklandığını takip edin.', en: 'Add locations to track where assets are stored.' },
  noCategoriesYet: { tr: 'Henüz kategori yok', en: 'No categories yet' },
  addCategoriesToClassify: { tr: 'Demirbaşları sınıflandırmak için kategori ekleyin.', en: 'Add categories to classify your assets, accessories, and licenses.' },
  noManufacturersYet: { tr: 'Henüz üretici yok', en: 'No manufacturers yet' },
  addManufacturersToTrack: { tr: 'Demirbaş markalarını takip edin.', en: 'Add manufacturers to track asset brands.' },
  noAccessoriesYet: { tr: 'Henüz aksesuar yok', en: 'No accessories yet' },
  addAccessoriesDesc: { tr: 'Klavye, mouse ve kulaklık gibi aksesuarlar ekleyin.', en: 'Add accessories like keyboards, mice, and headsets.' },
  noConsumablesYet: { tr: 'Henüz sarf malzeme yok', en: 'No consumables yet' },
  addConsumablesDesc: { tr: 'Kablo, toner ve batarya gibi sarf malzemeler ekleyin.', en: 'Add consumables like cables, toner, and batteries.' },
  noLicensesYet: { tr: 'Henüz lisans yok', en: 'No licenses yet' },
  addLicensesDesc: { tr: 'Lisans adetlerini ve bitiş tarihlerini takip edin.', en: 'Add software licenses to track seats and expirations.' },
  noHistoryYet: { tr: 'Henüz kayıt yok', en: 'No history yet' },
  assetNotFound: { tr: 'Demirbaş bulunamadı.', en: 'Asset not found.' },
  backToAssets: { tr: 'Demirbaşlara Dön', en: 'Back to Assets' },

  // ---- Page descriptions ----
  assetsCount: { tr: 'demirbaş', en: 'assets' },
  usersInSystem: { tr: 'sistemde kullanıcı', en: 'users in the system' },
  locationsCount: { tr: 'konum', en: 'locations' },
  categoriesCount: { tr: 'kategori', en: 'categories' },
  manufacturersCount: { tr: 'üretici', en: 'manufacturers' },
  accessoryTypes: { tr: 'aksesuar türü', en: 'accessory types' },
  consumableTypes: { tr: 'sarf malzeme türü', en: 'consumable types' },
  softwareLicenses: { tr: 'yazılım lisansı', en: 'software licenses' },

  // ---- Asset detail ----
  assetDetails: { tr: 'Demirbaş Detayları', en: 'Asset Details' },
  checkoutHistory: { tr: 'Zimmet Geçmişi', en: 'Checkout History' },
  assignAssetTo: { tr: 'zimmetleyin.', en: 'to a user.' },
  assign: { tr: 'Ata', en: 'Assign' },
  system: { tr: 'Sistem', en: 'System' },

  // ---- Users page ----
  available: { tr: 'Mevcut', en: 'Available' },
  remaining: { tr: 'Kalan', en: 'Remaining' },

  // ---- Licenses ----
  expired: { tr: 'Süresi Doldu', en: 'Expired' },
  expiringSoon: { tr: 'Yakında Bitiyor', en: 'Expiring soon' },

  // ---- Activity page ----
  activityLogDesc: { tr: 'Tüm demirbaşların zimmet ve iade geçmişi', en: 'Checkout and checkin history across all assets' },
  initialDeployment: { tr: 'İlk dağıtım', en: 'Initial deployment' },
  checkedOutFromAssets: { tr: 'Zimmetlendirildi', en: 'Checked out from assets page' },
  checkedOutFromDetail: { tr: 'Zimmetlendirildi', en: 'Checked out from detail page' },
  checkedIn: { tr: 'İade edildi', en: 'Checked in' },

  // ---- Settings page ----
  systemConfig: { tr: 'Sistem yapılandırması ve bilgileri', en: 'System configuration and information' },
  systemInformation: { tr: 'Sistem Bilgileri', en: 'System Information' },
  version: { tr: 'Sürüm', en: 'Version' },
  database: { tr: 'Veritabanı', en: 'Database' },
  environment: { tr: 'Ortam', en: 'Environment' },
  authentication: { tr: 'Kimlik Doğrulama', en: 'Authentication' },
  singleTenant: { tr: 'Tek kiracı', en: 'Single-tenant' },
  production: { tr: 'Üretim', en: 'Production' },
  modules: { tr: 'Modüller', en: 'Modules' },
  active: { tr: 'Aktif', en: 'Active' },
  hardwareInventory: { tr: 'Donanım envanter yönetimi', en: 'Hardware inventory management' },
  peripheralTracking: { tr: 'Çevre birimi takibi', en: 'Peripheral tracking' },
  consumableInventory: { tr: 'Sarf malzeme envanteri', en: 'Consumable inventory' },
  softwareLicenseTracking: { tr: 'Yazılım lisans takibi', en: 'Software license tracking' },
  userManagement: { tr: 'Kullanıcı yönetimi', en: 'User management' },
  locationManagement: { tr: 'Konum yönetimi', en: 'Location management' },
  about: { tr: 'Hakkında', en: 'About' },
  aboutDesc: { tr: 'AssetTracker, Snipe-IT\'ten ilham alınmış bir IT demirbaş yönetim sistemidir. Donanım demirbaşlarını, aksesuarları, sarf malzemeleri ve yazılım lisanslarını kuruluşunuz genelinde takip etmenize yardımcı olur. Kullanıcıları, konumları, üreticileri ve kategorileri tam zimmet/iade geçmişiyle yönetin.', en: 'AssetTracker is an IT asset management system inspired by Snipe-IT. It helps you track hardware assets, accessories, consumables, and software licenses across your organization. Manage users, locations, manufacturers, and categories with full checkout/checkin history.' },

  // ---- Deployment document ----
  deploymentDocument: { tr: 'Zimmet Tutanağı', en: 'Deployment Document' },
  printDocument: { tr: 'Belgeyi Yazdır', en: 'Print Document' },
  downloadPDF: { tr: 'PDF İndir', en: 'Download PDF' },
  documentNo: { tr: 'Tutanak No', en: 'Document No' },
  date: { tr: 'Tarih', en: 'Date' },
  assetInformation: { tr: 'Demirbaş Bilgileri', en: 'Asset Information' },
  assignedToInfo: { tr: 'Zimmetlenen Kişi Bilgileri', en: 'Assignee Information' },
  fullName: { tr: 'Ad Soyad', en: 'Full Name' },
  title: { tr: 'Ünvan', en: 'Title' },
  employeeNumber: { tr: 'Sicil No', en: 'Employee Number' },
  department: { tr: 'Departman', en: 'Department' },
  description: { tr: 'Açıklama', en: 'Description' },
  declaration: { tr: 'Beyan', en: 'Declaration' },
  declarationText: { tr: 'Yukarıda demirbaş nitelikleri belirtilen cihazın, tarafıma zimmetlendiğini teslim aldığımı ve cihazın kullanımı sırasında oluşabilecek hasar ve kayıplardan sorumlu olduğumu kabul ediyorum.', en: 'I acknowledge that I have received the device described above and accept responsibility for any damage or loss that may occur during its use.' },
  givenBy: { tr: 'Zimmeti Veren', en: 'Given By' },
  receivedBy: { tr: 'Zimmeti Alan', en: 'Received By' },
  signature: { tr: 'İmza', en: 'Signature' },
  nameSurname: { tr: 'Ad Soyad', en: 'Name Surname' },

  // ---- App ----
  assetTracker: { tr: 'AssetTracker', en: 'AssetTracker' },
  itInventorySystem: { tr: 'IT Envanter Sistemi', en: 'IT Inventory System' },
  admin: { tr: 'Yönetici', en: 'Admin' },
  searchAssets: { tr: 'Demirbaş ara...', en: 'Search assets...' },
} as const;

export type TranslationKey = keyof typeof translations;

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('lang');
    return (saved === 'tr' || saved === 'en') ? saved : 'tr';
  });

  const handleSetLang = useCallback((l: Lang) => {
    setLang(l);
    localStorage.setItem('lang', l);
  }, []);

  const t = useCallback((key: TranslationKey) => {
    return translations[key]?.[lang] || key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
