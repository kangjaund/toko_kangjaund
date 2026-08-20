-- =========================================================
-- TOKO KANG JAUND — PHASE 02
-- ATOMIC HYBRID ORDER ENGINE
--
-- NON-DESTRUCTIVE:
-- - tidak menyentuh legacy public.orders
-- - tidak menghapus data
-- - memakai tabel *_v2
--
-- Source of truth:
-- public.products.price_idr
-- public.products.stock_qty
-- public.products.product_type
-- =========================================================

create or replace function public.create_order_v2(
  p_buyer_email text,
  p_buyer_name text,
  p_buyer_whatsapp text,
  p_items jsonb,
  p_shipping jsonb default null
)
returns table (
  order_id uuid,
  order_code text,
  subtotal_idr bigint,
  shipping_cost_idr bigint,
  payment_fee_idr bigint,
  total_idr bigint,
  has_physical_items boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_code text;
  v_subtotal bigint := 0;
  v_shipping_cost bigint := 0;
  v_payment_fee bigint := 0;
  v_total bigint := 0;
  v_has_physical boolean := false;
  v_has_digital boolean := false;

  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_product record;
  v_line_total bigint;
  v_seen_ids uuid[] := '{}';
begin
  -- -------------------------------------------------------
  -- Basic validation
  -- -------------------------------------------------------

  if p_buyer_email is null
     or length(trim(p_buyer_email)) < 5
     or position('@' in p_buyer_email) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Email pembeli tidak valid.';
  end if;

  if p_buyer_name is null or length(trim(p_buyer_name)) < 2 then
    raise exception using
      errcode = 'P0001',
      message = 'Nama pembeli wajib diisi.';
  end if;

  if p_buyer_whatsapp is null or length(trim(p_buyer_whatsapp)) < 8 then
    raise exception using
      errcode = 'P0001',
      message = 'Nomor WhatsApp tidak valid.';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1 then
    raise exception using
      errcode = 'P0001',
      message = 'Keranjang kosong.';
  end if;

  if jsonb_array_length(p_items) > 50 then
    raise exception using
      errcode = 'P0001',
      message = 'Jumlah item dalam keranjang terlalu banyak.';
  end if;

  -- -------------------------------------------------------
  -- Validate each product and calculate from DB price.
  -- FOR UPDATE prevents concurrent stock races.
  -- -------------------------------------------------------

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item->>'product_id')::uuid;
    exception when others then
      raise exception using
        errcode = 'P0001',
        message = 'Product ID tidak valid.';
    end;

    begin
      v_quantity := (v_item->>'quantity')::integer;
    exception when others then
      raise exception using
        errcode = 'P0001',
        message = 'Quantity tidak valid.';
    end;

    if v_quantity is null or v_quantity < 1 or v_quantity > 99 then
      raise exception using
        errcode = 'P0001',
        message = 'Quantity harus antara 1 dan 99.';
    end if;

    -- Prevent duplicate product lines.
    if v_product_id = any(v_seen_ids) then
      raise exception using
        errcode = 'P0001',
        message = 'Product yang sama tidak boleh dikirim dua kali dalam cart.';
    end if;

    v_seen_ids := array_append(v_seen_ids, v_product_id);

    select
      p.id,
      p.title,
      p.price_idr,
      p.stock_qty,
      p.product_type,
      p.is_active
    into v_product
    from public.products p
    where p.id = v_product_id
    for update;

    if not found or not v_product.is_active then
      raise exception using
        errcode = 'P0001',
        message = 'Produk tidak tersedia.';
    end if;

    if v_product.price_idr is null or v_product.price_idr < 0 then
      raise exception using
        errcode = 'P0001',
        message = 'Harga produk tidak valid.';
    end if;

    if v_product.product_type not in ('digital','physical') then
      raise exception using
        errcode = 'P0001',
        message = 'Tipe produk tidak valid.';
    end if;

    -- NULL stock = unlimited.
    if v_product.stock_qty is not null
       and v_product.stock_qty < v_quantity then
      raise exception using
        errcode = 'P0001',
        message = format(
          'Stok "%s" tidak mencukupi. Stok tersedia: %s.',
          v_product.title,
          v_product.stock_qty
        );
    end if;

    if v_product.product_type = 'physical' then
      v_has_physical := true;
    else
      v_has_digital := true;
    end if;

    v_line_total := v_product.price_idr * v_quantity;
    v_subtotal := v_subtotal + v_line_total;
  end loop;

  -- -------------------------------------------------------
  -- Physical/mixed cart requires shipping information.
  -- -------------------------------------------------------

  if v_has_physical then
    if p_shipping is null
       or jsonb_typeof(p_shipping) <> 'object' then
      raise exception using
        errcode = 'P0001',
        message = 'Alamat pengiriman wajib diisi untuk produk fisik.';
    end if;

    if nullif(trim(p_shipping->>'recipient_name'), '') is null
       or nullif(trim(p_shipping->>'phone'), '') is null
       or nullif(trim(p_shipping->>'address_line'), '') is null
       or nullif(trim(p_shipping->>'postal_code'), '') is null then
      raise exception using
        errcode = 'P0001',
        message = 'Data alamat pengiriman belum lengkap.';
    end if;
  end if;

  -- Shipping cost deliberately remains 0 in Phase 02.
  -- Phase RajaOngkir will provide the authoritative quote.
  v_total := v_subtotal + v_shipping_cost + v_payment_fee;

  -- -------------------------------------------------------
  -- Create order.
  -- -------------------------------------------------------

  v_order_code :=
    'ORD-' ||
    to_char(clock_timestamp(), 'YYYYMMDD-HH24MISS') ||
    '-' ||
    upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 6));

  insert into public.orders_v2 (
    order_code,
    buyer_email,
    buyer_name,
    buyer_whatsapp,
    subtotal_idr,
    shipping_cost_idr,
    payment_fee_idr,
    total_idr,
    status
  )
  values (
    v_order_code,
    trim(p_buyer_email),
    trim(p_buyer_name),
    trim(p_buyer_whatsapp),
    v_subtotal,
    v_shipping_cost,
    v_payment_fee,
    v_total,
    'pending_payment'
  )
  returning id into v_order_id;

  -- -------------------------------------------------------
  -- Create items and decrement stock atomically.
  -- -------------------------------------------------------

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    select
      p.id,
      p.title,
      p.price_idr,
      p.stock_qty
    into v_product
    from public.products p
    where p.id = v_product_id
    for update;

    -- Stock can only become less available between the first
    -- validation and this second lock if another transaction
    -- changes it outside this function. Re-check.
    if v_product.stock_qty is not null
       and v_product.stock_qty < v_quantity then
      raise exception using
        errcode = 'P0001',
        message = format(
          'Stok "%s" berubah dan tidak lagi mencukupi.',
          v_product.title
        );
    end if;

    insert into public.order_items_v2 (
      order_id,
      product_id,
      product_title,
      unit_price_idr,
      quantity,
      line_total_idr
    )
    values (
      v_order_id,
      v_product.id,
      v_product.title,
      v_product.price_idr,
      v_quantity,
      v_product.price_idr * v_quantity
    );

    if v_product.stock_qty is not null then
      update public.products
      set stock_qty = stock_qty - v_quantity
      where id = v_product.id;
    end if;
  end loop;

  -- -------------------------------------------------------
  -- Shipping records for physical/mixed carts.
  -- -------------------------------------------------------

  if v_has_physical then
    insert into public.shipping_addresses_v2 (
      order_id,
      recipient_name,
      phone,
      address_line,
      district,
      city,
      province,
      postal_code,
      notes
    )
    values (
      v_order_id,
      trim(p_shipping->>'recipient_name'),
      trim(p_shipping->>'phone'),
      trim(p_shipping->>'address_line'),
      nullif(trim(p_shipping->>'district'), ''),
      nullif(trim(p_shipping->>'city'), ''),
      nullif(trim(p_shipping->>'province'), ''),
      trim(p_shipping->>'postal_code'),
      nullif(trim(p_shipping->>'notes'), '')
    );

    insert into public.shipments_v2 (
      order_id,
      provider,
      courier_code,
      courier_service,
      shipping_cost_idr,
      status
    )
    values (
      v_order_id,
      null,
      null,
      null,
      0,
      'pending'
    );
  end if;

  return query
  select
    v_order_id,
    v_order_code,
    v_subtotal,
    v_shipping_cost,
    v_payment_fee,
    v_total,
    v_has_physical;
end;
$$;

revoke all on function public.create_order_v2(text, text, text, jsonb, jsonb)
from public, anon, authenticated;

grant execute on function public.create_order_v2(text, text, text, jsonb, jsonb)
to service_role;
