-- READ ONLY — tidak mengubah database.
-- Jalankan dulu di Supabase SQL Editor.

select
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profile','links','products','orders')
order by table_name;

select
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profile','links','products','orders')
order by table_name, ordinal_position;

select
  'profile' as table_name, count(*)::bigint as row_count from public.profile
union all
select 'links', count(*)::bigint from public.links
union all
select 'products', count(*)::bigint from public.products
union all
select 'orders', count(*)::bigint from public.orders;

select
  id,
  slug,
  title,
  price_idr,
  stock_qty,
  is_active
from public.products
order by sort_order, created_at;
