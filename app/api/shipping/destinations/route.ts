import { NextRequest, NextResponse } from "next/server";
import { searchDomesticDestinations } from "@/lib/shipping/rajaongkir";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q") || "";
    const destinations = await searchDomesticDestinations(q);

    return NextResponse.json({
      ok: true,
      destinations,
    });
  } catch (error) {
    console.error("GET /api/shipping/destinations error:", error);

    const message =
      error instanceof Error ? error.message : "Gagal mencari tujuan pengiriman.";

    const safe =
      message.includes("minimal") || message.includes("belum dikonfigurasi");

    return NextResponse.json(
      {
        ok: false,
        error: safe ? message : "Gagal mencari tujuan pengiriman.",
      },
      { status: safe ? 400 : 502 }
    );
  }
}
