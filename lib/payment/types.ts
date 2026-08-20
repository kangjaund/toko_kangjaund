export interface PaymentCreateInput { orderCode:string; amountIdr:number; customer:{name:string;email:string;whatsapp:string}; }
export interface PaymentCreateResult { provider:string; providerTransactionId:string; paymentMethod:string; amountIdr:number; qrString:string; qrImageUrl?:string|null; expiresAt:string; }
