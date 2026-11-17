    // =========================================================================
    // KONFIGURASI UTAMA LAUNDRY (EDIT BAGIAN INI SEBELUM UPLOAD KE HOSTING)
    // =========================================================================
    // Petunjuk Publikasi Online (Vercel / Netlify / GitHub Pages):
    // 1. Deploy Google Apps Script Anda sebagai Web App (akses: "Anyone").
    // 2. Tempel URL Web App yang berakhiran "/exec" di dalam tanda kutip GOOGLE_SCRIPT_URL di bawah.
    // 3. Sesuaikan nama laundry, alamat, nomor WhatsApp admin, PIN kasir, dan tarif default.
    // 4. Simpan file HTML ini lalu upload ke hosting gratis pilihan Anda.
    const CONFIG_LAUNDRY = {
      GOOGLE_SCRIPT_URL: "", // TEMPEL URL WEB APP GOOGLE APPS SCRIPT ANDA DI SINI (contoh: "https://script.google.com/macros/s/AKfycb.../exec")
      NAMA_LAUNDRY: "SmartLaundry",
      SLOGAN_LAUNDRY: "Cepat, Bersih & Wangi",
      ALAMAT_LAUNDRY: "Karanganyar Barat depan TK",
      NO_WA_ADMIN: "6281234567890",
      PIN_ADMIN_DEFAULT: "1234",
      TARIF_DEFAULT: {
        "Cuci Mamel": 4000,
        "Cuci Kering": 5000,
        "Cuci Setrika": 7000,
        "Setrika": 4500,
        "Tikar": 15000
      }
    };

    // Kunci penyimpanan localStorage (cache & pengaturan lokal)
    const STORAGE_KEYS = {
      ORDERS: 'smartlaundry_orders_v4',
      SETTINGS: 'smartlaundry_settings_v4',
      ADMIN_SESSION: 'smartlaundry_admin_unlocked_v4'
    };

    // Konfigurasi default aplikasi yang mewarisi nilai dari CONFIG_LAUNDRY
    const DEFAULT_SETTINGS = {
      outletName: CONFIG_LAUNDRY.NAMA_LAUNDRY || 'SmartLaundry',
      slogan: CONFIG_LAUNDRY.SLOGAN_LAUNDRY || 'Cepat, Bersih & Wangi',
      address: CONFIG_LAUNDRY.ALAMAT_LAUNDRY || 'Jl. Melati No. 12',
      adminWa: CONFIG_LAUNDRY.NO_WA_ADMIN || '6281234567890',
      adminPin: CONFIG_LAUNDRY.PIN_ADMIN_DEFAULT || '1234',
      scriptUrl: '',
      rates: {
        cuci_mamel: Number(CONFIG_LAUNDRY.TARIF_DEFAULT["Cuci Mamel"]) || 4000,
        cuci_kering: Number(CONFIG_LAUNDRY.TARIF_DEFAULT["Cuci Kering"]) || 5000,
        cuci_setrika: Number(CONFIG_LAUNDRY.TARIF_DEFAULT["Cuci Setrika"]) || 7000,
        setrika: Number(CONFIG_LAUNDRY.TARIF_DEFAULT["Setrika"]) || 4500,
        tikar_default: Number(CONFIG_LAUNDRY.TARIF_DEFAULT["Tikar"]) || 15000
      }
    };

    // 4 Data Contoh Awal dengan skema persis kompatibel dengan kolom Google Sheets
    const INITIAL_SAMPLE_ORDERS = [
      {
        ID_Nota: 'LND-001',
        Tanggal_Masuk: '17 Nov 2026, 08:30',
        Nama_Pelanggan: 'Budi Santoso',
        No_WA: '081234567890',
        Jenis_Layanan: 'Cuci Setrika',
        Berat_Kg: 4.0,
        Catatan: '',
        Total_Tagihan: 28000,
        Uang_Dibayar: 28000,
        Status_Kembalian: 'Lunas',
        Selisih_Uang: 0,
        Status_Pengerjaan: 'Selesai'
      },
      {
        ID_Nota: 'LND-002',
        Tanggal_Masuk: '17 Nov 2026, 10:15',
        Nama_Pelanggan: 'Siti Aminah',
        No_WA: '085712349876',
        Jenis_Layanan: 'Karpet',
        Berat_Kg: 0,
        Catatan: 'Karpet bulu ruang tamu 2x3m',
        Total_Tagihan: 55000,
        Uang_Dibayar: 30000,
        Status_Kembalian: 'Kurang Bayar',
        Selisih_Uang: 25000,
        Status_Pengerjaan: 'Diproses'
      },
      {
        ID_Nota: 'LND-003',
        Tanggal_Masuk: '17 Nov 2026, 13:05',
        Nama_Pelanggan: 'Rizky Pratama',
        No_WA: '081398765432',
        Jenis_Layanan: 'Cuci Mamel',
        Berat_Kg: 4.8,
        Catatan: '',
        Total_Tagihan: 19200,
        Uang_Dibayar: 50000,
        Status_Kembalian: 'Kembalian Belum Diberikan',
        Selisih_Uang: 30800,
        Status_Pengerjaan: 'Diterima'
      },
      {
        ID_Nota: 'LND-004',
        Tanggal_Masuk: '16 Nov 2026, 16:40',
        Nama_Pelanggan: 'Dewi Lestari',
        No_WA: '082145678901',
        Jenis_Layanan: 'Tikar',
        Berat_Kg: 0,
        Catatan: 'Tikar lipat jumbo',
        Total_Tagihan: 15000,
        Uang_Dibayar: 0,
        Status_Kembalian: 'Belum Bayar',
        Selisih_Uang: 15000,
        Status_Pengerjaan: 'Diambil'
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
    let settings = {};
    let workFilter = 'Semua';
    let moneyFilter = 'Semua';
    let selectedServiceKey = 'cuci_setrika';
    let currentModalWaText = '';
    let deleteConfirmId = null;
    let resetDemoConfirmState = false;
    let settlingOrderId = null;

    // =========================================================
    // RESOLUSI URL GOOGLE APPS SCRIPT (PRIORITAS CONFIG_LAUNDRY)
    // =========================================================
    function hasHardcodedScriptUrl() {
      return Boolean(
        CONFIG_LAUNDRY.GOOGLE_SCRIPT_URL &&
        CONFIG_LAUNDRY.GOOGLE_SCRIPT_URL.trim().startsWith('http')
      );
    }

    function getActiveScriptUrl() {
      if (hasHardcodedScriptUrl()) {
        return CONFIG_LAUNDRY.GOOGLE_SCRIPT_URL.trim();
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
    // INISIALISASI APLIKASI & SINKRONISASI AWAL
    // =========================================================
    async function initApp() {
      loadLocalState();
      applyOutletBranding();
      updateConnectionBadgeUI();
      populateSettingsForm();
      renderPublicQuickChips();

      // Cek apakah ada parameter ?nota=LND-XXX di URL (dari klik link WhatsApp pelanggan)
      const urlParams = new URLSearchParams(window.location.search);
      const notaParam = urlParams.get('nota');

      if (notaParam) {
        document.getElementById('public-search-input').value = notaParam;
        searchPublicReceipt(notaParam);
      } else if (orders.length > 0) {
        document.getElementById('public-search-input').value = orders[0].ID_Nota;
        searchPublicReceipt(orders[0].ID_Nota);
      }

      // Jika URL Google Apps Script aktif (dari CONFIG_LAUNDRY atau lokal), otomatis muat data terbaru
      if (isSheetsConnected()) {
        await syncFromGoogleSheets(false);
        if (notaParam) {
          searchPublicReceipt(notaParam);
        } else if (orders.length > 0) {
          const currentInput = document.getElementById('public-search-input').value;
          searchPublicReceipt(currentInput || orders[0].ID_Nota);
        }
      }

      // Cek sesi login admin jika sebelumnya sudah dibuka di tab browser yang sama
      if (sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) === 'true') {
        enterAdminView();
      }
    }

    function loadLocalState() {
      try {
        const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          settings = {
            ...DEFAULT_SETTINGS,
            ...parsed,
            rates: { ...DEFAULT_SETTINGS.rates, ...(parsed.rates || {}) }
          };
        } else {
          settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        }

        const savedOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
        if (savedOrders) {
          orders = JSON.parse(savedOrders);
        } else {
          orders = JSON.parse(JSON.stringify(INITIAL_SAMPLE_ORDERS));
          persistOrdersLocal();
        }
      } catch (e) {
        console.error('Gagal memuat state lokal:', e);
        settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        orders = JSON.parse(JSON.stringify(INITIAL_SAMPLE_ORDERS));
      }
    }

    function persistOrdersLocal() {
      try {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      } catch (e) {
        console.error('Gagal menyimpan cache pesanan:', e);
      }
    }

    function persistSettingsLocal() {
      try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      } catch (e) {
        console.error('Gagal menyimpan pengaturan:', e);
      }
    }

    function applyOutletBranding() {
      const name = settings.outletName || CONFIG_LAUNDRY.NAMA_LAUNDRY || 'SmartLaundry';
      const slogan = settings.slogan || CONFIG_LAUNDRY.SLOGAN_LAUNDRY || 'Cepat, Bersih & Wangi';
      const address = settings.address || CONFIG_LAUNDRY.ALAMAT_LAUNDRY || 'Jl. Melati No. 12';

      document.title = `${name} — Kasir & Cek Nota Digital`;
      const pubTitle = document.getElementById('public-outlet-name');
      const pubSlogan = document.getElementById('public-outlet-slogan');
      const pubAddress = document.getElementById('public-outlet-address');
      const admTitle = document.getElementById('admin-outlet-name');

      if (pubTitle) pubTitle.textContent = name;
      if (pubSlogan) pubSlogan.textContent = slogan;
      if (pubAddress) pubAddress.innerHTML = `<i class="fa-solid fa-location-dot mr-1"></i>${address}`;
      if (admTitle) admTitle.textContent = `${name} Kasir`;
    }

    function updateConnectionBadgeUI() {
      const badge = document.getElementById('db-connection-badge');
      const sourceInfo = document.getElementById('sheets-source-info');

      if (hasHardcodedScriptUrl()) {
        if (badge) {
          badge.className = 'flex items-center gap-1.5 font-bold text-emerald-300';
          badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span><span>Google Sheets Aktif (Dari Kode HTML)</span>`;
        }
        if (sourceInfo) {
          sourceInfo.className = 'p-3 rounded-2xl border text-xs space-y-1 bg-emerald-50 border-emerald-200 text-emerald-900';
          sourceInfo.innerHTML = `
            <div class="font-extrabold flex items-center gap-1.5">
              <i class="fa-solid fa-circle-check text-emerald-600"></i>
              <span>Terhubung Permanen via CONFIG_LAUNDRY</span>
            </div>
            <p class="text-[11px] text-emerald-800">Semua HP pelanggan dan perangkat kasir otomatis terhubung ke Google Sheets Anda.</p>
          `;
        }
      } else if (isSheetsConnected()) {
        if (badge) {
          badge.className = 'flex items-center gap-1.5 font-bold text-sky-300';
          badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-sky-400"></span><span>Google Sheets Aktif (Pengaturan Lokal)</span>`;
        }
        if (sourceInfo) {
          sourceInfo.className = 'p-3 rounded-2xl border text-xs space-y-1 bg-sky-50 border-sky-200 text-sky-900';
          sourceInfo.innerHTML = `
            <div class="font-extrabold flex items-center gap-1.5">
              <i class="fa-solid fa-laptop-code text-sky-600"></i>
              <span>Terhubung via URL Uji Coba Browser Ini</span>
            </div>
            <p class="text-[11px] text-sky-800">Agar HP pelanggan juga otomatis terhubung setelah web di-online-kan, salin URL ini ke <strong>CONFIG_LAUNDRY.GOOGLE_SCRIPT_URL</strong> di dalam file HTML.</p>
          `;
        }
      } else {
        if (badge) {
          badge.className = 'flex items-center gap-1.5 font-bold text-amber-300';
          badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span><span>Mode Demo Lokal (Belum Hubung Sheets)</span>`;
        }
        if (sourceInfo) {
          sourceInfo.className = 'p-3 rounded-2xl border text-xs space-y-1 bg-amber-50 border-amber-200 text-amber-900';
          sourceInfo.innerHTML = `
            <div class="font-extrabold flex items-center gap-1.5">
              <i class="fa-solid fa-triangle-exclamation text-amber-600"></i>
              <span>Belum Terhubung ke Google Sheets</span>
            </div>
            <p class="text-[11px] text-amber-800">Data saat ini hanya tersimpan di memori browser perangkat ini. Masukkan URL Apps Script di bawah untuk uji coba atau di <strong>CONFIG_LAUNDRY</strong> untuk publikasi.</p>
          `;
        }
      }
    }

    // =========================================================
    // INTEGRASI GOOGLE SHEETS (VIA GOOGLE APPS SCRIPT WEB APP)
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
          showToast('URL Google Apps Script belum diisi di CONFIG_LAUNDRY maupun Pengaturan', 'warning');
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
        const rows = Array.isArray(result) ? result : Array.isArray(result.data) ? result.data : null;

        if (!rows) {
          throw new Error('Format respon JSON dari Apps Script tidak sesuai');
        }

        orders = rows.map(normalizeSheetRow).filter((r) => r.ID_Nota);
        persistOrdersLocal();
        renderAdminOrders();
        renderPublicQuickChips();

        if (showFeedback) {
          showToast(`Berhasil memuat ${orders.length} data dari Google Sheets!`);
        }
        return true;
      } catch (err) {
        console.error('Error sync Google Sheets:', err);
        if (showFeedback) {
          showToast('Gagal memuat dari Google Sheets. Pastikan URL & izin akses "Anyone" benar.', 'error');
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
        showToast('Tersimpan lokal, namun gagal sinkron ke Google Sheets', 'warning');
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
    // BAGIAN 1: LOGIKA HALAMAN PUBLIK (CEK NOTA DIGITAL)
    // =========================================================
    function renderPublicQuickChips() {
      const container = document.getElementById('public-quick-chips');
      if (!container) return;
      container.innerHTML = orders
        .slice(0, 4)
        .map(
          (o) => `
          <button
            type="button"
            onclick="quickSearchPublic('${o.ID_Nota}')"
            class="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-ocean-100 text-slate-700 hover:text-ocean-700 text-[11px] font-bold transition"
          >
            ${o.ID_Nota} (${o.Nama_Pelanggan.split(' ')[0]})
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
              <p class="text-[11px] text-rose-700 pl-5">
                Mohon melunasi sisa kekurangan saat pengambilan cucian di kasir.
              </p>
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
              <p class="text-[11px] text-amber-800 pl-5">
                Tunjukkan nota digital ini kepada kasir untuk mengambil sisa uang kembalian Anda.
              </p>
            </div>
          `
        };
      }

      // Default: Belum Bayar
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
            <p class="text-[11px] text-rose-700 pl-5">
              Pembayaran dapat dilakukan di kasir saat pengambilan cucian.
            </p>
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

      const outletName = settings.outletName || CONFIG_LAUNDRY.NAMA_LAUNDRY || 'SmartLaundry';
      const adminWaPhone = formatPhoneWA(settings.adminWa || CONFIG_LAUNDRY.NO_WA_ADMIN || '6281234567890');

      if (matches.length === 0) {
        resultContainer.innerHTML = `
          <div class="bg-white rounded-3xl p-6 text-center shadow-sm border border-slate-100 space-y-2 animate-fade-up">
            <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
              <i class="fa-solid fa-file-circle-question text-xl"></i>
            </div>
            <h3 class="text-sm font-extrabold text-slate-800">Nota Tidak Ditemukan</h3>
            <p class="text-xs text-slate-500">Periksa kembali Nomor Nota (contoh: <strong>LND-001</strong>) atau Nomor WhatsApp Anda.</p>
          </div>
        `;
        return;
      }

      resultContainer.innerHTML = matches
        .map((found) => {
          // Stepper status pengerjaan (Diterima -> Diproses -> Selesai, plus Diambil)
          const stepMap = { Diterima: 1, Diproses: 2, Selesai: 3, Diambil: 4 };
          const stepIndex = stepMap[found.Status_Pengerjaan] || 1;
          const progressWidth = stepIndex === 1 ? '0%' : stepIndex === 2 ? '33.3%' : stepIndex === 3 ? '66.6%' : '100%';

          const isKiloan = Number(found.Berat_Kg) > 0;
          const specLabel = isKiloan ? 'Berat Cucian' : 'Keterangan';
          const specValue = isKiloan
            ? `${found.Berat_Kg} kg`
            : found.Catatan || 'Layanan satuan (1 pcs)';

          const payInfo = getPublicPaymentBanner(found);
          const askAdminText = encodeURIComponent(
            `Halo Admin *${outletName}*, saya ingin menanyakan pesanan laundry saya dengan No. Nota *#${found.ID_Nota}* atas nama *${found.Nama_Pelanggan}*.`
          );

          return `
            <article class="bg-white rounded-3xl p-5 shadow-md border border-slate-100 space-y-4 animate-fade-up">
              <!-- Header Nota -->
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

              <!-- Visual Progress Bar Status Pengerjaan -->
              <div class="py-1">
                <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">Status Pengerjaan</span>
                <div class="grid grid-cols-4 relative">
                  <!-- Garis penghubung -->
                  <div class="absolute left-6 right-6 top-4 h-1 bg-slate-100 rounded-full z-0">
                    <div class="h-full bg-ocean-600 rounded-full transition-all duration-500" style="width: ${progressWidth}"></div>
                  </div>

                  <!-- Tahap 1: Diterima -->
                  <div class="relative z-10 flex flex-col items-center gap-1.5">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                      stepIndex >= 1 ? 'bg-ocean-600 text-white' : 'bg-slate-100 text-slate-400'
                    }">
                      <i class="fa-solid fa-box-open"></i>
                    </div>
                    <span class="text-[10px] font-bold ${stepIndex >= 1 ? 'text-ocean-700' : 'text-slate-400'}">Diterima</span>
                  </div>

                  <!-- Tahap 2: Diproses -->
                  <div class="relative z-10 flex flex-col items-center gap-1.5">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                      stepIndex >= 2 ? 'bg-ocean-600 text-white' : 'bg-slate-100 text-slate-400'
                    }">
                      <i class="fa-solid fa-spinner ${found.Status_Pengerjaan === 'Diproses' ? 'fa-spin' : ''}"></i>
                    </div>
                    <span class="text-[10px] font-bold ${stepIndex >= 2 ? 'text-ocean-700' : 'text-slate-400'}">Diproses</span>
                  </div>

                  <!-- Tahap 3: Selesai -->
                  <div class="relative z-10 flex flex-col items-center gap-1.5">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                      stepIndex >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                    }">
                      <i class="fa-solid fa-check"></i>
                    </div>
                    <span class="text-[10px] font-bold ${stepIndex >= 3 ? 'text-emerald-700' : 'text-slate-400'}">Selesai</span>
                  </div>

                  <!-- Tahap 4: Diambil -->
                  <div class="relative z-10 flex flex-col items-center gap-1.5">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                      stepIndex >= 4 ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'
                    }">
                      <i class="fa-solid fa-bag-shopping"></i>
                    </div>
                    <span class="text-[10px] font-bold ${stepIndex >= 4 ? 'text-slate-800' : 'text-slate-400'}">Diambil</span>
                  </div>
                </div>
              </div>

              <!-- Rincian Layanan & Keuangan -->
              <div class="bg-slate-50 rounded-2xl p-4 space-y-2.5 border border-slate-100 text-xs">
                <div class="flex justify-between gap-3">
                  <span class="text-slate-500">Nama Pelanggan</span>
                  <span class="font-extrabold text-slate-800 text-right">${found.Nama_Pelanggan}</span>
                </div>
                <div class="flex justify-between gap-3">
                  <span class="text-slate-500">Jenis Layanan</span>
                  <span class="font-bold text-ocean-700 text-right">${found.Jenis_Layanan}</span>
                </div>
                <div class="flex justify-between gap-3">
                  <span class="text-slate-500 shrink-0">${specLabel}</span>
                  <span class="font-bold text-slate-800 text-right">${specValue}</span>
                </div>
                <div class="border-t border-slate-200 pt-2.5 flex justify-between items-center">
                  <span class="font-bold text-slate-600">Total Tagihan</span>
                  <span class="font-extrabold text-sm text-slate-900">${formatRupiah(found.Total_Tagihan)}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="font-bold text-slate-600">Uang Dibayar</span>
                  <span class="font-extrabold text-sm text-slate-800">${formatRupiah(found.Uang_Dibayar)}</span>
                </div>
              </div>

              <!-- Kotak Peringatan Kekurangan Bayar / Sisa Kembalian Belum Diberikan -->
              ${payInfo.alertHtml}

              <!-- Tombol Hubungi Admin via WhatsApp -->
              <a
                href="https://wa.me/${adminWaPhone}?text=${askAdminText}"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full py-3 px-4 bg-[#25D366] hover:bg-[#1ebe5d] active:scale-[0.99] text-white font-extrabold text-xs rounded-2xl shadow-sm shadow-emerald-500/25 flex items-center justify-center gap-2 transition"
              >
                <i class="fa-brands fa-whatsapp text-base"></i>
                <span>Hubungi Admin via WA</span>
              </a>
            </article>
          `;
        })
        .join('');
    }

    // =========================================================
    // AUTENTIKASI PIN ADMIN / KASIR
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
      const validPin = String(settings.adminPin || '1234');

      if (entered === validPin) {
        sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, 'true');
        closePinModal();
        enterAdminView();
        showToast('Berhasil masuk ke Halaman Admin / Kasir');
      } else {
        showToast('PIN salah! Gunakan PIN demo 1234', 'error');
        document.getElementById('admin-pin-input').value = '';
        document.getElementById('admin-pin-input').focus();
      }
    }

    function enterAdminView() {
      document.getElementById('public-view').classList.add('hidden');
      document.getElementById('admin-view').classList.remove('hidden');
      renderServiceSelector();
      selectService('cuci_setrika');
      updateNextNotaPreview();
      renderAdminOrders();
    }

    function logoutAdmin() {
      sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
      document.getElementById('admin-view').classList.add('hidden');
      document.getElementById('public-view').classList.remove('hidden');
      renderPublicQuickChips();
      const currentPubVal = document.getElementById('public-search-input').value;
      if (currentPubVal) searchPublicReceipt(currentPubVal);
      showToast('Kembali ke Halaman Publik Pelanggan');
    }

    // =========================================================
    // BAGIAN 2: NAVIGASI TAB ADMIN
    // =========================================================
    function switchAdminTab(tabName) {
      const tabs = ['orders', 'input', 'settings'];
      tabs.forEach((t) => {
        const el = document.getElementById(`admin-tab-${t}`);
        if (el) el.classList.toggle('hidden', t !== tabName);
      });

      document.querySelectorAll('.admin-nav-btn').forEach((btn) => {
        const active = btn.getAttribute('data-admintab') === tabName;
        if (active) {
          btn.classList.remove('text-slate-500', 'font-medium');
          btn.classList.add('text-ocean-600', 'bg-ocean-50', 'font-bold');
        } else {
          btn.classList.add('text-slate-500', 'font-medium');
          btn.classList.remove('text-ocean-600', 'bg-ocean-50', 'font-bold');
        }
      });

      if (tabName === 'input') {
        renderServiceSelector();
        updateNextNotaPreview();
        calculateFormTotal();
      } else if (tabName === 'orders') {
        renderAdminOrders();
      } else if (tabName === 'settings') {
        populateSettingsForm();
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // =========================================================
    // INPUT ORDER BARU & KALKULATOR PEMBAYARAN / KEMBALIAN
    // =========================================================
    function generateNextNotaId() {
      if (orders.length === 0) return 'LND-001';
      let maxNum = 0;
      orders.forEach((o) => {
        const match = String(o.ID_Nota).match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      return `LND-${String(maxNum + 1).padStart(3, '0')}`;
    }

    function updateNextNotaPreview() {
      const badge = document.getElementById('preview-nota-badge');
      if (badge) badge.textContent = `#${generateNextNotaId()}`;
    }

    function updatePhonePreview() {
      const raw = document.getElementById('input-hp').value;
      const preview = document.getElementById('wa-format-preview');
      const formatted = formatPhoneWA(raw);
      if (formatted.length >= 4) {
        preview.textContent = `WA: ${formatted}`;
        preview.classList.remove('hidden');
      } else {
        preview.classList.add('hidden');
      }
    }

    function renderServiceSelector() {
      const container = document.getElementById('service-selector');
      if (!container) return;
      container.innerHTML = SERVICE_ITEMS.map((item) => {
        const isSelected = item.key === selectedServiceKey;
        let rateText = '';
        if (item.type === 'kiloan') {
          rateText = `${formatRupiah(settings.rates[item.key])}/kg`;
        } else if (item.key === 'karpet') {
          rateText = 'Input Manual';
        } else {
          rateText = `${formatRupiah(settings.rates.tikar_default)}/pcs`;
        }

        return `
          <button
            type="button"
            onclick="selectService('${item.key}')"
            class="p-3 rounded-2xl border text-left transition flex items-start gap-2.5 ${
              isSelected
                ? 'bg-ocean-50 border-ocean-600 ring-1 ring-ocean-600 shadow-xs'
                : 'bg-white border-slate-200 hover:border-ocean-300'
            }"
          >
            <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              isSelected ? 'bg-ocean-600 text-white' : 'bg-slate-100 text-slate-500'
            }">
              <i class="fa-solid ${item.icon} text-xs"></i>
            </div>
            <div class="min-w-0">
              <div class="text-xs font-extrabold text-slate-800 truncate">${item.label}</div>
              <div class="text-[11px] font-semibold ${isSelected ? 'text-ocean-700' : 'text-slate-400'}">${rateText}</div>
            </div>
          </button>
        `;
      }).join('');
    }

    function selectService(key) {
      selectedServiceKey = key;
      renderServiceSelector();

      const serviceObj = SERVICE_ITEMS.find((s) => s.key === key);
      const secKiloan = document.getElementById('section-kiloan');
      const secManual = document.getElementById('section-manual-item');
      const manualInput = document.getElementById('input-manual-price');
      const labelPrice = document.getElementById('label-manual-price');
      const hintPrice = document.getElementById('hint-manual-price');
      const inputNote = document.getElementById('input-item-note');
      const btnResetTikar = document.getElementById('btn-reset-tikar-price');

      if (serviceObj.type === 'kiloan') {
        secKiloan.classList.remove('hidden');
        secManual.classList.add('hidden');
        document.getElementById('label-tarif-per-kg').textContent = `${formatRupiah(settings.rates[key])} / kg`;
      } else {
        secKiloan.classList.add('hidden');
        secManual.classList.remove('hidden');

        if (key === 'karpet') {
          labelPrice.innerHTML = 'Harga Cuci Karpet (Rp) <span class="text-rose-500">*</span>';
          hintPrice.textContent = 'Ketik langsung nominal harga cuci karpet sesuai kesepakatan dengan pelanggan.';
          inputNote.placeholder = 'Misal: Karpet bulu ruang tamu 2x3m';
          btnResetTikar.classList.add('hidden');
          manualInput.value = '';
        } else {
          labelPrice.innerHTML = 'Harga Cuci Tikar (Rp) <span class="text-rose-500">*</span>';
          hintPrice.textContent = 'Terisi otomatis dari tarif default tikar dan dapat diedit manual jika perlu.';
          inputNote.placeholder = 'Misal: Tikar lipat jumbo 2 lembar';
          btnResetTikar.classList.remove('hidden');
          const defaultTikar = Number(settings.rates.tikar_default) || 0;
          manualInput.value = defaultTikar > 0 ? defaultTikar.toLocaleString('id-ID') : '';
        }
      }

      calculateFormTotal();
    }

    function applyDefaultTikarPrice() {
      const manualInput = document.getElementById('input-manual-price');
      const defaultTikar = Number(settings.rates.tikar_default) || 0;
      manualInput.value = defaultTikar > 0 ? defaultTikar.toLocaleString('id-ID') : '';
      calculateFormTotal();
      showToast('Tarif default tikar diterapkan');
    }

    function adjustWeight(delta) {
      const input = document.getElementById('input-berat');
      const current = parseFloat(input.value) || 0;
      const updated = Math.max(0.1, Math.round((current + delta) * 10) / 10);
      input.value = updated.toFixed(1);
      calculateFormTotal();
    }

    function calculateFormTotal() {
      const serviceObj = SERVICE_ITEMS.find((s) => s.key === selectedServiceKey);
      let total = 0;
      let summaryText = '';

      if (serviceObj.type === 'kiloan') {
        const berat = Math.max(0, parseFloat(document.getElementById('input-berat').value) || 0);
        const ratePerKg = Number(settings.rates[selectedServiceKey]) || 0;
        total = Math.round(berat * ratePerKg);
        summaryText = `${serviceObj.label} • ${berat} kg`;
      } else {
        total = parseRupiahInput(document.getElementById('input-manual-price').value);
        const note = (document.getElementById('input-item-note').value || '').trim();
        summaryText = note ? `${serviceObj.label} • ${note}` : `${serviceObj.label} • Harga manual`;
      }

      document.getElementById('form-summary-detail').textContent = summaryText;
      document.getElementById('form-total-display').textContent = formatRupiah(total);

      evaluatePaymentState(total);
      return total;
    }

    function handlePaidTyping(el) {
      const val = parseRupiahInput(el.value);
      el.value = val > 0 ? val.toLocaleString('id-ID') : '';
      evaluatePaymentState();
    }

    function setQuickPaid(mode) {
      const paidInput = document.getElementById('input-uang-dibayar');
      const total = getCurrentFormTotalValue();

      if (mode === 'zero') {
        paidInput.value = '';
      } else if (mode === 'exact') {
        paidInput.value = total > 0 ? total.toLocaleString('id-ID') : '';
      } else {
        paidInput.value = Number(mode).toLocaleString('id-ID');
      }
      evaluatePaymentState(total);
    }

    function getCurrentFormTotalValue() {
      const serviceObj = SERVICE_ITEMS.find((s) => s.key === selectedServiceKey);
      if (serviceObj.type === 'kiloan') {
        const berat = Math.max(0, parseFloat(document.getElementById('input-berat').value) || 0);
        return Math.round(berat * (Number(settings.rates[selectedServiceKey]) || 0));
      }
      return parseRupiahInput(document.getElementById('input-manual-price').value);
    }

    function evaluatePaymentState(forcedTotal) {
      const total = typeof forcedTotal === 'number' ? forcedTotal : getCurrentFormTotalValue();
      const paid = parseRupiahInput(document.getElementById('input-uang-dibayar').value);

      const statusBox = document.getElementById('payment-status-box');
      const statusLabel = document.getElementById('payment-status-label');
      const statusAmount = document.getElementById('payment-status-amount');
      const changeBox = document.getElementById('change-decision-box');
      const changeDisplay = document.getElementById('change-amount-display');
      const changeReturnedCheckbox = document.getElementById('checkbox-change-returned');

      if (paid === 0) {
        changeBox.classList.add('hidden');
        statusBox.className = 'p-3 rounded-xl border text-xs font-bold flex items-center justify-between bg-rose-50 border-rose-200 text-rose-700';
        statusLabel.textContent = 'Status: Belum Bayar';
        statusAmount.textContent = `Tagihan: ${formatRupiah(total)}`;
        return {
          Uang_Dibayar: 0,
          Status_Kembalian: 'Belum Bayar',
          Selisih_Uang: total
        };
      }

      if (paid < total) {
        const kekurangan = total - paid;
        changeBox.classList.add('hidden');
        statusBox.className = 'p-3 rounded-xl border text-xs font-bold flex items-center justify-between bg-rose-50 border-rose-200 text-rose-700';
        statusLabel.textContent = 'Status: Kurang Bayar';
        statusAmount.textContent = `Kekurangan Pelanggan: ${formatRupiah(kekurangan)}`;
        return {
          Uang_Dibayar: paid,
          Status_Kembalian: 'Kurang Bayar',
          Selisih_Uang: kekurangan
        };
      }

      if (paid === total) {
        changeBox.classList.add('hidden');
        statusBox.className = 'p-3 rounded-xl border text-xs font-bold flex items-center justify-between bg-emerald-50 border-emerald-200 text-emerald-700';
        statusLabel.textContent = 'Status: Lunas (Uang Pas)';
        statusAmount.textContent = 'Selisih: Rp 0';
        return {
          Uang_Dibayar: paid,
          Status_Kembalian: 'Lunas',
          Selisih_Uang: 0
        };
      }

      // paid > total (Ada Sisa Kembalian)
      const kembalian = paid - total;
      changeBox.classList.remove('hidden');
      changeDisplay.textContent = formatRupiah(kembalian);

      const isReturned = changeReturnedCheckbox ? changeReturnedCheckbox.checked : true;
      if (!isReturned) {
        statusBox.className = 'p-3 rounded-xl border text-xs font-bold flex items-center justify-between bg-amber-50 border-amber-300 text-amber-900';
        statusLabel.textContent = 'Status: Kembalian Belum Diberikan';
        statusAmount.textContent = `Sisa Kembalian: ${formatRupiah(kembalian)}`;
        return {
          Uang_Dibayar: paid,
          Status_Kembalian: 'Kembalian Belum Diberikan',
          Selisih_Uang: kembalian
        };
      }

      statusBox.className = 'p-3 rounded-xl border text-xs font-bold flex items-center justify-between bg-emerald-50 border-emerald-200 text-emerald-700';
      statusLabel.textContent = 'Status: Lunas (Kembalian Diberikan)';
      statusAmount.textContent = `Sisa Kembalian: ${formatRupiah(kembalian)}`;
      return {
        Uang_Dibayar: paid,
        Status_Kembalian: 'Lunas',
        Selisih_Uang: 0
      };
    }

    async function handleSaveOrder(event) {
      event.preventDefault();

      const nama = document.getElementById('input-nama').value.trim();
      const hp = document.getElementById('input-hp').value.trim();
      if (!nama || !hp) {
        showToast('Nama dan Nomor WhatsApp wajib diisi!', 'error');
        return;
      }

      const serviceObj = SERVICE_ITEMS.find((s) => s.key === selectedServiceKey);
      const isManualItem = serviceObj.type === 'manual';
      const beratKg = isManualItem ? 0 : Math.max(0.1, parseFloat(document.getElementById('input-berat').value) || 1);
      const catatan = isManualItem ? (document.getElementById('input-item-note').value || '').trim() : '';
      const totalTagihan = getCurrentFormTotalValue();

      if (isManualItem && totalTagihan <= 0) {
        showToast(`Masukkan harga cuci ${serviceObj.label.toLowerCase()} terlebih dahulu!`, 'error');
        document.getElementById('input-manual-price').focus();
        return;
      }

      const paymentEval = evaluatePaymentState(totalTagihan);
      const statusPengerjaan = document.querySelector('input[name="status_pengerjaan"]:checked').value;

      const now = new Date();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const pad = (n) => String(n).padStart(2, '0');
      const tanggalMasuk = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}`;

      const newOrder = {
        ID_Nota: generateNextNotaId(),
        Tanggal_Masuk: tanggalMasuk,
        Nama_Pelanggan: nama,
        No_WA: hp,
        Jenis_Layanan: serviceObj.label,
        Berat_Kg: beratKg,
        Catatan: catatan,
        Total_Tagihan: totalTagihan,
        Uang_Dibayar: paymentEval.Uang_Dibayar,
        Status_Kembalian: paymentEval.Status_Kembalian,
        Selisih_Uang: paymentEval.Selisih_Uang,
        Status_Pengerjaan: statusPengerjaan
      };

      const submitBtn = document.getElementById('btn-submit-order');
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>Menyimpan...</span>`;

      orders.unshift(newOrder);
      persistOrdersLocal();
      await pushToGoogleSheets('create', newOrder);

      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fa-solid fa-floppy-disk text-base"></i><span>Simpan Pesanan</span>`;

      // Reset form
      document.getElementById('order-form').reset();
      document.getElementById('input-berat').value = '1.0';
      document.getElementById('input-uang-dibayar').value = '';
      const chkReturned = document.getElementById('checkbox-change-returned');
      if (chkReturned) chkReturned.checked = true;
      document.getElementById('wa-format-preview').classList.add('hidden');
      selectService('cuci_setrika');

      showToast(`Pesanan #${newOrder.ID_Nota} berhasil disimpan!`);
      workFilter = 'Semua';
      moneyFilter = 'Semua';
      updateFilterChipsUI();
      switchAdminTab('orders');
    }

    // =========================================================
    // DAFTAR CUCIAN ADMIN: FILTER, AKSI KEUANGAN, & STATUS KERJA
    // =========================================================
    function setWorkFilter(status) {
      workFilter = status;
      updateFilterChipsUI();
      renderAdminOrders();
    }

    function setMoneyFilter(status) {
      moneyFilter = status;
      updateFilterChipsUI();
      renderAdminOrders();
    }

    function updateFilterChipsUI() {
      document.querySelectorAll('.work-chip').forEach((chip) => {
        const active = chip.getAttribute('data-work') === workFilter;
        chip.className = active
          ? 'work-chip shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold bg-ocean-600 text-white shadow-xs transition'
          : 'work-chip shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-600 border border-slate-200 transition';
      });

      document.querySelectorAll('.money-chip').forEach((chip) => {
        const active = chip.getAttribute('data-money') === moneyFilter;
        chip.className = active
          ? 'money-chip shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-800 text-white shadow-xs transition'
          : 'money-chip shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-white text-slate-600 border border-slate-200 transition';
      });
    }

    async function updateOrderWorkStatus(orderId, newStatus) {
      const idx = orders.findIndex((o) => o.ID_Nota === orderId);
      if (idx === -1) return;
      orders[idx].Status_Pengerjaan = newStatus;
      persistOrdersLocal();
      renderAdminOrders();
      showToast(`Status #${orderId} diubah menjadi "${newStatus}"`);
      await pushToGoogleSheets('update', orders[idx]);
    }

    async function markChangeReturned(orderId) {
      const idx = orders.findIndex((o) => o.ID_Nota === orderId);
      if (idx === -1) return;
      orders[idx].Status_Kembalian = 'Lunas';
      orders[idx].Selisih_Uang = 0;
      persistOrdersLocal();
      renderAdminOrders();
      showToast(`Kembalian #${orderId} ditandai sudah diberikan (Lunas)!`);
      await pushToGoogleSheets('update', orders[idx]);
    }

    // Modal Pelunasan / Tambah Pembayaran
    function openSettleModal(orderId) {
      const order = orders.find((o) => o.ID_Nota === orderId);
      if (!order) return;

      settlingOrderId = orderId;
      const remaining = Number(order.Selisih_Uang) > 0
        ? Number(order.Selisih_Uang)
        : Math.max(0, Number(order.Total_Tagihan) - Number(order.Uang_Dibayar));

      document.getElementById('settle-modal-subtitle').textContent = `#${order.ID_Nota} • ${order.Nama_Pelanggan}`;
      document.getElementById('settle-total-tagihan').textContent = formatRupiah(order.Total_Tagihan);
      document.getElementById('settle-already-paid').textContent = formatRupiah(order.Uang_Dibayar);
      document.getElementById('settle-remaining-due').textContent = formatRupiah(remaining);

      const addInput = document.getElementById('settle-add-amount');
      addInput.value = remaining > 0 ? remaining.toLocaleString('id-ID') : '';
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
      const remaining = Math.max(0, Number(order.Total_Tagihan) - Number(order.Uang_Dibayar));
      const addInput = document.getElementById('settle-add-amount');
      addInput.value = remaining.toLocaleString('id-ID');
      handleSettleTyping(addInput);
    }

    function handleSettleTyping(el) {
      const val = parseRupiahInput(el.value);
      el.value = val > 0 ? val.toLocaleString('id-ID') : '';

      const order = orders.find((o) => o.ID_Nota === settlingOrderId);
      if (!order) return;
      const remaining = Math.max(0, Number(order.Total_Tagihan) - Number(order.Uang_Dibayar));
      const overpayBox = document.getElementById('settle-overpay-box');

      if (val > remaining) {
        overpayBox.classList.remove('hidden');
        document.getElementById('settle-overpay-amount').textContent = formatRupiah(val - remaining);
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

      const newPaid = Number(order.Uang_Dibayar) + addAmount;
      const total = Number(order.Total_Tagihan);

      order.Uang_Dibayar = newPaid;
      if (newPaid < total) {
        order.Status_Kembalian = 'Kurang Bayar';
        order.Selisih_Uang = total - newPaid;
      } else if (newPaid === total) {
        order.Status_Kembalian = 'Lunas';
        order.Selisih_Uang = 0;
      } else {
        const change = newPaid - total;
        const mode = document.querySelector('input[name="settle_change_mode"]:checked')?.value || 'given';
        if (mode === 'pending') {
          order.Status_Kembalian = 'Kembalian Belum Diberikan';
          order.Selisih_Uang = change;
        } else {
          order.Status_Kembalian = 'Lunas';
          order.Selisih_Uang = 0;
        }
      }

      persistOrdersLocal();
      closeSettleModal();
      renderAdminOrders();
      showToast(`Pembayaran #${order.ID_Nota} diperbarui (${order.Status_Kembalian})`);
      await pushToGoogleSheets('update', order);
    }

    async function requestDeleteOrder(orderId) {
      if (deleteConfirmId === orderId) {
        const target = orders.find((o) => o.ID_Nota === orderId);
        orders = orders.filter((o) => o.ID_Nota !== orderId);
        deleteConfirmId = null;
        persistOrdersLocal();
        renderAdminOrders();
        showToast(`Pesanan #${orderId} dihapus`, 'warning');
        if (target) {
          await pushToGoogleSheets('delete', target);
        }
      } else {
        deleteConfirmId = orderId;
        renderAdminOrders();
        setTimeout(() => {
          if (deleteConfirmId === orderId) {
            deleteConfirmId = null;
            renderAdminOrders();
          }
        }, 3500);
      }
    }

    function getWorkBadgeStyle(status) {
      switch (status) {
        case 'Diterima':
          return 'bg-sky-100 text-sky-700 border-sky-200';
        case 'Diproses':
          return 'bg-amber-100 text-amber-800 border-amber-200';
        case 'Selesai':
          return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'Diambil':
          return 'bg-slate-200 text-slate-800 border-slate-300';
        default:
          return 'bg-slate-100 text-slate-700 border-slate-200';
      }
    }

    function getMoneyBadgeConfig(order) {
      const st = order.Status_Kembalian;
      const selisih = Number(order.Selisih_Uang) || 0;

      if (st === 'Lunas') {
        return {
          pillClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: 'fa-circle-check',
          label: 'Lunas',
          detailBanner: ''
        };
      }
      if (st === 'Kurang Bayar') {
        return {
          pillClass: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: 'fa-circle-exclamation',
          label: `Kurang ${formatRupiah(selisih)}`,
          detailBanner: `
            <div class="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs text-rose-800">
              <span class="font-bold"><i class="fa-solid fa-circle-exclamation mr-1 text-rose-600"></i>Kekurangan Pelanggan:</span>
              <span class="font-extrabold text-rose-700">${formatRupiah(selisih)}</span>
            </div>
          `
        };
      }
      if (st === 'Kembalian Belum Diberikan') {
        return {
          pillClass: 'bg-amber-50 text-amber-800 border-amber-300',
          icon: 'fa-coins',
          label: `Kembalian ${formatRupiah(selisih)}`,
          detailBanner: `
            <div class="bg-amber-50 border border-amber-300 rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs text-amber-900">
              <span class="font-bold"><i class="fa-solid fa-coins mr-1 text-amber-600"></i>Kembalian Belum Diberikan:</span>
              <span class="font-extrabold text-amber-900">${formatRupiah(selisih)}</span>
            </div>
          `
        };
      }
      const due = selisih > 0 ? selisih : Number(order.Total_Tagihan) || 0;
      return {
        pillClass: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: 'fa-clock',
        label: 'Belum Bayar',
        detailBanner: `
          <div class="bg-rose-50/70 border border-rose-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs text-rose-800">
            <span class="font-bold"><i class="fa-solid fa-clock mr-1 text-rose-600"></i>Tagihan Belum Dibayar:</span>
            <span class="font-extrabold text-rose-700">${formatRupiah(due)}</span>
          </div>
        `
      };
    }

    function renderAdminOrders() {
      // Hitung ringkasan status pengerjaan & keuangan
      const countDiterima = orders.filter((o) => o.Status_Pengerjaan === 'Diterima').length;
      const countDiproses = orders.filter((o) => o.Status_Pengerjaan === 'Diproses').length;
      const countSelesai = orders.filter((o) => o.Status_Pengerjaan === 'Selesai').length;

      const totalTagihan = orders.reduce((s, o) => s + (Number(o.Total_Tagihan) || 0), 0);
      const totalPiutang = orders
        .filter((o) => o.Status_Kembalian === 'Kurang Bayar' || o.Status_Kembalian === 'Belum Bayar')
        .reduce((s, o) => s + (Number(o.Selisih_Uang) || 0), 0);
      const totalKembalianTertahan = orders
        .filter((o) => o.Status_Kembalian === 'Kembalian Belum Diberikan')
        .reduce((s, o) => s + (Number(o.Selisih_Uang) || 0), 0);

      document.getElementById('stat-count-diterima').textContent = countDiterima;
      document.getElementById('stat-count-diproses').textContent = countDiproses;
      document.getElementById('stat-count-selesai').textContent = countSelesai;
      document.getElementById('stat-total-tagihan').textContent = formatRupiah(totalTagihan);
      document.getElementById('stat-total-orders').textContent = `${orders.length} Nota`;
      document.getElementById('stat-total-piutang').textContent = formatRupiah(totalPiutang);
      document.getElementById('stat-total-kembalian').textContent = formatRupiah(totalKembalianTertahan);

      const keyword = (document.getElementById('admin-search-orders').value || '').toLowerCase().trim();
      const listContainer = document.getElementById('admin-orders-list');

      const filtered = orders.filter((o) => {
        const matchWork = workFilter === 'Semua' || o.Status_Pengerjaan === workFilter;
        const matchMoney =
          moneyFilter === 'Semua' ||
          (moneyFilter === 'Ada Kembalian' && o.Status_Kembalian === 'Kembalian Belum Diberikan') ||
          o.Status_Kembalian === moneyFilter;
        const matchKey =
          !keyword ||
          o.Nama_Pelanggan.toLowerCase().includes(keyword) ||
          o.ID_Nota.toLowerCase().includes(keyword) ||
          String(o.No_WA).includes(keyword);
        return matchWork && matchMoney && matchKey;
      });

      if (filtered.length === 0) {
        listContainer.innerHTML = `
          <div class="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-xs">
            <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <i class="fa-solid fa-basket-shopping text-xl"></i>
            </div>
            <h3 class="text-sm font-bold text-slate-700">Tidak ada data cucian</h3>
            <p class="text-xs text-slate-400 mt-1">Ubah filter status atau buat order baru.</p>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = filtered
        .map((o) => {
          const isKiloan = Number(o.Berat_Kg) > 0;
          const detailLine = isKiloan
            ? `Berat: ${o.Berat_Kg} kg`
            : o.Catatan
            ? `Catatan: ${o.Catatan}`
            : 'Layanan satuan (1 pcs)';

          const moneyCfg = getMoneyBadgeConfig(o);

          const statusOptions = ['Diterima', 'Diproses', 'Selesai', 'Diambil']
            .map((st) => `<option value="${st}" ${o.Status_Pengerjaan === st ? 'selected' : ''}>${st}</option>`)
            .join('');

          // Tombol langkah status pengerjaan berikutnya
          let nextWorkBtn = '';
          if (o.Status_Pengerjaan === 'Diterima') {
            nextWorkBtn = `
              <button type="button" onclick="updateOrderWorkStatus('${o.ID_Nota}', 'Diproses')" class="px-2.5 py-2.5 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-800 border border-amber-200 font-bold text-xs rounded-2xl transition flex items-center gap-1 shrink-0">
                <span>Diproses</span><i class="fa-solid fa-arrow-right text-[10px]"></i>
              </button>
            `;
          } else if (o.Status_Pengerjaan === 'Diproses') {
            nextWorkBtn = `
              <button type="button" onclick="updateOrderWorkStatus('${o.ID_Nota}', 'Selesai')" class="px-2.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-2xl transition flex items-center gap-1 shrink-0">
                <span>Selesai</span><i class="fa-solid fa-check text-[10px]"></i>
              </button>
            `;
          } else if (o.Status_Pengerjaan === 'Selesai') {
            nextWorkBtn = `
              <button type="button" onclick="updateOrderWorkStatus('${o.ID_Nota}', 'Diambil')" class="px-2.5 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 border border-slate-300 font-bold text-xs rounded-2xl transition flex items-center gap-1 shrink-0">
                <span>Diambil</span><i class="fa-solid fa-bag-shopping text-[10px]"></i>
              </button>
            `;
          }

          // Tombol aksi cepat keuangan
          let moneyActionBtn = '';
          if (o.Status_Kembalian === 'Kurang Bayar' || o.Status_Kembalian === 'Belum Bayar') {
            moneyActionBtn = `
              <button
                type="button"
                onclick="openSettleModal('${o.ID_Nota}')"
                class="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-extrabold text-xs rounded-2xl shadow-xs flex items-center justify-center gap-1.5 transition"
              >
                <i class="fa-solid fa-money-bill-wave"></i>
                <span>Lunasi / Tambah Bayar</span>
              </button>
            `;
          } else if (o.Status_Kembalian === 'Kembalian Belum Diberikan') {
            moneyActionBtn = `
              <button
                type="button"
                onclick="markChangeReturned('${o.ID_Nota}')"
                class="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-extrabold text-xs rounded-2xl shadow-xs flex items-center justify-center gap-1.5 transition"
              >
                <i class="fa-solid fa-hand-holding-dollar"></i>
                <span>Kembalian Sudah Diberikan ✓</span>
              </button>
            `;
          }

          const isConfirmingDelete = deleteConfirmId === o.ID_Nota;

          return `
            <article class="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 space-y-3 transition">
              <!-- Baris Atas: No Nota, Tanggal & Badge Status Keuangan -->
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-xs font-extrabold text-ocean-700 bg-ocean-50 px-2.5 py-1 rounded-lg border border-ocean-100 shrink-0">
                    #${o.ID_Nota}
                  </span>
                  <span class="text-[11px] text-slate-400 font-medium truncate">${o.Tanggal_Masuk}</span>
                </div>

                <span class="px-2.5 py-1 rounded-lg text-[11px] font-extrabold border shrink-0 ${moneyCfg.pillClass}">
                  <i class="fa-solid ${moneyCfg.icon} mr-1"></i>
                  ${moneyCfg.label}
                </span>
              </div>

              <!-- Info Pelanggan & Ringkasan Tagihan / Dibayar -->
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h3 class="text-base font-extrabold text-slate-800 truncate">${o.Nama_Pelanggan}</h3>
                  <p class="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                    <i class="fa-brands fa-whatsapp text-emerald-500"></i>
                    <span>${o.No_WA}</span>
                  </p>
                </div>
                <div class="text-right shrink-0">
                  <span class="text-[11px] text-slate-400 block font-medium">Tagihan: <strong class="text-slate-800">${formatRupiah(o.Total_Tagihan)}</strong></span>
                  <span class="text-[11px] text-slate-400 block font-medium">Dibayar: <strong class="text-slate-700">${formatRupiah(o.Uang_Dibayar)}</strong></span>
                </div>
              </div>

              <!-- Banner Kekurangan Pembayaran / Kembalian Belum Diberikan -->
              ${moneyCfg.detailBanner}

              <!-- Rincian Layanan & Status Pengerjaan -->
              <div class="bg-slate-50 px-3 py-2.5 rounded-2xl border border-slate-100 flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <span class="text-xs font-extrabold text-slate-700 block">${o.Jenis_Layanan}</span>
                  <span class="text-[11px] text-slate-500 font-medium block truncate">${detailLine}</span>
                </div>
                <span class="px-2.5 py-1 rounded-lg text-[11px] font-extrabold border shrink-0 ${getWorkBadgeStyle(o.Status_Pengerjaan)}">
                  ${o.Status_Pengerjaan}
                </span>
              </div>

              <!-- Kontrol Ubah Status Pengerjaan & Hapus -->
              <div class="flex items-center gap-2">
                <div class="relative flex-1">
                  <select
                    onchange="updateOrderWorkStatus('${o.ID_Nota}', this.value)"
                    aria-label="Ubah Status Pengerjaan"
                    class="w-full appearance-none bg-slate-100 hover:bg-slate-200/70 text-slate-800 font-bold text-xs py-2.5 pl-3 pr-8 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-ocean-500 cursor-pointer"
                  >
                    ${statusOptions}
                  </select>
                  <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none"></i>
                </div>

                ${nextWorkBtn}

                <button
                  type="button"
                  onclick="requestDeleteOrder('${o.ID_Nota}')"
                  title="Hapus pesanan"
                  class="py-2.5 px-3 rounded-2xl border text-xs font-bold transition active:scale-95 shrink-0 ${
                    isConfirmingDelete
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-slate-400 hover:text-rose-500 border-slate-200'
                  }"
                >
                  ${isConfirmingDelete ? 'Hapus?' : '<i class="fa-regular fa-trash-can"></i>'}
                </button>
              </div>

              <!-- Tombol Aksi Cepat Keuangan (jika ada kekurangan / kembalian tertahan) -->
              ${moneyActionBtn}

              <!-- Tombol Utama Kirim Info WA (1 Klik) -->
              <button
                type="button"
                onclick="triggerWhatsAppSend('${o.ID_Nota}')"
                class="w-full py-3 px-4 bg-[#25D366] hover:bg-[#1ebe5d] active:scale-[0.99] text-white font-extrabold text-xs rounded-2xl shadow-sm shadow-emerald-500/25 flex items-center justify-center gap-2 transition"
              >
                <i class="fa-brands fa-whatsapp text-base"></i>
                <span>Kirim Info WA (1 Klik)</span>
              </button>
            </article>
          `;
        })
        .join('');
    }

    // =========================================================
    // NOTIFIKASI WHATSAPP SEMI-OTOMATIS + LINK NOTA DIGITAL
    // =========================================================
    function buildReceiptShareUrl(notaId) {
      try {
        return `${window.location.origin}${window.location.pathname}?nota=${encodeURIComponent(notaId)}`;
      } catch (e) {
        return `https://smartlaundry.id/?nota=${encodeURIComponent(notaId)}`;
      }
    }

    function buildWhatsAppMessage(order) {
      const outletName = settings.outletName || 'SmartLaundry';
      const isKiloan = Number(order.Berat_Kg) > 0;
      const specLine = isKiloan
        ? `• Berat Cucian: ${order.Berat_Kg} kg`
        : order.Catatan
        ? `• Keterangan: ${order.Catatan}`
        : `• Satuan: 1 pcs`;

      let salamPembuka = '';
      if (order.Status_Pengerjaan === 'Selesai') {
        salamPembuka = `Halo Kak *${order.Nama_Pelanggan}*, cucian Anda di *${outletName}* sudah *SELESAI* dan siap diambil! 🎉`;
      } else if (order.Status_Pengerjaan === 'Diproses') {
        salamPembuka = `Halo Kak *${order.Nama_Pelanggan}*, cucian Anda di *${outletName}* sedang dalam tahap *DIPROSES*. 🧺`;
      } else if (order.Status_Pengerjaan === 'Diambil') {
        salamPembuka = `Halo Kak *${order.Nama_Pelanggan}*, terima kasih telah menggunakan jasa *${outletName}*. Berikut ringkasan nota cucian Anda: 🙏`;
      } else {
        salamPembuka = `Halo Kak *${order.Nama_Pelanggan}*, pesanan laundry Anda telah kami *TERIMA* di *${outletName}*. 🧾`;
      }

      // Rincian status pembayaran, kekurangan, atau sisa kembalian
      let infoUangLine = `• Status Bayar: *${order.Status_Kembalian}*`;
      const selisih = Number(order.Selisih_Uang) || 0;
      if (order.Status_Kembalian === 'Kurang Bayar') {
        infoUangLine += `\n• Kekurangan Pembayaran: *${formatRupiah(selisih)}*`;
      } else if (order.Status_Kembalian === 'Belum Bayar') {
        const due = selisih > 0 ? selisih : Number(order.Total_Tagihan) || 0;
        infoUangLine += `\n• Tagihan Belum Dibayar: *${formatRupiah(due)}*`;
      } else if (order.Status_Kembalian === 'Kembalian Belum Diberikan') {
        infoUangLine += `\n• Sisa Kembalian Anda (Belum Diberikan): *${formatRupiah(selisih)}*`;
      }

      const trackingLink = buildReceiptShareUrl(order.ID_Nota);

      return `${salamPembuka}

*DETAIL NOTA DIGITAL*
• No. Nota: *#${order.ID_Nota}*
• Jenis Layanan: *${order.Jenis_Layanan}*
${specLine}
• Status Pengerjaan: *${order.Status_Pengerjaan}*
• Total Tagihan: *${formatRupiah(order.Total_Tagihan)}*
• Uang Dibayar: *${formatRupiah(order.Uang_Dibayar)}*
${infoUangLine}

Cek nota digital & status cucian Anda di sini:
${trackingLink}

Terima kasih!`;
    }

    function triggerWhatsAppSend(orderId) {
      const order = orders.find((o) => o.ID_Nota === orderId);
      if (!order) return;

      const waPhone = formatPhoneWA(order.No_WA);
      const message = buildWhatsAppMessage(order);
      const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;

      currentModalWaText = message;

      document.getElementById('wa-modal-recipient').textContent = `Tujuan: ${order.Nama_Pelanggan} (${waPhone})`;
      document.getElementById('wa-message-preview').textContent = message;
      document.getElementById('wa-direct-link').href = waUrl;

      const modal = document.getElementById('wa-modal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeWaModal() {
      const modal = document.getElementById('wa-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    function copyWaMessage() {
      if (!currentModalWaText) return;
      const textarea = document.createElement('textarea');
      textarea.value = currentModalWaText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        showToast('Teks pesan WhatsApp berhasil disalin!');
      } catch (err) {
        showToast('Gagal menyalin teks', 'error');
      }
      document.body.removeChild(textarea);
    }

    // =========================================================
    // PENGATURAN OUTLET, PIN, TARIF, & GOOGLE SHEETS
    // =========================================================
    function populateSettingsForm() {
      document.getElementById('setting-script-url').value = settings.scriptUrl || '';
      document.getElementById('setting-outlet-name').value = settings.outletName || CONFIG_LAUNDRY.NAMA_LAUNDRY || 'SmartLaundry';
      document.getElementById('setting-admin-pin').value = settings.adminPin || CONFIG_LAUNDRY.PIN_ADMIN_DEFAULT || '1234';
      document.getElementById('setting-admin-wa').value = settings.adminWa || CONFIG_LAUNDRY.NO_WA_ADMIN || '6281234567890';
      document.getElementById('setting-outlet-address').value = settings.address || CONFIG_LAUNDRY.ALAMAT_LAUNDRY || 'Jl. Melati No. 12';

      document.getElementById('rate-cuci_mamel').value = settings.rates.cuci_mamel;
      document.getElementById('rate-cuci_kering').value = settings.rates.cuci_kering;
      document.getElementById('rate-cuci_setrika').value = settings.rates.cuci_setrika;
      document.getElementById('rate-setrika').value = settings.rates.setrika;
      document.getElementById('rate-tikar_default').value = settings.rates.tikar_default;
      updateConnectionBadgeUI();
    }

    async function saveAndTestSheetsUrl() {
      const urlVal = document.getElementById('setting-script-url').value.trim();
      settings.scriptUrl = urlVal;
      persistSettingsLocal();
      updateConnectionBadgeUI();

      if (!isSheetsConnected()) {
        showToast('URL dikosongkan. Aplikasi berjalan di Mode Demo Lokal.', 'warning');
        return;
      }

      const btn = document.getElementById('btn-save-sheets');
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>Menghubungkan & Memuat Data...</span>`;

      await syncFromGoogleSheets(true);

      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i><span>Simpan URL</span>`;
    }

    function saveAppSettings(event) {
      event.preventDefault();

      const newOutlet = document.getElementById('setting-outlet-name').value.trim() || CONFIG_LAUNDRY.NAMA_LAUNDRY || 'SmartLaundry';
      const newPin = document.getElementById('setting-admin-pin').value.trim() || CONFIG_LAUNDRY.PIN_ADMIN_DEFAULT || '1234';
      const newAdminWa = document.getElementById('setting-admin-wa').value.trim() || CONFIG_LAUNDRY.NO_WA_ADMIN || '6281234567890';
      const newAddress = document.getElementById('setting-outlet-address').value.trim() || CONFIG_LAUNDRY.ALAMAT_LAUNDRY || 'Jl. Melati No. 12';

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

      persistSettingsLocal();
      applyOutletBranding();
      renderServiceSelector();
      showToast('Pengaturan outlet, PIN & tarif berhasil disimpan!');
    }

    function handleResetDemoData() {
      const btn = document.getElementById('btn-reset-demo');
      if (!resetDemoConfirmState) {
        resetDemoConfirmState = true;
        btn.textContent = 'Ketuk sekali lagi untuk konfirmasi reset data contoh';
        btn.classList.replace('bg-slate-100', 'bg-rose-100');
        btn.classList.replace('text-slate-600', 'text-rose-700');
        setTimeout(() => {
          resetDemoConfirmState = false;
          btn.textContent = 'Reset Data Contoh Awal';
          btn.classList.replace('bg-rose-100', 'bg-slate-100');
          btn.classList.replace('text-rose-700', 'text-slate-600');
        }, 3500);
        return;
      }

      orders = JSON.parse(JSON.stringify(INITIAL_SAMPLE_ORDERS));
      persistOrdersLocal();
      renderAdminOrders();
      renderPublicQuickChips();
      resetDemoConfirmState = false;
      btn.textContent = 'Reset Data Contoh Awal';
      btn.classList.replace('bg-rose-100', 'bg-slate-100');
      btn.classList.replace('text-rose-700', 'text-slate-600');
      showToast('4 data contoh awal berhasil dipulihkan!');
    }

    // Jalankan inisialisasi saat halaman dimuat
    window.addEventListener('DOMContentLoaded', initApp);
