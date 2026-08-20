import type { ShippingDestination, ShippingQuote } from "@/lib/shipping/types";

const BASE_URL = "https://rajaongkir.komerce.id/api/v1";

const DEFAULT_COURIERS = [
  "jne",
  "jnt",
  "sicepat",
  "anteraja",
  "ninja",
  "tiki",
  "pos",
].join(":");

function getApiKey() {
  const key = process.env.RAJAONGKIR_API_KEY;
  if (!key) {
    throw new Error("RAJAONGKIR_API_KEY belum dikonfigurasi di server.");
  }
  return key;
}

function getOriginId() {
  const value = process.env.RAJAONGKIR_ORIGIN_ID;
  if (!value) {
    throw new Error(
      "RAJAONGKIR_ORIGIN_ID belum dikonfigurasi. Gunakan endpoint destination search untuk menemukan ID Tangerang Selatan."
    );
  }

  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("RAJAONGKIR_ORIGIN_ID tidak valid.");
  }
  return id;
}

function getCouriers() {
  return process.env.RAJAONGKIR_COURIERS?.trim() || DEFAULT_COURIERS;
}

async function rajaFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      key: getApiKey(),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("RajaOngkir HTTP error", response.status, body);
    throw new Error("RajaOngkir gagal memproses permintaan.");
  }

  if (!body?.meta || body.meta.status !== "success") {
    console.error("RajaOngkir API error", body);
    throw new Error(body?.meta?.message || "RajaOngkir mengembalikan error.");
  }

  return body as T;
}

type DestinationResponse = {
  meta: { status: string; code: number; message: string };
  data: Array<{
    id: number;
    label?: string;
    province_name?: string;
    city_name?: string;
    district_name?: string;
    subdistrict_name?: string;
    zip_code?: string;
  }>;
};

export async function searchDomesticDestinations(
  query: string,
  limit = 20
): Promise<ShippingDestination[]> {
  const q = query.trim();
  if (q.length < 2) {
    throw new Error("Pencarian tujuan minimal 2 karakter.");
  }

  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const url = new URL(`${BASE_URL}/destination/domestic-destination`);
  url.searchParams.set("search", q);
  url.searchParams.set("limit", String(safeLimit));
  url.searchParams.set("offset", "0");

  const result = await rajaFetch<DestinationResponse>(url.toString());

  return (result.data ?? []).map((item) => ({
    id: item.id,
    label:
      item.label ||
      [
        item.subdistrict_name,
        item.district_name,
        item.city_name,
        item.province_name,
        item.zip_code,
      ]
        .filter(Boolean)
        .join(", "),
    province: item.province_name ?? null,
    city: item.city_name ?? null,
    district: item.district_name ?? null,
    subdistrict: item.subdistrict_name ?? null,
    zipCode: item.zip_code ?? null,
  }));
}

type CostResponse = {
  meta: { status: string; code: number; message: string };
  data: Array<{
    code?: string;
    name?: string;
    service?: string;
    description?: string;
    cost?: number;
    etd?: string;
  }>;
};

export async function calculateDomesticShipping(input: {
  destinationId: number;
  weightGrams: number;
  courier?: string;
}): Promise<ShippingQuote[]> {
  const originId = getOriginId();

  if (!Number.isInteger(input.destinationId) || input.destinationId <= 0) {
    throw new Error("Destination ID tidak valid.");
  }

  if (
    !Number.isInteger(input.weightGrams) ||
    input.weightGrams < 1 ||
    input.weightGrams > 300000
  ) {
    throw new Error("Berat paket harus antara 1 gram dan 300 kg.");
  }

  const form = new URLSearchParams();
  form.set("origin", String(originId));
  form.set("destination", String(input.destinationId));
  form.set("weight", String(input.weightGrams));
  form.set("courier", input.courier?.trim() || getCouriers());
  form.set("price", "lowest");

  const result = await rajaFetch<CostResponse>(
    `${BASE_URL}/calculate/domestic-cost`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    }
  );

  return (result.data ?? [])
    .filter((item) => Number.isFinite(Number(item.cost)) && Number(item.cost) >= 0)
    .map((item) => ({
      courierCode: item.code ?? "",
      courierName: item.name ?? item.code ?? "",
      courierService: item.service ?? "",
      courierDescription: item.description ?? "",
      costIdr: Number(item.cost),
      etd: item.etd ?? null,
    }));
}

export function getShippingOriginLabel() {
  return process.env.RAJAONGKIR_ORIGIN_LABEL || "Tangerang Selatan, Banten";
}
