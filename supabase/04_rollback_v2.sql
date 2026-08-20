-- =========================================================
-- ROLLBACK V2
-- HANYA gunakan jika Phase 01 perlu dibatalkan.
--
-- Tidak menyentuh legacy `orders`.
-- Produk product_type/weight_grams dikembalikan ke state sebelum
-- migration hanya jika kolom tersebut memang dibuat oleh migration.
-- Karena PostgreSQL tidak menyimpan histori "siapa membuat kolom",
-- kolom product additions TIDAK otomatis di-drop di sini.
-- =========================================================

drop function if exists public.decrement_product_stock_v2(uuid, integer);

drop table if exists public.download_tokens_v2;
drop table if exists public.payments_v2;
drop table if exists public.shipments_v2;
drop table if exists public.shipping_addresses_v2;
drop table if exists public.order_items_v2;
drop table if exists public.orders_v2;
