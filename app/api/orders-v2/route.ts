import { NextRequest, NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";

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
    if (!body.buyer_email?.trim()) return fail("buyer_email wajib diisi.");
    if (!body.buyer_name?.trim()) return fail("buyer_name wajib diisi.");
    if (!body.destination_id) return fail("destination_id wajib diisi.");
    if (!body.courier_code || !body.courier_service) {
      return fail("Courier dan service wajib dipilih.");
    }
    if (!body.recipient_name?.trim() || !body.recipient_phone?.trim()) {
      return fail("Nama dan nomor penerima wajib diisi.");
    }
    if (!body.address_line?.trim()) {
      return fail("Alamat lengkap wajib diisi.");
    }

    // This is a server-side order route. It uses the service-role client
    // because create_order_v2_atomic is intentionally executable only by
    // service_role. The service-role key never reaches the browser.
    const supabase = createServiceRoleClient();

    // Product is authoritative on the server.
    const { data: product, error: productError } = await supabase
      .from("products")
      .select(
        "id, title, price_idr, stock_qty, is_active, product_type, weight_grams"
      )
      .eq("id", body.product_id)
      .eq("is_active", true)
      .single();

    if (productError || !product) {
      console.error("orders-v2 product lookup error", {
        code: productError?.code,
        message: productError?.message,
        details: productError?.details,
        hint: productError?.hint,
      });
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

    // Recalculate shipping on the server. Browser-provided shipping price
    // is intentionally ignored.
    const quoteUrl = new URL("/api/shipping/quotes", request.url);
    const quoteRequest = new NextRequest(quoteUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
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

    // Atomic DB write: order + shipping address + item either all commit
    // or all roll back.
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "create_order_v2_atomic",
      {
        p_buyer_email: body.buyer_email.trim().toLowerCase(),
        p_buyer_name: body.buyer_name.trim(),
        p_buyer_whatsapp: body.buyer_whatsapp?.trim() || "",
        p_subtotal_idr: subtotal,
        p_shipping_cost_idr: shippingCost,
        p_payment_fee_idr: paymentFee,
        p_total_idr: total,
        p_product_id: product.id,
        p_product_title: product.title,
        p_unit_price_idr: unitPrice,
        p_quantity: quantity,
        p_weight_grams: weight,
        p_destination_id: body.destination_id,
        p_recipient_name: body.recipient_name.trim(),
        p_recipient_phone: body.recipient_phone.trim(),
        p_address_line: body.address_line.trim(),
        p_district: body.district?.trim() || "",
        p_city: body.city?.trim() || "",
        p_province: body.province?.trim() || "",
        p_postal_code: body.postal_code?.trim() || "",
        p_notes: body.notes?.trim() || "",
        p_courier_code: selectedQuote.courierCode,
        p_courier_name: selectedQuote.courierName,
        p_courier_service: selectedQuote.courierService,
        p_courier_description: selectedQuote.courierDescription ?? "",
        p_courier_etd: selectedQuote.etd ?? "",
      }
    );

    if (rpcError || !rpcResult) {
      console.error("create_order_v2_atomic error", {
        code: rpcError?.code,
        message: rpcError?.message,
        details: rpcError?.details,
        hint: rpcError?.hint,
      });

      return fail("Gagal membuat order secara atomik.", 500);
    }

    return NextResponse.json({
      ok: true,
      order_id: rpcResult.order_id,
      order_code: rpcResult.order_code,
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
