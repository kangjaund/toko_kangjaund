import { createServiceRoleClient } from "@/lib/supabase/server";

export type OrderItemInput = {
  product_id: string;
  quantity: number;
};

export type ShippingInput = {
  recipient_name: string;
  phone: string;
  address_line: string;
  district?: string;
  city?: string;
  province?: string;
  postal_code: string;
  notes?: string;
};

export type CreateOrderInput = {
  buyer_email: string;
  buyer_name: string;
  buyer_whatsapp: string;
  items: OrderItemInput[];
  shipping?: ShippingInput | null;
};

export type CreateOrderResult = {
  orderId: string;
  orderCode: string;
  subtotalIdr: number;
  shippingCostIdr: number;
  paymentFeeIdr: number;
  totalIdr: number;
  hasPhysicalItems: boolean;
};

export async function createOrderV2(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase.rpc("create_order_v2", {
    p_buyer_email: input.buyer_email,
    p_buyer_name: input.buyer_name,
    p_buyer_whatsapp: input.buyer_whatsapp,
    p_items: input.items,
    p_shipping: input.shipping ?? null,
  });

  if (error) {
    console.error("create_order_v2 RPC error:", error);
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    throw new Error("Pesanan tidak dapat dibuat. Silakan coba lagi.");
  }

  return {
    orderId: row.order_id,
    orderCode: row.order_code,
    subtotalIdr: Number(row.subtotal_idr),
    shippingCostIdr: Number(row.shipping_cost_idr),
    paymentFeeIdr: Number(row.payment_fee_idr),
    totalIdr: Number(row.total_idr),
    hasPhysicalItems: Boolean(row.has_physical_items),
  };
}
