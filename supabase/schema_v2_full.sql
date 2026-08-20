create extension if not exists pgcrypto;

create table if not exists profile (id uuid primary key default gen_random_uuid(), owner_id uuid references auth.users(id) not null, display_name text not null default 'Kang Jaund', bio text default '', avatar_url text, qris_image_url text, whatsapp_number text, theme text default 'default', created_at timestamptz not null default now());
create table if not exists links (id uuid primary key default gen_random_uuid(), owner_id uuid references auth.users(id) not null, title text not null, url text not null, icon text not null default 'link', link_type text not null default 'regular', platform text, sort_order int not null default 0, is_active boolean not null default true, click_count int not null default 0, created_at timestamptz not null default now());
create table if not exists products (id uuid primary key default gen_random_uuid(), owner_id uuid references auth.users(id) not null, slug text unique not null, title text not null, description text default '', price_idr bigint not null check (price_idr >= 0), stock_qty int, product_type text not null default 'digital' check (product_type in ('digital','physical')), cover_image_url text, file_path text, weight_grams int check (weight_grams is null or weight_grams > 0), is_active boolean not null default true, sort_order int not null default 0, created_at timestamptz not null default now());
create table if not exists orders (id uuid primary key default gen_random_uuid(), order_code text unique not null, owner_id uuid references auth.users(id), buyer_email text not null, buyer_name text not null, buyer_whatsapp text not null, subtotal_idr bigint not null check (subtotal_idr >= 0), shipping_cost_idr bigint not null default 0 check (shipping_cost_idr >= 0), payment_fee_idr bigint not null default 0 check (payment_fee_idr >= 0), total_idr bigint not null check (total_idr >= 0), status text not null default 'pending_payment' check (status in ('pending_payment','paid','processing','shipped','completed','cancelled','expired','refunded')), created_at timestamptz not null default now(), paid_at timestamptz, completed_at timestamptz);
create table if not exists order_items (id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id) on delete cascade, product_id uuid not null references products(id), product_title text not null, unit_price_idr bigint not null check (unit_price_idr >= 0), quantity int not null check (quantity > 0), line_total_idr bigint not null check (line_total_idr >= 0), created_at timestamptz not null default now());
create table if not exists shipping_addresses (id uuid primary key default gen_random_uuid(), order_id uuid unique not null references orders(id) on delete cascade, recipient_name text not null, phone text not null, address_line text not null, district text, city text, province text, postal_code text not null, notes text, created_at timestamptz not null default now());
create table if not exists shipments (id uuid primary key default gen_random_uuid(), order_id uuid unique not null references orders(id) on delete cascade, provider text, courier_code text, courier_service text, courier_description text, tracking_number text, shipping_cost_idr bigint not null default 0, status text not null default 'pending' check (status in ('pending','booked','shipped','delivered','cancelled')), label_url text, created_at timestamptz not null default now(), shipped_at timestamptz, delivered_at timestamptz);
create table if not exists payments (id uuid primary key default gen_random_uuid(), order_id uuid unique not null references orders(id) on delete cascade, provider text not null, provider_transaction_id text, payment_method text, amount_idr bigint not null check (amount_idr >= 0), status text not null default 'pending' check (status in ('pending','paid','failed','expired','refunded')), qr_string text, qr_image_url text, raw_response jsonb, created_at timestamptz not null default now(), paid_at timestamptz, expired_at timestamptz);
create table if not exists download_tokens (id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id) on delete cascade, product_id uuid not null references products(id), token_hash text unique not null, expires_at timestamptz not null, download_count int not null default 0, created_at timestamptz not null default now());

create index if not exists idx_products_active_sort on products(is_active, sort_order);
create index if not exists idx_orders_created on orders(created_at desc);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_payments_provider_tx on payments(provider, provider_transaction_id);

alter table profile enable row level security;
alter table links enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table shipping_addresses enable row level security;
alter table shipments enable row level security;
alter table payments enable row level security;
alter table download_tokens enable row level security;

drop policy if exists profile_public_read on profile;
create policy profile_public_read on profile for select using (true);
drop policy if exists links_public_read on links;
create policy links_public_read on links for select using (is_active = true);
drop policy if exists products_public_read on products;
create policy products_public_read on products for select using (is_active = true);
drop policy if exists profile_owner_write on profile;
create policy profile_owner_write on profile for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists links_owner_write on links;
create policy links_owner_write on links for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists products_owner_write on products;
create policy products_owner_write on products for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
