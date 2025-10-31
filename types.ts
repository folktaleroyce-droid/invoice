// FIX: Removed an incorrect circular import of `WalkInService` and `Staff`.
// These types are defined within this same file and should not be imported.

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

// The Staff enum is removed as authentication is now handled by a predefined list in the LoginScreen.

export interface AdditionalChargeItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
}

export interface InvoiceData {
  receiptNo: string;
  date: string;
  guestName: string;
  guestEmail: string;
  phoneContact: string;
  roomNumber: string;
  arrivalDate: string;
  departureDate: string;
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
  totalAmountDue: number;
  amountReceived: number;
  balance: number;
  amountInWords: string;
  paymentPurpose: string;
  paymentMethod: PaymentMethod;
  receivedBy: string;
  designation: string;
  currency: 'NGN' | 'USD';
}

// New additions for Walk-in Guest Feature
export enum WalkInService {
  RESTAURANT = 'Restaurant',
  BAR = 'Bar',
  GYM = 'Gym',
  SWIMMING_POOL = 'Swimming Pool',
  OTHER = 'Other',
}

export interface WalkInChargeItem {
  id: string;
  date: string;
  service: WalkInService;
  otherServiceDescription?: string;
  amount: number;
  paymentMethod: PaymentMethod;
}

export interface WalkInTransaction {
  id: string;
  transactionDate: string;
  charges: WalkInChargeItem[];
  currency: 'NGN' | 'USD';
  subtotal: number;
  discount: number;
  amountPaid: number;
  balance: number;
  cashier: string;
  paymentMethod: PaymentMethod;
}

export interface RecordedTransaction {
  id: string; // receiptNo from InvoiceData or id from WalkInTransaction
  type: 'Hotel Stay' | 'Walk-In';
  date: string;
  guestName: string; // guestName or "Walk-In Guest"
  amount: number; // totalAmountDue or (subtotal - discount)
  currency: 'NGN' | 'USD';
  data: InvoiceData | WalkInTransaction;
}