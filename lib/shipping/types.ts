export interface ShippingQuote {
  courierCode: string;
  courierName: string;
  courierService: string;
  courierDescription: string;
  costIdr: number;
  etd: string | null;
}

export interface ShippingDestination {
  id: number;
  label: string;
  province: string | null;
  city: string | null;
  district: string | null;
  subdistrict: string | null;
  zipCode: string | null;
}

export interface ShippingProvider {
  quote(input: {
    destinationId: number;
    weightGrams: number;
    courier?: string;
  }): Promise<ShippingQuote[]>;
}
