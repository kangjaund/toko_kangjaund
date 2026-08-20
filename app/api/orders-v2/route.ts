import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type Body = {
  product_id?: string;
  quantity?: number;
  buyer_email?: string;
  buyer_name?: string;
  buyer_whatsapp?: string;
  destination_id?: number;
  recipient_name?: string;
  recipient_phone?: string;
  address_line?: string;
  district?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  notes?: string;
  courier_code?: string;
  courier_name?: string;
  courier_service?: string;
  courier_description?: string;
  courier_etd?: string | null;
};

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;

    if (!body.product_id) return fail("product_id wajib diisi.");

    const quantity = Number(body.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return fail("quantity tidak valid.");
    }

    if (!body.buyer_email?.trim()) {
      return fail("buyer_email wajib diisi.");
    }

    if (!body.buyer_name?.trim()) {
      return fail("buyer_name wajib diisi.");
    }

    if (!body.destination_id) {
      return fail("destination_id wajib diisi untuk order physical.");
    }

    if (!body.courier_code || !body.courier_service) {
      return fail("Courier dan service wajib dipilih.");
    }

    if (!body.recipient_name?.trim() || !body.recipient_phone?.trim()) {
      return fail("Nama dan nomor penerima wajib diisi.");
    }

    if (!body.address_line?.trim()) {
      return fail("Alamat lengkap wajib diisi.");
    }

    const supabase = await createClient();

    // Server-side authoritative product lookup.
    const { data: product, error: productError } = await supabase
      .from("products")
      .select(
        "id, title, price_idr, stock_qty, is_active, product_type, weight_grams"
      )
      .eq("id", body.product_id)
      .eq("is_active", true)
      .single();

    if (productError || !product) {
      return fail("Produk tidak ditemukan atau tidak aktif.", 404);
    }

    if (product.product_type !== "physical") {
      return fail("Endpoint ini hanya untuk produk physical.");
    }

    if (
      product.stock_qty !== null &&
      product.stock_qty !== undefined &&
      product.stock_qty < quantity
    ) {
      return fail("Stok produk tidak mencukupi.", 409);
    }

    const unitPrice = Number(product.price_idr);
    const weight = Number(product.weight_grams ?? 0);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return fail("Harga produk tidak valid.", 500);
    }

    if (!Number.isFinite(weight) || weight <= 0) {
      return fail("Berat produk belum dikonfigurasi.", 500);
    }

    /*
     * IMPORTANT:
     * This first Order Engine implementation does NOT trust a shipping
     * price sent by the browser.
     *
     * The existing /api/shipping/quotes endpoint remains the authoritative
     * shipping calculator. The browser must send only the selected courier
     * identity. We fetch quotes server-side and find the requested service.
     */
    const quoteUrl = new URL("/api/shipping/quotes", request.url);

    const quoteRequest = new NextRequest(quoteUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        destination_id: body.destination_id,
        items: [{ product_id: product.id, quantity }],
      }),
    });

    const quoteResponse = await (
      await import("@/app/api/shipping/quotes/route")
    ).POST(quoteRequest);

    const quoteData = await quoteResponse.json();

    if (!quoteResponse.ok || !quoteData.ok) {
      return fail(
        quoteData.error ?? "Gagal memvalidasi ongkir.",
        quoteResponse.status || 502
      );
    }

    const selectedQuote = Array.isArray(quoteData.quotes)
      ? quoteData.quotes.find(
          (quote: {
            courierCode?: string;
            courierService?: string;
          }) =>
            quote.courierCode === body.courier_code &&
            quote.courierService === body.courier_service
        )
      : null;

    if (!selectedQuote) {
      return fail(
        "Layanan pengiriman yang dipilih sudah tidak tersedia. Silakan pilih ulang.",
        409
      );
    }

    const shippingCost = Number(selectedQuote.costIdr);

    if (!Number.isFinite(shippingCost) || shippingCost < 0) {
      return fail("Biaya pengiriman dari provider tidak valid.", 502);
    }

    const subtotal = unitPrice * quantity;
    const paymentFee = 0;
    const total = subtotal + shippingCost + paymentFee;

    /*
     * Snapshot the transaction.
     *
     * NOTE:
     * We intentionally do not accept price/subtotal/shipping/total from
     * the browser. All financial values below are server-calculated.
     */

    const { data: shippingAddress, error: addressError } = await supabase
      .from("shipping_addresses_v2")
      .insert({
        destination_id: body.destination_id,
        recipient_name: body.recipient_name.trim(),
        phone: body.recipient_phone.trim(),
        address_line: body.address_line.trim(),
        district: body.district?.trim() || null,
        city: body.city?.trim() || null,
        province: body.province?.trim() || null,
        postal_code: body.postal_code?.trim() || null,
        notes: body.notes?.trim() || null,
        courier_code: selectedQuote.courierCode,
        courier_name: selectedQuote.courierName,
        courier_service: selectedQuote.courierService,
        courier_description: selectedQuote.courierDescription ?? null,
        courier_etd: selectedQuote.etd ?? null,
      })
      .select("id")
      .single();

    if (addressError || !shippingAddress) {
      console.error("shipping_addresses_v2 insert error", addressError);
      return fail("Gagal menyimpan alamat pengiriman.", 500);
    }

    const { data: order, error: orderError } = await supabase
      .from("orders_v2")
      .insert({
        buyer_email: body.buyer_email.trim().toLowerCase(),
        buyer_name: body.buyer_name.trim(),
        buyer_whatsapp: body.buyer_whatsapp?.trim() || null,
        subtotal_idr: subtotal,
        shipping_cost_idr: shippingCost,
        payment_fee_idr: paymentFee,
        total_idr: total,
        status: "pending",
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("orders_v2 insert error", orderError);
      return fail("Gagal membuat order.", 500);
    }

    const { error: itemError } = await supabase
      .from("order_items_v2")
      .insert({
        order_id: order.id,
        product_id: product.id,
        product_title: product.title,
        unit_price_idr: unitPrice,
        quantity,
        line_total_idr: subtotal,
        weight_grams: weight,
      });

    if (itemError) {
      console.error("order_items_v2 insert error", itemError);
      return fail(
        "Order header berhasil dibuat tetapi item gagal disimpan. Hubungi administrator.",
        500
      );
    }

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      subtotal_idr: subtotal,
      shipping_cost_idr: shippingCost,
      payment_fee_idr: paymentFee,
      total_idr: total,
      shipping: {
        destination_id: body.destination_id,
        courier_code: selectedQuote.courierCode,
        courier_name: selectedQuote.courierName,
        courier_service: selectedQuote.courierService,
        courier_description: selectedQuote.courierDescription ?? null,
        etd: selectedQuote.etd ?? null,
      },
      snapshot: {
        product_id: product.id,
        product_title: product.title,
        quantity,
        unit_price_idr: unitPrice,
        weight_grams: weight,
      },
    });
  } catch (error) {
    console.error("POST /api/orders-v2 error", error);
    return fail("Terjadi kesalahan server.", 500);
  }
}
