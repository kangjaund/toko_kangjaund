-- =========================================================
-- TOKO KANG JAUND — SAFE V2 DATABASE FOUNDATION
-- NON-DESTRUCTIVE MIGRATION
--
-- Tidak rename/drop/delete tabel existing.
-- Legacy `orders` tetap utuh.
-- =========================================================

create extension if not exists pgcrypto;

-- Product additions needed by the new checkout.
alter table public.products
  add column if not exists product_type text;

alter table public.products
  add column if not exists weight_grams integer;

update public.products
set product_type = 'digital'
where product_type is null;

alter table public.products
  drop constraint if exists products_product_type_check;

alter table public.products
  add constraint products_product_type_check
  check (product_type in ('digital','physical'));

-- =========================================================
-- ORDERS V2
-- =========================================================

create table if not exists public.orders_v2 (
  id uuid primary key default gen_random_uuid(),
  order_code text unique not null,
  owner_id uuid references auth.users(id),
  buyer_email text not null,
  buyer_name text not null,
  buyer_whatsapp text not null,

  subtotal_idr bigint not null check (subtotal_idr >= 0),
  shipping_cost_idr bigint not null default 0
    check (shipping_cost_idr >= 0),
  payment_fee_idr bigint not null default 0
    check (payment_fee_idr >= 0),
  total_idr bigint not null check (total_idr >= 0),

  status text not null default 'pending_payment'
    check (
      status in (
        'pending_payment',
        'paid',
        'processing',
        'shipped',
        'completed',
        'cancelled',
        'expired',
        'refunded'
      )
    ),

  created_at timestamptz not null default now(),
  paid_at timestamptz,
  completed_at timestamptz
);

create index if not exists idx_orders_v2_created
  on public.orders_v2(created_at desc);

create index if not exists idx_orders_v2_status
  on public.orders_v2(status);

-- =========================================================
-- ORDER ITEMS V2
-- Snapshot product title/price at purchase time.
-- =========================================================

create table if not exists public.order_items_v2 (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders_v2(id) on delete cascade,
  product_id uuid not null references public.products(id),

  product_title text not null,
  unit_price_idr bigint not null check (unit_price_idr >= 0),
  quantity integer not null check (quantity > 0),
  line_total_idr bigint not null check (line_total_idr >= 0),

  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_v2_order
  on public.order_items_v2(order_id);

-- =========================================================
-- SHIPPING
-- =========================================================

create table if not exists public.shipping_addresses_v2 (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique not null
    references public.orders_v2(id) on delete cascade,

  recipient_name text not null,
  phone text not null,
  address_line text not null,
  district text,
  city text,
  province text,
  postal_code text not null,
  notes text,

  created_at timestamptz not null default now()
);

create table if not exists public.shipments_v2 (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique not null
    references public.orders_v2(id) on delete cascade,

  provider text,
  courier_code text,
  courier_service text,
  courier_description text,
  tracking_number text,

  shipping_cost_idr bigint not null default 0
    check (shipping_cost_idr >= 0),

  status text not null default 'pending'
    check (status in ('pending','booked','shipped','delivered','cancelled')),

  label_url text,

  created_at timestamptz not null default now(),
  shipped_at timestamptz,
  delivered_at timestamptz
);

-- =========================================================
-- PAYMENTS
-- =========================================================

create table if not exists public.payments_v2 (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique not null
    references public.orders_v2(id) on delete cascade,

  provider text not null,
  provider_transaction_id text,
  payment_method text,

  amount_idr bigint not null check (amount_idr >= 0),

  status text not null default 'pending'
    check (
      status in ('pending','paid','failed','expired','refunded')
    ),

  qr_string text,
  qr_image_url text,

  raw_response jsonb,

  created_at timestamptz not null default now(),
  paid_at timestamptz,
  expired_at timestamptz
);

create index if not exists idx_payments_v2_provider_tx
  on public.payments_v2(provider, provider_transaction_id);

-- =========================================================
-- DIGITAL DOWNLOAD TOKENS
-- =========================================================

create table if not exists public.download_tokens_v2 (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null
    references public.orders_v2(id) on delete cascade,
  product_id uuid not null
    references public.products(id),

  token_hash text unique not null,

  expires_at timestamptz not null,
  download_count integer not null default 0,

  created_at timestamptz not null default now()
);

-- =========================================================
-- RLS
-- =========================================================

alter table public.orders_v2 enable row level security;
alter table public.order_items_v2 enable row level security;
alter table public.shipping_addresses_v2 enable row level security;
alter table public.shipments_v2 enable row level security;
alter table public.payments_v2 enable row level security;
alter table public.download_tokens_v2 enable row level security;

-- No public policies are intentionally created.
-- Public checkout will use a server-side privileged path.
-- Admin/dashboard policies will be added separately.

-- =========================================================
-- ATOMIC STOCK DECREMENT
-- =========================================================

create or replace function public.decrement_product_stock_v2(
  p_product_id uuid,
  p_quantity integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_stock integer;
begin
  if p_quantity is null or p_quantity < 1 then
    return false;
  end if;

  select stock_qty
    into current_stock
  from public.products
  where id = p_product_id
  for update;

  if not found then
    return false;
  end if;

  -- NULL means unlimited stock.
  if current_stock is null then
    return true;
  end if;

  if current_stock < p_quantity then
    return false;
  end if;

  update public.products
  set stock_qty = stock_qty - p_quantity
  where id = p_product_id;

  return true;
end;
$$;

revoke all on function public.decrement_product_stock_v2(uuid, integer)
from public, anon, authenticated;

grant execute on function public.decrement_product_stock_v2(uuid, integer)
to service_role;
