import { NextRequest, NextResponse } from "next/server";
import {
  createOrderV2,
  type CreateOrderInput,
} from "@/lib/ecommerce/order-engine";

export const runtime = "nodejs";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeItems(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) {
    throw new Error("Keranjang tidak valid.");
  }

  return value.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("Item keranjang tidak valid.");
    }

    const raw = item as Record<string, unknown>;
    const productId = raw.product_id;
    const quantity = raw.quantity;

    if (!isNonEmptyString(productId)) {
      throw new Error("Product ID tidak valid.");
    }

    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 99
    ) {
      throw new Error("Quantity tidak valid.");
    }

    return {
      product_id: productId.trim(),
      quantity,
    };
  });
}

function normalizeShipping(value: unknown) {
  if (value == null) return null;

  if (!value || typeof value !== "object") {
    throw new Error("Data pengiriman tidak valid.");
  }

  const raw = value as Record<string, unknown>;

  const required = [
    "recipient_name",
    "phone",
    "address_line",
    "postal_code",
  ] as const;

  for (const key of required) {
    if (!isNonEmptyString(raw[key])) {
      throw new Error("Data alamat pengiriman belum lengkap.");
    }
  }

  return {
    recipient_name: String(raw.recipient_name).trim(),
    phone: String(raw.phone).trim(),
    address_line: String(raw.address_line).trim(),
    district: isNonEmptyString(raw.district)
      ? String(raw.district).trim()
      : undefined,
    city: isNonEmptyString(raw.city)
      ? String(raw.city).trim()
      : undefined,
    province: isNonEmptyString(raw.province)
      ? String(raw.province).trim()
      : undefined,
    postal_code: String(raw.postal_code).trim(),
    notes: isNonEmptyString(raw.notes)
      ? String(raw.notes).trim()
      : undefined,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    const buyerEmail = body.buyer_email;
    const buyerName = body.buyer_name;
    const buyerWhatsapp = body.buyer_whatsapp;

    if (!isNonEmptyString(buyerEmail) || !isValidEmail(buyerEmail.trim())) {
      return NextResponse.json(
        { ok: false, error: "Email pembeli tidak valid." },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(buyerName) || buyerName.trim().length < 2) {
      return NextResponse.json(
        { ok: false, error: "Nama pembeli wajib diisi." },
        { status: 400 }
      );
    }

    if (
      !isNonEmptyString(buyerWhatsapp) ||
      buyerWhatsapp.trim().length < 8
    ) {
      return NextResponse.json(
        { ok: false, error: "Nomor WhatsApp tidak valid." },
        { status: 400 }
      );
    }

    const input: CreateOrderInput = {
      buyer_email: buyerEmail.trim(),
      buyer_name: buyerName.trim(),
      buyer_whatsapp: buyerWhatsapp.trim(),
      items: normalizeItems(body.items),
      shipping: normalizeShipping(body.shipping),
    };

    const result = await createOrderV2(input);

    return NextResponse.json(
      {
        ok: true,
        order: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/orders-v2 error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Pesanan tidak dapat dibuat. Silakan coba lagi.";

    const clientSafeErrors = [
      "Keranjang tidak valid.",
      "Item keranjang tidak valid.",
      "Product ID tidak valid.",
      "Quantity tidak valid.",
      "Data pengiriman tidak valid.",
      "Data alamat pengiriman belum lengkap.",
      "Email pembeli tidak valid.",
      "Nama pembeli wajib diisi.",
      "Nomor WhatsApp tidak valid.",
      "Produk tidak tersedia.",
      "Keranjang kosong.",
      "Quantity harus antara 1 dan 99.",
    ];

    const isKnownClientError =
      clientSafeErrors.includes(message) ||
      message.startsWith("Stok ") ||
      message.startsWith("Produk ");

    return NextResponse.json(
      {
        ok: false,
        error: isKnownClientError
          ? message
          : "Pesanan tidak dapat dibuat. Silakan coba lagi.",
      },
      { status: isKnownClientError ? 400 : 500 }
    );
  }
}
