// =========================================================================
    // KONFIGURASI MODE DEMO BAWAAN (KOSONG AGAR AMAN SAAT DIBUKA PUBLIK)
    // =========================================================================
    const CONFIG_LAUNDRY = {
      GOOGLE_SCRIPT_URL: "", // DIBIARKAN KOSONG: Setiap pengusaha wajib input URL Sheets-nya di Pengaturan
      NAMA_LAUNDRY: "SmartLaundry",
      SLOGAN_LAUNDRY: "Simulasi Sistem Kasir & Nota Digital",
      ALAMAT_LAUNDRY: "Mode Demo (Belum Terhubung Toko)",
      NO_WA_ADMIN: "",
      PIN_ADMIN_DEFAULT: "1234"
    };

    const SESSION_KEYS = {
      ORDERS: 'smartlaundry_session_orders',
      SETTINGS: 'smartlaundry_session_settings',
      ADMIN_UNLOCKED: 'smartlaundry_session_admin'
    };

    // Pengaturan kosong untuk dasbor usaha sebelum terhubung ke Google Sheets
    const EMPTY_STORE_SETTINGS = {
      outletName: '',
      slogan: 'Cepat, Bersih & Wangi',
      address: '',
      adminWa: '',
      adminPin: '',
      scriptUrl: '',
      rates: {
        cuci_mamel: '',
        cuci_kering: '',
        cuci_setrika: '',
        setrika: '',
        tikar_default: ''
      }
    };

    // Data simulasi hanya tampil saat Mode Demo (sebelum terhubung ke Google Sheets)
    const INITIAL_SAMPLE_ORDERS = [
      {
        ID_Nota: 'DEMO-001',
        Tanggal_Masuk: 'Contoh Simulasi',
        Nama_Pelanggan: 'Pelanggan Contoh 1',
        No_WA: '081200000001',
        Jenis_Layanan: 'Cuci Setrika',
        Berat_Kg: 3.0,
        Catatan: '',
        Total_Tagihan: 21000,
        Uang_Dibayar: 21000,
        Status_Kembalian: 'Lunas',
        Selisih_Uang: 0,
        Status_Pengerjaan: 'Selesai'
      },
      {
        ID_Nota: 'DEMO-002',
        Tanggal_Masuk: 'Contoh Simulasi',
        Nama_Pelanggan: 'Pelanggan Contoh 2',
        No_WA: '081200000002',
        Jenis_Layanan: 'Karpet',
        Berat_Kg: 0,
        Catatan: 'Contoh karpet ukuran sedang',
        Total_Tagihan: 40000,
        Uang_Dibayar: 20000,
        Status_Kembalian: 'Kurang Bayar',
        Selisih_Uang: 20000,
        Status_Pengerjaan: 'Diproses'
      }
    ];

    const SERVICE_ITEMS = [
      { key: 'cuci_mamel', label: 'Cuci Mamel', type: 'kiloan', icon: 'fa-droplet' },
      { key: 'cuci_kering', label: 'Cuci Kering', type: 'kiloan', icon: 'fa-wind' },
      { key: 'cuci_setrika', label: 'Cuci Setrika', type: 'kiloan', icon: 'fa-shirt' },
      { key: 'setrika', label: 'Setrika', type: 'kiloan', icon: 'fa-temperature-high' },
      { key: 'karpet', label: 'Karpet', type: 'manual', icon: 'fa-rug' },
      { key: 'tikar', label: 'Tikar', type: 'manual', icon: 'fa-layer-group' }
    ];

    // State Global Aplikasi
    let orders = [];
    let settings = JSON.parse(JSON.stringify(EMPTY_STORE_SETTINGS));
    let sharedStoreScriptUrl = '';
    let workFilter = 'Semua';
    let moneyFilter = 'Semua';
    let selectedServiceKey = 'cuci_setrika';
    let currentModalWaText = '';
    let deleteConfirmId = null;
    let settlingOrderId = null;

    // =========================================================
    // ENCODE & DECODE URL DATABASE TOKO PADA LINK NOTA WHATSAPP
    // =========================================================
    function decodeStoreParam(encoded) {
      try {
        return decodeURIComponent(escape(atob(encoded)));
      } catch (e) {
        return '';
      }
    }

    function encodeStoreParam(url) {
      try {
        return btoa(unescape(encodeURIComponent(url)));
      } catch (e) {
        return '';
      }
    }

    function getActiveScriptUrl() {
      if (sharedStoreScriptUrl && sharedStoreScriptUrl.startsWith('http')) {
        return sharedStoreScriptUrl;
      }
      if (settings.scriptUrl && settings.scriptUrl.trim().startsWith('http')) {
        return settings.scriptUrl.trim();
      }
      return '';
    }

    function isSheetsConnected() {
      return Boolean(getActiveScriptUrl());
    }

    // =========================================================
    // INISIALISASI APLIKASI
    // =========================================================
    async function initApp() {
      // Bersihkan sisa penyimpanan lokal lama agar selalu mulai bersih
      try {
        localStorage.removeItem('smartlaundry_orders_v4');
        localStorage.removeItem('smartlaundry_settings_v4');
        localStorage.removeItem('smartlaundry_orders_v5');
        localStorage.removeItem('smartlaundry_settings_v5');
      } catch (e) {}

      loadSessionState();

      const urlParams = new URLSearchParams(window.location.search);
      const notaParam = urlParams.get('nota');
      const dbParam = urlParams.get('db');

      // Jika dibuka dari link nota pelanggan (?nota=...&db=...), hubungkan ke database toko tersebut
      if (dbParam) {
        const decodedUrl = decodeStoreParam(dbParam);
        if (decodedUrl && decodedUrl.startsWith('http')) {
          sharedStoreScriptUrl = decodedUrl;
          settings.scriptUrl = decodedUrl;
        }
      }

      applyOutletBranding();
      updateConnectionBadgeUI();
      populateSettingsForm();
      renderPublicQuickChips();

      if (isSheetsConnected()) {
        await syncFromGoogleSheets(false);
        applyOutletBranding();
        updateConnectionBadgeUI();
        populateSettingsForm();

        // Pelanggan langsung melihat notanya tanpa diminta PIN
        if (notaParam) {
          document.getElementById('public-search-input').value = notaParam;
          searchPublicReceipt(notaParam);
        }
      } else {
        // Mode Demo: Tampilkan contoh nota simulasi
        orders = JSON.parse(JSON.stringify(INITIAL_SAMPLE_ORDERS));
        renderPublicQuickChips();
        if (notaParam) {
          document.getElementById('public-search-input').value = notaParam;
          searchPublicReceipt(notaParam);
        } else if (orders.length > 0) {
          document.getElementById('public-search-input').value = orders[0].ID_Nota;
          searchPublicReceipt(orders[0].ID_Nota);
        }
      }

      // Cek apakah sesi kasir sedang aktif pada tab browser ini
      if (sessionStorage.getItem(SESSION_KEYS.ADMIN_UNLOCKED) === 'true') {
        enterAdminView();
      }
    }

    function loadSessionState() {
      try {
        const savedSettings = sessionStorage.getItem(SESSION_KEYS.SETTINGS);
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          settings = {
            ...EMPTY_STORE_SETTINGS,
            ...parsed,
            rates: { ...EMPTY_STORE_SETTINGS.rates, ...(parsed.rates || {}) }
          };
        } else {
          settings = JSON.parse(JSON.stringify(EMPTY_STORE_SETTINGS));
        }

        const savedOrders = sessionStorage.getItem(SESSION_KEYS.ORDERS);
        if (savedOrders && isSheetsConnected()) {
          orders = JSON.parse(savedOrders);
        } else {
          orders = [];
        }
      } catch (e) {
        settings = JSON.parse(JSON.stringify(EMPTY_STORE_SETTINGS));
        orders = [];
      }
    }

    function persistSessionState() {
      try {
        sessionStorage.setItem(SESSION_KEYS.SETTINGS, JSON.stringify(settings));
        if (isSheetsConnected()) {
          sessionStorage.setItem(SESSION_KEYS.ORDERS, JSON.stringify(orders));
        }
      } catch (e) {
        console.error('Gagal menyimpan sesi:', e);
      }
    }

    function applyOutletBranding() {
      const connected = isSheetsConnected();
      const name = connected && settings.outletName ? settings.outletName : CONFIG_LAUNDRY.NAMA_LAUNDRY;
      const slogan = connected && settings.slogan ? settings.slogan : CONFIG_LAUNDRY.SLOGAN_LAUNDRY;
      const address = connected && settings.address ? settings.address : CONFIG_LAUNDRY.ALAMAT_LAUNDRY;

      document.title = connected && settings.outletName ? `${name} — Kasir & Cek Nota` : 'SmartLaundry — Mode Demo';

      const pubTitle = document.getElementById('public-outlet-name');
      const pubSlogan = document.getElementById('public-outlet-slogan');
      const pubAddress = document.getElementById('public-outlet-address');
      const pubDemoPill = document.getElementById('public-demo-pill');
      const pubDemoChipsWrapper = document.getElementById('public-demo-chips-wrapper');
      const admTitle = document.getElementById('admin-outlet-name');

      if (pubTitle) pubTitle.textContent = name;
      if (pubSlogan) pubSlogan.textContent = slogan;
      if (pubAddress) pubAddress.innerHTML = `<i class="fa-solid fa-location-dot mr-1"></i>${address}`;
      if (pubDemoPill) pubDemoPill.classList.toggle('hidden', connected);
      if (pubDemoChipsWrapper) pubDemoChipsWrapper.classList.toggle('hidden', connected);
      if (admTitle) {
        admTitle.textContent = connected && settings.outletName ? `${name} Kasir` : 'Dasbor Usaha (Kosong)';
      }
    }

    function updateConnectionBadgeUI() {
      const badge = document.getElementById('db-connection-badge');
      const sourceInfo = document.getElementById('sheets-source-info');
      const demoWarning = document.getElementById('admin-demo-warning');

      if (isSheetsConnected()) {
        if (badge) {
          badge.className = 'flex items-center gap-1.5 font-bold text-emerald-300';
          badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span><span>Terhubung ke Google Sheets Anda</span>`;
        }
        if (sourceInfo) {
          sourceInfo.className = 'p-3 rounded-2xl border text-xs space-y-1 bg-emerald-50 border-emerald-200 text-emerald-900';
          sourceInfo.innerHTML = `
            <div class="font-extrabold flex items-center gap-1.5">
              <i class="fa-solid fa-circle-check text-emerald-600"></i>
              <span>Database Google Sheets Aktif</span>
            </div>
            <p class="text-[11px] text-emerald-800">Semua data pesanan, profil outlet, alamat, WA, PIN kasir, dan tarif tersimpan otomatis di Google Sheets Anda.</p>
          `;
        }
        if (demoWarning) demoWarning.classList.add('hidden');
      } else {
        if (badge) {
          badge.className = 'flex items-center gap-1.5 font-bold text-amber-300';
          badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span><span>Belum Terhubung Google Sheets</span>`;
        }
        if (sourceInfo) {
          sourceInfo.className = 'p-3 rounded-2xl border text-xs space-y-1 bg-amber-50 border-amber-200 text-amber-900';
          sourceInfo.innerHTML = `
            <div class="font-extrabold flex items-center gap-1.5">
              <i class="fa-solid fa-triangle-exclamation text-amber-600"></i>
              <span>Wajib Masukkan URL Google Apps Script</span>
            </div>
            <p class="text-[11px] text-amber-800">Dasbor usaha saat ini masih kosong. Tempel URL Web App Google Apps Script milik Anda di bawah lalu klik <strong>Hubungkan Sheets</strong>.</p>
          `;
        }
        if (demoWarning) demoWarning.classList.remove('hidden');
      }
    }

    // =========================================================
    // INTEGRASI GOOGLE SHEETS (DATA & PENGATURAN)
    // =========================================================
    function normalizeSheetRow(row) {
      return {
        ID_Nota: String(row.ID_Nota || '').trim(),
        Tanggal_Masuk: String(row.Tanggal_Masuk || ''),
        Nama_Pelanggan: String(row.Nama_Pelanggan || ''),
        No_WA: String(row.No_WA || ''),
        Jenis_Layanan: String(row.Jenis_Layanan || ''),
        Berat_Kg: Number(row.Berat_Kg) || 0,
        Catatan: String(row.Catatan || ''),
        Total_Tagihan: Number(row.Total_Tagihan) || 0,
        Uang_Dibayar: Number(row.Uang_Dibayar) || 0,
        Status_Kembalian: String(row.Status_Kembalian || 'Belum Bayar'),
        Selisih_Uang: Number(row.Selisih_Uang) || 0,
        Status_Pengerjaan: String(row.Status_Pengerjaan || 'Diterima')
      };
    }

    async function syncFromGoogleSheets(showFeedback = true) {
      const activeUrl = getActiveScriptUrl();
      if (!activeUrl) {
        if (showFeedback) {
          showToast('Masukkan URL Google Apps Script terlebih dahulu!', 'warning');
        }
        return false;
      }

      const syncIcon = document.getElementById('sync-icon');
      if (syncIcon) syncIcon.classList.add('fa-spin');

      try {
        const fetchUrl = activeUrl.includes('?') ? `${activeUrl}&action=getAll` : `${activeUrl}?action=getAll`;
        const response = await fetch(fetchUrl, { method: 'GET' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        const rows = Array.isArray(result)
          ? result
          : Array.isArray(result.orders)
          ? result.orders
          : Array.isArray(result.data)
          ? result.data
          : null;

        if (!rows) {
          throw new Error('Format respon JSON dari Apps Script tidak sesuai');
        }

        orders = rows.map(normalizeSheetRow).filter((r) => r.ID_Nota);

        // Muat Pengaturan (Nama, Alamat, WA, PIN Kasir, Harga Jasa) dari Tab "Pengaturan" di Google Sheets
        if (result.settings && typeof result.settings === 'object') {
          const s = result.settings;
          if (s.Nama_Outlet) settings.outletName = String(s.Nama_Outlet);
          if (s.Slogan) settings.slogan = String(s.Slogan);
          if (s.Alamat_Outlet) settings.address = String(s.Alamat_Outlet);
          if (s.No_WA_Admin) settings.adminWa = String(s.No_WA_Admin);
          if (s.PIN_Admin) settings.adminPin = String(s.PIN_Admin);
          if (s.Cuci_Mamel !== undefined && s.Cuci_Mamel !== '') settings.rates.cuci_mamel = Number(s.Cuci_Mamel) || 0;
          if (s.Cuci_Kering !== undefined && s.Cuci_Kering !== '') settings.rates.cuci_kering = Number(s.Cuci_Kering) || 0;
          if (s.Cuci_Setrika !== undefined && s.Cuci_Setrika !== '') settings.rates.cuci_setrika = Number(s.Cuci_Setrika) || 0;
          if (s.Setrika !== undefined && s.Setrika !== '') settings.rates.setrika = Number(s.Setrika) || 0;
          if (s.Tikar_Default !== undefined && s.Tikar_Default !== '') settings.rates.tikar_default = Number(s.Tikar_Default) || 0;
        }

        persistSessionState();
        applyOutletBranding();
        updateConnectionBadgeUI();
        populateSettingsForm();
        renderServiceSelector();
        renderAdminOrders();

        if (showFeedback) {
          showToast(`Berhasil memuat ${orders.length} data & pengaturan dari Google Sheets!`);
        }
        return true;
      } catch (err) {
        console.error('Error sync Google Sheets:', err);
        if (showFeedback) {
          showToast('Gagal memuat Google Sheets. Periksa URL Web App & izin akses.', 'error');
        }
        return false;
      } finally {
        if (syncIcon) syncIcon.classList.remove('fa-spin');
      }
    }

    async function pushToGoogleSheets(action, orderObj) {
      const activeUrl = getActiveScriptUrl();
      if (!activeUrl) return;

      try {
        await fetch(activeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action,
            ID_Nota: orderObj.ID_Nota,
            data: orderObj
          })
        });
      } catch (err) {
        console.error(`Gagal mengirim action "${action}" ke Google Sheets:`, err);
        showToast('Gagal menyinkronkan ke Google Sheets', 'warning');
      }
    }

    // =========================================================
    // HELPER FORMATTER & TOAST
    // =========================================================
    function formatRupiah(amount) {
      const num = Number(amount) || 0;
      return 'Rp ' + num.toLocaleString('id-ID');
    }

    function parseRupiahInput(str) {
      return parseInt(String(str || '').replace(/\D/g, ''), 10) || 0;
    }

    function handleRupiahTyping(el) {
      const val = parseRupiahInput(el.value);
      el.value = val > 0 ? val.toLocaleString('id-ID') : '';
      calculateFormTotal();
    }

    function formatPhoneWA(rawPhone) {
      let cleaned = String(rawPhone || '').replace(/\D/g, '');
      if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.slice(1);
      } else if (cleaned.startsWith('8')) {
        cleaned = '62' + cleaned;
      }
      return cleaned;
    }

    function showToast(message, type = 'success') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      const bgClass =
        type === 'success'
          ? 'bg-slate-900 text-white border-emerald-500'
          : type === 'warning'
          ? 'bg-amber-600 text-white border-amber-300'
          : 'bg-rose-600 text-white border-rose-300';

      const iconClass =
        type === 'success'
          ? 'fa-circle-check text-emerald-400'
          : type === 'warning'
          ? 'fa-triangle-exclamation text-white'
          : 'fa-circle-exclamation text-white';

      toast.className = `${bgClass} border-l-4 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2.5 animate-fade-up`;
      toast.innerHTML = `<i class="fa-solid ${iconClass} text-sm shrink-0"></i><span>${message}</span>`;

      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.25s ease';
        setTimeout(() => toast.remove(), 250);
      }, 2800);
    }

    // =========================================================
    // HALAMAN PUBLIK (CEK NOTA PELANGGAN)
    // =========================================================
    function renderPublicQuickChips() {
      const container = document.getElementById('public-quick-chips');
      if (!container || isSheetsConnected()) return;
      container.innerHTML = orders
        .slice(0, 2)
        .map(
          (o) => `
          <button
            type="button"
            onclick="quickSearchPublic('${o.ID_Nota}')"
            class="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-ocean-100 text-slate-700 hover:text-ocean-700 text-[11px] font-bold transition"
          >
            ${o.ID_Nota}
          </button>
        `
        )
        .join('');
    }

    function quickSearchPublic(notaId) {
      document.getElementById('public-search-input').value = notaId;
      searchPublicReceipt(notaId);
    }

    function handlePublicSearch(event) {
      event.preventDefault();
      const q = document.getElementById('public-search-input').value;
      searchPublicReceipt(q);
    }

    function getPublicPaymentBanner(order) {
      const status = order.Status_Kembalian;
      const selisih = Number(order.Selisih_Uang) || 0;

      if (status === 'Lunas') {
        return {
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          badgeIcon: 'fa-circle-check',
          badgeText: 'Lunas',
          alertHtml: `
            <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2.5 text-emerald-800">
              <i class="fa-solid fa-circle-check text-emerald-600 text-base shrink-0"></i>
              <span class="text-xs font-bold">Pembayaran sudah Lunas. Terima kasih!</span>
            </div>
          `
        };
      }

      if (status === 'Kurang Bayar') {
        return {
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
          badgeIcon: 'fa-circle-exclamation',
          badgeText: 'Kurang Bayar',
          alertHtml: `
            <div class="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 space-y-1 text-rose-800">
              <div class="flex items-center gap-2 font-extrabold text-xs">
                <i class="fa-solid fa-circle-exclamation text-rose-600 text-sm"></i>
                <span>Kekurangan Pembayaran: ${formatRupiah(selisih)}</span>
              </div>
              <p class="text-[11px] text-rose-700 pl-5">Mohon melunasi sisa kekurangan saat pengambilan cucian di kasir.</p>
            </div>
          `
        };
      }

      if (status === 'Kembalian Belum Diberikan') {
        return {
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
          badgeIcon: 'fa-coins',
          badgeText: 'Ada Sisa Kembalian',
          alertHtml: `
            <div class="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 space-y-1 text-amber-900">
              <div class="flex items-center gap-2 font-extrabold text-xs">
                <i class="fa-solid fa-coins text-amber-600 text-sm"></i>
                <span>Ada Sisa Kembalian ${formatRupiah(selisih)} yang belum dikembalikan</span>
              </div>
              <p class="text-[11px] text-amber-800 pl-5">Tunjukkan nota digital ini kepada kasir untuk mengambil sisa uang kembalian Anda.</p>
            </div>
          `
        };
      }

      const due = selisih > 0 ? selisih : Number(order.Total_Tagihan) || 0;
      return {
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        badgeIcon: 'fa-clock',
        badgeText: 'Belum Bayar',
        alertHtml: `
          <div class="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 space-y-1 text-rose-800">
            <div class="flex items-center gap-2 font-extrabold text-xs">
              <i class="fa-solid fa-wallet text-rose-600 text-sm"></i>
              <span>Tagihan Belum Dibayar: ${formatRupiah(due)}</span>
            </div>
            <p class="text-[11px] text-rose-700 pl-5">Pembayaran dapat dilakukan di kasir saat pengambilan cucian.</p>
          </div>
        `
      };
    }

    function searchPublicReceipt(rawQuery) {
      const cleaned = String(rawQuery || '').trim().toLowerCase().replace(/^#/, '');
      const resultContainer = document.getElementById('public-receipt-result');

      if (!cleaned) {
        resultContainer.innerHTML = '';
        return;
      }

      const normalizedPhoneQuery = cleaned.replace(/\D/g, '');
      const matches = orders.filter((o) => {
        const matchId = o.ID_Nota.toLowerCase() === cleaned;
        const rawOrderPhone = String(o.No_WA || '').replace(/\D/g, '');
        const intlOrderPhone = formatPhoneWA(o.No_WA);
        const matchPhone =
          normalizedPhoneQuery.length >= 6 &&
          (rawOrderPhone === normalizedPhoneQuery ||
            intlOrderPhone === normalizedPhoneQuery ||
            intlOrderPhone === formatPhoneWA(normalizedPhoneQuery));
        return matchId || matchPhone;
      });

      const connected = isSheetsConnected();
      const outletName = connected && settings.outletName ? settings.outletName : CONFIG_LAUNDRY.NAMA_LAUNDRY;
      const adminWaPhone = formatPhoneWA(settings.adminWa || '');

      if (matches.length === 0) {
        resultContainer.innerHTML = `
          <div class="bg-white rounded-3xl p-6 text-center shadow-sm border border-slate-100 space-y-2 animate-fade-up">
            <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
              <i class="fa-solid fa-file-circle-question text-xl"></i>
            </div>
            <h3 class="text-sm font-extrabold text-slate-800">Nota Tidak Ditemukan</h3>
            <p class="text-xs text-slate-500">Periksa kembali Nomor Nota atau Nomor WhatsApp Anda.</p>
          </div>
        `;
        return;
      }

      resultContainer.innerHTML = matches
        .map((found) => {
          const stepMap = { Diterima: 1, Diproses: 2, Selesai: 3, Diambil: 4 };
          const stepIndex = stepMap[found.Status_Pengerjaan] || 1;
          const progressWidth = stepIndex === 1 ? '0%' : stepIndex === 2 ? '33.3%' : stepIndex === 3 ? '66.6%' : '100%';

          const isKiloan = Number(found.Berat_Kg) > 0;
          const specLabel = isKiloan ? 'Berat Cucian' : 'Keterangan';
          const specValue = isKiloan ? `${found.Berat_Kg} kg` : found.Catatan || 'Layanan satuan (1 pcs)';

          const payInfo = getPublicPaymentBanner(found);
          const askAdminText = encodeURIComponent(
            `Halo Admin *${outletName}*, saya ingin menanyakan pesanan laundry saya dengan No. Nota *#${found.ID_Nota}* atas nama *${found.Nama_Pelanggan}*.`
          );

          const waContactBtn = adminWaPhone
            ? `
              <a
                href="https://wa.me/${adminWaPhone}?text=${askAdminText}"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full py-3 px-4 bg-[#25D366] hover:bg-[#1ebe5d] active:scale-[0.99] text-white font-extrabold text-xs rounded-2xl shadow-sm shadow-emerald-500/25 flex items-center justify-center gap-2 transition"
              >
                <i class="fa-brands fa-whatsapp text-base"></i>
                <span>Hubungi Admin via WA</span>
              </a>
            `
            : '';

          return `
            <article class="bg-white rounded-3xl p-5 shadow-md border border-slate-100 space-y-4 animate-fade-up">
              <div class="flex items-start justify-between gap-2 border-b border-dashed border-slate-200 pb-3.5">
                <div>
                  <span class="text-[11px] font-extrabold text-ocean-600 uppercase tracking-wider block">${outletName}</span>
                  <h3 class="text-lg font-extrabold text-slate-900 mt-0.5">#${found.ID_Nota}</h3>
                  <p class="text-xs text-slate-400 font-medium">${found.Tanggal_Masuk}</p>
                </div>
                <span class="px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold border shrink-0 ${payInfo.badgeClass}">
                  <i class="fa-solid ${payInfo.badgeIcon} mr-1"></i>
                  ${payInfo.badgeText}
                </span>
              </div>

              <div class="py-1">
                <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">Status Pengerjaan</span>
                <div class="grid grid-cols-4 relative">
                  <div class="absolute left-6 right-6 top-4 h-1 bg-slate-100 rounded-full z-0">
                    <div class="h-full bg-ocean-600 rounded-full transition-all duration-500" style="width: ${progressWidth}"></div>
                  </div>

                  <div class="relative z-10 flex flex-col items-center gap-1.5">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${stepIndex >= 1 ? 'bg-ocean-600 text-white' : 'bg-slate-100 text-slate-400'}">
                      <i class="fa-solid fa-box-open"></i>
                    </div>
                    <span class="text-[10px] font-bold ${stepIndex >= 1 ? 'text-ocean-700' : 'text-slate-400'}">Diterima</span>
                  </div>

                  <div class="relative z-10 flex flex-col items-center gap-1.5">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${stepIndex >= 2 ? 'bg-ocean-600 text-white' : 'bg-slate-100 text-slate-400'}">
                      <i class="fa-solid fa-spinner ${found.Status_Pengerjaan === 'Diproses' ? 'fa-spin' : ''}"></i>
                    </div>
                    <span class="text-[10px] font-bold ${stepIndex >= 2 ? 'text-ocean-700' : 'text-slate-400'}">Diproses</span>
                  </div>

                  <div class="relative z-10 flex flex-col items-center gap-1.5">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${stepIndex >= 3 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}">
                      <i class="fa-solid fa-check"></i>
                    </div>
                    <span class="text-[10px] font-bold ${stepIndex >= 3 ? 'text-emerald-700' : 'text-slate-400'}">Selesai</span>
                  </div>

                  <div class="relative z-10 flex flex-col items-center gap-1.5">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${stepIndex >= 4 ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'}">
                      <i class="fa-solid fa-bag-shopping"></i>
                    </div>
                    <span class="text-[10px] font-bold ${stepIndex >= 4 ? 'text-slate-800' : 'text-slate-400'}">Diambil</span>
                  </div>
                </div>
              </div>

              <div class="bg-slate-50 rounded-2xl p-4 space-y-2.5 border border-slate-100 text-xs">
                <div class="flex justify-between">
                  <span class="text-slate-500">Nama Pelanggan</span>
                  <span class="font-bold text-slate-800">${found.Nama_Pelanggan}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Jenis Layanan</span>
                  <span class="font-bold text-slate-800">${found.Jenis_Layanan}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">${specLabel}</span>
                  <span class="font-bold text-slate-800 text-right max-w-[60%]">${specValue}</span>
                </div>
                <div class="border-t border-slate-200 pt-2.5 flex justify-between items-center">
                  <span class="text-slate-600 font-bold">Total Tagihan</span>
                  <span class="text-sm font-extrabold text-slate-900">${formatRupiah(found.Total_Tagihan)}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-slate-500">Uang Dibayar</span>
                  <span class="font-extrabold text-ocean-700">${formatRupiah(found.Uang_Dibayar)}</span>
                </div>
              </div>

              ${payInfo.alertHtml}
              ${waContactBtn}
            </article>
          `;
        })
        .join('');
    }

    // =========================================================
    // AUTENTIKASI PIN PENGUSAHA / KASIR (SAMA DI SEMUA LAMAN)
    // =========================================================
    function openPinModal() {
      const modal = document.getElementById('pin-modal');
      const input = document.getElementById('admin-pin-input');
      input.value = '';
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      setTimeout(() => input.focus(), 100);
    }

    function closePinModal() {
      const modal = document.getElementById('pin-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    function handleVerifyPin(event) {
      event.preventDefault();
      const entered = document.getElementById('admin-pin-input').value.trim();
      const validPin = settings.adminPin ? String(settings.adminPin) : String(CONFIG_LAUNDRY.PIN_ADMIN_DEFAULT);

      if (entered === validPin) {
        sessionStorage.setItem(SESSION_KEYS.ADMIN_UNLOCKED, 'true');
        closePinModal();
        enterAdminView();
        showToast('Berhasil masuk ke Dasbor Usaha');
      } else {
        showToast('PIN salah! Silakan coba lagi.', 'error');
        document.getElementById('admin-pin-input').value = '';
        document.getElementById('admin-pin-input').focus();
      }
    }

    function enterAdminView() {
      document.getElementById('public-view').classList.add('hidden');
      document.getElementById('admin-view').classList.remove('hidden');
      updateConnectionBadgeUI();

      // Jika belum terhubung Google Sheets, pastikan daftar pesanan dasbor kosong (tidak memakai data simulasi demo)
      if (!isSheetsConnected()) {
        orders = [];
        switchAdminTab('settings');
      } else {
        switchAdminTab('orders');
      }

      renderServiceSelector();
      resetOrderForm();
      renderAdminOrders();
    }

    function logoutAdmin() {
      // Hapus seluruh sesi usaha agar kembali bersih ke Mode Demo
      sessionStorage.removeItem(SESSION_KEYS.ADMIN_UNLOCKED);
      sessionStorage.removeItem(SESSION_KEYS.SETTINGS);
      sessionStorage.removeItem(SESSION_KEYS.ORDERS);

      sharedStoreScriptUrl = '';
      settings = JSON.parse(JSON.stringify(EMPTY_STORE_SETTINGS));
      orders = JSON.parse(JSON.stringify(INITIAL_SAMPLE_ORDERS));

      // Bersihkan parameter URL jika sebelumnya dibuka dari link nota
      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      document.getElementById('admin-view').classList.add('hidden');
      document.getElementById('public-view').classList.remove('hidden');

      applyOutletBranding();
      populateSettingsForm();
      renderPublicQuickChips();

      if (orders.length > 0) {
        document.getElementById('public-search-input').value = orders[0].ID_Nota;
        searchPublicReceipt(orders[0].ID_Nota);
      }

      showToast('Keluar dari dasbor. Aplikasi kembali ke Mode Demo.');
    }

    // =========================================================
    // NAVIGASI TAB ADMIN / KASIR
    // =========================================================
    function switchAdminTab(tabName) {
      ['orders', 'input', 'settings'].forEach((t) => {
        document.getElementById(`admin-tab-${t}`).classList.add('hidden');
      });
      document.getElementById(`admin-tab-${tabName}`).classList.remove('hidden');

      document.querySelectorAll('.admin-nav-btn').forEach((btn) => {
        if (btn.dataset.admintab === tabName) {
          btn.className = 'admin-nav-btn flex flex-col items-center justify-center py-2 px-1 rounded-2xl text-ocean-600 bg-ocean-50 font-bold transition';
        } else {
          btn.className = 'admin-nav-btn flex flex-col items-center justify-center py-2 px-1 rounded-2xl text-slate-500 hover:text-ocean-600 font-medium transition';
        }
      });

      if (tabName === 'input') {
        document.getElementById('preview-nota-badge').textContent = `#${generateNextNotaId()}`;
        calculateFormTotal();
      } else if (tabName === 'orders') {
        renderAdminOrders();
      } else if (tabName === 'settings') {
        populateSettingsForm();
        updateConnectionBadgeUI();
      }
    }

    // =========================================================
    // FORM INPUT ORDER & KALKULATOR PEMBAYARAN
    // =========================================================
    function generateNextNotaId() {
      let maxNum = 0;
      orders.forEach((o) => {
        const match = String(o.ID_Nota || '').match(/LND-(\d+)/i);
        if (match) {
          const n = parseInt(match[1], 10);
          if (n > maxNum) maxNum = n;
        }
      });
      return `LND-${String(maxNum + 1).padStart(3, '0')}`;
    }

    function getCurrentUnitRate() {
      return Number(settings.rates[selectedServiceKey]) || 0;
    }

    function renderServiceSelector() {
      const container = document.getElementById('service-selector');
      if (!container) return;

      container.innerHTML = SERVICE_ITEMS.map((item) => {
        const active = item.key === selectedServiceKey;
        let subLabel = 'Input harga manual';
        if (item.type === 'kiloan') {
          subLabel = `${formatRupiah(settings.rates[item.key] || 0)}/kg`;
        } else if (item.key === 'tikar') {
          subLabel = `Default ${formatRupiah(settings.rates.tikar_default || 0)}`;
        }

        return `
          <button
            type="button"
            onclick="selectService('${item.key}')"
            class="p-3 rounded-2xl border text-left transition flex items-start gap-2.5 ${
              active
                ? 'bg-ocean-50 border-ocean-500 ring-2 ring-ocean-500/20'
                : 'bg-white border-slate-200 hover:border-ocean-300'
            }"
          >
            <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              active ? 'bg-ocean-600 text-white' : 'bg-slate-100 text-slate-500'
            }">
              <i class="fa-solid ${item.icon} text-xs"></i>
            </div>
            <div class="min-w-0">
              <span class="text-xs font-extrabold block truncate ${active ? 'text-ocean-900' : 'text-slate-800'}">
                ${item.label}
              </span>
              <span class="text-[11px] font-semibold block truncate ${active ? 'text-ocean-600' : 'text-slate-400'}">
                ${subLabel}
              </span>
            </div>
          </button>
        `;
      }).join('');
    }

    function selectService(key) {
      selectedServiceKey = key;
      renderServiceSelector();

      const item = SERVICE_ITEMS.find((s) => s.key === key);
      const secKiloan = document.getElementById('section-kiloan');
      const secManual = document.getElementById('section-manual-item');
      const manualPriceInput = document.getElementById('input-manual-price');
      const btnResetTikar = document.getElementById('btn-reset-tikar-price');
      const labelManual = document.getElementById('label-manual-price');
      const hintManual = document.getElementById('hint-manual-price');
      const noteInput = document.getElementById('input-item-note');

      if (item.type === 'kiloan') {
        secKiloan.classList.remove('hidden');
        secManual.classList.add('hidden');
        document.getElementById('label-tarif-per-kg').textContent = `${formatRupiah(getCurrentUnitRate())} / kg`;
      } else {
        secKiloan.classList.add('hidden');
        secManual.classList.remove('hidden');

        if (key === 'tikar') {
          const defTikar = Number(settings.rates.tikar_default) || 0;
          labelManual.innerHTML = 'Harga Cuci Tikar (Rp) <span class="text-rose-500">*</span>';
          manualPriceInput.value = defTikar > 0 ? defTikar.toLocaleString('id-ID') : '';
          btnResetTikar.classList.remove('hidden');
          hintManual.textContent = 'Terisi otomatis dari tarif default tikar, dapat diubah manual.';
          noteInput.placeholder = 'Misal: Tikar lipat jumbo 2x3m';
        } else {
          labelManual.innerHTML = 'Harga Cuci Karpet (Rp) <span class="text-rose-500">*</span>';
          manualPriceInput.value = '';
          btnResetTikar.classList.add('hidden');
          hintManual.textContent = 'Ketik langsung nominal harga cuci karpet sesuai kesepakatan.';
          noteInput.placeholder = 'Misal: Karpet bulu ruang tamu';
        }
      }

      calculateFormTotal();
    }

    function applyDefaultTikarPrice() {
      const defTikar = Number(settings.rates.tikar_default) || 0;
      document.getElementById('input-manual-price').value = defTikar > 0 ? defTikar.toLocaleString('id-ID') : '';
      calculateFormTotal();
    }

    function adjustWeight(delta) {
      const input = document.getElementById('input-berat');
      const current = parseFloat(input.value) || 0;
      const next = Math.max(0.1, Math.round((current + delta) * 10) / 10);
      input.value = next.toFixed(1);
      calculateFormTotal();
    }

    function updatePhonePreview() {
      const raw = document.getElementById('input-hp').value;
      const previewEl = document.getElementById('wa-format-preview');
      const formatted = formatPhoneWA(raw);
      if (formatted.length >= 4) {
        previewEl.textContent = `WA: ${formatted}`;
        previewEl.classList.remove('hidden');
      } else {
        previewEl.classList.add('hidden');
      }
    }

    function getComputedFormTotal() {
      const item = SERVICE_ITEMS.find((s) => s.key === selectedServiceKey);
      if (!item) return 0;
      if (item.type === 'kiloan') {
        const weight = Math.max(0, parseFloat(document.getElementById('input-berat').value) || 0);
        return Math.round(weight * getCurrentUnitRate());
      }
      return parseRupiahInput(document.getElementById('input-manual-price').value);
    }

    function calculateFormTotal() {
      const item = SERVICE_ITEMS.find((s) => s.key === selectedServiceKey);
      const total = getComputedFormTotal();
      let detailText = item ? item.label : '';

      if (item && item.type === 'kiloan') {
        const weight = Math.max(0, parseFloat(document.getElementById('input-berat').value) || 0);
        detailText = `${item.label} • ${weight.toFixed(1)} kg`;
      } else if (item) {
        const note = document.getElementById('input-item-note').value.trim();
        detailText = note ? `${item.label} • ${note}` : `${item.label} • Satuan`;
      }

      document.getElementById('form-summary-detail').textContent = detailText;
      document.getElementById('form-total-display').textContent = formatRupiah(total);

      evaluatePaymentState();
    }

    function handlePaidTyping(el) {
      const val = parseRupiahInput(el.value);
      el.value = val > 0 ? val.toLocaleString('id-ID') : '';
      evaluatePaymentState();
    }

    function setQuickPaid(mode) {
      const input = document.getElementById('input-uang-dibayar');
      const total = getComputedFormTotal();

      if (mode === 'exact') {
        input.value = total > 0 ? total.toLocaleString('id-ID') : '';
      } else if (mode === 'zero') {
        input.value = '';
      } else if (typeof mode === 'number') {
        input.value = mode.toLocaleString('id-ID');
      }

      evaluatePaymentState();
    }

    function evaluatePaymentState() {
      const total = getComputedFormTotal();
      const paid = parseRupiahInput(document.getElementById('input-uang-dibayar').value);
      const statusBox = document.getElementById('payment-status-box');
      const statusLabel = document.getElementById('payment-status-label');
      const statusAmount = document.getElementById('payment-status-amount');
      const changeBox = document.getElementById('change-decision-box');
      const changeDisplay = document.getElementById('change-amount-display');
      const changeReturnedChecked = document.getElementById('checkbox-change-returned').checked;

      if (paid <= 0) {
        changeBox.classList.add('hidden');
        statusBox.className = 'p-3 rounded-xl border text-xs font-bold flex items-center justify-between bg-rose-50 border-rose-200 text-rose-700';
        statusLabel.textContent = 'Status: Belum Bayar';
        statusAmount.textContent = `Tagihan: ${formatRupiah(total)}`;
        return { statusKembalian: 'Belum Bayar', selisihUang: total };
      }

      if (paid < total) {
        const kurang = total - paid;
        changeBox.classList.add('hidden');
        statusBox.className = 'p-3 rounded-xl border text-xs font-bold flex items-center justify-between bg-rose-50 border-rose-200 text-rose-700';
        statusLabel.textContent = 'Status: Kurang Bayar';
        statusAmount.textContent = `Kurang: ${formatRupiah(kurang)}`;
        return { statusKembalian: 'Kurang Bayar', selisihUang: kurang };
      }

      if (paid === total) {
        changeBox.classList.add('hidden');
        statusBox.className = 'p-3 rounded-xl border text-xs font-bold flex items-center justify-between bg-emerald-50 border-emerald-200 text-emerald-700';
        statusLabel.textContent = 'Status: Lunas';
        statusAmount.textContent = 'Uang Pas (Selisih Rp 0)';
        return { statusKembalian: 'Lunas', selisihUang: 0 };
      }

      const kembalian = paid - total;
      changeBox.classList.remove('hidden');
      changeDisplay.textContent = formatRupiah(kembalian);

      if (changeReturnedChecked) {
        statusBox.className = 'p-3 rounded-xl border text-xs font-bold flex items-center justify-between bg-emerald-50 border-emerald-200 text-emerald-700';
        statusLabel.textContent = 'Status: Lunas (Kembalian Diberikan)';
        statusAmount.textContent = `Kembali: ${formatRupiah(kembalian)}`;
        return { statusKembalian: 'Lunas', selisihUang: 0 };
      } else {
        statusBox.className = 'p-3 rounded-xl border text-xs font-bold flex items-center justify-between bg-amber-50 border-amber-300 text-amber-900';
        statusLabel.textContent = 'Status: Kembalian Belum Diberikan';
        statusAmount.textContent = `Tertahan: ${formatRupiah(kembalian)}`;
        return { statusKembalian: 'Kembalian Belum Diberikan', selisihUang: kembalian };
      }
    }

    function resetOrderForm() {
      const form = document.getElementById('order-form');
      if (form) form.reset();
      selectedServiceKey = 'cuci_setrika';
      renderServiceSelector();
      selectService('cuci_setrika');
      document.getElementById('input-berat').value = '1.0';
      document.getElementById('input-uang-dibayar').value = '';
      document.getElementById('checkbox-change-returned').checked = true;
      document.getElementById('wa-format-preview').classList.add('hidden');
      document.getElementById('preview-nota-badge').textContent = `#${generateNextNotaId()}`;
      calculateFormTotal();
    }

    async function handleSaveOrder(event) {
      event.preventDefault();

      if (!isSheetsConnected()) {
        showToast('Hubungkan URL Google Sheets terlebih dahulu di Pengaturan!', 'warning');
        switchAdminTab('settings');
        return;
      }

      const nama = document.getElementById('input-nama').value.trim();
      const hpRaw = document.getElementById('input-hp').value.trim();
      const item = SERVICE_ITEMS.find((s) => s.key === selectedServiceKey);
      const total = getComputedFormTotal();

      if (!nama || !hpRaw) {
        showToast('Nama pelanggan dan nomor WhatsApp wajib diisi!', 'error');
        return;
      }

      if (total <= 0) {
        showToast('Nominal total tagihan harus lebih dari Rp 0!', 'error');
        return;
      }

      const paid = parseRupiahInput(document.getElementById('input-uang-dibayar').value);
      const payEval = evaluatePaymentState();
      const statusPengerjaan = document.querySelector('input[name="status_pengerjaan"]:checked').value;
      const beratKg = item.type === 'kiloan' ? Math.max(0.1, parseFloat(document.getElementById('input-berat').value) || 0.1) : 0;
      const catatan = item.type === 'manual' ? document.getElementById('input-item-note').value.trim() : '';

      const now = new Date();
      const tanggalMasuk = now.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const newOrder = {
        ID_Nota: generateNextNotaId(),
        Tanggal_Masuk: tanggalMasuk,
        Nama_Pelanggan: nama,
        No_WA: formatPhoneWA(hpRaw),
        Jenis_Layanan: item.label,
        Berat_Kg: beratKg,
        Catatan: catatan,
        Total_Tagihan: total,
        Uang_Dibayar: paid,
        Status_Kembalian: payEval.statusKembalian,
        Selisih_Uang: payEval.selisihUang,
        Status_Pengerjaan: statusPengerjaan
      };

      const btn = document.getElementById('btn-submit-order');
      btn.disabled = true;

      orders.unshift(newOrder);
      persistSessionState();
      await pushToGoogleSheets('create', newOrder);

      btn.disabled = false;
      resetOrderForm();
      switchAdminTab('orders');
      showToast(`Pesanan #${newOrder.ID_Nota} berhasil disimpan!`);
    }

    // =========================================================
    // DAFTAR CUCIAN ADMIN & AKSI STATUS / PELUNASAN / WHATSAPP
    // =========================================================
    function setWorkFilter(status) {
      workFilter = status;
      document.querySelectorAll('.work-chip').forEach((chip) => {
        if (chip.dataset.work === status) {
          chip.className = 'work-chip shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold bg-ocean-600 text-white shadow-xs transition';
        } else {
          chip.className = 'work-chip shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-600 border border-slate-200 transition';
        }
      });
      renderAdminOrders();
    }

    function setMoneyFilter(status) {
      moneyFilter = status;
      document.querySelectorAll('.money-chip').forEach((chip) => {
        if (chip.dataset.money === status) {
          chip.className = 'money-chip shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-800 text-white shadow-xs transition';
        } else {
          chip.className = 'money-chip shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-white text-slate-700 border border-slate-200 transition';
        }
      });
      renderAdminOrders();
    }

    function updateAdminStats() {
      let diterima = 0;
      let diproses = 0;
      let selesai = 0;
      let totalTagihan = 0;
      let totalPiutang = 0;
      let totalKembalian = 0;

      orders.forEach((o) => {
        if (o.Status_Pengerjaan === 'Diterima') diterima++;
        else if (o.Status_Pengerjaan === 'Diproses') diproses++;
        else if (o.Status_Pengerjaan === 'Selesai') selesai++;

        totalTagihan += Number(o.Total_Tagihan) || 0;

        if (o.Status_Kembalian === 'Kurang Bayar' || o.Status_Kembalian === 'Belum Bayar') {
          totalPiutang += Number(o.Selisih_Uang) || 0;
        } else if (o.Status_Kembalian === 'Kembalian Belum Diberikan') {
          totalKembalian += Number(o.Selisih_Uang) || 0;
        }
      });

      document.getElementById('stat-count-diterima').textContent = diterima;
      document.getElementById('stat-count-diproses').textContent = diproses;
      document.getElementById('stat-count-selesai').textContent = selesai;
      document.getElementById('stat-total-tagihan').textContent = formatRupiah(totalTagihan);
      document.getElementById('stat-total-orders').textContent = `${orders.length} Nota`;
      document.getElementById('stat-total-piutang').textContent = formatRupiah(totalPiutang);
      document.getElementById('stat-total-kembalian').textContent = formatRupiah(totalKembalian);
    }

    function renderAdminOrders() {
      updateAdminStats();
      const container = document.getElementById('admin-orders-list');
      if (!container) return;

      const query = (document.getElementById('admin-search-orders').value || '').trim().toLowerCase();

      const filtered = orders.filter((o) => {
        const matchWork = workFilter === 'Semua' || o.Status_Pengerjaan === workFilter;
        const matchMoney =
          moneyFilter === 'Semua' ||
          (moneyFilter === 'Ada Kembalian' && o.Status_Kembalian === 'Kembalian Belum Diberikan') ||
          o.Status_Kembalian === moneyFilter;

        const matchQuery =
          !query ||
          o.ID_Nota.toLowerCase().includes(query) ||
          o.Nama_Pelanggan.toLowerCase().includes(query) ||
          String(o.No_WA || '').includes(query);

        return matchWork && matchMoney && matchQuery;
      });

      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="bg-white rounded-3xl p-8 text-center border border-slate-100 space-y-2">
            <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <i class="fa-solid fa-basket-shopping text-lg"></i>
            </div>
            <h3 class="text-sm font-extrabold text-slate-700">Belum Ada Data Cucian</h3>
            <p class="text-xs text-slate-400">${
              isSheetsConnected()
                ? 'Tambahkan pesanan baru lewat tab Input Order di bawah.'
                : 'Hubungkan URL Google Sheets di menu Pengaturan & Sheets terlebih dahulu.'
            }</p>
          </div>
        `;
        return;
      }

      container.innerHTML = filtered
        .map((o) => {
          const isKiloan = Number(o.Berat_Kg) > 0;
          const detailInfo = isKiloan ? `${o.Berat_Kg} kg` : o.Catatan || 'Satuan';

          let payBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
          let paySummary = 'Lunas';
          if (o.Status_Kembalian === 'Kurang Bayar') {
            payBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
            paySummary = `Kurang ${formatRupiah(o.Selisih_Uang)}`;
          } else if (o.Status_Kembalian === 'Belum Bayar') {
            payBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
            paySummary = `Belum Bayar ${formatRupiah(o.Selisih_Uang || o.Total_Tagihan)}`;
          } else if (o.Status_Kembalian === 'Kembalian Belum Diberikan') {
            payBadgeClass = 'bg-amber-50 text-amber-800 border-amber-300';
            paySummary = `Kembalian ${formatRupiah(o.Selisih_Uang)}`;
          }

          const workSteps = ['Diterima', 'Diproses', 'Selesai', 'Diambil'];
          const workButtons = workSteps
            .map((st) => {
              const active = o.Status_Pengerjaan === st;
              return `
                <button
                  type="button"
                  onclick="updateOrderWorkStatus('${o.ID_Nota}', '${st}')"
                  class="py-1.5 px-1 rounded-xl text-[10px] font-extrabold border transition ${
                    active
                      ? 'bg-ocean-600 text-white border-ocean-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }"
                >
                  ${st}
                </button>
              `;
            })
            .join('');

          const canSettle = o.Status_Kembalian === 'Kurang Bayar' || o.Status_Kembalian === 'Belum Bayar';
          const canReturnChange = o.Status_Kembalian === 'Kembalian Belum Diberikan';

          let extraMoneyBtn = '';
          if (canSettle) {
            extraMoneyBtn = `
              <button
                type="button"
                onclick="openSettleModal('${o.ID_Nota}')"
                class="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <i class="fa-solid fa-money-bill-wave"></i>
                <span>Lunasi</span>
              </button>
            `;
          } else if (canReturnChange) {
            extraMoneyBtn = `
              <button
                type="button"
                onclick="markChangeReturned('${o.ID_Nota}')"
                class="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <i class="fa-solid fa-hand-holding-dollar"></i>
                <span>Kembalikan</span>
              </button>
            `;
          }

          return `
            <article class="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 space-y-3">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-extrabold text-ocean-700 bg-ocean-50 px-2 py-0.5 rounded-lg">#${o.ID_Nota}</span>
                    <span class="text-[11px] text-slate-400 truncate">${o.Tanggal_Masuk}</span>
                  </div>
                  <h3 class="text-sm font-extrabold text-slate-900 mt-1 truncate">${o.Nama_Pelanggan}</h3>
                  <p class="text-xs text-slate-500 font-medium">${o.Jenis_Layanan} • ${detailInfo}</p>
                </div>

                <span class="px-2.5 py-1 rounded-xl text-[11px] font-extrabold border shrink-0 ${payBadgeClass}">
                  ${paySummary}
                </span>
              </div>

              <div class="bg-slate-50 rounded-2xl px-3 py-2.5 flex items-center justify-between text-xs border border-slate-100">
                <div>
                  <span class="text-slate-400 block text-[10px]">Total Tagihan</span>
                  <span class="font-extrabold text-slate-900">${formatRupiah(o.Total_Tagihan)}</span>
                </div>
                <div class="text-right">
                  <span class="text-slate-400 block text-[10px]">Sudah Dibayar</span>
                  <span class="font-extrabold text-ocean-700">${formatRupiah(o.Uang_Dibayar)}</span>
                </div>
              </div>

              <div>
                <span class="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Status Pengerjaan</span>
                <div class="grid grid-cols-4 gap-1.5">${workButtons}</div>
              </div>

              <div class="flex items-center gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onclick="openWaModal('${o.ID_Nota}')"
                  class="flex-1 py-2.5 px-3 bg-[#25D366] hover:bg-[#1ebe5d] active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition"
                >
                  <i class="fa-brands fa-whatsapp text-sm"></i>
                  <span>Kirim Nota WA</span>
                </button>
                ${extraMoneyBtn}
                <button
                  type="button"
                  onclick="handleDeleteOrder('${o.ID_Nota}')"
                  class="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition shrink-0"
                  title="Hapus Pesanan"
                >
                  <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
              </div>
            </article>
          `;
        })
        .join('');
    }

    async function updateOrderWorkStatus(orderId, newStatus) {
      const idx = orders.findIndex((o) => o.ID_Nota === orderId);
      if (idx === -1) return;

      orders[idx].Status_Pengerjaan = newStatus;
      persistSessionState();
      renderAdminOrders();
      await pushToGoogleSheets('update', orders[idx]);
      showToast(`Status #${orderId} diubah ke "${newStatus}"`);
    }

    async function markChangeReturned(orderId) {
      const idx = orders.findIndex((o) => o.ID_Nota === orderId);
      if (idx === -1) return;

      orders[idx].Status_Kembalian = 'Lunas';
      orders[idx].Selisih_Uang = 0;
      persistSessionState();
      renderAdminOrders();
      await pushToGoogleSheets('update', orders[idx]);
      showToast(`Kembalian #${orderId} ditandai sudah diserahkan`);
    }

    async function handleDeleteOrder(orderId) {
      if (deleteConfirmId !== orderId) {
        deleteConfirmId = orderId;
        showToast(`Klik ikon hapus sekali lagi untuk menghapus #${orderId}`, 'warning');
        setTimeout(() => {
          if (deleteConfirmId === orderId) deleteConfirmId = null;
        }, 3500);
        return;
      }

      deleteConfirmId = null;
      const target = orders.find((o) => o.ID_Nota === orderId);
      orders = orders.filter((o) => o.ID_Nota !== orderId);
      persistSessionState();
      renderAdminOrders();
      if (target) {
        await pushToGoogleSheets('delete', target);
      }
      showToast(`Nota #${orderId} telah dihapus`);
    }

    // =========================================================
    // MODAL PELUNASAN PEMBAYARAN
    // =========================================================
    function openSettleModal(orderId) {
      const order = orders.find((o) => o.ID_Nota === orderId);
      if (!order) return;

      settlingOrderId = orderId;
      const due = Math.max(0, (Number(order.Total_Tagihan) || 0) - (Number(order.Uang_Dibayar) || 0));

      document.getElementById('settle-modal-subtitle').textContent = `#${order.ID_Nota} • ${order.Nama_Pelanggan}`;
      document.getElementById('settle-total-tagihan').textContent = formatRupiah(order.Total_Tagihan);
      document.getElementById('settle-already-paid').textContent = formatRupiah(order.Uang_Dibayar);
      document.getElementById('settle-remaining-due').textContent = formatRupiah(due);
      document.getElementById('settle-add-amount').value = due > 0 ? due.toLocaleString('id-ID') : '';
      document.getElementById('settle-overpay-box').classList.add('hidden');

      const modal = document.getElementById('settle-modal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeSettleModal() {
      settlingOrderId = null;
      const modal = document.getElementById('settle-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    function fillExactRemainingDue() {
      const order = orders.find((o) => o.ID_Nota === settlingOrderId);
      if (!order) return;
      const due = Math.max(0, (Number(order.Total_Tagihan) || 0) - (Number(order.Uang_Dibayar) || 0));
      document.getElementById('settle-add-amount').value = due > 0 ? due.toLocaleString('id-ID') : '';
      document.getElementById('settle-overpay-box').classList.add('hidden');
    }

    function handleSettleTyping(el) {
      const val = parseRupiahInput(el.value);
      el.value = val > 0 ? val.toLocaleString('id-ID') : '';

      const order = orders.find((o) => o.ID_Nota === settlingOrderId);
      if (!order) return;
      const due = Math.max(0, (Number(order.Total_Tagihan) || 0) - (Number(order.Uang_Dibayar) || 0));

      const overpayBox = document.getElementById('settle-overpay-box');
      if (val > due) {
        overpayBox.classList.remove('hidden');
        document.getElementById('settle-overpay-amount').textContent = formatRupiah(val - due);
      } else {
        overpayBox.classList.add('hidden');
      }
    }

    async function submitSettlePayment(event) {
      event.preventDefault();
      const idx = orders.findIndex((o) => o.ID_Nota === settlingOrderId);
      if (idx === -1) return;

      const order = orders[idx];
      const addAmount = parseRupiahInput(document.getElementById('settle-add-amount').value);
      if (addAmount <= 0) {
        showToast('Masukkan nominal pembayaran tambahan!', 'error');
        return;
      }

      const newPaid = (Number(order.Uang_Dibayar) || 0) + addAmount;
      const total = Number(order.Total_Tagihan) || 0;
      order.Uang_Dibayar = newPaid;

      if (newPaid < total) {
        order.Status_Kembalian = 'Kurang Bayar';
        order.Selisih_Uang = total - newPaid;
      } else if (newPaid === total) {
        order.Status_Kembalian = 'Lunas';
        order.Selisih_Uang = 0;
      } else {
        const changeMode = document.querySelector('input[name="settle_change_mode"]:checked').value;
        const changeAmt = newPaid - total;
        if (changeMode === 'given') {
          order.Status_Kembalian = 'Lunas';
          order.Selisih_Uang = 0;
        } else {
          order.Status_Kembalian = 'Kembalian Belum Diberikan';
          order.Selisih_Uang = changeAmt;
        }
      }

      persistSessionState();
      renderAdminOrders();
      closeSettleModal();
      await pushToGoogleSheets('update', order);
      showToast(`Pembayaran #${order.ID_Nota} berhasil diperbarui!`);
    }

    // =========================================================
    // KIRIM NOTA WHATSAPP KE PELANGGAN (TANPA BOCORKAN PIN)
    // =========================================================
    function openWaModal(orderId) {
      const order = orders.find((o) => o.ID_Nota === orderId);
      if (!order) return;

      const outletName = settings.outletName || CONFIG_LAUNDRY.NAMA_LAUNDRY;
      const outletAddr = settings.address ? `\nAlamat: ${settings.address}` : '';
      const isKiloan = Number(order.Berat_Kg) > 0;
      const rincian = isKiloan ? `${order.Jenis_Layanan} (${order.Berat_Kg} kg)` : `${order.Jenis_Layanan}${order.Catatan ? ' - ' + order.Catatan : ''}`;

      let statusBayarText = order.Status_Kembalian;
      if (order.Status_Kembalian === 'Kurang Bayar') {
        statusBayarText = `Kurang Bayar (${formatRupiah(order.Selisih_Uang)})`;
      } else if (order.Status_Kembalian === 'Kembalian Belum Diberikan') {
        statusBayarText = `Lunas (Ada Sisa Kembalian ${formatRupiah(order.Selisih_Uang)})`;
      }

      // Link nota pelanggan mengarah ke laman nota toko ini (pelanggan langsung melihat nota tanpa perlu PIN)
      const baseUrl = `${window.location.origin}${window.location.pathname}`;
      const activeUrl = getActiveScriptUrl();
      const dbQuery = activeUrl ? `&db=${encodeURIComponent(encodeStoreParam(activeUrl))}` : '';
      const receiptLink = `${baseUrl}?nota=${encodeURIComponent(order.ID_Nota)}${dbQuery}`;

      const message =
        `Halo Kak *${order.Nama_Pelanggan}*,\n` +
        `Berikut nota digital cucian Anda di *${outletName}*:${outletAddr}\n\n` +
        `• No. Nota: *#${order.ID_Nota}*\n` +
        `• Layanan: ${rincian}\n` +
        `• Status Cucian: *${order.Status_Pengerjaan}*\n` +
        `• Total Tagihan: *${formatRupiah(order.Total_Tagihan)}*\n` +
        `• Uang Dibayar: ${formatRupiah(order.Uang_Dibayar)}\n` +
        `• Status Bayar: *${statusBayarText}*\n\n` +
        `Cek status & rincian nota Anda secara langsung di link berikut:\n${receiptLink}\n\n` +
        `Terima kasih!`;

      currentModalWaText = message;
      const waPhone = formatPhoneWA(order.No_WA);

      document.getElementById('wa-modal-recipient').textContent = `Tujuan: ${order.Nama_Pelanggan} (${waPhone})`;
      document.getElementById('wa-message-preview').textContent = message;
      document.getElementById('wa-direct-link').href = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;

      const modal = document.getElementById('wa-modal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeWaModal() {
      const modal = document.getElementById('wa-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    async function copyWaMessage() {
      try {
        await navigator.clipboard.writeText(currentModalWaText);
        showToast('Teks nota berhasil disalin!');
      } catch (e) {
        showToast('Gagal menyalin teks', 'error');
      }
    }

    // =========================================================
    // PENGATURAN & KONEKSI GOOGLE SHEETS (KOSONG SAAT AWAL)
    // =========================================================
    function populateSettingsForm() {
      document.getElementById('setting-script-url').value = settings.scriptUrl || '';
      document.getElementById('setting-outlet-name').value = settings.outletName || '';
      document.getElementById('setting-admin-pin').value = settings.adminPin || '';
      document.getElementById('setting-admin-wa').value = settings.adminWa || '';
      document.getElementById('setting-outlet-address').value = settings.address || '';

      document.getElementById('rate-cuci_mamel').value = settings.rates.cuci_mamel !== '' ? settings.rates.cuci_mamel : '';
      document.getElementById('rate-cuci_kering').value = settings.rates.cuci_kering !== '' ? settings.rates.cuci_kering : '';
      document.getElementById('rate-cuci_setrika').value = settings.rates.cuci_setrika !== '' ? settings.rates.cuci_setrika : '';
      document.getElementById('rate-setrika').value = settings.rates.setrika !== '' ? settings.rates.setrika : '';
      document.getElementById('rate-tikar_default').value = settings.rates.tikar_default !== '' ? settings.rates.tikar_default : '';
    }

    async function saveAndTestSheetsUrl() {
      const urlInput = document.getElementById('setting-script-url').value.trim();

      if (!urlInput) {
        showToast('Tempel URL Google Apps Script terlebih dahulu!', 'error');
        return;
      }

      if (!urlInput.startsWith('https://script.google.com/')) {
        showToast('URL harus diawali https://script.google.com/...', 'error');
        return;
      }

      const btn = document.getElementById('btn-save-sheets');
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>Menghubungkan...</span>`;

      settings.scriptUrl = urlInput;
      sharedStoreScriptUrl = '';
      persistSessionState();

      const ok = await syncFromGoogleSheets(true);
      if (ok) {
        updateConnectionBadgeUI();
        applyOutletBranding();
        populateSettingsForm();
      } else {
        settings.scriptUrl = '';
        persistSessionState();
        updateConnectionBadgeUI();
      }

      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }

    async function pushSettingsToGoogleSheets() {
      const activeUrl = getActiveScriptUrl();
      if (!activeUrl) return false;

      const payloadData = {
        Nama_Outlet: settings.outletName,
        Slogan: settings.slogan || 'Cepat, Bersih & Wangi',
        Alamat_Outlet: settings.address,
        No_WA_Admin: settings.adminWa,
        PIN_Admin: settings.adminPin,
        Cuci_Mamel: settings.rates.cuci_mamel,
        Cuci_Kering: settings.rates.cuci_kering,
        Cuci_Setrika: settings.rates.cuci_setrika,
        Setrika: settings.rates.setrika,
        Tikar_Default: settings.rates.tikar_default
      };

      try {
        await fetch(activeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'saveSettings',
            data: payloadData
          })
        });
        return true;
      } catch (err) {
        console.error('Gagal menyimpan pengaturan ke Google Sheets:', err);
        return false;
      }
    }

    async function saveAppSettings(event) {
      event.preventDefault();

      if (!isSheetsConnected()) {
        showToast('Hubungkan URL Google Apps Script terlebih dahulu di bagian atas!', 'warning');
        return;
      }

      const newOutlet = document.getElementById('setting-outlet-name').value.trim();
      const newPin = document.getElementById('setting-admin-pin').value.trim();
      const newAdminWa = formatPhoneWA(document.getElementById('setting-admin-wa').value.trim());
      const newAddress = document.getElementById('setting-outlet-address').value.trim();

      settings.outletName = newOutlet;
      settings.adminPin = newPin;
      settings.adminWa = newAdminWa;
      settings.address = newAddress;
      settings.rates = {
        cuci_mamel: Number(document.getElementById('rate-cuci_mamel').value) || 0,
        cuci_kering: Number(document.getElementById('rate-cuci_kering').value) || 0,
        cuci_setrika: Number(document.getElementById('rate-cuci_setrika').value) || 0,
        setrika: Number(document.getElementById('rate-setrika').value) || 0,
        tikar_default: Number(document.getElementById('rate-tikar_default').value) || 0
      };

      persistSessionState();
      applyOutletBranding();
      renderServiceSelector();

      const saved = await pushSettingsToGoogleSheets();
      if (saved) {
        showToast('Profil outlet, alamat, WA, PIN & tarif tersimpan ke Google Sheets!');
      } else {
        showToast('Gagal menyimpan ke Google Sheets. Periksa koneksi internet.', 'error');
      }
    }

    // Jalankan Aplikasi saat DOM Siap
    document.addEventListener('DOMContentLoaded', initApp);
