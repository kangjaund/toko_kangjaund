-- =========================================================
-- SKEMA DATABASE - Personal Link & Digital Store
-- Jalankan di Supabase SQL Editor (Project > SQL Editor > New Query)
-- =========================================================

-- MIGRASI: kalau kamu SUDAH PERNAH jalankan schema ini sebelumnya (tabel udah ada),
-- jangan run ulang semuanya dari atas. Cukup jalankan 1 baris ini aja buat nambah
-- kolom stok ke tabel products yang udah ada:
--
--   alter table products add column if not exists stock_qty int;
--
-- Setelah itu skip ke bagian bawah, TIDAK perlu run "create table" lagi.
-- =========================================================

-- 1. PROFIL (satu baris saja, ini halaman "kartu nama" kamu)
create table if not exists profile (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) not null,
  display_name text not null default 'Kang Jaund',
  bio text default '',
  avatar_url text,
  qris_image_url text, -- gambar QRIS statis, ditampilkan di halaman checkout
  whatsapp_number text, -- nomor WA buat pembeli konfirmasi/tanya (format 62xxxx)
  theme text default 'default', -- reserved buat ganti tema nanti
  created_at timestamptz default now()
);

-- 2. LINKS (tombol-tombol link di halaman profil, mis. Threads, Instagram, dsb)
create table if not exists links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) not null,
  title text not null,
  url text not null,
  icon text default 'link', -- nama icon (lucide-react)
  sort_order int default 0,
  is_active boolean default true,
  click_count int default 0,
  created_at timestamptz default now()
);

-- 3. PRODUCTS (produk digital yang dijual)
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) not null,
  slug text unique not null,
  title text not null,
  description text default '',
  price_idr int not null check (price_idr >= 0),
  stock_qty int, -- NULL = stok tak terbatas/tidak ditampilkan. Angka = stok tersisa (fear marketing + auto-berkurang saat lunas)
  cover_image_url text,
  file_path text not null, -- path di Supabase Storage (bucket private)
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 4. ORDERS (transaksi pembelian - alur manual: pembeli upload bukti, admin verifikasi)
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique not null,
  product_id uuid references products(id) not null,
  buyer_email text not null,
  buyer_name text,
  buyer_whatsapp text,
  amount_idr int not null,
  proof_path text, -- path bukti transfer di bucket private "payment-proofs"
  status text not null default 'pending_review', -- pending_review | paid | rejected
  download_token text unique, -- dibuat manual oleh admin saat klik "Tandai Lunas"
  download_token_expires_at timestamptz,
  download_count int default 0,
  created_at timestamptz default now(),
  paid_at timestamptz
);

-- =========================================================
-- ROW LEVEL SECURITY
-- Prinsip: pemilik cuma bisa lihat/ubah datanya sendiri.
-- Publik cuma boleh SELECT data yang is_active = true.
-- Orders TIDAK bisa dibaca publik sama sekali (rawan bocor email pembeli).
-- =========================================================

alter table profile enable row level security;
alter table links enable row level security;
alter table products enable row level security;
alter table orders enable row level security;

-- PROFILE: publik boleh baca, hanya owner boleh ubah
create policy "profile_public_read" on profile for select using (true);
create policy "profile_owner_write" on profile for all using (auth.uid() = owner_id);

-- LINKS: publik boleh baca yang aktif, owner full akses
create policy "links_public_read" on links for select using (is_active = true);
create policy "links_owner_write" on links for all using (auth.uid() = owner_id);

-- PRODUCTS: publik boleh baca yang aktif (tanpa file_path terekspos di query publik -> dibatasi di kode app),
-- owner full akses
create policy "products_public_read" on products for select using (is_active = true);
create policy "products_owner_write" on products for all using (auth.uid() = owner_id);

-- ORDERS: hanya owner produk terkait yang boleh baca & update (dashboard laporan + verifikasi manual)
-- Insert HANYA lewat server (service role key) di /api/orders, karena pembeli tidak login.
create policy "orders_owner_read" on orders for select using (
  auth.uid() = (select owner_id from products where products.id = orders.product_id)
);
create policy "orders_owner_update" on orders for update using (
  auth.uid() = (select owner_id from products where products.id = orders.product_id)
);

-- =========================================================
-- STORAGE
-- Buat 3 bucket manual di Supabase Dashboard > Storage:
--   1. "covers"          -> PUBLIC   (gambar cover produk + gambar QRIS statis)
--   2. "products"        -> PRIVATE  (file digital asli, jangan public!)
--   3. "payment-proofs"  -> PRIVATE  (screenshot/foto bukti transfer dari pembeli)
--
-- File di "products" hanya bisa diakses lewat signed URL yang dibuat server
-- setelah admin menandai order "paid" (lihat /api/download).
--
-- Storage policy tambahan untuk bucket "payment-proofs" (Storage > Policies):
-- izinkan role "authenticated" melakukan SELECT, supaya admin (kamu, yang login)
-- bisa lihat bukti transfer lewat signed URL di dashboard.
-- =========================================================
