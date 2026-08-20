-- BACKUP FIRST. This migration preserves the old one-product order table as orders_legacy_v1.
create extension if not exists pgcrypto;
alter table products add column if not exists product_type text default 'digital';
alter table products add column if not exists weight_grams int;
alter table products alter column file_path drop not null;
update products set product_type='digital' where product_type is null;
alter table products drop constraint if exists products_product_type_check;
alter table products add constraint products_product_type_check check (product_type in ('digital','physical'));
alter table orders rename to orders_legacy_v1;

create table orders (id uuid primary key default gen_random_uuid(), order_code text unique not null, owner_id uuid references auth.users(id), buyer_email text not null, buyer_name text not null, buyer_whatsapp text not null, subtotal_idr bigint not null check (subtotal_idr >= 0), shipping_cost_idr bigint not null default 0, payment_fee_idr bigint not null default 0, total_idr bigint not null check (total_idr >= 0), status text not null default 'pending_payment' check (status in ('pending_payment','paid','processing','shipped','completed','cancelled','expired','refunded')), created_at timestamptz not null default now(), paid_at timestamptz, completed_at timestamptz);
create table order_items (id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id) on delete cascade, product_id uuid not null references products(id), product_title text not null, unit_price_idr bigint not null, quantity int not null check (quantity > 0), line_total_idr bigint not null, created_at timestamptz not null default now());
create table shipping_addresses (id uuid primary key default gen_random_uuid(), order_id uuid unique not null references orders(id) on delete cascade, recipient_name text not null, phone text not null, address_line text not null, district text, city text, province text, postal_code text not null, notes text, created_at timestamptz not null default now());
create table shipments (id uuid primary key default gen_random_uuid(), order_id uuid unique not null references orders(id) on delete cascade, provider text, courier_code text, courier_service text, courier_description text, tracking_number text, shipping_cost_idr bigint not null default 0, status text not null default 'pending', label_url text, created_at timestamptz not null default now(), shipped_at timestamptz, delivered_at timestamptz);
create table payments (id uuid primary key default gen_random_uuid(), order_id uuid unique not null references orders(id) on delete cascade, provider text not null, provider_transaction_id text, payment_method text, amount_idr bigint not null, status text not null default 'pending', qr_string text, qr_image_url text, raw_response jsonb, created_at timestamptz not null default now(), paid_at timestamptz, expired_at timestamptz);
create table download_tokens (id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id) on delete cascade, product_id uuid not null references products(id), token_hash text unique not null, expires_at timestamptz not null, download_count int not null default 0, created_at timestamptz not null default now());

alter table orders enable row level security;
alter table order_items enable row level security;
alter table shipping_addresses enable row level security;
alter table shipments enable row level security;
alter table payments enable row level security;
alter table download_tokens enable row level security;

-- No public order/payment policies: server/service-role only.
