import React, { useState, useEffect, ReactNode, useMemo, Component } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ERROR BOUNDARY
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
interface ErrorBoundaryProps { children?: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: Error | null; }

/* Fixed: Use React.Component explicitly to ensure correct property inheritance for 'props' which was previously missing in the class type definition */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 text-white">
          <div className="bg-[#1e293b] p-10 rounded-3xl shadow-2xl max-w-lg w-full border-2 border-red-500/30 text-center">
            <h1 className="text-3xl font-black text-red-500 mb-4 uppercase">System Error</h1>
            <p className="text-white/60 mb-6">{this.state.error?.message}</p>
            <button 
              onClick={() => { localStorage.clear(); window.location.reload(); }} 
              className="w-full bg-[#c4a66a] text-white py-4 rounded-2xl font-black uppercase tracking-widest"
            >
              Reboot Terminal
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// DATA MODELS & CONSTANTS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const HOTEL_ADDRESS = "38 S.O. Williams Street, Utako, Abuja.";
const TAGLINE = "where boldness meets elegance";

const ZENITH_ACCOUNT = {
  bank: "Zenith Bank",
  accountNumber: "1311027935",
  accountName: "Tidé Hotels and Resort"
};

const MONIEPOINT_ACCOUNT = {
  bank: "Moniepoint",
  accountNumber: "5169200615",
  accountName: "Tidé Hotels and Resorts"
};

const DOCKET_ACCOUNT_DETAILS_2 = {
  bank: "Suntrust Bank",
  accountNumber: "9990000647",
  accountName: "Tidé Hotels and Resorts"
};

export enum RoomType {
  SOJOURN_ROOM = 'The Sojourn Room (Standard)',
  TRANQUIL_ROOM = 'The Tranquil Room (Double)',
  HARMONY_STUDIO = 'The Harmony Studio (Double Deluxe)',
  SERENITY_STUDIO = 'The Serenity Studio (Executive Room)',
  NARRATIVE_SUITE = 'The Narrative Suite (Business Suite)',
  ODYSSEY_SUITE = 'The Odyssey Suite (Executive Suite)',
  TIDE_SIGNATURE_SUITE = 'The Tidé Signature Suite (Presidential)',
}

export enum PaymentMethod { CASH = 'Cash', POS = 'POS', TRANSFER = 'Bank Transfer', CHEQUE = 'Cheque' }

export enum IDType {
  NIN = 'NIN',
  PASSPORT = 'International Passport',
  DRIVERS = 'Drivers License',
  VOTERS = 'Voters Card',
  STUDENT = 'Student ID',
  OTHER = 'Other'
}

export interface BookingRoom {
  id: string;
  roomType: RoomType;
  description?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  ratePerNight: number;
  quantity: number;
}

export interface ExtraCharge {
  id: string;
  description: string;
  amount: number;
}

export interface PaymentEntry { id: string; amount: number; method: PaymentMethod; reference?: string; }
export interface POSItem { description: string; amount: number; quantity: number; category?: string; }

export interface Transaction {
  id: string;
  type: 'RESERVATION' | 'WALK-IN';
  date: string;
  account: string; 
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  guestIDType?: IDType;
  guestIDNumber?: string;
  roomNumber?: string;
  rooms?: BookingRoom[];
  items?: POSItem[];
  extraCharges?: ExtraCharge[];
  subtotal: number;
  serviceCharge: number;
  vat: number;
  discount: number;
  totalDue: number;
  payments: PaymentEntry[];
  totalPaid: number;
  balance: number;
  cashier: string;
  scPerc?: number;
  vatPerc?: number;
  team?: string;
}

const MENU_DATA: Record<string, { name: string; price: number }[]> = {
  "Food - Breakfast": [
    { name: "English Breakfast", price: 14000 },
    { name: "Fluffy Pancakes with Eggs & Sausages", price: 13000 },
    { name: "Custard & Akara", price: 9000 },
    { name: "Nigerian Breakfast", price: 10000 },
    { name: "Waffles with Eggs & Grilled Sausages", price: 14000 },
    { name: "Steamed or Baked Potatoes with Egg Sauce", price: 11500 },
    { name: "Breakfast Quesadillas", price: 14500 },
    { name: "Omelette & Toast", price: 10000 },
    { name: "Liver & Kidney Sauce with roasted potatoes", price: 11500 },
    { name: "Porridge Oats with Milk & Fruit Topping", price: 9500 }
  ],
  "Food - Lunch & Dinner": [
    { name: "Chicken Jambalaya", price: 23500 },
    { name: "Orange-Glazed Grilled Chicken & Rice", price: 13000 },
    { name: "Grilled Nile Perch Fillet", price: 27500 },
    { name: "Penne in Arrabbiata Sauce", price: 28000 },
    { name: "Penne Alfredo (Chicken or Shrimp)", price: 29000 },
    { name: "Seafood Stir-Fry with Rice", price: 29500 },
    { name: "Fried rice", price: 18000 },
    { name: "Jollof Rice", price: 16000 },
    { name: "Coconut Rice", price: 18000 },
    { name: "Spaghetti Bolognese", price: 11000 },
    { name: "Beef or Chicken Stroganoff", price: 29000 },
    { name: "Goat Ragu & Fried Yam", price: 20000 },
    { name: "Chicken Stir-Fry with Rice", price: 22000 },
    { name: "Beef Stir-fry with Rice", price: 22900 },
    { name: "Mixed (Chicken and beef) stir-Fry Rice", price: 25500 }
  ],
  "Food - Salads & Soups": [
    { name: "Greek Salad", price: 10000 },
    { name: "Garden salad", price: 12000 },
    { name: "Grilled chicken salad", price: 15000 },
    { name: "Coleslaw", price: 3000 },
    { name: "Egusi with Fish or Chicken", price: 16500 },
    { name: "Okra Soup (Beef or Goatmeat)", price: 15500 },
    { name: "Afang Soup (Beef or Goat Meat)", price: 16000 },
    { name: "Bitter leaf (Goat or Beef)", price: 17000 },
    { name: "Seafood okro", price: 23000 },
    { name: "Fisherman soup", price: 25000 },
    { name: "Goat Meat Pepper Soup", price: 10500 },
    { name: "Fish Pepper Soup", price: 15000 },
    { name: "Cream of Chicken Soup", price: 16000 }
  ],
  "Food - Small Bites & Extras": [
    { name: "Chicken Wings in Buffalo Sauce", price: 10000 },
    { name: "Fish & Chips", price: 13500 },
    { name: "Shrimp Tempura", price: 12000 },
    { name: "Chicken tenders", price: 12000 },
    { name: "Club Sandwich", price: 10500 },
    { name: "French fries", price: 3000 },
    { name: "Plantain", price: 6000 },
    { name: "Peppered braised goatmeat", price: 6000 }
  ],
  "Drinks - Cocktails & Signatures": [
    { name: "Long Island Ice Tea", price: 8199 },
    { name: "Margarita", price: 8199 },
    { name: "Martini", price: 8199 },
    { name: "Negroni", price: 8199 },
    { name: "Old Fashioned", price: 8199 },
    { name: "Whiskey Sour", price: 8199 },
    { name: "Mojito", price: 8199 },
    { name: "Tide Ignite", price: 9999 },
    { name: "Tide Rush", price: 9999 }
  ],
  "Drinks - Non-Alcoholic": [
    { name: "Virgin Pina Colada", price: 6199 },
    { name: "Virgin Mojito", price: 6199 },
    { name: "Chapman", price: 6199 },
    { name: "Milk Shake (Oreo/Vanilla/Strawberry)", price: 8250 },
    { name: "Zenza Dream Smoothie", price: 4000 },
    { name: "Freshly Squeezed Juice", price: 4000 },
    { name: "Water (60cl)", price: 600 },
    { name: "Fizzy Drinks", price: 1000 },
    { name: "Cranberry Juice", price: 12500 }
  ],
  "Drinks - Beer & Spirit": [
    { name: "Heineken", price: 2000 },
    { name: "Budweiser", price: 2700 },
    { name: "Medium Stout", price: 2700 },
    { name: "Desperados", price: 1500 },
    { name: "Legend", price: 2500 }
  ],
  "Drinks - Wine & Whiskey": [
    { name: "Carlo Rossi Red/White", price: 19000 },
    { name: "Four Cousins", price: 15000 },
    { name: "Nederburg", price: 40000 },
    { name: "Jameson Green Irish", price: 48000 },
    { name: "Jack Daniels", price: 56000 },
    { name: "Black Label", price: 79000 },
    { name: "Glen 12 Yrs", price: 120000 }
  ]
};

const ROOM_RATES: Record<RoomType, number> = {
  [RoomType.SOJOURN_ROOM]: 94050,
  [RoomType.TRANQUIL_ROOM]: 115140,
  [RoomType.HARMONY_STUDIO]: 128250,
  [RoomType.SERENITY_STUDIO]: 179550,
  [RoomType.NARRATIVE_SUITE]: 222300,
  [RoomType.ODYSSEY_SUITE]: 235125,
  [RoomType.TIDE_SIGNATURE_SUITE]: 265050,
};

const DEFAULT_ACCOUNTS = [
  "Main Revenue Account",
  "F&B Operations",
  "Laundry Services",
  "Logistics & Transport",
  "Events & Conferences",
  "Miscellaneous Income"
];

const uuid = () => Math.random().toString(36).substring(2, 11).toUpperCase();

const formatNaira = (amt: number) => {
  const cleanAmt = Math.abs(amt) < 0.01 ? 0 : amt;
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(cleanAmt);
};

const printReceipt = (transaction: Transaction) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const isReservation = transaction.type === 'RESERVATION';
  const isOwing = transaction.balance < 0;
  const isOverpaid = transaction.balance > 0;

  const balanceLabel = isOwing 
    ? 'Balance Outstanding' 
    : (isOverpaid ? 'Credit Balance (Refund Due)' : 'Account Balance');

  const docketBalanceLabel = isOwing 
    ? 'BALANCE DUE' 
    : (isOverpaid ? 'CREDIT BALANCE' : 'BALANCE');

  const a4Template = `
    <html>
      <head>
        <title>Invoice - ${transaction.id}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.4; padding: 10px; box-sizing: border-box; }
          .container { width: 100%; min-height: 100%; display: flex; flex-direction: column; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #c4a66a; padding-bottom: 10px; margin-bottom: 20px; }
          .logo { font-size: 28px; font-weight: 900; color: #0f172a; letter-spacing: -1.5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 20px; }
          .section-title { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #64748b; margin-bottom: 3px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { text-align: left; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #64748b; padding: 10px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
          td { padding: 10px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
          .grand-total { font-size: 16px; font-weight: 900; color: #0f172a; border-top: 2px solid #c4a66a !important; padding-top: 10px !important; }
          .bank-info { background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 20px; }
          .footer { margin-top: auto; padding-top: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
          .bold { font-weight: bold; }
          .overpayment-highlight { color: #059669; font-weight: 900; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div><div class="logo">TIDÈ HOTELS</div><div style="font-size:11px;">${HOTEL_ADDRESS}</div></div>
            <div style="text-align: right;"><div style="font-size:18px; font-weight:bold; color:#c4a66a;">GUEST FOLIO</div><div style="font-size:13px;">#${transaction.id}</div></div>
          </div>
          <div class="info-grid">
            <div>
              <div class="section-title">Guest Details</div>
              <b>${transaction.guestName}</b><br/>
              ${transaction.guestEmail ? `Email: ${transaction.guestEmail}<br/>` : ''}
              ${transaction.guestPhone ? `Phone: ${transaction.guestPhone}<br/>` : ''}
              ${transaction.guestIDType ? `${transaction.guestIDType}: ${transaction.guestIDNumber || 'N/A'}` : ''}
            </div>
            <div style="text-align: right;">
              <div class="section-title">Folio Information</div>
              Date: ${new Date(transaction.date).toLocaleDateString()}<br/>
              Room Ref: ${transaction.roomNumber || 'N/A'}<br/>
              Cashier: ${transaction.cashier}
              ${transaction.team ? `<br/>Team: ${transaction.team}` : ''}
            </div>
          </div>
          <table>
            <thead><tr><th>Description</th><th>Qty</th><th>Nts</th><th>Rate</th><th>Total</th></tr></thead>
            <tbody>
              ${transaction.rooms?.map(r => `<tr><td>${r.roomType}${r.description ? ` (${r.description})` : ''}<br/><small>${r.checkIn} to ${r.checkOut}</small></td><td>${r.quantity}</td><td>${r.nights}</td><td>${formatNaira(r.ratePerNight)}</td><td>${formatNaira(r.ratePerNight * r.nights * r.quantity)}</td></tr>`).join('')}
              ${transaction.extraCharges?.map(e => `<tr><td colspan="4">${e.description}</td><td>${formatNaira(e.amount)}</td></tr>`).join('')}
            </tbody>
          </table>
          <div style="display: flex; justify-content: flex-end;">
            <table style="width: 320px;">
              <tr><td>Folio Subtotal</td><td style="text-align:right;">${formatNaira(transaction.totalDue + (transaction.discount || 0))}</td></tr>
              ${transaction.discount ? `<tr><td>Rebate / Discount</td><td style="text-align:right; color:red;">-${formatNaira(transaction.discount)}</td></tr>` : ''}
              <tr><td class="bold">Total Amount Payable</td><td class="bold" style="text-align:right;">${formatNaira(transaction.totalDue)}</td></tr>
              <tr><td colspan="2"><div style="border-top: 1px dashed #cbd5e1; margin: 8px 0;"></div></td></tr>
              ${transaction.payments.filter(p => p.amount > 0).map(p => `<tr><td style="font-size: 11px; color: #64748b;">Payment (${p.method})</td><td style="text-align:right; font-size: 11px; color: #64748b;">${formatNaira(p.amount)}</td></tr>`).join('')}
              <tr><td class="bold" style="padding-top: 6px;">Total Paid To Date</td><td class="bold" style="text-align:right; padding-top: 6px;">${formatNaira(transaction.totalPaid)}</td></tr>
              <tr><td class="grand-total ${isOverpaid ? 'overpayment-highlight' : ''}">${balanceLabel}</td><td class="grand-total ${isOverpaid ? 'overpayment-highlight' : ''}" style="text-align:right;">${formatNaira(Math.abs(transaction.balance))}</td></tr>
              <tr><td colspan="2" style="font-size:9px; color:#94a3b8; text-align:right; padding-top:5px;">*Rates are Inclusive of SC (${transaction.scPerc || 0}%) and VAT (${transaction.vatPerc || 0}%)</td></tr>
            </table>
          </div>
          ${isOwing ? `
            <div class="bank-info">
              <div class="section-title">Settlement Bank Accounts</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                  <b>${ZENITH_ACCOUNT.bank}</b><br/>
                  Acc No: <b>${ZENITH_ACCOUNT.accountNumber}</b><br/>
                  Name: <b>${ZENITH_ACCOUNT.accountName}</b>
                </div>
                <div>
                  <b>${MONIEPOINT_ACCOUNT.bank}</b><br/>
                  Acc No: <b>${MONIEPOINT_ACCOUNT.accountNumber}</b><br/>
                  Name: <b>${MONIEPOINT_ACCOUNT.accountName}</b>
                </div>
              </div>
            </div>
          ` : ''}
          <div class="footer"><p>${TAGLINE}</p></div>
        </div>
      </body>
    </html>
  `;

  const docketTemplate = `
    <html>
      <head>
        <title>Docket - #${transaction.id}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { margin: 0; padding: 0; width: 100%; display: flex; justify-content: center; background-color: #fff; font-family: 'Courier New', Courier, monospace; }
          .receipt-wrapper { width: 72mm; color: #000; line-height: 1.2; font-size: 11px; padding: 10px 0; }
          .bold { font-weight: bold; }
          .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          .bank-area { background: #f0f0f0; padding: 8px; border: 1px solid #000; margin: 10px 0; font-size: 10px; border-radius: 4px; }
          .bank-title { text-align:center; font-weight:bold; text-decoration:underline; margin-bottom: 4px; }
        </style>
      </head>
      <body>
        <div class="receipt-wrapper">
          <div style="text-align:center;">
            <h2 style="margin:0; font-size: 18px;">TIDÈ HOTELS</h2>
            <p style="margin:2px 0;">${HOTEL_ADDRESS}</p>
          </div>
          <div class="divider"></div>
          <div class="row"><span>Docket:</span><span class="bold">#${transaction.id}</span></div>
          <div class="row"><span>Date:</span><span>${new Date(transaction.date).toLocaleDateString()}</span></div>
          <div class="row"><span>Time:</span><span>${new Date(transaction.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
          <p class="bold">Guest: ${transaction.guestName}</p>
          ${transaction.team ? `<p class="bold">Team: ${transaction.team}</p>` : ''}
          <div class="divider"></div>
          ${transaction.items?.map(i => `<div class="row"><span>${i.description} (x${i.quantity})</span><span>${formatNaira(i.amount * i.quantity)}</span></div>`).join('')}
          <div class="divider"></div>
          ${transaction.discount ? `<div class="row"><span>DISCOUNT</span><span style="color:red;">-${formatNaira(transaction.discount)}</span></div>` : ''}
          <div class="row bold" style="font-size:13px;"><span>TOTAL DUE</span><span>${formatNaira(transaction.totalDue)}</span></div>
          <div style="font-size:8px; text-align:right; opacity:0.6;">(Rates inclusive of SC/VAT)</div>
          <div class="divider"></div>
          <div class="payments">
            ${transaction.payments.map(p => `<div class="row"><span>${p.method}</span><span>${formatNaira(p.amount)}</span></div>`).join('')}
            <div class="row bold"><span>PAID</span><span>${formatNaira(transaction.totalPaid)}</span></div>
            <div class="row bold"><span>${docketBalanceLabel}</span><span>${formatNaira(Math.abs(transaction.balance))}</span></div>
          </div>
          ${isOwing ? `
            <div class="bank-area">
              <div class="bank-title">SETTLEMENT ACCOUNTS</div>
              <div class="row"><span>Bank:</span><span class="bold">${DOCKET_ACCOUNT_DETAILS_2.bank}</span></div>
              <div class="row"><span>Acc:</span><span class="bold">${DOCKET_ACCOUNT_DETAILS_2.accountNumber}</span></div>
              <div class="row"><span>Name:</span><span class="bold">${DOCKET_ACCOUNT_DETAILS_2.accountName}</span></div>
            </div>
          ` : ''}
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(isReservation ? a4Template : docketTemplate);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// UI COMPONENTS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const GlassCard = ({ children, className = "" }: { children?: ReactNode, className?: string }) => (
  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={`bg-[#1e293b]/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-6 ${className}`}>{children}</motion.div>
);

const InputField = ({ label, type = 'text', ...props }: any) => {
  const isDate = type === 'date';
  return (
    <div className="space-y-1 w-full overflow-hidden">
      <label className="text-[10px] font-black uppercase text-[#c4a66a] tracking-widest pl-1 block truncate">{label}</label>
      <div className="relative">
        <input 
          {...props} 
          type={type}
          className={`w-full bg-[#0f172a] border border-white/10 text-white p-4 rounded-2xl outline-none focus:border-[#c4a66a] transition-all font-medium text-sm placeholder:text-white/10 ${props.readOnly ? 'opacity-50 cursor-not-allowed bg-white/5' : ''} ${isDate ? 'date-input-fix' : ''}`} 
        />
      </div>
    </div>
  );
};

const SelectField = ({ label, options, ...props }: any) => (
  <div className="space-y-1 w-full overflow-hidden">
    <label className="text-[10px] font-black uppercase text-[#c4a66a] tracking-widest pl-1 block truncate">{label}</label>
    <select {...props} className={`w-full bg-[#0f172a] border border-white/10 text-white p-4 rounded-2xl outline-none focus:border-[#c4a66a] transition-all font-medium text-sm appearance-none cursor-pointer ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {options.map((o: any) => <option key={o.value || o} value={o.value || o} className="bg-[#1a252f] text-white">{o.label || o}</option>)}
    </select>
  </div>
);

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// MODALS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const ReservationModal = ({ onSave, onClose, initial, cashierName }: any) => {
  const [guest, setGuest] = useState(initial?.guestName || '');
  const [email, setEmail] = useState(initial?.guestEmail || '');
  const [phone, setPhone] = useState(initial?.guestPhone || '');
  const [idType, setIdType] = useState<IDType>(initial?.guestIDType || IDType.NIN);
  const [idNumber, setIdNumber] = useState(initial?.guestIDNumber || '');
  const [account, setAccount] = useState(initial?.account || DEFAULT_ACCOUNTS[0]);
  const [roomNo, setRoomNo] = useState(initial?.roomNumber || '');
  const [rooms, setRooms] = useState<BookingRoom[]>(initial?.rooms || [{ 
    id: uuid(), 
    roomType: RoomType.SOJOURN_ROOM, 
    description: '',
    checkIn: new Date().toISOString().split('T')[0], 
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0], 
    nights: 1, 
    ratePerNight: ROOM_RATES[RoomType.SOJOURN_ROOM],
    quantity: 1
  }]);
  const [extraCharges] = useState<ExtraCharge[]>(initial?.extraCharges || []);
  const [payments, setPayments] = useState<PaymentEntry[]>(initial?.payments || [{ id: uuid(), amount: 0, method: PaymentMethod.POS }]);
  const [discount, setDiscount] = useState(initial?.discount || 0);

  const roomSubtotal = useMemo(() => rooms.reduce((s, r) => s + (r.ratePerNight * r.nights * (r.quantity || 1)), 0), [rooms]);
  const combinedSubtotal = roomSubtotal;
  const totalDue = Math.max(0, combinedSubtotal - discount);
  const totalPaid = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);
  const balance = totalPaid - totalDue;

  const updateDates = (rid: string, cin: string, cout: string) => {
    setRooms(rooms.map(r => {
      if (r.id === rid) {
        let nights = r.nights;
        if (cin && cout) {
          const start = new Date(cin);
          const end = new Date(cout);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
          }
        }
        return { ...r, checkIn: cin, checkOut: cout, nights };
      }
      return r;
    }));
  };

  const handleSave = () => {
    if (!guest.trim()) return alert("Guest Name is required.");
    onSave({
      id: initial?.id || `RES-${uuid()}`, type: 'RESERVATION', date: initial?.date || new Date().toISOString(),
      account, guestName: guest, guestEmail: email, guestPhone: phone, guestIDType: idType, guestIDNumber: idNumber,
      roomNumber: roomNo, rooms, extraCharges, 
      subtotal: combinedSubtotal, serviceCharge: 0, vat: 0, discount, totalDue,
      payments, totalPaid, balance, cashier: cashierName, scPerc: 10, vatPerc: 7.5
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="max-w-6xl w-full max-h-[95vh] flex flex-col overflow-hidden bg-[#1e293b] rounded-[2.5rem] border border-white/10 shadow-2xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1a252f] shrink-0">
          <h2 className="text-xl font-black uppercase text-[#c4a66a] tracking-widest text-center w-full">Folio Control Hub</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-3xl transition-all">&times;</button>
        </div>
        
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <InputField label="Guest Name" value={guest} onChange={(e:any)=>setGuest(e.target.value)} />
            <InputField label="Email Address" value={email} onChange={(e:any)=>setEmail(e.target.value)} />
            <InputField label="Contact Phone" value={phone} onChange={(e:any)=>setPhone(e.target.value)} />
            <InputField label="Room/Reference" value={roomNo} onChange={(e:any)=>setRoomNo(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white/5 rounded-3xl border border-white/5">
             <SelectField label="Identity Type" value={idType} options={Object.values(IDType)} onChange={(e:any)=>setIdType(e.target.value)} />
             <InputField label="ID Card Number" value={idNumber} onChange={(e:any)=>setIdNumber(e.target.value)} />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center"><h3 className="text-[10px] font-black text-[#c4a66a] uppercase tracking-widest">Stay Logistics</h3><button onClick={()=>setRooms([...rooms, { id: uuid(), roomType: RoomType.SOJOURN_ROOM, description: '', checkIn: '', checkOut: '', nights: 1, ratePerNight: ROOM_RATES[RoomType.SOJOURN_ROOM], quantity: 1 }])} className="text-[10px] bg-[#c4a66a]/10 text-[#c4a66a] px-5 py-2.5 rounded-xl font-bold border border-[#c4a66a]/20">Add Room Unit</button></div>
            {rooms.map(r=>(
              <div key={r.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#0f172a] p-5 rounded-2xl border border-white/5 items-end">
                <div className="md:col-span-2"><SelectField label="Category" value={r.roomType} options={Object.values(RoomType)} onChange={(e:any)=>setRooms(rooms.map(rx=>rx.id===r.id?{...rx, roomType: e.target.value as any, ratePerNight: ROOM_RATES[e.target.value as RoomType]}:rx))} /></div>
                <div className="md:col-span-2"><InputField label="Plan (e.g. Breakfast)" value={r.description || ''} onChange={(e:any)=>setRooms(rooms.map(rx=>rx.id===r.id?{...rx, description: e.target.value}:rx))} /></div>
                <div className="md:col-span-1"><InputField label="Rate" type="number" value={r.ratePerNight} onChange={(e:any)=>setRooms(rooms.map(rx=>rx.id===r.id?{...rx, ratePerNight: parseFloat(e.target.value)||0}:rx))} /></div>
                <div className="md:col-span-1"><InputField label="Qty" type="number" value={r.quantity} onChange={(e:any)=>setRooms(rooms.map(rx=>rx.id===r.id?{...rx, quantity: parseInt(e.target.value)||1}:rx))} /></div>
                <div className="md:col-span-2"><InputField label="Check-In" type="date" value={r.checkIn} onChange={(e:any)=>updateDates(r.id, e.target.value, r.checkOut)} /></div>
                <div className="md:col-span-2"><InputField label="Check-Out" type="date" value={r.checkOut} onChange={(e:any)=>updateDates(r.id, r.checkIn, e.target.value)} /></div>
                <div className="md:col-span-1"><InputField label="Nts" type="number" value={r.nights} readOnly /></div>
                <button onClick={()=>setRooms(rooms.filter(rx=>rx.id!==r.id))} className="md:col-span-1 text-red-500 mb-4 font-black text-2xl">×</button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 border-t border-white/5 pt-10">
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-[#c4a66a] uppercase tracking-widest">Folio Settlement</h3>
              {payments.map(p=>(
                <div key={p.id} className="flex gap-3 bg-[#0f172a] p-4 rounded-2xl border border-white/5 items-center shadow-lg">
                  <select className="bg-transparent flex-1 text-sm text-white font-bold outline-none cursor-pointer" value={p.method} onChange={e=>setPayments(payments.map(px=>px.id===p.id?{...px, method: e.target.value as any}:px))}>{Object.values(PaymentMethod).map(m=><option key={m} value={m} className="bg-[#1e293b]">{m}</option>)}</select>
                  <input type="number" className="bg-transparent w-36 text-right text-white font-black outline-none border-b border-white/10 focus:border-[#c4a66a] transition-all" placeholder="Amount" value={p.amount || ''} onChange={e=>setPayments(payments.map(px=>px.id===p.id?{...px, amount: parseFloat(e.target.value)||0}:px))} />
                </div>
              ))}
              <button onClick={()=>setPayments([...payments, {id: uuid(), amount: 0, method: PaymentMethod.POS}])} className="w-full py-3 border-2 border-dashed border-white/10 rounded-2xl text-[10px] font-black uppercase text-white/30 hover:border-[#c4a66a]/30 hover:text-[#c4a66a] transition-all">Split Settlement</button>
            </div>
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-xl">
              <SelectField label="Internal Ledger" value={account} options={DEFAULT_ACCOUNTS} onChange={(e:any)=>setAccount(e.target.value)} />
              <InputField label="Folio Rebate" type="number" value={discount || ''} onChange={(e:any)=>setDiscount(parseFloat(e.target.value)||0)} />
              <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                <div className="flex flex-col"><span className="text-[10px] font-black uppercase text-[#c4a66a] tracking-widest">Net Valuation</span><span className="text-4xl font-black text-white tracking-tighter">{formatNaira(totalDue)}</span></div>
                <div className="text-right flex flex-col"><span className="text-[10px] font-black uppercase text-white/30 tracking-widest">Balance</span><span className={`text-2xl font-black tracking-tighter ${balance < 0 ? 'text-red-400' : (balance > 0 ? 'text-emerald-400' : 'text-white')}`}>{formatNaira(balance)}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-white/5 bg-[#1a252f] shrink-0">
          <button onClick={handleSave} className="w-full bg-[#c4a66a] text-black py-6 rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl hover:brightness-110 active:scale-95 transition-all">Authorize & Print Folio (A4)</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const MenuSelectionOverlay = ({ onSelect, onClose }: { onSelect: (item: { name: string; price: number }) => void; onClose: () => void }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    let result: { name: string; price: number; category: string }[] = [];
    Object.entries(MENU_DATA).forEach(([cat, items]) => {
      items.forEach(i => result.push({ ...i, category: cat }));
    });
    
    if (selectedCategory) {
      result = result.filter(i => i.category === selectedCategory);
    }
    
    if (search) {
      result = result.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()));
    }
    
    return result;
  }, [search, selectedCategory]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <GlassCard className="max-w-3xl w-full h-[80vh] flex flex-col !p-0 overflow-hidden">
        <div className="p-6 bg-[#1a252f] border-b border-white/10 flex justify-between items-center">
          <h3 className="text-lg font-black text-[#c4a66a] uppercase tracking-widest">Menu Explorer</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl transition-all">&times;</button>
        </div>
        
        <div className="p-6 space-y-4">
          <input 
            autoFocus
            type="text" 
            placeholder="Search food, drinks, cocktails..." 
            className="w-full bg-[#0f172a] border border-[#c4a66a]/30 text-white p-4 rounded-2xl outline-none focus:border-[#c4a66a] transition-all font-medium text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            <button 
              onClick={() => setSelectedCategory(null)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${!selectedCategory ? 'bg-[#c4a66a] text-black border-[#c4a66a]' : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'}`}
            >
              All Items
            </button>
            {Object.keys(MENU_DATA).map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedCategory === cat ? 'bg-[#c4a66a] text-black border-[#c4a66a]' : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-2 custom-scrollbar">
          {filteredItems.map((item, idx) => (
            <button 
              key={idx}
              onClick={() => onSelect(item)}
              className="w-full flex justify-between items-center p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group"
            >
              <div className="text-left">
                <p className="font-bold text-white group-hover:text-[#c4a66a] transition-all">{item.name}</p>
                <p className="text-[10px] text-white/30 uppercase font-black">{item.category}</p>
              </div>
              <p className="font-black text-[#c4a66a]">{formatNaira(item.price)}</p>
            </button>
          ))}
          {filteredItems.length === 0 && (
            <div className="text-center py-20 text-white/20 font-black uppercase tracking-widest">No matching items found</div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
};

const WalkInModal = ({ user, initial, onSave, onClose }: any) => {
  const [guest, setGuest] = useState(initial?.guestName || 'Walk-In Customer');
  const [items, setItems] = useState<POSItem[]>(initial?.items || [{ description: 'F&B/General Service', amount: 0, quantity: 1 }]);
  const [payments, setPayments] = useState<PaymentEntry[]>(initial?.payments || [{ id: uuid(), amount: 0, method: PaymentMethod.POS }]);
  const [scPerc, setScPerc] = useState(initial?.scPerc || 10);
  const [vatPerc, setVatPerc] = useState(initial?.vatPerc || 7.5);
  const [team, setTeam] = useState(initial?.team || '');
  const [discount, setDiscount] = useState(initial?.discount || 0);
  const [activePickerIdx, setActivePickerIdx] = useState<number | null>(null);

  const subtotal = useMemo(() => items.reduce((s, i) => s + (i.amount * i.quantity), 0), [items]);
  const totalDue = useMemo(() => Math.max(0, subtotal - discount), [subtotal, discount]);
  const totalPaid = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);
  const balance = totalPaid - totalDue;
  
  const handleSave = () => {
    if (!guest.trim()) return alert("Customer Name is required.");
    /* Added mandatory team check per strict instruction */
    if (!team) return alert("Please select a Printing Team (Zenza or Whispers) before proceeding.");
    
    onSave({ 
      id: initial?.id || `POS-${uuid()}`, type: 'WALK-IN', date: initial?.date || new Date().toISOString(), account: "F&B Operations", guestName: guest, items, subtotal, serviceCharge: 0, vat: 0, discount, totalDue, payments, totalPaid, balance, cashier: user, scPerc, vatPerc, team
    });
  };

  const updateItem = (idx: number, updates: Partial<POSItem>) => {
    setItems(items.map((it, i) => i === idx ? { ...it, ...updates } : it));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50">
      <GlassCard className="max-w-2xl w-full flex flex-col max-h-[95vh] overflow-hidden !p-0 shadow-2xl rounded-[3rem]">
        <div className="p-6 bg-[#1a252f] flex justify-between items-center border-b border-white/5 shrink-0">
           <h2 className="text-xl font-black uppercase text-[#c4a66a] tracking-widest text-center w-full">Walk-In Point of Sale</h2>
           <button onClick={onClose} className="text-white/20 hover:text-white text-3xl transition-all">&times;</button>
        </div>
        
        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <InputField label="Customer Identity" value={guest} onChange={(e:any)=>setGuest(e.target.value)} />
             <SelectField 
                label="Printing Team" 
                value={team} 
                options={[
                   { value: '', label: 'Select Team' },
                   { value: 'Zenza', label: 'Zenza' },
                   { value: 'Whispers', label: 'Whispers' }
                ]} 
                onChange={(e:any)=>setTeam(e.target.value)} 
                disabled={team !== ''}
             />
          </div>
          
          <div className="space-y-4">
             <div className="flex justify-between items-center">
               <h3 className="text-[10px] font-black text-[#c4a66a] uppercase tracking-widest">Billable Items</h3>
               <button onClick={()=>setItems([...items, {description: '', amount: 0, quantity: 1}])} className="text-[#c4a66a] text-2xl font-black hover:scale-110 transition-all">+</button>
             </div>
             {items.map((it, idx) => (
                <div key={idx} className="flex flex-col gap-3 bg-white/5 p-5 rounded-3xl border border-white/5 shadow-inner">
                   <div className="flex gap-2 items-end">
                     <div className="flex-1">
                        <InputField 
                          label="Item Description" 
                          placeholder="Select from menu or type..."
                          value={it.description} 
                          onChange={(e:any)=>updateItem(idx, { description: e.target.value })} 
                        />
                     </div>
                     <button 
                      onClick={() => setActivePickerIdx(idx)}
                      className="h-14 w-14 mb-0.5 bg-[#c4a66a]/10 border border-[#c4a66a]/30 rounded-2xl flex items-center justify-center text-[#c4a66a] hover:bg-[#c4a66a] hover:text-black transition-all group"
                      title="Search Menu"
                     >
                       <span className="text-xs font-black group-hover:scale-110">MENU</span>
                     </button>
                   </div>
                   <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-5">
                        <InputField 
                          label="Unit Price" 
                          type="number" 
                          value={it.amount || ''} 
                          onChange={(e:any)=>updateItem(idx, { amount: parseFloat(e.target.value)||0 })} 
                        />
                      </div>
                      <div className="col-span-4">
                        <InputField 
                          label="Qty" 
                          type="number" 
                          value={it.quantity} 
                          onChange={(e:any)=>updateItem(idx, { quantity: parseInt(e.target.value)||1 })} 
                        />
                      </div>
                      <div className="col-span-3 flex items-end justify-center">
                        <button onClick={()=>setItems(items.filter((_,i)=>i!==idx))} className="text-red-500 font-bold text-xs uppercase tracking-widest transition-all hover:text-red-300 pb-5">Remove</button>
                      </div>
                   </div>
                </div>
             ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white/5 rounded-3xl border border-white/5 shadow-lg">
             <div className="space-y-4">
                <h3 className="text-[10px] font-black text-[#c4a66a] uppercase tracking-widest">Pricing Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                   <InputField label="SC % (Incl)" type="number" value={scPerc} onChange={(e:any)=>setScPerc(parseFloat(e.target.value)||0)} />
                   <InputField label="VAT % (Incl)" type="number" value={vatPerc} onChange={(e:any)=>setVatPerc(parseFloat(e.target.value)||0)} />
                </div>
                <InputField label="Docket Discount" type="number" value={discount || ''} onChange={(e:any)=>setDiscount(parseFloat(e.target.value)||0)} />
             </div>
             <div className="flex flex-col justify-end">
                <div className="p-5 bg-black/40 rounded-2xl border border-[#c4a66a]/30 flex justify-between items-center">
                   <span className="text-[10px] font-black uppercase text-[#c4a66a]">Final Total</span>
                   <span className="text-2xl font-black text-white tracking-tighter">{formatNaira(totalDue)}</span>
                </div>
             </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center"><h3 className="text-[10px] font-black text-[#c4a66a] uppercase tracking-widest">Settlement Log</h3><button onClick={()=>setPayments([...payments, {id: uuid(), amount: 0, method: PaymentMethod.POS}])} className="text-[#c4a66a] text-xl font-black">+</button></div>
            {payments.map(p=>(
               <div key={p.id} className="flex gap-4 bg-[#0f172a] p-4 rounded-3xl border border-white/5 items-center shadow-lg">
                  <select className="flex-1 bg-transparent text-xs text-white font-bold outline-none cursor-pointer" value={p.method} onChange={e=>setPayments(payments.map(px=>px.id===p.id?{...px, method: e.target.value as any}:px))}>{Object.values(PaymentMethod).map(m=><option key={m} value={m} className="bg-[#1e293b]">{m}</option>)}</select>
                  <div className="flex flex-col items-end">
                     <span className="text-[8px] font-black uppercase text-white/20 mb-1">Amount Paid</span>
                     <input type="number" className="bg-transparent w-40 text-right font-black text-white outline-none border-b border-white/5 focus:border-[#c4a66a] transition-all" value={p.amount || ''} onChange={e=>setPayments(payments.map(px=>px.id===p.id?{...px, amount: parseFloat(e.target.value)||0}:px))} />
                  </div>
                  <button onClick={()=>setPayments(payments.filter(px=>px.id!==p.id))} className="text-red-500 font-bold transition-all hover:scale-125 px-2">&times;</button>
               </div>
            ))}
          </div>
        </div>

        <div className="p-8 border-t border-white/5 bg-[#1a252f] shrink-0">
          <div className="flex justify-between items-center mb-6">
             <div className="flex flex-col"><span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Folio Balance</span><span className={`text-2xl font-black ${balance < 0 ? 'text-red-400' : (balance > 0 ? 'text-emerald-400' : 'text-white')}`}>{formatNaira(balance)}</span></div>
             <button onClick={handleSave} className="bg-[#c4a66a] text-black px-12 py-5 rounded-2xl font-black uppercase tracking-widest shadow-2xl transition-all hover:brightness-110 active:scale-95">Complete & Print Docket</button>
          </div>
          <p className="text-[9px] text-center text-white/20 uppercase tracking-[0.5em]">Payment directed to settlement accounts only</p>
        </div>
      </GlassCard>

      <AnimatePresence>
        {activePickerIdx !== null && (
          <MenuSelectionOverlay 
            onClose={() => setActivePickerIdx(null)}
            onSelect={(item) => {
              updateItem(activePickerIdx, { description: item.name, amount: item.price });
              setActivePickerIdx(null);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// HELPER FUNCTIONS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const exportToExcel = (data: Transaction[]) => {
  if (data.length === 0) return alert("No data to export.");
  const flatData = data.map(t => ({
    Reference: t.id,
    Type: t.type,
    Date: new Date(t.date).toLocaleDateString(),
    Account: t.account,
    Guest: t.guestName,
    Email: t.guestEmail || '',
    Phone: t.guestEmail || '',
    TotalDue: t.totalDue,
    TotalPaid: t.totalPaid,
    Balance: t.balance,
    Cashier: t.cashier,
    Team: t.team || 'N/A'
  }));
  const worksheet = XLSX.utils.json_to_sheet(flatData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Revenue_Ledger");
  XLSX.writeFile(workbook, `Tide_Hotels_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// MAIN APP
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const App = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [modalType, setModalType] = useState<'RES' | 'WALK' | null>(null);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const [filterStart, setFilterStart] = useState<string>('');
  const [filterEnd, setFilterEnd] = useState<string>('');

  useEffect(() => {
    const savedSession = localStorage.getItem('tide_user_session');
    if (savedSession) {
      setUser(savedSession);
    }

    const savedLedger = localStorage.getItem('tide_ledger_master_v4');
    if (savedLedger) {
      try { setTransactions(JSON.parse(savedLedger)); } catch(e) { console.error(e); }
    }

    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem('tide_ledger_master_v4', JSON.stringify(transactions));
    }
  }, [transactions, loading]);

  const filteredTransactions = useMemo(() => {
    if (!filterStart && !filterEnd) return transactions;
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      tDate.setHours(0,0,0,0);
      const startDate = filterStart ? new Date(filterStart) : null;
      if (startDate) startDate.setHours(0,0,0,0);
      const endDate = filterEnd ? new Date(filterEnd) : null;
      if (endDate) endDate.setHours(0,0,0,0);
      if (startDate && tDate < startDate) return false;
      if (endDate && tDate > endDate) return false;
      return true;
    });
  }, [transactions, filterStart, filterEnd]);

  const handleLogin = (e: any) => {
    e.preventDefault();
    const username = e.target.u.value || 'Administrator';
    setUser(username);
    if (rememberMe) {
      localStorage.setItem('tide_user_session', username);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('tide_user_session');
  };

  if (loading) return (
    <div className="fixed inset-0 bg-[#0f172a] flex flex-col items-center justify-center">
      <h1 className="text-9xl font-black text-[#c4a66a] tracking-tighter animate-pulse">TIDÈ</h1>
      <p className="text-[#c4a66a] text-[10px] uppercase tracking-[1em] mt-4 opacity-40">Financial Terminal Initializing...</p>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1e293b] via-[#0f172a] to-[#0f172a] opacity-50"></div>
      <GlassCard className="max-w-md w-full p-12 relative z-10 border-[#c4a66a]/20">
        <h2 className="text-center text-4xl font-black uppercase mb-10 tracking-tighter text-[#c4a66a]">Terminal Login</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <InputField label="Operator Identifier" name="u" placeholder="Your Full Name" required />
          <InputField label="Access Key" type="password" placeholder="••••••••" required />
          
          <div className="flex items-center gap-3 pl-1">
            <input 
              type="checkbox" 
              id="remember" 
              checked={rememberMe} 
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-white/10 bg-[#0f172a] accent-[#c4a66a] cursor-pointer"
            />
            <label htmlFor="remember" className="text-[10px] font-black uppercase text-white/40 tracking-widest cursor-pointer select-none">Remember Terminal Password</label>
          </div>

          <button type="submit" className="w-full bg-[#c4a66a] text-black py-5 rounded-3xl font-black uppercase tracking-widest shadow-2xl hover:brightness-110 active:scale-95 transition-all">Authenticate</button>
        </form>
      </GlassCard>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-white selection:bg-[#c4a66a]/30">
      <nav className="p-8 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[#0f172a]/95 backdrop-blur-3xl z-40">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-[#c4a66a] rounded-xl flex items-center justify-center font-black text-[#1a252f] text-2xl shadow-lg">T</div>
          <h1 className="text-xl font-black uppercase tracking-tighter">Tidè Hotels & Resorts</h1>
        </div>
        <button onClick={handleLogout} className="text-[10px] font-black uppercase text-red-400 bg-red-400/10 px-6 py-2.5 rounded-xl border border-red-400/20 hover:bg-red-400 hover:text-white transition-all">Sign Out</button>
      </nav>

      <main className="p-10 md:p-16 max-w-7xl mx-auto space-y-14">
        <div className="flex flex-col md:flex-row justify-between items-end gap-10 border-b border-white/5 pb-16">
          <div><h2 className="text-7xl font-black uppercase tracking-tighter leading-none">Ledger</h2><p className="text-[#c4a66a] text-sm font-black uppercase tracking-[0.3em] opacity-40 mt-4">Revenue Authority Terminal</p></div>
          <div className="flex flex-wrap gap-4">
            <button onClick={() => exportToExcel(filteredTransactions)} className="bg-emerald-500/10 text-emerald-400 px-8 py-5 rounded-2xl font-black text-[10px] uppercase border border-emerald-500/20 transition-all hover:bg-emerald-500/20">Download Report</button>
            <button onClick={()=>{setEditTarget(null); setModalType('WALK');}} className="bg-[#1e293b] px-10 py-5 rounded-2xl font-black text-[10px] uppercase border border-white/10 transition-all hover:bg-white/5">Walk-In POS</button>
            <button onClick={()=>{setEditTarget(null); setModalType('RES');}} className="bg-[#c4a66a] text-black px-10 py-5 rounded-2xl font-black text-[10px] uppercase shadow-2xl transition-all hover:brightness-110">Reservation Entry</button>
          </div>
        </div>

        <GlassCard className="!p-8 border-white/5 shadow-xl flex flex-col md:flex-row items-end gap-6 bg-[#1a252f]/40">
          <div className="w-full md:w-48"><InputField label="Start Date" type="date" value={filterStart} onChange={(e: any) => setFilterStart(e.target.value)} /></div>
          <div className="w-full md:w-48"><InputField label="End Date" type="date" value={filterEnd} onChange={(e: any) => setFilterEnd(e.target.value)} /></div>
          <button onClick={() => { setFilterStart(''); setFilterEnd(''); }} className="text-[10px] font-black uppercase text-white/40 hover:text-[#c4a66a] transition-all pb-4 tracking-[0.2em]">Clear Filters</button>
          <div className="flex-1 text-right pb-4"><p className="text-[10px] font-black uppercase text-[#c4a66a] tracking-[0.2em]">Showing {filteredTransactions.length} {filteredTransactions.length === 1 ? 'Transaction' : 'Transactions'}</p></div>
        </GlassCard>

        <GlassCard className="!p-0 border-white/5 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-[10px] font-black uppercase text-white/30"><tr className="border-b border-white/5"><th className="p-8">Reference</th><th className="p-8">Guest/Entity</th><th className="p-8">Valuation</th><th className="p-8">Audit</th><th className="p-8 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {filteredTransactions.map(t=>(
                  <tr key={t.id} className="hover:bg-white/[0.03] transition-all group">
                    <td className="p-8"><p className="font-black text-white/20 group-hover:text-[#c4a66a] transition-all tracking-widest">#{t.id}</p><p className="text-[10px] mt-1 opacity-50">{new Date(t.date).toLocaleDateString()}</p></td>
                    <td className="p-8"><p className="font-black text-xl leading-none">{t.guestName}</p><p className="text-[10px] text-[#c4a66a] mt-1.5 font-black uppercase tracking-widest">{t.account}</p></td>
                    <td className="p-8 font-black text-2xl tracking-tighter">{formatNaira(t.totalDue)}</td>
                    <td className="p-8"><span className={`text-[9px] font-black uppercase px-4 py-1.5 rounded-full border shadow-inner ${t.balance >= 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{t.balance >= 0 ? 'Settled' : 'Unpaid'}</span></td>
                    <td className="p-8 text-right space-x-3"><button onClick={()=>{setEditTarget(t); setModalType(t.type==='RESERVATION'?'RES':'WALK')}} className="p-3 px-6 rounded-2xl bg-white/5 text-[10px] font-black uppercase hover:bg-white/10 transition-all">Edit</button><button onClick={()=>printReceipt(t)} className="p-3 px-6 rounded-2xl bg-[#c4a66a] text-black text-[10px] font-black uppercase shadow-lg hover:brightness-110 transition-all">Print</button></td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr><td colSpan={5} className="p-20 text-center text-white/20 uppercase font-black tracking-[1em]">No records in this range</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </main>

      <AnimatePresence>
        {modalType === 'RES' && <ReservationModal initial={editTarget} cashierName={user} onSave={(tx:any)=>{setTransactions([tx,...transactions.filter(o=>o.id!==tx.id)]); setModalType(null); printReceipt(tx);}} onClose={()=>setModalType(null)} />}
        {modalType === 'WALK' && <WalkInModal initial={editTarget} user={user} onSave={(tx:any)=>{setTransactions([tx,...transactions.filter(o=>o.id!==tx.id)]); setModalType(null); printReceipt(tx);}} onClose={()=>setModalType(null)} />}
      </AnimatePresence>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');
const root = createRoot(rootElement);
root.render(<ErrorBoundary><App /></ErrorBoundary>)
