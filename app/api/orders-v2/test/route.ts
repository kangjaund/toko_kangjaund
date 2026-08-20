import { NextRequest, NextResponse } from "next/server";

import { POST as createOrder } from "../route";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const testRequest = new NextRequest(
    new URL("/api/orders-v2", request.url),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        product_id: "658457e1-bd79-4f60-8f57-affeb6e9595c",
        quantity: 1,
        buyer_email: "beta-test@example.com",
        buyer_name: "Beta Test Buyer",
        buyer_whatsapp: "080000000000",
        destination_id: 73492,
        recipient_name: "Beta Test Buyer",
        recipient_phone: "080000000000",
        address_line: "Alamat dummy — JANGAN DIKIRIM",
        district: "Serpong",
        city: "Tangerang Selatan",
        province: "Banten",
        postal_code: "15311",
        notes: "TEST ORDER — JANGAN DIPROSES / JANGAN DIKIRIM",
        courier_code: "anteraja",
        courier_name: "AnterAja",
        courier_service: "ECO",
        courier_description: "Test order",
        courier_etd: null,
      }),
    }
  );

  const response = await createOrder(testRequest);
  const data = await response.json();

  return NextResponse.json(
    {
      ...data,
      warning:
        "THIS IS A TEST ORDER. Do not fulfill, ship, or request payment.",
    },
    { status: response.status }
  );
}
