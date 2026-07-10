import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createServiceRoleClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, download_token_expires_at, product_id, download_count")
    .eq("download_token", token)
    .single();

  if (!order || order.status !== "paid") {
    return NextResponse.json({ error: "Link tidak valid" }, { status: 404 });
  }

  if (new Date(order.download_token_expires_at) < new Date()) {
    return NextResponse.json(
      { error: "Link download sudah kedaluwarsa. Hubungi penjual untuk link baru." },
      { status: 410 }
    );
  }

  const { data: product } = await supabase
    .from("products")
    .select("file_path, title")
    .eq("id", order.product_id)
    .single();

  if (!product) {
    return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
  }

  // Buat signed URL sementara (5 menit) langsung dari bucket PRIVATE "products"
  const { data: signed, error } = await supabase.storage
    .from("products")
    .createSignedUrl(product.file_path, 60 * 5);

  if (error || !signed) {
    return NextResponse.json({ error: "Gagal menyiapkan file" }, { status: 500 });
  }

  // Catat berapa kali sudah didownload (opsional, buat monitoring)
  await supabase
    .from("orders")
    .update({ download_count: (order.download_count ?? 0) + 1 })
    .eq("id", order.id);

  return NextResponse.redirect(signed.signedUrl);
}
