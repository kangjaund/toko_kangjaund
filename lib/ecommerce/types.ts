export type ProductType = "digital" | "physical";
export type OrderStatus = "pending_payment" | "paid" | "processing" | "shipped" | "completed" | "cancelled" | "expired" | "refunded";
export interface CheckoutLineInput { productId: string; quantity: number; }
export interface BuyerInput { name: string; email: string; whatsapp: string; }
export interface ShippingInput { recipientName: string; phone: string; addressLine: string; district?: string; city?: string; province?: string; postalCode: string; notes?: string; }
