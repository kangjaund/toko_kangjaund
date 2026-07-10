# Panduan Setup — Halaman Profil & Toko Produk Digital Kang Jaund

Alur pembayaran: **QRIS statis + verifikasi manual** (bukan payment gateway otomatis).
Pembeli scan QRIS → upload bukti transfer → kamu cek di dashboard → klik "Tandai Lunas" →
link download otomatis dibuatkan → kamu kirim manual ke pembeli.

---

## 1. Setup Supabase (database + auth + storage) — ±15 menit

1. Daftar/masuk di https://supabase.com → **New Project** (region Singapore, biar cepat dari Indonesia).
2. Buka **SQL Editor** → New query → copy-paste seluruh isi `supabase/schema.sql` → Run.
   Ini membuat tabel `profile`, `links`, `products`, `orders` + aturan keamanan (RLS).
3. Buka **Storage** → buat 3 bucket:
   - `covers` → **Public bucket** (cover produk + gambar QRIS kamu)
   - `products` → **JANGAN** dicentang public (file digital asli)
   - `payment-proofs` → **JANGAN** dicentang public (bukti transfer pembeli)
4. Buka **Storage → Policies** → untuk bucket `payment-proofs`, tambah policy baru:
   role `authenticated`, operasi `SELECT`, kondisi `true`. Ini supaya kamu (yang login)
   bisa buka bukti transfer, tapi orang luar tidak bisa.
5. Buka **Authentication → Users → Add user** → buat 1 akun (email + password) buat login dashboard kamu.
6. Masuk ke tabel `profile` (Table Editor) → insert 1 baris manual: isi `owner_id` = UUID user tadi,
   isi `display_name` dan `bio` sesuai kamu.
7. Ambil kunci API: **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (RAHASIA, jangan expose ke browser/GitHub publik)

## 2. Deploy ke Vercel

1. Push folder ini ke repo GitHub baru.
2. Di https://vercel.com → **New Project** → import repo tadi.
3. Isi **Environment Variables** dengan 3 value dari step 1.7 di atas.
4. Deploy.

## 3. Setelah live: isi QRIS & nomor WA

1. Buka `https://domain-kamu.vercel.app/dashboard/login` → login.
2. Ke tab **Pengaturan** → upload foto/gambar QRIS statis kamu (dari e-wallet/bank apapun
   yang mendukung QRIS), isi nomor WhatsApp.
3. Ke tab **Produk** → tambah produk pertama (judul, harga, upload file asli + cover).
4. Ke tab **Links** → tambah link-link kamu (Threads, dll).

## 4. Setup notifikasi (opsional tapi direkomendasikan)

**Telegram** (alert instan ke HP kamu tiap ada pesanan masuk):
1. Chat @BotFather di Telegram → `/newbot` → ikuti instruksi → dapat `TELEGRAM_BOT_TOKEN`
2. Chat @userinfobot → catat `id` kamu → itu `TELEGRAM_CHAT_ID`
3. Masukkan 2 value itu ke Environment Variables di Vercel

**Resend** (email notifikasi terstruktur ke email kamu sendiri, dasar buat otomasi nanti):
1. Daftar di https://resend.com (gratis)
2. **API Keys → Create API Key** → catat sebagai `RESEND_API_KEY`
3. Isi `NOTIFY_EMAIL` dengan email kamu yang mau nerima notifikasi
4. Nggak perlu verifikasi domain apapun, karena email dikirim ke diri sendiri pakai domain default Resend

Setelah 2 di atas diisi di Vercel, redeploy. Tiap ada pesanan baru, kamu akan dapat:
- Notif Telegram instan
- Email dengan subject **`Pesanan Baru #ORD-xxxxxx`** (format ini sengaja tetap/terstruktur)

## 5. Alur transaksi (cara kerja hari-hari)

1. Pembeli buka halaman produk → scan QRIS → transfer manual → upload screenshot bukti → isi email.
2. Kamu buka tab **Pesanan** di dashboard, ada status "Menunggu verifikasi".
3. Klik **Lihat bukti transfer** untuk cek nominalnya benar.
4. Kalau cocok → klik **Tandai lunas** → sistem otomatis bikin link download unik (berlaku 7 hari).
5. Klik **Salin link download** → kirim manual ke pembeli via WA/email pakai link itu.
6. Kalau bukti mencurigakan/nggak sesuai → klik **Tolak**.

> Ini bagian paling manual di seluruh sistem: **tidak ada notifikasi otomatis** kalau ada
> pesanan baru masuk. Kamu perlu cek dashboard secara berkala, atau nanti aku bisa bantu
> tambahkan notifikasi Telegram/WA setiap ada pesanan baru kalau volume order sudah mulai banyak.

---

## Kalau nanti mau upgrade ke pembayaran otomatis

Struktur kode sengaja dibuat modular (checkout terpisah dari database), jadi kalau suatu saat
mau pindah ke payment gateway lain (Xendit, Tripay, dll — nggak harus Midtrans), yang perlu
diubah cuma bagian API `/api/orders` dan form checkout, database & dashboard nggak perlu dirombak ulang.

## Domain: root domain buat halaman publik, `/dashboard` tetap jalur terpisah

Ini sudah otomatis sesuai keinginan kamu, nggak perlu setting tambahan yang aneh-aneh:

- Kalau kamu beli domain (mis. `kangjaund.com`) dan hubungkan ke project Vercel ini
  (**Vercel Project → Settings → Domains → Add**, lalu arahkan DNS sesuai instruksi Vercel di sana),
  maka:
  - `kangjaund.com` → otomatis tampilkan halaman profil publik (`/`)
  - `kangjaund.com/dashboard` → tetap dashboard kamu, dilindungi login
- **Satu domain, dua "wajah"** — bukan dua situs terpisah. Dashboard tetap ada di path `/dashboard`,
  cuma nggak akan muncul di navigasi manapun buat pengunjung biasa, dan siapapun yang buka
  `/dashboard` tanpa login otomatis dilempar ke halaman login.
- Kalau suatu saat kamu MAU dashboard di subdomain terpisah (mis. `admin.kangjaund.com`) itu
  bisa, tapi butuh setup tambahan (routing per-subdomain) — kasih tahu aku kalau itu yang kamu mau,
  saat ini belum perlu karena skalanya masih 1 pemilik.

## Risiko yang perlu kamu sadari

- Karena verifikasi manual, ada jeda waktu antara pembeli bayar dan kamu kirim link — kalau kamu
  nggak sempat cek dashboard beberapa hari, pembeli bisa kecewa/komplain. Ini trade-off dari
  keputusan menghindari Midtrans.
- Bukti transfer bisa dipalsukan (edit nominal di foto). Sistem ini TIDAK verifikasi otomatis ke
  bank/e-wallet — itu murni keputusan kamu saat klik "Tandai Lunas", jadi tetap teliti cek mutasi asli.
- `SUPABASE_SERVICE_ROLE_KEY` adalah kunci sakti — kalau bocor, orang bisa baca/tulis semua data.
  Jangan commit file `.env.local` ke GitHub.
- Bucket `products` dan `payment-proofs` HARUS tetap private.
