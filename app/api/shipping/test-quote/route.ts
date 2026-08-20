import { NextRequest, NextResponse } from "next/server";

import { POST as shippingQuotesPost } from "../quotes/route";

export const runtime = "nodejs";

export async function GET() {
  const request = new NextRequest(
    "http://localhost/api/shipping/quotes",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        destination_id: 73492,
        items: [
          {
            product_id: "658457e1-bd79-4f60-8f57-affeb6e9595c",
            quantity: 1,
          },
        ],
      }),
    }
  );

  const response = await shippingQuotesPost(request);
  const data = await response.json();

  return NextResponse.json(data, { status: response.status });
}
