import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase
    .from("profile")
    .select("qris_image_url")
    .limit(1)
    .single();

  if (!profile?.qris_image_url) {
    return NextResponse.json({ error: "QRIS belum diatur" }, { status: 404 });
  }

  const imageRes = await fetch(profile.qris_image_url);
  if (!imageRes.ok) {
    return NextResponse.json({ error: "Gagal mengambil gambar QRIS" }, { status: 500 });
  }

  const contentType = imageRes.headers.get("content-type") || "image/png";
  const buffer = await imageRes.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": 'attachment; filename="qris-toko-kang-jaund.png"',
    },
  });
}
