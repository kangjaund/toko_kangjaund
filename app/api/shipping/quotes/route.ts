import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { calculateDomesticShipping } from "@/lib/shipping/rajaongkir";

export const runtime = "nodejs";

type Item = {
  product_id: string;
  quantity: number;
};

function bad(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const destinationId = body.destination_id;
    const items = body.items;

    if (
      typeof destinationId !== "number" ||
      !Number.isInteger(destinationId) ||
      destinationId <= 0
    ) {
      return bad("Destination pengiriman belum dipilih.");
    }

    if (!Array.isArray(items) || items.length < 1 || items.length > 50) {
      return bad("Item keranjang tidak valid.");
    }

    const normalized: Item[] = [];
    const seen = new Set<string>();

    for (const raw of items) {
      if (!raw || typeof raw !== "object") return bad("Item keranjang tidak valid.");
      const item = raw as Record<string, unknown>;

      if (
        typeof item.product_id !== "string" ||
        item.product_id.trim() === "" ||
        typeof item.quantity !== "number" ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 99
      ) {
        return bad("Item keranjang tidak valid.");
      }

      const id = item.product_id.trim();
      if (seen.has(id)) return bad("Produk yang sama tidak boleh dikirim dua kali.");
      seen.add(id);
      normalized.push({ product_id: id, quantity: item.quantity });
    }

    const supabase = createServiceRoleClient();
    const ids = normalized.map((item) => item.product_id);

    const { data: products, error } = await supabase
      .from("products")
      .select("id,title,product_type,weight_grams,is_active")
      .in("id", ids);

    if (error) {
      console.error("Shipping product lookup error:", error);
      return NextResponse.json(
        { ok: false, error: "Gagal membaca data produk." },
        { status: 500 }
      );
    }

    if (!products || products.length !== ids.length) {
      return bad("Ada produk dalam keranjang yang tidak tersedia.");
    }

    let weightGrams = 0;
    let hasPhysical = false;

    for (const item of normalized) {
      const product = products.find((p) => p.id === item.product_id);

      if (!product || !product.is_active) {
        return bad("Ada produk dalam keranjang yang tidak tersedia.");
      }

      if (product.product_type !== "physical") continue;

      hasPhysical = true;

      if (
        !Number.isInteger(product.weight_grams) ||
        Number(product.weight_grams) <= 0
      ) {
        return bad(
          `Berat produk "${product.title}" belum diatur. Produk fisik tidak bisa menghitung ongkir sebelum berat diisi.`
        );
      }

      weightGrams += Number(product.weight_grams) * item.quantity;
    }

    if (!hasPhysical) {
      return bad("Keranjang ini tidak memiliki produk fisik.");
    }

    const quotes = await calculateDomesticShipping({
      destinationId,
      weightGrams,
    });

    return NextResponse.json({
      ok: true,
      origin: {
        label:
          process.env.RAJAONGKIR_ORIGIN_LABEL || "Tangerang Selatan, Banten",
      },
      package: {
        weightGrams,
      },
      quotes,
    });
  } catch (error) {
    console.error("POST /api/shipping/quotes error:", error);

    const message =
      error instanceof Error ? error.message : "Gagal menghitung ongkir.";

    const known =
      message.includes("RAJAONGKIR_") ||
      message.includes("Destination ID") ||
      message.includes("Berat paket");

    return NextResponse.json(
      {
        ok: false,
        error: known ? message : "Gagal menghitung ongkir. Silakan coba lagi.",
      },
      { status: known ? 400 : 502 }
    );
  }
}
