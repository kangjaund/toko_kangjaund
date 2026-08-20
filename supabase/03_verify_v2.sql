-- READ ONLY verification after migration.

select
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'orders_v2',
    'order_items_v2',
    'shipping_addresses_v2',
    'shipments_v2',
    'payments_v2',
    'download_tokens_v2'
  )
order by table_name;

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'orders_v2'
order by ordinal_position;

select
  routine_name,
  routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'decrement_product_stock_v2';

select
  count(*)::bigint as products_total,
  count(*) filter (where product_type = 'digital')::bigint as digital_products,
  count(*) filter (where product_type = 'physical')::bigint as physical_products
from public.products;
