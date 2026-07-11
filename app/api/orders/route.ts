import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";
import { sendOrderNotificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const productSlug = formData.get("productSlug") as string | null;
    const buyerEmail = formData.get("buyerEmail") as string | null;
    const buyerName = formData.get("buyerName") as string | null;
    const buyerWhatsapp = formData.get("buyerWhatsapp") as string | null;
    const proofFile = formData.get("proofFile") as File | null;

    if (!productSlug || !buyerEmail || !proofFile) {
      return NextResponse.json(
        { error: "Email dan bukti transfer wajib diisi." },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Ambil harga dari DATABASE, bukan dari input browser
    const { data: product, error } = await supabase
      .from("products")
      .select("id, title, price_idr, is_active, stock_qty")
      .eq("slug", productSlug)
      .single();

    if (error || !product || !product.is_active) {
      return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
    }

    // Validasi stok di SERVER, bukan cuma di tampilan - supaya nggak bisa dilewati
    if (product.stock_qty !== null && product.stock_qty <= 0) {
      return NextResponse.json({ error: "Maaf, stok produk ini sudah habis." }, { status: 409 });
    }

    const orderCode = `ORD-${Date.now()}-${randomUUID().slice(0, 6)}`;
    const proofPath = `${orderCode}-${proofFile.name}`;

    const arrayBuffer = await proofFile.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(proofPath, Buffer.from(arrayBuffer), {
        contentType: proofFile.type || "image/jpeg",
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Gagal upload bukti transfer: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { error: insertError } = await supabase.from("orders").insert({
      order_code: orderCode,
      product_id: product.id,
      buyer_email: buyerEmail,
      buyer_name: buyerName ?? "",
      buyer_whatsapp: buyerWhatsapp ?? "",
      amount_idr: product.price_idr,
      proof_path: proofPath,
      status: "pending_review",
    });

    if (insertError) {
      return NextResponse.json({ error: "Gagal menyimpan pesanan" }, { status: 500 });
    }

    // Kirim notifikasi Telegram (opsional - kalau env var belum diisi, dilewati saja)
    // PENTING: pakai await, karena di serverless function, proses yang nggak ditunggu
    // bisa keputus di tengah jalan begitu response dikirim balik.
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      const text =
        `🛒 Pesanan baru!\n` +
        `Produk: ${productSlug}\n` +
        `Harga: Rp ${product.price_idr.toLocaleString("id-ID")}\n` +
        `Pembeli: ${buyerName || "-"} (${buyerEmail})\n` +
        `Kode: ${orderCode}\n\n` +
        `Cek & verifikasi di dashboard > Pesanan.`;

      try {
        const tgRes = await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text }),
          }
        );
        if (!tgRes.ok) {
          console.error("Telegram API error:", await tgRes.text());
        }
      } catch (err) {
        console.error("Gagal kirim notif Telegram:", err);
      }
    }

    // Kirim email notifikasi ke email SENDIRI, subject terstruktur "Pesanan Baru #ORD-xxx"
    // - dipakai buat trigger otomasi (n8n/Hermes) nanti, terpisah dari email pembeli.
    try {
      await sendOrderNotificationEmail({
        orderCode,
        productTitle: product.title,
        amountIdr: product.price_idr,
        buyerName: buyerName ?? "",
        buyerEmail,
        buyerWhatsapp: buyerWhatsapp ?? "",
      });
    } catch (err) {
      console.error("Gagal kirim email notifikasi:", err);
    }

    return NextResponse.json({ orderCode });
  } catch (err) {
    console.error("Order error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
