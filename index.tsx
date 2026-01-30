
import React, { Component, useState, useEffect, ReactNode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ERROR BOUNDARY
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
interface ErrorBoundaryProps { children?: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: Error | null; }

// Use Component from named imports to ensure proper type resolution for state and props
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    // Accessing this.state which is now correctly recognized due to Component inheritance
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 text-white">
          <div className="bg-[#1e293b] p-10 rounded-3xl shadow-2xl max-w-lg w-full border-2 border-red-500/30 text-center">
            <h1 className="text-3xl font-black text-red-500 mb-4 uppercase">System Error</h1>
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
    // Accessing this.props which is now correctly recognized
    return this.props.children;
  }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// DATA MODELS & CONSTANTS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const HOTEL_ADDRESS = "38 S.O. Williams Street, Utako, Abuja.";
const TAGLINE = "where boldness meets elegance";

const DOCKET_ACCOUNT_DETAILS = {
  bank: "Suntrust",
  accountNumber: "0025840833",
  accountName: "Tide’ Hotels Resorts"
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
  NATIONAL_ID = 'National ID',
  PASSPORT = 'Passport Card',
  DRIVERS = 'Drivers License',
  VOTERS = 'Voter’s Card',
  STUDENT_ID = 'Student ID',
  OTHER = 'Other'
}

export interface BookingRoom {
  id: string;
  roomType: RoomType;
  checkIn: string;
  checkOut: string;
  nights: number;
  ratePerNight: number;
  quantity: number;
}

export interface PaymentEntry { id: string; amount: number; method: PaymentMethod; reference?: string; }

export interface POSItem { description: string; amount: number; quantity: number; }

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
  subtotal: number;
  serviceCharge: number;
  vat: number;
  discount: number;
  totalDue: number;
  payments: PaymentEntry[];
  totalPaid: number;
  balance: number;
  cashier: string;
}

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

const calculateInclusiveFinancials = (grossAmount: number) => {
  const net = grossAmount / 1.175;
  const svc = net * 0.10;
  const vat = net * 0.075;
  return { net, svc, vat };
};

const exportToExcel = (transactions: Transaction[], filename: string = "TIDE_LEDGER") => {
  if (transactions.length === 0) {
    alert("No records found in the selected range to export.");
    return;
  }

  const data = transactions.map(t => ({
    "Date": new Date(t.date).toLocaleDateString(),
    "Docket Ref": t.id,
    "Type": t.type,
    "Internal Ledger": t.account || "N/A",
    "Settlement Bank": DOCKET_ACCOUNT_DETAILS.bank,
    "Settlement Account": DOCKET_ACCOUNT_DETAILS.accountNumber,
    "Guest/Customer": t.guestName,
    "Room/Ref": t.roomNumber || "",
    "Items Count": (t.rooms?.length || 0) + (t.items?.length || 0),
    "Total Quantity": (t.rooms?.reduce((acc, r) => acc + r.quantity, 0) || 0) + (t.items?.reduce((acc, i) => acc + i.quantity, 0) || 0),
    "Nights Sum": t.rooms?.reduce((acc, r) => acc + r.nights, 0) || 0,
    "Total Due": t.totalDue,
    "Total Paid": t.totalPaid,
    "Balance": t.balance,
    "Cashier": t.cashier
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Master Ledger");
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

const printReceipt = (transaction: Transaction) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <html>
      <head>
        <title>Tidé - #${transaction.id}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { 
            margin: 0; 
            padding: 0; 
            width: 100%;
            display: flex;
            justify-content: center;
            background-color: #fff;
          }
          .receipt-wrapper {
            width: 72mm;
            font-family: 'Courier New', Courier, monospace; 
            color: #000; 
            line-height: 1.2; 
            font-size: 11px;
            padding: 10px 0;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .header { border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 10px; }
          .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          .account-info { 
            background: #f0f0f0; 
            padding: 5px; 
            border: 1px solid #000; 
            margin: 10px 0;
            font-size: 10px;
          }
          .item-row { margin-bottom: 5px; }
          .total-box { margin-top: 10px; font-size: 13px; border-top: 1px solid #000; padding-top: 5px; }
          .footer { margin-top: 25px; font-size: 10px; text-align: center; font-style: italic; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="receipt-wrapper">
          <div class="header center">
            <h2 style="margin:0; font-size: 18px;">TIDÈ HOTELS</h2>
            <p style="margin:2px 0;">${HOTEL_ADDRESS}</p>
          </div>

          <div class="account-info">
            <p class="bold center" style="margin:0 0 3px 0;">SETTLEMENT ACCOUNT</p>
            <div class="row"><span>Bank:</span><span class="bold">${DOCKET_ACCOUNT_DETAILS.bank}</span></div>
            <div class="row"><span>Account:</span><span class="bold">${DOCKET_ACCOUNT_DETAILS.accountNumber}</span></div>
            <div class="row"><span>Name:</span><span class="bold">${DOCKET_ACCOUNT_DETAILS.accountName}</span></div>
          </div>

          <div class="section">
            <div class="row"><span>DOCKET:</span><span class="bold">#${transaction.id}</span></div>
            <div class="row"><span>DATE:</span><span>${new Date(transaction.date).toLocaleDateString()}</span></div>
            <div class="row"><span>CASHIER:</span><span>${transaction.cashier}</span></div>
          </div>

          <div class="divider"></div>

          <div class="section">
            <p class="bold" style="margin: 0 0 5px 0;">GUEST: ${transaction.guestName}</p>
            ${transaction.roomNumber ? `<p style="margin: 0;">Ref: ${transaction.roomNumber}</p>` : ''}
          </div>

          <div class="divider"></div>

          <div class="items">
            ${transaction.rooms ? transaction.rooms.map(r => `
              <div class="item-row">
                <div class="row"><span class="bold">${r.roomType}</span></div>
                <div class="row"><span>Qty: ${r.quantity} x ${r.nights} Nts</span><span>${formatNaira(r.ratePerNight * r.nights * r.quantity)}</span></div>
              </div>
            `).join('') : ''}
            ${transaction.items ? transaction.items.map(i => `
              <div class="item-row">
                <div class="row"><span>${i.description} x${i.quantity}</span><span>${formatNaira(i.amount * i.quantity)}</span></div>
              </div>
            `).join('') : ''}
          </div>

          <div class="divider"></div>

          <div class="totals">
            <div class="row"><span>SUBTOTAL</span><span>${formatNaira(transaction.subtotal)}</span></div>
            <div class="row"><span>SC (10%)</span><span>${formatNaira(transaction.serviceCharge)}</span></div>
            <div class="row"><span>VAT (7.5%)</span><span>${formatNaira(transaction.vat)}</span></div>
            ${transaction.discount > 0 ? `<div class="row"><span>DISCOUNT</span><span>-${formatNaira(transaction.discount)}</span></div>` : ''}
            <div class="row bold total-box"><span>TOTAL DUE</span><span>${formatNaira(transaction.totalDue)}</span></div>
          </div>

          <div class="divider" style="border-style: solid;"></div>

          <div class="payments">
            <p class="bold" style="margin-bottom: 5px;">PAYMENTS:</p>
            ${transaction.payments.map(p => `
              <div class="row"><span>${p.method}</span><span>${formatNaira(p.amount)}</span></div>
            `).join('')}
            <div class="divider"></div>
            <div class="row bold"><span>PAID</span><span>${formatNaira(transaction.totalPaid)}</span></div>
            <div class="row bold"><span>BAL.</span><span style="${transaction.balance < -0.1 ? 'color: red;' : ''}">${formatNaira(transaction.balance)}</span></div>
          </div>

          <div class="footer">
            <p>${TAGLINE}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// UI COMPONENTS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const GlassCard = ({ children, className = "", delay = 0 }: { children?: ReactNode, className?: string, delay?: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay, ease: "easeOut" }}
    className={`bg-[#1e293b]/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-6 ${className}`}
  >
    {children}
  </motion.div>
);

const InputField = ({ label, ...props }: any) => {
  const isDate = props.type === 'date';
  return (
    <div className="space-y-1 w-full overflow-hidden">
      <label className="text-[10px] font-black uppercase text-[#c4a66a] tracking-widest pl-1 block truncate">
        {label} {props.required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative group">
        <input 
          {...props} 
          className={`w-full bg-[#0f172a] border border-white/10 text-white p-4 rounded-2xl outline-none focus:border-[#c4a66a] focus:ring-2 focus:ring-[#c4a66a]/20 transition-all font-medium text-sm placeholder:text-white/20 ${isDate ? 'relative z-10 cursor-pointer' : ''}`} 
        />
        {isDate && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#c4a66a] z-20 flex items-center justify-center bg-[#0f172a] pl-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
        )}
      </div>
    </div>
  );
};

const SelectField = ({ label, options, ...props }: any) => (
  <div className="space-y-1 w-full overflow-hidden">
    <label className="text-[10px] font-black uppercase text-[#c4a66a] tracking-widest pl-1 block truncate">{label}</label>
    <div className="relative">
      <select {...props} className="w-full bg-[#0f172a] border border-white/10 text-white p-4 rounded-2xl outline-none focus:border-[#c4a66a] transition-all font-medium text-sm appearance-none cursor-pointer">
        {options.map((o: any) => <option key={o.value || o} value={o.value || o} className="bg-[#1a252f] text-white">{o.label || o}</option>)}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#c4a66a] opacity-50">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      </div>
    </div>
  </div>
);

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// MODALS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const ReservationModal = ({ onSave, onClose, initial, cashierName }: any) => {
  const [guest, setGuest] = useState(initial?.guestName || '');
  const [account, setAccount] = useState(initial?.account || DEFAULT_ACCOUNTS[0]);
  const [email, setEmail] = useState(initial?.guestEmail || '');
  const [phone, setPhone] = useState(initial?.guestPhone || '');
  const [roomNo, setRoomNo] = useState(initial?.roomNumber || '');
  const [rooms, setRooms] = useState<BookingRoom[]>(initial?.rooms || [{ 
    id: uuid(), 
    roomType: RoomType.SOJOURN_ROOM, 
    checkIn: new Date().toISOString().split('T')[0], 
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0], 
    nights: 1, 
    ratePerNight: ROOM_RATES[RoomType.SOJOURN_ROOM],
    quantity: 1
  }]);
  const [payments, setPayments] = useState<PaymentEntry[]>(initial?.payments || [{ id: uuid(), amount: 0, method: PaymentMethod.POS }]);
  const [discount, setDiscount] = useState(initial?.discount || 0);

  const grossSubtotal = useMemo(() => rooms.reduce((s, r) => s + (r.ratePerNight * r.nights * (r.quantity || 1)), 0), [rooms]);
  const { net, svc, vat } = useMemo(() => calculateInclusiveFinancials(grossSubtotal), [grossSubtotal]);
  const totalDue = grossSubtotal - discount; 
  const totalPaid = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);
  const currentBalance = totalPaid - totalDue;

  const updateDates = (rid: string, cin: string, cout: string) => {
    const start = new Date(cin);
    const end = new Date(cout);
    const diff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
    setRooms(rooms.map(r => r.id === rid ? { ...r, checkIn: cin, checkOut: cout, nights: diff } : r));
  };

  const handleSave = () => {
    if (!guest.trim()) return alert("Guest Name is required.");
    onSave({
      id: initial?.id || `RES-${uuid()}`, type: 'RESERVATION', date: initial?.date || new Date().toISOString(),
      account, guestName: guest, guestEmail: email, guestPhone: phone,
      roomNumber: roomNo, rooms, subtotal: net, serviceCharge: svc, vat, discount, totalDue,
      payments, totalPaid, balance: currentBalance, cashier: cashierName
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div layout initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="max-w-6xl w-full max-h-[92vh] flex flex-col">
        <GlassCard className="!p-0 h-full flex flex-col overflow-hidden">
          <div className="p-6 bg-[#1a252f] flex justify-between items-center border-b border-white/5 shrink-0">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <span className="w-1.5 h-6 bg-[#c4a66a] rounded-full"></span>
              Folio Management
            </h2>
            <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all text-2xl">&times;</button>
          </div>
          <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="md:col-span-2"><InputField label="Guest Full Name" value={guest} onChange={(e:any)=>setGuest(e.target.value)} required /></div>
              <SelectField label="Internal Ledger" value={account} options={DEFAULT_ACCOUNTS} onChange={(e:any)=>setAccount(e.target.value)} />
              <InputField label="Contact Phone" value={phone} onChange={(e:any)=>setPhone(e.target.value)} />
              <InputField label="Room/Reference" value={roomNo} onChange={(e:any)=>setRoomNo(e.target.value)} />
              <InputField label="Guest Email" type="email" value={email} onChange={(e:any)=>setEmail(e.target.value)} />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h3 className="text-[10px] font-black text-[#c4a66a] uppercase tracking-widest">Stays (Quantity Enabled)</h3>
                <button onClick={()=>setRooms([...rooms, { id: uuid(), roomType: RoomType.SOJOURN_ROOM, checkIn: '', checkOut: '', nights: 1, ratePerNight: ROOM_RATES[RoomType.SOJOURN_ROOM], quantity: 1 }])} className="text-[#c4a66a] text-[10px] font-black uppercase bg-[#c4a66a]/10 px-4 py-2 rounded-lg hover:bg-[#c4a66a]/20 transition-all">+ Add Unit</button>
              </div>
              {rooms.map((r) => (
                <div key={r.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#0f172a] p-5 rounded-2xl border border-white/5 items-end">
                  <div className="md:col-span-4"><SelectField label="Category" value={r.roomType} options={Object.values(RoomType)} onChange={(e:any)=>setRooms(rooms.map(rx=>rx.id===r.id?{...rx, roomType: e.target.value, ratePerNight: ROOM_RATES[e.target.value as RoomType]}:rx))} /></div>
                  <div className="md:col-span-2"><InputField label="Qty" type="number" value={r.quantity} min="1" onChange={(e:any)=>setRooms(rooms.map(rx=>rx.id===r.id?{...rx, quantity: Math.max(1, parseInt(e.target.value)||1)}:rx))} /></div>
                  <div className="md:col-span-2"><InputField label="Check-In" type="date" value={r.checkIn} onChange={(e:any)=>updateDates(r.id, e.target.value, r.checkOut)} /></div>
                  <div className="md:col-span-2"><InputField label="Check-Out" type="date" value={r.checkOut} onChange={(e:any)=>updateDates(r.id, r.checkIn, e.target.value)} /></div>
                  <div className="md:col-span-1 text-center bg-[#1a252f] p-3 rounded-xl"><span className="text-[9px] text-white/30 uppercase font-bold block">Nts</span><span className="font-black text-[#c4a66a]">{r.nights}</span></div>
                  <button onClick={()=>setRooms(rooms.filter(rx=>rx.id!==r.id))} className="md:col-span-1 text-red-500/20 hover:text-red-500 p-4 transition-colors">&times;</button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 border-t border-white/5 pt-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center"><h3 className="text-[10px] font-black text-[#c4a66a] uppercase tracking-widest">Payments</h3><button onClick={()=>setPayments([...payments, {id: uuid(), amount: 0, method: PaymentMethod.POS}])} className="text-[#c4a66a] text-[10px] font-black uppercase">+</button></div>
                {payments.map(p => (
                  <div key={p.id} className="flex gap-3 bg-[#0f172a] p-3.5 rounded-2xl border border-white/5 group">
                    <select className="bg-transparent text-xs text-white outline-none flex-1 font-bold cursor-pointer" value={p.method} onChange={e=>setPayments(payments.map(px=>px.id===p.id?{...px, method: e.target.value as any}:px))}>
                      {Object.values(PaymentMethod).map(m=><option key={m} value={m} className="bg-[#1e293b]">{m}</option>)}
                    </select>
                    <input type="number" className="bg-transparent text-right font-black w-32 outline-none border-b border-white/10 group-focus-within:border-[#c4a66a] transition-all" placeholder="Amount" value={p.amount || ''} onChange={e=>setPayments(payments.map(px=>px.id===p.id?{...px, amount: Math.max(0, parseFloat(e.target.value)||0)}:px))} />
                  </div>
                ))}
              </div>
              <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5 space-y-4">
                <div className="flex justify-between text-xs font-bold text-white/40 uppercase tracking-widest"><span>Subtotal (Incl.)</span><span>{formatNaira(grossSubtotal)}</span></div>
                <InputField label="Rebate / Discount" type="number" value={discount || ''} onChange={(e:any)=>setDiscount(Math.max(0, parseFloat(e.target.value)||0))} />
                <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                  <div className="flex flex-col"><span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Master Valuation</span><span className="text-4xl font-black text-[#c4a66a] tracking-tighter">{formatNaira(totalDue)}</span></div>
                  <div className="text-right flex flex-col">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{currentBalance < -0.1 ? 'Due' : 'Bal.'}</span>
                    <span className={`text-2xl font-black tracking-tighter ${currentBalance < -0.1 ? 'text-red-400' : 'text-emerald-400'}`}>{formatNaira(Math.abs(currentBalance))}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="p-8 bg-[#1a252f] border-t border-white/5 shrink-0">
            <button onClick={handleSave} className="w-full bg-[#c4a66a] text-[#1a252f] py-6 rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl hover:brightness-110 active:scale-95 transition-all">Authorize & Print 80mm Docket</button>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
};

const WalkInModal = ({ user, initial, onSave, onClose }: any) => {
  const [guest, setGuest] = useState(initial?.guestName || 'POS Guest');
  const [account, setAccount] = useState(initial?.account || DEFAULT_ACCOUNTS[1]);
  const [items, setItems] = useState<POSItem[]>(initial?.items || [{ description: 'POS General Service', amount: 0, quantity: 1 }]);
  const [payments, setPayments] = useState<PaymentEntry[]>(initial?.payments || [{ id: uuid(), amount: 0, method: PaymentMethod.POS }]);

  const grossSubtotal = useMemo(() => items.reduce((s, i) => s + (i.amount * i.quantity), 0), [items]);
  const { net, svc, vat } = useMemo(() => calculateInclusiveFinancials(grossSubtotal), [grossSubtotal]);
  const totalDue = grossSubtotal;
  const totalPaid = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);
  const currentBalance = totalPaid - totalDue;

  const handleSave = () => {
    if (!guest.trim()) return alert("Customer name is required.");
    onSave({
      id: initial?.id || `W-${uuid()}`, type: 'WALK-IN', date: initial?.date || new Date().toISOString(),
      account, guestName: guest, items, subtotal: net, serviceCharge: svc, vat, discount: 0,
      totalDue, payments, totalPaid, balance: currentBalance, cashier: user
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
      <motion.div layout initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-xl w-full">
        <GlassCard className="space-y-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">POS Transaction</h2>
            <button onClick={onClose} className="text-white/20 text-3xl hover:text-white transition-all">&times;</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Guest / Customer" value={guest} onChange={(e:any)=>setGuest(e.target.value)} required />
            <SelectField label="Internal Ledger" value={account} options={DEFAULT_ACCOUNTS} onChange={(e:any)=>setAccount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase text-[#c4a66a] tracking-widest"><span>Order Entries</span><button onClick={()=>setItems([...items, {description: '', amount: 0, quantity: 1}])} className="bg-[#c4a66a]/10 px-2 rounded">+</button></div>
            <div className="max-h-[250px] overflow-y-auto custom-scrollbar space-y-2 pr-2">
              {items.map((it, idx) => (
                <div key={idx} className="flex gap-2">
                  <input className="flex-1 bg-black/40 p-3.5 rounded-xl text-sm outline-none text-white border border-white/5" value={it.description} placeholder="Item" onChange={e=>setItems(items.map((x,i)=>i===idx?{...x, description: e.target.value}:x))} />
                  <input type="number" className="w-16 bg-black/40 p-3.5 rounded-xl text-center font-black text-white border border-white/5" value={it.quantity} min="1" onChange={e=>setItems(items.map((x,i)=>i===idx?{...x, quantity: Math.max(1, parseInt(e.target.value)||1)}:x))} />
                  <input type="number" className="w-24 bg-black/40 p-3.5 rounded-xl text-right font-black text-[#c4a66a] border border-white/5" value={it.amount || ''} placeholder="0" onChange={e=>setItems(items.map((x,i)=>i===idx?{...x, amount: Math.max(0, parseFloat(e.target.value)||0)}:x))} />
                </div>
              ))}
            </div>
          </div>
          <div className="p-6 bg-black/50 rounded-3xl border border-white/5 flex justify-between items-center">
            <span className="font-black text-white/40 uppercase tracking-widest text-[10px]">Grand Total</span>
            <span className="text-3xl font-black text-[#c4a66a]">{formatNaira(totalDue)}</span>
          </div>
          <div className="space-y-3">
             <h3 className="text-[10px] font-black uppercase text-[#c4a66a] tracking-widest">Settlement</h3>
             {payments.map(p => (
                <div key={p.id} className="flex gap-2 bg-white/5 p-2 rounded-2xl items-center">
                  <select className="flex-1 bg-transparent p-2 text-xs text-white outline-none cursor-pointer font-bold" value={p.method} onChange={e=>setPayments(payments.map(px=>px.id===p.id?{...px, method: e.target.value as any}:px))}>
                    {Object.values(PaymentMethod).map(m=><option key={m} value={m} className="bg-[#1e293b]">{m}</option>)}
                  </select>
                  <input type="number" className="w-32 bg-transparent p-2 text-right font-black text-white outline-none" placeholder="0.00" value={p.amount || ''} onChange={e=>setPayments(payments.map(px=>px.id===p.id?{...px, amount: Math.max(0, parseFloat(e.target.value)||0)}:px))} />
                </div>
              ))}
          </div>
          <div className="flex gap-4 pt-4">
             <button onClick={onClose} className="flex-1 text-[10px] font-black uppercase text-white/20">Cancel</button>
             <button onClick={handleSave} className="flex-[2] bg-[#c4a66a] text-[#1a252f] py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl hover:brightness-110 active:scale-95 transition-all">Authorize & Print 80mm</button>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
};

const App = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [modalType, setModalType] = useState<'RES' | 'WALK' | null>(null);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  
  // DATE FILTER STATE
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 3500); // Cinematic loading delay
    const saved = localStorage.getItem('tide_ledger_v25');
    if (saved) setTransactions(JSON.parse(saved));
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => { localStorage.setItem('tide_ledger_v25', JSON.stringify(transactions)); }, [transactions]);

  // DERIVED FILTERED TRANSACTIONS
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const txDate = new Date(t.date).getTime();
      const start = startDate ? new Date(startDate).setHours(0,0,0,0) : null;
      const end = endDate ? new Date(endDate).setHours(23,59,59,999) : null;
      
      if (start && txDate < start) return false;
      if (end && txDate > end) return false;
      return true;
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, startDate, endDate]);

  const stats = useMemo(() => ({
    revenue: filteredTransactions.reduce((s,t)=>s+t.totalPaid, 0),
    receivables: filteredTransactions.reduce((s,t)=>s+(t.balance < -0.1 ? Math.abs(t.balance) : 0), 0),
    total: filteredTransactions.length
  }), [filteredTransactions]);

  if (loading) return (
    <div className="fixed inset-0 bg-[#0f172a] flex flex-col items-center justify-center overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, letterSpacing: "1em" }} 
        animate={{ opacity: 1, scale: 1, letterSpacing: "-0.05em" }} 
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="z-10 text-center"
      >
        <h1 className="text-[12rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-[#c4a66a] to-[#7c633a] tracking-tighter leading-none select-none">TIDÈ</h1>
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 1 }}
          className="text-[#c4a66a] font-black text-xs uppercase tracking-[0.8em] mt-6 opacity-60"
        >
          {TAGLINE}
        </motion.p>
      </motion.div>
      <motion.div 
        initial={{ width: 0 }} 
        animate={{ width: "240px" }} 
        transition={{ delay: 2.2, duration: 1, ease: "easeInOut" }}
        className="h-[1px] bg-gradient-to-r from-transparent via-[#c4a66a]/50 to-transparent mt-12"
      />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md">
        <GlassCard className="p-10 border-[#c4a66a]/10">
          <div className="text-center mb-10"><h2 className="text-4xl font-black text-white uppercase tracking-tighter">Terminal</h2><p className="text-[#c4a66a] text-[10px] font-black uppercase tracking-widest mt-2 opacity-50">Sovereign Management Access</p></div>
          <form onSubmit={(e:any) => { e.preventDefault(); setUser(e.target.u.value || 'Admin'); }} className="space-y-6">
            <InputField label="Operator ID" name="u" placeholder="Full Name" required />
            <InputField label="Secure Key" type="password" placeholder="••••" required />
            <button type="submit" className="w-full bg-[#c4a66a] text-[#1a252f] py-6 rounded-3xl font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Authenticate</button>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <nav className="px-8 py-7 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[#0f172a]/95 backdrop-blur-3xl z-40">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#c4a66a] rounded-xl flex items-center justify-center font-black text-[#1a252f] text-2xl">T</div>
          <h1 className="text-xl font-black uppercase tracking-tighter">Tidè Hotels</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block"><p className="text-[9px] font-black text-white/20 uppercase">Operator</p><p className="font-black text-sm">{user}</p></div>
          <button onClick={()=>setUser(null)} className="p-3 px-6 rounded-xl bg-white/5 hover:bg-red-500/10 text-red-400 text-[9px] font-black uppercase tracking-widest transition-all">Sign Out</button>
        </div>
      </nav>

      <main className="p-8 md:p-14 max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col lg:flex-row justify-between items-end gap-10 border-b border-white/5 pb-14">
          <div>
            <h2 className="text-7xl font-black uppercase tracking-tighter leading-none">Ledger</h2>
            <p className="text-[#c4a66a] font-black text-sm uppercase tracking-[0.4em] opacity-40 mt-3">Financial Authority Hub</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button onClick={() => exportToExcel(filteredTransactions)} className="bg-emerald-500/10 text-emerald-500 px-8 py-5 rounded-2xl font-black text-[10px] uppercase border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all tracking-widest flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              EXCEL LEDGER
            </button>
            <button onClick={()=>{setEditTarget(null); setModalType('WALK');}} className="bg-[#1e293b] px-10 py-5 rounded-2xl font-black text-[10px] uppercase border border-white/10 tracking-widest hover:bg-[#2e3b4e] transition-all">POS DIRECT</button>
            <button onClick={()=>{setEditTarget(null); setModalType('RES');}} className="bg-[#c4a66a] text-[#1a252f] px-10 py-5 rounded-2xl font-black text-[10px] uppercase shadow-2xl tracking-widest hover:brightness-110 active:scale-95 transition-all">NEW FOLIO</button>
          </div>
        </div>

        {/* DATE FILTER CONTROLS */}
        <GlassCard className="!p-6 border-white/5 bg-[#1a252f]/40">
           <div className="flex flex-col md:flex-row items-end gap-6">
              <div className="flex-1 w-full"><InputField label="Start Period" type="date" value={startDate} onChange={(e:any)=>setStartDate(e.target.value)} /></div>
              <div className="flex-1 w-full"><InputField label="End Period" type="date" value={endDate} onChange={(e:any)=>setEndDate(e.target.value)} /></div>
              <button onClick={()=>{setStartDate(''); setEndDate('');}} className="bg-white/5 text-white/40 px-6 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all mb-1">Reset</button>
           </div>
        </GlassCard>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <GlassCard delay={0.1} className="border-l-4 border-emerald-500/40">
             <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Selected Revenue</p>
             <p className="text-5xl font-black mt-3 tracking-tighter">{formatNaira(stats.revenue)}</p>
           </GlassCard>
           <GlassCard delay={0.2} className="border-l-4 border-red-500/40">
             <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Receivables</p>
             <p className="text-5xl font-black mt-3 text-red-400 tracking-tighter">{formatNaira(stats.receivables)}</p>
           </GlassCard>
           <GlassCard delay={0.3} className="border-l-4 border-[#c4a66a]/40">
             <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Active Entries</p>
             <p className="text-5xl font-black mt-3 tracking-tighter">{stats.total}</p>
           </GlassCard>
        </div>

        <GlassCard className="!p-0 border-white/5 overflow-hidden bg-[#1a252f]/40">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-black/30 text-[10px] font-black uppercase text-white/20">
                  <th className="p-6">Docket / Ref</th>
                  <th className="p-6">Entity / Ledger</th>
                  <th className="p-6">Valuation</th>
                  <th className="p-6">Audit Status</th>
                  <th className="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTransactions.map(t=>(
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-6">
                      <p className="font-black text-white/30 text-[9px] tracking-tighter">#{t.id}</p>
                      <p className="text-[10px] opacity-60 mt-1">{new Date(t.date).toLocaleDateString()}</p>
                    </td>
                    <td className="p-6">
                      <p className="font-black text-lg group-hover:text-[#c4a66a] transition-colors leading-none">{t.guestName}</p>
                      <p className="text-[9px] text-[#c4a66a] font-black uppercase mt-1.5 opacity-60">{t.account}</p>
                    </td>
                    <td className="p-6 font-black text-[#c4a66a] text-xl tracking-tight">{formatNaira(t.totalDue)}</td>
                    <td className="p-6">
                      <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${t.balance >= -0.1 ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10' : 'bg-red-500/5 text-red-500 border-red-500/10'}`}>
                        {t.balance >= -0.1 ? 'Settled' : 'Owing'}
                      </span>
                    </td>
                    <td className="p-6 text-right space-x-2">
                       <button onClick={()=>{setEditTarget(t); setModalType(t.type==='RESERVATION'?'RES':'WALK')}} className="p-2 px-5 rounded-xl bg-white/5 text-[9px] font-black uppercase hover:bg-white/10 transition-all">Edit</button>
                       <button onClick={()=>printReceipt(t)} className="p-2 px-5 rounded-xl bg-[#c4a66a]/10 text-[#c4a66a] text-[9px] font-black uppercase hover:bg-[#c4a66a] hover:text-[#1a252f] transition-all">Docket</button>
                       <button onClick={()=>{ if(window.confirm("Permanently delete this entry?")) setTransactions(transactions.filter(x=>x.id!==t.id)); }} className="p-2 px-5 rounded-xl bg-red-500/10 text-red-500 text-[9px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">Del</button>
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && <tr><td colSpan={5} className="p-20 text-center text-white/5 font-black uppercase tracking-[2em] italic opacity-20">No Entries Found</td></tr>}
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

const root = createRoot(document.getElementById('root')!);
root.render(<ErrorBoundary><App /></ErrorBoundary>);
