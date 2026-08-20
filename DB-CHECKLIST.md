# Phase 01 Checklist

## Sebelum
- [ ] Backup Supabase/database
- [ ] Backup repository GitHub/local
- [ ] Pastikan toko beta masih bisa dibuka

## Step 1 — READ ONLY
Run:
`supabase/01_verify_existing_db.sql`

Expected:
- profile exists
- links exists
- products exists
- orders exists
- products memiliki price_idr
- products memiliki stock_qty
- products memiliki file_path

## Step 2 — MIGRATION
Run:
`supabase/02_add_v2_tables.sql`

Expected:
- tidak ada DROP TABLE
- `orders` lama tetap ada
- muncul 6 tabel `_v2`
- products mendapat product_type dan weight_grams

## Step 3 — VERIFY
Run:
`supabase/03_verify_v2.sql`

Expected:
6 tabel `_v2` muncul.

## Jangan lanjut jika
- SQL error
- orders lama hilang
- products tidak bisa dibaca
- RLS error
- ada data existing yang berubah tidak semestinya

Jika semua aman, baru Phase 02/Order Engine dilanjutkan.
