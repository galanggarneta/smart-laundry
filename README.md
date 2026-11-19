# smart-laundry

# 🧺 SmartLaundry — Aplikasi Kasir & Tracking Nota Digital Laundry

**SmartLaundry** adalah aplikasi web *mobile-first* untuk manajemen kasir laundry dan pelacakan status cucian pelanggan secara *real-time*. Aplikasi ini berjalan tanpa server berbayar dengan memanfaatkan **GitHub Pages** sebagai antarmuka web dan **Google Sheets (Apps Script)** sebagai database *cloud* pribadi milik masing-masing pengusaha laundry.

---

## ✨ Fitur Utama

1. **Keamanan Multi-Toko & Mode Demo Bersih**
   - Halaman utama aplikasi selalu dimulai dalam **Mode Demo** kosong tanpa menampilkan data usaha atau tautan database milik siapa pun.
   - Setiap pemilik usaha wajib menghubungkan **URL Google Apps Script** miliknya sendiri agar data outlet, tarif, dan transaksi aktif.
2. **Satu Laman untuk Nota Pelanggan & Login Pengusaha**
   - Pelanggan yang menerima link nota melalui WhatsApp dapat langsung memantau progres cucian (*Diterima $\rightarrow$ Diproses $\rightarrow$ Selesai $\rightarrow$ Diambil*) dan rincian tagihan tanpa perlu login.
   - Pemilik usaha atau kasir dapat masuk ke **Dasbor Usaha** dari halaman yang sama melalui tombol **Masuk Kasir** menggunakan **PIN Rahasia Toko**.
3. **Pelacakan Keuangan & Uang Kembalian Otomatis**
   - Mendukung layanan kiloan (*Cuci Mamel, Cuci Kering, Cuci Setrika, Setrika Saja*) dan satuan (*Karpet, Tikar*).
   - Menghitung otomatis status pembayaran: **Lunas**, **Belum Bayar**, **Kurang Bayar**, maupun **Kembalian Belum Diberikan** (kembalian tertahan).
4. **Kirim Nota WhatsApp 1-Klik**
   - Membuat format pesan nota digital lengkap dengan tautan pelacakan khusus toko yang siap dikirim langsung ke WhatsApp pelanggan.
5. **Sinkronisasi Lintas Perangkat**
   - Profil outlet, alamat, nomor WA admin, PIN kasir, dan tarif jasa tersimpan di tab **`Pengaturan`** pada Google Sheets, sehingga tetap aman saat kasir berganti HP/laptop atau menghapus cache browser.

---

## 🔐 Cara Kerja Mode Demo & PIN Login

Aplikasi ini memiliki dua kondisi akses pada tombol **Masuk Kasir**:

| Kondisi Aplikasi | Cara Masuk Dasbor | Keterangan |
| :--- | :--- | :--- |
| **Mode Demo** *(Belum terhubung Google Sheets)* | Klik **Masuk Kasir** $\rightarrow$ **Langsung masuk tanpa PIN** | Dasbor terbuka dalam keadaan kosong. Pemilik usaha diarahkan ke menu **Pengaturan & Sheets** untuk menempelkan URL Google Apps Script miliknya. |
| **Mode Toko Aktif** *(Sudah terhubung Google Sheets)* | Klik **Masuk Kasir** $\rightarrow$ **Wajib masukkan PIN Toko** | Sistem meminta **PIN Login Kasir** yang telah Anda buat dan simpan di Google Sheets. Berlaku baik di perangkat kasir maupun saat dibuka dari link nota pelanggan. |

---

## 🛠️ Panduan Instalasi Database (Google Sheets & Apps Script)

Sebelum menggunakan aplikasi untuk operasional usaha, siapkan database Google Sheets pribadi Anda dengan langkah berikut:

### Langkah 1: Siapkan File Google Sheets
1. Buka [Google Sheets](https://sheets.google.com) dan buat spreadsheet baru (misalnya: `Database_Laundry_Saya`).
2. Pastikan nama tab pertama di bagian bawah adalah **`Sheet1`**.
3. Pada baris pertama (**sel `A1` sampai `L1`**), isi judul kolom persis seperti berikut:

| Kolom | Header (`Baris 1`) | Keterangan |
| :--- | :--- | :--- |
| **A1** | `ID_Nota` | Nomor nota otomatis (contoh: `LND-001`) |
| **B1** | `Tanggal_Masuk` | Waktu pesanan dicatat |
| **C1** | `Nama_Pelanggan` | Nama pelanggan |
| **D1** | `No_WA` | Nomor WhatsApp format `628...` |
| **E1** | `Jenis_Layanan` | Jenis layanan laundry |
| **F1** | `Berat_Kg` | Berat cucian (`0` untuk layanan satuan) |
| **G1** | `Catatan` | Keterangan tambahan (ukuran karpet/tikar, dll.) |
| **H1** | `Total_Tagihan` | Total biaya tagihan |
| **I1** | `Uang_Dibayar` | Nominal uang yang dibayarkan pelanggan |
| **J1** | `Status_Kembalian` | `Lunas` / `Kurang Bayar` / `Belum Bayar` / `Kembalian Belum Diberikan` |
| **K1** | `Selisih_Uang` | Nominal kekurangan atau kembalian tertahan |
| **L1** | `Status_Pengerjaan` | `Diterima` / `Diproses` / `Selesai` / `Diambil` |

> **Catatan:** Anda tidak perlu membuat tab kedua secara manual. Tab **`Pengaturan`** akan otomatis dibuat oleh sistem saat pertama kali Anda menekan tombol simpan pengaturan di aplikasi.

### Langkah 2: Pasang Kode Google Apps Script
1. Di dalam file Google Sheets Anda, klik menu **Ekstensi (Extensions) $\rightarrow$ Apps Script**.
2. Hapus seluruh kode bawaan di editor, lalu salin dan tempelkan kode berikut:

```javascript
const ORDER_SHEET = 'Sheet1';
const SETTINGS_SHEET = 'Pengaturan';
const SETTINGS_HEADERS = [
  'Nama_Outlet',
  'Slogan',
  'Alamat_Outlet',
  'No_WA_Admin',
  'PIN_Admin',
  'Cuci_Mamel',
  'Cuci_Kering',
  'Cuci_Setrika',
  'Setrika',
  'Tikar_Default'
];

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Ambil Data Pesanan dari Sheet1
  const orderSheet = ss.getSheetByName(ORDER_SHEET);
  const orderRows = orderSheet ? orderSheet.getDataRange().getValues() : [];
  let ordersData = [];
  if (orderRows.length > 1) {
    const headers = orderRows[0];
    ordersData = orderRows.slice(1).map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    }).reverse();
  }

  // 2. Ambil Data Pengaturan dari Tab "Pengaturan"
  const settingsSheet = ss.getSheetByName(SETTINGS_SHEET);
  let settingsData = null;
  if (settingsSheet) {
    const sRows = settingsSheet.getDataRange().getValues();
    if (sRows.length > 1) {
      settingsData = {};
      sRows[0].forEach((h, i) => settingsData[h] = sRows[1][i]);
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ orders: ordersData, data: ordersData, settings: settingsData }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const payload = JSON.parse(e.postData.contents);
  const d = payload.data || {};

  // Simpan Profil Outlet, PIN & Tarif ke Tab "Pengaturan"
  if (payload.action === 'saveSettings') {
    let settingsSheet = ss.getSheetByName(SETTINGS_SHEET);
    if (!settingsSheet) {
      settingsSheet = ss.insertSheet(SETTINGS_SHEET);
    }
    settingsSheet.getRange(1, 1, 1, SETTINGS_HEADERS.length).setValues([SETTINGS_HEADERS]);
    const rowValues = SETTINGS_HEADERS.map(h => d[h] !== undefined ? d[h] : '');
    settingsSheet.getRange(2, 1, 1, SETTINGS_HEADERS.length).setValues([rowValues]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Kelola Transaksi Pesanan (Create / Update / Delete)
  const sheet = ss.getSheetByName(ORDER_SHEET);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  if (payload.action === 'create') {
    const newRow = headers.map(h => d[h] !== undefined ? d[h] : '');
    sheet.appendRow(newRow);
  } else if (payload.action === 'update' || payload.action === 'delete') {
    const allRows = sheet.getDataRange().getValues();
    for (let i = 1; i < allRows.length; i++) {
      if (String(allRows[i][0]) === String(payload.ID_Nota)) {
        if (payload.action === 'delete') {
          sheet.deleteRow(i + 1);
        } else {
          const updatedRow = headers.map(h => d[h] !== undefined ? d[h] : allRows[i][headers.indexOf(h)]);
          sheet.getRange(i + 1, 1, 1, headers.length).setValues([updatedRow]);
        }
        break;
      }
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Klik ikon **Simpan (Save)** di bagian atas editor.

### Langkah 3: Terapkan (Deploy) sebagai Web App
1. Klik tombol **Terapkan (Deploy) $\rightarrow$ Deployment baru (New deployment)**.
2. Klik ikon roda gigi di sebelah *Pilih jenis*, lalu pilih **Aplikasi web (Web app)**.
3. Atur konfigurasi berikut:
   - **Jalankan sebagai (*Execute as*):** `Saya (Me)`
   - **Yang memiliki akses (*Who has access*):** `Siapa saja (Anyone)`
4. Klik **Terapkan (Deploy)** $\rightarrow$ klik **Izinkan akses (*Authorize access*)** dan pilih akun Google Anda (jika muncul peringatan *Google hasn't verified this app*, klik **Advanced $\rightarrow$ Go to ... (unsafe) $\rightarrow$ Allow**).
5. Salin **URL Aplikasi Web** yang berakhiran `/exec`.

> **Tips Pembaruan:** Jika suatu saat Anda mengedit kode Apps Script, jangan membuat deployment baru agar URL tidak berubah. Cukup klik **Terapkan $\rightarrow$ Kelola deployment $\rightarrow$ ikon Pensil (Edit) $\rightarrow$ Versi: Versi baru (New version) $\rightarrow$ Terapkan**.

---

## 📖 Tata Cara Menggunakan Aplikasi

### 1. Aktivasi Usaha Pertama Kali (Setup Outlet)
1. Buka halaman web aplikasi Anda (tampilan awal berupa **Mode Demo**).
2. Klik tombol **Masuk Kasir** di pojok kanan atas (dasbor langsung terbuka tanpa PIN karena masih Mode Demo).
3. Buka tab **Pengaturan & Sheets** di menu bawah.
4. Pada bagian **1. Hubungkan Database Google Sheets**, tempel **URL Web App** (`https://script.google.com/macros/s/.../exec`) lalu klik **Hubungkan Sheets**.
5. Pada bagian **2. Profil Usaha, PIN & Tarif**, lengkapi:
   - **Nama Outlet Laundry**
   - **PIN Login Kasir** *(buat PIN rahasia Anda, misalnya `2580`)*
   - **Nomor WhatsApp Admin** *(gunakan awalan `62`, contoh: `6281234567890`)*
   - **Alamat Outlet Laundry**
   - **Tarif Layanan Kiloan & Default Tikar**
6. Klik **Simpan ke Google Sheets**. Seluruh pengaturan otomatis tersimpan ke tab `Pengaturan` di spreadsheet Anda.

### 2. Mencatat Pesanan Baru & Mengirim Nota WA
1. Masuk ke tab **Input Order**.
2. Isi **Nama Pelanggan** dan **Nomor WhatsApp Pelanggan**.
3. Pilih **Jenis Layanan**:
   - **Layanan Kiloan:** Masukkan berat cucian (bisa gunakan tombol cepat `+0.5 kg` atau `+1 kg`), total tagihan terhitung otomatis.
   - **Karpet / Tikar:** Ketik nominal harga sesuai kesepakatan dan isi catatan ukuran/jenis barang jika perlu.
4. Pilih **Status Pengerjaan Awal** (*Diterima / Diproses / Selesai / Diambil*).
5. Masukkan nominal **Uang Dibayar Pelanggan** (atau gunakan tombol cepat *Uang Pas* / *Belum Bayar Rp 0*):
   - Jika uang pelanggan lebih besar dari tagihan, centang atau hilangkan centang pada opsi **"Kembalian sudah dikembalikan ke pelanggan"** untuk mencatat apakah kembalian sudah diberikan atau masih tertahan di kasir.
6. Klik **Simpan Pesanan**. Data otomatis tersimpan ke Google Sheets dan muncul pop-up **Kirim Nota ke WhatsApp** $\rightarrow$ klik **Buka WhatsApp & Kirim Sekarang**.

### 3. Mengelola Progres Cucian & Pelunasan
1. Buka tab **Daftar Cucian** untuk memantau ringkasan jumlah cucian, total pendapatan, piutang (*Kekurangan Pelanggan*), dan *Kembalian Tertahan*.
2. Gunakan bar filter di bagian atas daftar untuk menyaring pesanan berdasarkan status pengerjaan maupun status pembayaran.
3. Klik langsung tombol status (**Diterima**, **Diproses**, **Selesai**, **Diambil**) pada kartu pesanan untuk memperbarui progres cucian ke Google Sheets.
4. Jika pelanggan melunasi kekurangan atau mengambil kembalian tertahan, tekan tombol **Lunasi Kekurangan** atau **Tandai Kembalian Sudah Diberikan** pada kartu pesanan terkait.

### 4. Cara Pelanggan Mengecek Nota & Login Pengusaha dari Laman Nota
- **Bagi Pelanggan:** Cukup klik tautan nota yang dikirim kasir melalui WhatsApp. Halaman nota akan langsung terbuka menampilkan progres cucian, rincian biaya, status pelunasan/kembalian, serta tombol **Hubungi Admin via WA**.
- **Bagi Pemilik Usaha / Kasir:** Jika Anda membuka halaman toko dari tautan nota tersebut dan ingin masuk ke dasbor kasir, klik tombol **Masuk Kasir** di pojok kanan atas lalu masukkan **PIN Login Kasir** Anda.

### 5. Ganti Perangkat atau Reset ke Mode Demo
- **Login di HP/Laptop Baru:** Buka link website utama $\rightarrow$ klik **Masuk Kasir** $\rightarrow$ masuk ke tab **Pengaturan & Sheets** $\rightarrow$ tempel **URL Google Apps Script** Anda $\rightarrow$ klik **Hubungkan Sheets**. Seluruh data pesanan, nama outlet, alamat, WA, PIN toko, dan tarif otomatis termuat dari Google Sheets.
- **Mengosongkan Perangkat (Logout Total):** Buka tab **Pengaturan & Sheets** $\rightarrow$ gulir ke paling bawah $\rightarrow$ klik **Keluar & Kosongkan ke Mode Demo** untuk menghapus sesi dan data lokal dari browser perangkat tersebut.

---

## 📁 Struktur File Repository

```text
smart-laundry/
├── index.html   # Struktur halaman publik (cek nota) & dasbor kasir
├── script.js    # Logika transaksi, kalkulasi pembayaran, PIN & sinkronisasi Google Sheets
├── style.css    # Kustomisasi tampilan & animasi antarmuka
├── logo.png     # Ikon dan logo aplikasi
└── README.md    # Dokumentasi proyek & panduan penggunaan
```

## 💡 Catatan Pembuat & Riwayat Pengembangan

### Orisinalitas Ide & Proses Deployment
Seluruh gagasan, konsep alur kerja, logika bisnis, serta fitur-fitur di dalam aplikasi **SmartLaundry** ini merupakan **100% ide murni dari saya (pengembang proyek)**, bukan gagasan dari AI. Mulai dari konsep isolasi *Mode Demo* yang bersih, penyatuan laman nota pelanggan dengan gerbang login pengusaha, pencatatan detail selisih pembayaran dan uang kembalian tertahan, hingga penyimpanan pengaturan lintas perangkat di Google Sheets lahir sepenuhnya dari pemikiran dan kebutuhan nyata saya sendiri.

Dalam proses penyusunannya, AI hanya digunakan sebagai alat bantu untuk menerjemahkan gagasan tersebut ke dalam bentuk sintaks kode. Selain itu, kode aplikasi ini juga melalui beberapa penyesuaian dan penyempurnaan kecil secara bertahap pada setiap proses *deploy* (baik di GitHub Pages maupun Google Apps Script) agar sistem berjalan stabil dan sesuai dengan kebutuhan operasional di lapangan.

### Ringkasan Tahapan Pengembangan Aplikasi
Berikut adalah rangkuman perjalanan diskusi dan penyempurnaan fitur selama aplikasi ini dibangun:

1. **Perancangan Konsep Kasir & Pelacakan Keuangan**
   - Saya merancang sistem kasir laundry berbasis web *mobile-first* yang mampu menghitung layanan kiloan dan satuan (karpet/tikar), memantau progres cucian (*Diterima, Diproses, Selesai, Diambil*), serta melacak detail status pembayaran (*Lunas, Kurang Bayar, Belum Bayar, Kembalian Belum Diberikan*).
2. **Integrasi Database Cloud (Google Sheets & Apps Script)**
   - Menghubungkan antarmuka web di GitHub Pages dengan Google Sheets melalui Google Apps Script agar setiap transaksi tercatat secara *real-time* dan pelanggan dapat memantau status cuciannya lewat tautan nota WhatsApp.
3. **Sinkronisasi Profil Outlet, Alamat, PIN & Tarif ke Google Sheets**
   - Saya menggagas agar pengaturan penting—seperti Nama Outlet, Alamat Outlet, Nomor WhatsApp Admin, PIN Kasir, dan daftar Harga Jasa—ikut tersimpan di tab khusus **`Pengaturan`** pada Google Sheets. Dengan begitu, pemilik usaha tidak perlu mengisi ulang data dari awal saat berganti HP/laptop atau setelah keluar (*logout*) dari perangkat.
4. **Penyempurnaan Keamanan *Mode Demo* & Alur Login Satu Laman**
   - Saya menetapkan aturan privasi agar ketika tautan utama GitHub dibuka secara langsung, aplikasi tampil dalam **Mode Demo** yang benar-benar kosong tanpa menampilkan data outlet maupun URL database milik siapa pun.
   - Setiap pengusaha yang ingin memakai aplikasi untuk usahanya wajib memasukkan URL Google Apps Script miliknya sendiri terlebih dahulu.
   - Menyatukan laman nota pelanggan dengan akses login pengusaha: pelanggan yang membuka tautan nota dari WhatsApp dapat langsung melihat status cuciannya tanpa hambatan, sementara tombol **Masuk Kasir** di laman yang sama tetap terlindungi oleh **PIN Rahasia Toko** yang dibuat oleh pengusaha.
