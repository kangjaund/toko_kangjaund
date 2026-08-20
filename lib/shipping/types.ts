export interface ShippingQuote { courierCode:string; courierService:string; courierDescription:string; costIdr:number; etd:string|null; }
export interface ShippingProvider { quote(input:{originCityId:string;destination:{postalCode:string;cityId?:string;districtId?:string};weightGrams:number}):Promise<ShippingQuote[]>; }
