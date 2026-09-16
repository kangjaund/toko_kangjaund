import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { sendBuyerDownloadEmail } from "@/lib/email";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    // 1. Verifikasi autentikasi user
    const supabaseUser = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId wajib disertakan." }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // 2. Ambil detail pesanan & produk
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, order_code, product_id, buyer_name, buyer_email, amount_idr, status, download_token, products(title, stock_qty)"
      )
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    const token = order.download_token || randomUUID();
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);

    // 3. Update status pesanan jadi "paid"
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "paid",
        download_token: token,
        download_token_expires_at: expires.toISOString(),
        paid_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      return NextResponse.json(
        { error: `Gagal memperbarui status: ${updateError.message}` },
        { status: 500 }
      );
    }

    // 4. Kurangi stok produk jika ada batasan stok
    const product = order.products as unknown as {
      title: string;
      stock_qty: number | null;
    } | null;

    if (product && product.stock_qty !== null && product.stock_qty > 0) {
      await supabase
        .from("products")
        .update({ stock_qty: product.stock_qty - 1 })
        .eq("id", order.product_id);
    }

    // 5. Susun link download
    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://toko-kangjaund.vercel.app";
    const downloadUrl = `${origin}/api/download/${token}`;

    // 6. Kirim email konfirmasi ke pembeli
    const emailResult = await sendBuyerDownloadEmail({
      orderCode: order.order_code,
      productTitle: product?.title || "Produk Digital",
      amountIdr: order.amount_idr,
      buyerName: order.buyer_name || "",
      buyerEmail: order.buyer_email,
      downloadUrl,
    });

    return NextResponse.json({
      ok: true,
      downloadToken: token,
      downloadUrl,
      emailSent: emailResult.success,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Gagal mengonfirmasi pesanan:", message);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
