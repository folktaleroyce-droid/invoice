export enum RoomType {
  STANDARD = 'Standard',
  DOUBLE = 'Double',
  DOUBLE_EXECUTIVE = 'Double Executive',
  STUDIO = 'Studio',
  AURA_STUDIO = 'Aura Studio (Studio Executive)',
  SERENITY_SUITES = 'Serenity Suites (Junior Suite)',
  ILE_IFE_SUITE = 'Ile-Ife Suite (Presidential Suite)',
}

export enum PaymentMethod {
  CASH = 'Cash',
  POS = 'POS',
  BANK_TRANSFER = 'Bank Transfer',
  OTHER = 'Other',
}

export interface AdditionalChargeItem {
  id: string;
  description: string;
  amount: number;
}

export interface InvoiceData {
  receiptNo: string;
  date: string;
  guestName: string;
  guestEmail: string;
  phoneContact: string;
  roomType: RoomType;
  nights: number;
  ratePerNight: number;
  roomCharge: number;
  additionalChargeItems: AdditionalChargeItem[];
  additionalCharges: number;
  discount: number;
  subtotal: number;
  taxPercentage: number;
  taxAmount: number;
  amountReceived: number;
  amountInWords: string;
  paymentPurpose: string;
  paymentMethod: PaymentMethod;
  receivedBy: string;
  designation: string;
  currency: 'NGN' | 'USD';
}