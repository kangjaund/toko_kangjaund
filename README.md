# TOKO KANG JAUND — PHASE 01
## Recovery + Database Foundation

Tanggal: 2026-08-20

### Tujuan
Menyambungkan architecture checkout baru ke database existing TANPA menghancurkan
schema/order lama yang masih dipakai beta tester.

Project existing saat ini memiliki:
- profile
- links
- products
- orders (legacy/manual payment)

Phase ini TIDAK mengganti tabel `orders` lama.

### Parent folder
Semua file SQL masuk ke:

toko_kangjaund/
└── supabase/

### Urutan eksekusi

1. Jalankan `01_verify_existing_db.sql`
   - READ ONLY
   - tidak mengubah database.
2. Baca hasilnya.
3. Jika tabel existing sesuai, jalankan `02_add_v2_tables.sql`.
4. Jalankan `03_verify_v2.sql`.
5. JANGAN menjalankan rollback kecuali memang perlu.

### Kenapa tidak rename orders lama?
Karena toko sudah live/beta. `orders` lama berisi transaksi/manual flow.
Mempertahankan tabel lama membuat rollback jauh lebih aman.

Architecture baru sementara memakai:
- orders_v2
- order_items_v2
- shipping_addresses_v2
- shipments_v2
- payments_v2
- download_tokens_v2

Setelah payment + shipping terbukti stabil, baru kita lakukan cutover final.

### Penting
Phase ini belum mengaktifkan:
- RajaOngkir
- QRIS dinamis
- webhook pembayaran
- fulfillment otomatis

Jadi production checkout belum boleh diaktifkan.

### UI
Tidak ada UI yang diganti pada phase ini.
Design existing tetap dipertahankan. UI brief menetapkan storefront mobile-first,
clean, modern, airy, dan checkout yang sederhana. fileciteturn0file3L262-L320
