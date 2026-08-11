import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export type Lang = 'tr' | 'en';

export const translations = {
  // ---- Navigation ----
  dashboard: { tr: 'Panel', en: 'Dashboard' },
  assets: { tr: 'Demirbaşlar', en: 'Assets' },
  deployedAssets: { tr: 'Zimmetli', en: 'Deployed' },
  checkedInAssets: { tr: 'Teslim Alınanlar', en: 'Returned' },
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

  // ---- Category types (singular) ----
  asset: { tr: 'Demirbaş', en: 'Asset' },
  license: { tr: 'Lisans', en: 'License' },
  accessory: { tr: 'Aksesuar', en: 'Accessory' },
  consumable: { tr: 'Sarf Malzeme', en: 'Consumable' },

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
  saveFailed: { tr: 'Kayıt başarısız. Lütfen tekrar deneyin.', en: 'Save failed. Please try again.' },
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
  months: { tr: 'ay', en: 'months' },
  expirationDate: { tr: 'Bitiş Tarihi', en: 'Expiration Date' },
  assignedTo: { tr: 'Atanan Kişi', en: 'Assigned To' },
  defaultLocation: { tr: 'Varsayılan Konum', en: 'Default Location' },
  notAssigned: { tr: 'Atanmamış', en: 'Not assigned' },
  employee: { tr: 'Çalışan', en: 'Employee' },
  exampleUrl: { tr: 'https://ornek.com', en: 'https://example.com' },

  // ---- Placeholders ----
  placeholderAssetName: { tr: 'örn. MacBook Pro 16', en: 'e.g. MacBook Pro 16' },
  placeholderEmail: { tr: 'ornek@sirket.com', en: 'name@company.com' },
  placeholderPersonName: { tr: 'örn. Ahmet Yılmaz', en: 'e.g. John Smith' },
  placeholderAccessoryName: { tr: 'örn. Logitech MX Master 3S', en: 'e.g. Logitech MX Master 3S' },
  placeholderConsumableName: { tr: 'örn. USB-C Kablo 2m', en: 'e.g. USB-C Cable 2m' },
  placeholderLicenseName: { tr: 'örn. Microsoft 365 Business', en: 'e.g. Microsoft 365 Business' },
  placeholderLocationName: { tr: 'örn. Merkez Ofis', en: 'e.g. Main Office' },
  placeholderCategoryName: { tr: 'örn. Dizüstü Bilgisayar', en: 'e.g. Laptops' },
  placeholderManufacturerName: { tr: 'örn. Dell', en: 'e.g. Dell' },

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
  addCheckout: { tr: 'Zimmet Ekle', en: 'Add Assignment' },
  editCheckout: { tr: 'Zimmet Düzenle', en: 'Edit Assignment' },
  viewDetails: { tr: 'Detayı Görüntüle', en: 'View Details' },
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
  checkInConfirmTitle: { tr: 'Teslim Almayı Onayla', en: 'Confirm Check In' },
  checkInConfirmMsg: { tr: '"{name}" cihazını teslim almak istediğinize emin misiniz? Cihaz Teslim Alınanlar listesine taşınacak.', en: 'Are you sure you want to check in "{name}"? The device will be moved to Returned.' },
  checkout: { tr: 'Zimmet', en: 'Checkout' },
  checkin: { tr: 'İade', en: 'Check-in' },
  audit: { tr: 'Denetim', en: 'Audit' },
  assignTo: { tr: 'Atanan Kişi', en: 'Assign to' },
  selectUser: { tr: 'Kullanıcı seç...', en: 'Select a user...' },

  // ---- Dashboard ----
  itAssetDashboard: { tr: 'IT Demirbaş Paneli', en: 'IT Asset Dashboard' },
  dashboardSubtitle: { tr: 'Tüm IT envanterinizi tek bir yerden takip edin', en: 'Track and manage all your IT inventory in one place' },
  totalAssets: { tr: 'Toplam Demirbaş', en: 'Total Assets' },
  readyToDeploy: { tr: 'Teslim Alınan', en: 'Returned' },
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
  checkedInAssetsDesc: { tr: 'Teslim alınan / iade edilen zimmetler', en: 'Returned / checked-in assignments' },
  noDeployedAssets: { tr: 'Zimmetli cihaz yok', en: 'No deployed assets' },
  noDeployedAssetsDesc: { tr: 'Henüz kimseye zimmetlenmiş cihaz bulunmuyor. Yeni zimmet ekleyebilirsiniz.', en: 'No assets have been checked out yet. You can add a new assignment.' },
  noCheckedInAssets: { tr: 'Teslim alınan zimmet yok', en: 'No returned assets' },
  noCheckedInAssetsDesc: { tr: 'Zimmetli listesinden teslim alınan cihazlar burada görünür.', en: 'Assets checked in from the deployed list will appear here.' },
  returnedBy: { tr: 'Teslim Eden', en: 'Returned By' },
  returnedAt: { tr: 'Teslim Tarihi', en: 'Returned At' },
  searchPlaceholder: { tr: 'İsim, etiket, seri no ile ara...', en: 'Search by name, tag, serial...' },
  ofAssets: { tr: 'demirbaşın', en: 'of' },
  noAssetsFound: { tr: 'Demirbaş bulunamadı', en: 'No assets found' },
  addFirstAsset: { tr: 'Başlamak için ilk demirbaşınızı ekleyin.', en: 'Add your first asset to get started.' },
  adjustFilters: { tr: 'Arama veya filtrelerinizi ayarlamayı deneyin.', en: 'Try adjusting your search or filters.' },
  autoGenerated: { tr: 'Boş bırakılırsa otomatik oluşturulur', en: 'Auto-generated if empty' },

  // ---- Delete confirmations (use {name}) ----
  deleteAsset: { tr: 'Demirbaş Sil', en: 'Delete Asset' },
  deleteAssetConfirm: { tr: '"{name}" silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.', en: 'Are you sure you want to delete "{name}"? This action cannot be undone.' },
  deleteCheckout: { tr: 'Zimmeti Sil', en: 'Delete Assignment' },
  deleteCheckoutConfirm: { tr: '"{name}" zimmet kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.', en: 'Are you sure you want to delete the assignment for "{name}"? This cannot be undone.' },
  deleteUser: { tr: 'Kullanıcı Sil', en: 'Delete User' },
  deleteUserConfirm: { tr: '"{name}" silmek istediğinizden emin misiniz? Atanmış demirbaşları atanmamış duruma gelecektir.', en: 'Are you sure you want to delete "{name}"? Their assigned assets will become unassigned.' },
  deleteLocation: { tr: 'Konum Sil', en: 'Delete Location' },
  deleteCategory: { tr: 'Kategori Sil', en: 'Delete Category' },
  deleteManufacturer: { tr: 'Üretici Sil', en: 'Delete Manufacturer' },
  deleteAccessory: { tr: 'Aksesuar Sil', en: 'Delete Accessory' },
  deleteConsumable: { tr: 'Sarf Malzeme Sil', en: 'Delete Consumable' },
  deleteLicense: { tr: 'Lisans Sil', en: 'Delete License' },
  deleteConfirm: { tr: '"{name}" silmek istediğinizden emin misiniz?', en: 'Are you sure you want to delete "{name}"?' },

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
  backToDeployed: { tr: 'Zimmetlilere Dön', en: 'Back to Deployed' },
  backToCheckedIn: { tr: 'Teslim Alınanlara Dön', en: 'Back to Returned' },

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
  assignAssetTo: { tr: 'kullanıcıya zimmetleyin.', en: 'to a user.' },
  assign: { tr: 'Ata', en: 'Assign' },
  performedBy: { tr: 'Yapan', en: 'Performed by' },
  assignedPerson: { tr: 'Zimmetlenen', en: 'Assignee' },
  system: { tr: 'Sistem', en: 'System' },

  // ---- Qty / stock ----
  available: { tr: 'Mevcut', en: 'Available' },
  remaining: { tr: 'Kalan', en: 'Remaining' },
  inStock: { tr: 'Stokta', en: 'In stock' },
  used: { tr: 'Kullanılan', en: 'Used' },
  totalStock: { tr: 'Toplam Stok', en: 'Total Stock' },
  lowStock: { tr: 'Düşük Stok', en: 'Low Stock' },
  lowStockQty: { tr: 'Düşük stok miktarı', en: 'Low stock quantity' },
  lowStockQtyHint: { tr: 'Kalan stok bu sayının altına düşünce uyarı gösterilir.', en: 'Warning shows when remaining stock falls to this number or below.' },
  stockOk: { tr: 'Yeterli', en: 'Sufficient' },
  stockMedium: { tr: 'Orta', en: 'Medium' },
  stockLow: { tr: 'Azalıyor', en: 'Running low' },
  stockEmpty: { tr: 'Tükendi', en: 'Out of stock' },
  searchInventory: { tr: 'İsim, üretici veya kategori ara...', en: 'Search by name, manufacturer or category...' },
  accessoriesDesc: { tr: 'Klavye, mouse, kulaklık gibi çevre birimleri', en: 'Peripherals like keyboards, mice, and headsets' },
  consumablesDesc: { tr: 'Kablo, toner ve batarya gibi sarf malzemeler', en: 'Consumables like cables, toner, and batteries' },
  noResults: { tr: 'Sonuç bulunamadı', en: 'No results found' },
  items: { tr: 'kalem', en: 'items' },

  // ---- Licenses ----
  expired: { tr: 'Süresi Doldu', en: 'Expired' },
  expiringSoon: { tr: 'Yakında Bitiyor', en: 'Expiring soon' },

  // ---- Activity page ----
  activityLogDesc: { tr: 'Tüm demirbaşların zimmet ve iade geçmişi', en: 'Checkout and checkin history across all assets' },
  initialDeployment: { tr: 'İlk dağıtım', en: 'Initial deployment' },
  checkedOutFromAssets: { tr: 'Demirbaşlar sayfasından zimmetlendi', en: 'Checked out from assets page' },
  checkedOutFromDetail: { tr: 'Detay sayfasından zimmetlendi', en: 'Checked out from detail page' },
  checkedIn: { tr: 'İade edildi', en: 'Checked in' },
  checkedInFromDeployed: { tr: 'Zimmetli listesinden iade edildi', en: 'Checked in from deployed list' },

  // ---- Settings page ----
  systemConfig: { tr: 'Sistem yapılandırması ve bilgileri', en: 'System configuration and information' },
  systemInformation: { tr: 'Sistem Bilgileri', en: 'System Information' },
  version: { tr: 'Sürüm', en: 'Version' },
  database: { tr: 'Veritabanı', en: 'Database' },
  databaseMock: { tr: 'Yerel mock veri (bellek)', en: 'Local mock data (in-memory)' },
  databaseSupabase: { tr: 'Supabase (PostgreSQL)', en: 'Supabase (PostgreSQL)' },
  environment: { tr: 'Ortam', en: 'Environment' },
  authentication: { tr: 'Kimlik Doğrulama', en: 'Authentication' },
  singleTenant: { tr: 'Tek kiracı', en: 'Single-tenant' },
  production: { tr: 'Üretim', en: 'Production' },
  demoMode: { tr: 'Demo', en: 'Demo' },
  modules: { tr: 'Modüller', en: 'Modules' },
  active: { tr: 'Aktif', en: 'Active' },
  hardwareInventory: { tr: 'Donanım envanter yönetimi', en: 'Hardware inventory management' },
  peripheralTracking: { tr: 'Çevre birimi takibi', en: 'Peripheral tracking' },
  consumableInventory: { tr: 'Sarf malzeme envanteri', en: 'Consumable inventory' },
  softwareLicenseTracking: { tr: 'Yazılım lisans takibi', en: 'Software license tracking' },
  userManagement: { tr: 'Kullanıcı yönetimi', en: 'User management' },
  locationManagement: { tr: 'Konum yönetimi', en: 'Location management' },
  about: { tr: 'Hakkında', en: 'About' },
  aboutDesc: {
    tr: 'Bu yazılım, Final Üniversitesi Bilgi İşlem Departmanı tarafından hazırlanan bir IT stok takip programıdır. Üniversite bünyesindeki demirbaş, zimmet, aksesuar, sarf malzemesi ve yazılım lisanslarının düzenli ve güvenli biçimde takip edilmesini amaçlar.',
    en: 'This software is an IT stock tracking program developed by the Final University Information Technology Department. It is designed to track university assets, assignments, accessories, consumables, and software licenses in an organized and secure way.',
  },
  language: { tr: 'Dil', en: 'Language' },

  // ---- Deployment document ----
  deploymentDocument: { tr: 'Zimmet Tutanağı', en: 'Deployment Document' },
  universityName: { tr: 'FİNAL ÜNİVERSİTESİ', en: 'FINAL UNIVERSITY' },
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
  declarationText: {
    tr: 'Yukarıda demirbaş nitelikleri belirtilen cihazın, tarafıma zimmetlendiğini teslim aldığımı ve cihazın kullanımı sırasında oluşabilecek hasar ve kayıplardan sorumlu olduğumu kabul ediyorum.',
    en: 'I acknowledge that I have received the device described above and accept responsibility for any damage or loss that may occur during its use.',
  },
  givenBy: { tr: 'Zimmeti Veren', en: 'Given By' },
  receivedBy: { tr: 'Zimmeti Alan', en: 'Received By' },
  signature: { tr: 'İmza', en: 'Signature' },
  nameSurname: { tr: 'Ad Soyad', en: 'Name Surname' },

  // ---- App ----
  assetTracker: { tr: 'FİNAL ÜNİVERSİTESİ', en: 'FINAL UNIVERSITY' },
  itInventorySystem: { tr: 'IT Envanter Sistemi', en: 'IT Inventory System' },
  admin: { tr: 'Yönetici', en: 'Admin' },
  searchAssets: { tr: 'Zimmet ara...', en: 'Search assignments...' },
  appTitle: { tr: 'FİNAL ÜNİVERSİTESİ — IT Envanter Yönetimi', en: 'FINAL UNIVERSITY — IT Inventory Management' },
  adminProfile: { tr: 'Yönetici Profili', en: 'Admin Profile' },
  currentPassword: { tr: 'Mevcut Şifre', en: 'Current Password' },
  newPassword: { tr: 'Yeni Şifre', en: 'New Password' },
  confirmPassword: { tr: 'Yeni Şifre (Tekrar)', en: 'Confirm New Password' },
  changePasswordOptional: { tr: 'Şifre değiştirmek istemiyorsanız boş bırakın.', en: 'Leave blank if you do not want to change the password.' },
  profileSaved: { tr: 'Profil kaydedildi.', en: 'Profile saved.' },
  passwordMismatch: { tr: 'Yeni şifreler eşleşmiyor.', en: 'New passwords do not match.' },
  wrongCurrentPassword: { tr: 'Mevcut şifre hatalı.', en: 'Current password is incorrect.' },
  saveProfile: { tr: 'Kaydet', en: 'Save' },
  login: { tr: 'Giriş', en: 'Login' },
  loginSubtitle: { tr: 'Yönetici hesabınızla giriş yapın', en: 'Sign in with your admin account' },
  password: { tr: 'Şifre', en: 'Password' },
  signIn: { tr: 'Giriş Yap', en: 'Sign In' },
  signingIn: { tr: 'Giriş yapılıyor...', en: 'Signing in...' },
  loginFailed: { tr: 'E-posta veya şifre hatalı.', en: 'Invalid email or password.' },
  signOut: { tr: 'Çıkış Yap', en: 'Sign Out' },
  changePasswordRequired: { tr: 'Şifre Değiştirme Zorunlu', en: 'Password Change Required' },
  changePasswordRequiredDesc: { tr: 'İlk girişinizde güvenliğiniz için şifrenizi değiştirmeniz gerekir.', en: 'For your security, you must change your password on first login.' },
  saveNewPassword: { tr: 'Yeni Şifreyi Kaydet', en: 'Save New Password' },
  passwordTooShort: { tr: 'Şifre en az 6 karakter olmalıdır.', en: 'Password must be at least 6 characters.' },
  passwordMustChangeFromDefault: { tr: 'Varsayılan şifreyi kullanamazsınız. Yeni bir şifre belirleyin.', en: 'You cannot keep the default password. Choose a new one.' },
  defaultPasswordHint: { tr: 'Giriş şifresi otomatik olarak "1" atanır. Kullanıcı ilk girişte değiştirmek zorundadır.', en: 'Login password is set to "1" automatically. The user must change it on first login.' },
  emailRequired: { tr: 'Giriş için e-posta zorunludur.', en: 'Email is required for login.' },
  role: { tr: 'Rol', en: 'Role' },
  roleRequired: { tr: 'Rol seçimi zorunludur.', en: 'Role selection is required.' },
  roleHr: { tr: 'İnsan Kaynakları', en: 'Human Resources' },
  roleIt: { tr: 'Bilgi İşlem Uzmanı', en: 'IT Specialist' },
  roleAdmin: { tr: 'Yönetici', en: 'Admin' },
  roleHrDesc: { tr: 'Sadece Zimmetli ve Teslim Alınanlar (görüntüleme)', en: 'Only Deployed and Returned assets (view only)' },
  roleItDesc: { tr: 'Envanter ve zimmet işlemleri (Kullanıcılar / Konumlar hariç)', en: 'Inventory and assignments (except Users / Locations)' },
  roleAdminDesc: { tr: 'Tüm ekranlara ve yönetim işlemlerine erişim', en: 'Full access to all screens and management' },
  accessDenied: { tr: 'Bu sayfaya erişim yetkiniz yok.', en: 'You do not have access to this page.' },
  importCsv: { tr: 'Dosya Yükle', en: 'Upload File' },
  importCsvTitle: { tr: 'Zimmet İçe Aktar', en: 'Import Assignments' },
  importCsvHint: {
    tr: 'Excel (.xlsx), Word (.docx), XML veya CSV yükleyin. Eşleşen alanlar doldurulur; eksik alanlar boş bırakılır, hata verilmez.',
    en: 'Upload Excel (.xlsx), Word (.docx), XML or CSV. Matching fields are filled; missing fields stay empty without errors.',
  },
  importCsvColumns: {
    tr: 'Sütunlar (hepsi isteğe bağlı): Ad Soyad, E-posta, Demirbaş Adı, Etiket, Seri No, Model, Kategori, Üretici, Lokasyon, Notlar',
    en: 'Columns (all optional): Full Name, Email, Asset Name, Tag, Serial, Model, Category, Manufacturer, Location, Notes',
  },
  downloadCsvTemplate: { tr: 'Örnek CSV İndir', en: 'Download Sample CSV' },
  selectCsvFile: { tr: 'Dosya seç (Excel / Word / XML / CSV)', en: 'Select file (Excel / Word / XML / CSV)' },
  importStart: { tr: 'İçe Aktar', en: 'Import' },
  importing: { tr: 'İçe aktarılıyor...', en: 'Importing...' },
  importSuccess: { tr: '{count} zimmet kaydı eklendi.', en: '{count} assignments imported.' },
  importPartial: { tr: '{ok} kayıt eklendi, {fail} satır atlandı.', en: '{ok} imported, {fail} rows skipped.' },
  importNoFile: { tr: 'Lütfen bir dosya seçin.', en: 'Please select a file.' },
  importEmpty: { tr: 'Dosya boş veya okunamadı.', en: 'File is empty or could not be read.' },
  importNoData: { tr: 'Veri satırı bulunamadı.', en: 'No data rows found.' },
  importUnsupported: {
    tr: 'Desteklenen formatlar: .xlsx, .xls, .docx, .xml, .csv',
    en: 'Supported formats: .xlsx, .xls, .docx, .xml, .csv',
  },
  importMissingHeaders: {
    tr: 'Dosyada eşleşen sütun bulunamadı. Başlık adlarını kontrol edin.',
    en: 'No matching columns found. Check header names.',
  },
  importRowError: { tr: 'Satır {row}: {msg}', en: 'Row {row}: {msg}' },
  importInvalidRow: { tr: 'zorunlu alanlar eksik', en: 'required fields missing' },
  importRowsReady: { tr: '{count} satır hazır', en: '{count} rows ready' },
  fillFromFile: { tr: 'Dosyadan doldur', en: 'Fill from file' },
  formFilledFromFile: { tr: 'Eşleşen alanlar dosyadan dolduruldu.', en: 'Matching fields filled from file.' },
  unnamedAsset: { tr: 'Adsız Demirbaş', en: 'Unnamed Asset' },
  unknownAssignee: { tr: 'Belirtilmedi', en: 'Not specified' },
  rowsPerPage: { tr: 'Sayfada', en: 'Per page' },
  paginationRange: { tr: '{from}–{to} / {total}', en: '{from}–{to} of {total}' },
  pageOf: { tr: 'Sayfa {page} / {pages}', en: 'Page {page} of {pages}' },
  prevPage: { tr: 'Önceki', en: 'Previous' },
  nextPage: { tr: 'Sonraki', en: 'Next' },
} as const;

export type TranslationKey = keyof typeof translations;

/** Known mock/seed entity names → localized labels */
export const entityNames: Record<string, { tr: string; en: string }> = {
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

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Repair common import corruption / aliases before lookup. */
function normalizeEntityName(name: string) {
  let cleaned = stripHtml(name);
  if (!cleaned) return '';

  // Broken UTF-8 leftovers like "Diz.st. Bilgisayar"
  if (cleaned.includes('\uFFFD') || /diz.?st.? bilgisayar/i.test(cleaned)) {
    if (/diz/i.test(cleaned) && /bilgisayar/i.test(cleaned)) return 'Laptops';
    if (/masa/i.test(cleaned) && /bilgisayar/i.test(cleaned)) return 'Desktops';
    if (/monit/i.test(cleaned)) return 'Monitors';
  }

  const upper = cleaned.toLocaleUpperCase('tr-TR');
  if (upper === 'NOTEBOOK' || upper === 'NOTEBOOKS' || upper === 'LAPTOP' || upper === 'LAPTOPS') return 'Laptops';
  if (upper === 'CEP TELEFONU' || upper === 'TELEFON') return 'Phones';
  if (upper === 'WEBCAM') return 'Peripherals';
  if (upper === 'MIKROFON' || upper === 'MICROPHONE') return 'Audio';
  if (upper === 'DIZÜSTÜ BILGISAYAR' || upper === 'DIZUSTU BILGISAYAR') return 'Laptops';
  if (upper === 'MASAÜSTÜ BILGISAYAR' || upper === 'MASAUSTU BILGISAYAR') return 'Desktops';

  return cleaned;
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  /** Translate known entity/display names; falls back to original */
  tn: (name: string | null | undefined) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('lang');
    return (saved === 'tr' || saved === 'en') ? saved : 'tr';
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = translations.appTitle[lang];
  }, [lang]);

  const handleSetLang = useCallback((l: Lang) => {
    setLang(l);
    localStorage.setItem('lang', l);
  }, []);

  const t = useCallback((key: TranslationKey, vars?: Record<string, string | number>) => {
    const value = translations[key]?.[lang] || key;
    return interpolate(value, vars);
  }, [lang]);

  const tn = useCallback((name: string | null | undefined) => {
    if (!name) return '';
    const normalized = normalizeEntityName(name);
    return entityNames[normalized]?.[lang]
      ?? entityNames[name]?.[lang]
      ?? (normalized || stripHtml(name));
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang: handleSetLang, t, tn }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
