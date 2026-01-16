
import React, { Component, useState, useEffect, ReactNode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ERROR BOUNDARY
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
interface ErrorBoundaryProps { children?: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: Error | null; }

// Use explicit type parameters for Component to ensure this.props and this.state are correctly typed.
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }
  
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 text-white">
          <div className="bg-[#1e293b] p-10 rounded-3xl shadow-2xl max-w-lg w-full border-2 border-red-500/30 text-center">
            <h1 className="text-3xl font-black text-red-500 mb-4 uppercase">System Error</h1>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full bg-[#c4a66a] text-white py-4 rounded-2xl font-black">REBOOT SYSTEM</button>
          </div>
        </div>
      );
    }
    // Fix: line 32 error was likely caused by a mismatch in class component typing during compilation.
    // Explicitly using this.props.children.
    return this.props.children;
  }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// DATA MODELS & CONSTANTS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const HOTEL_ADDRESS = "38 S.O. Williams Street, Utako, Abuja.";

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

export interface Transaction {
  id: string;
  type: 'RESERVATION' | 'WALK-IN';
  date: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  guestIDType?: IDType;
  guestIDOtherSpec?: string;
  guestIDNumber?: string;
  roomNumber?: string;
  rooms?: BookingRoom[];
  items?: { description: string; amount: number }[];
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

const BANK_DETAILS = [
  { bank: 'Zenith Bank', account: '1311027935', name: 'Tidé Hotels and Resorts' },
  { bank: 'Moniepoint', account: '5169200615', name: 'Tidé Hotels and Resorts' }
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

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// PRINT ENGINE
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const printReceipt = (tx: Transaction) => {
  const p = window.open('', '_blank');
  if (!p) return;

  const isReservation = tx.type === 'RESERVATION';
  const isOwing = tx.balance < -0.1;
  const absBalance = Math.abs(tx.balance);
  const displayIDType = tx.guestIDType === IDType.OTHER ? (tx.guestIDOtherSpec || 'Other') : tx.guestIDType;
  const issueDateStr = new Date(tx.date).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
  const displayDiscount = tx.discount > 0 ? `- ${formatNaira(tx.discount)}` : formatNaira(0);
  
  if (isReservation) {
    p.document.write(`
      <html>
        <head>
          <title>Invoice - ${tx.guestName}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Inter', sans-serif; padding: 0; margin: 0; color: #1e293b; line-height: 1.2; font-size: 11pt; }
            .content-wrapper { display: flex; flex-direction: column; min-height: 270mm; justify-content: space-between; }
            .header { border-bottom: 2px solid #c4a66a; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            .logo h1 { margin: 0; font-weight: 900; font-size: 24pt; color: #0f172a; }
            .logo span { color: #c4a66a; font-weight: bold; font-size: 8pt; text-transform: uppercase; letter-spacing: 2px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; }
            .info-col h4 { border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 5px; font-size: 9pt; text-transform: uppercase; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; table-layout: fixed; }
            th { text-align: left; background: #f8fafc; padding: 10px; font-size: 9pt; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
            td { padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 10pt; word-wrap: break-word; }
            .totals { width: 300px; margin-left: auto; }
            .total-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
            .grand-total { font-weight: 900; font-size: 14pt; border-top: 2px solid #0f172a; margin-top: 5px; padding-top: 5px; }
            .footer { margin-top: auto; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; padding-bottom: 10px; }
            .tagline { color: #c4a66a; font-weight: 900; font-size: 10pt; letter-spacing: 2px; text-transform: uppercase; }
            .bank-box { background:#fefce8; padding:15px; border-radius:8px; border:1px solid #fef08a; margin-top:15px; }
          </style>
        </head>
        <body>
          <div class="content-wrapper">
            <div>
              <div class="header">
                <div class="logo"><h1>TIDÈ HOTELS</h1><span>${HOTEL_ADDRESS}</span></div>
                <div style="text-align: right;"><h2>INVOICE FOLIO</h2><p>#${tx.id}</p></div>
              </div>
              <div class="grid">
                <div class="info-col">
                  <h4>GUEST INFORMATION</h4>
                  <p><strong>${tx.guestName}</strong></p>
                  <p>${tx.guestEmail || '---'}</p>
                  <p>${tx.guestPhone || '---'}</p>
                  <p>${displayIDType}: ${tx.guestIDNumber || '---'}</p>
                </div>
                <div class="info-col" style="text-align: right;">
                  <h4>STAY DETAILS</h4>
                  <p>Folio Ref: ${tx.roomNumber}</p>
                  <p>Issued: ${issueDateStr}</p>
                  <p>Cashier: ${tx.cashier}</p>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 35%;">Description</th>
                    <th style="width: 15%;">Qty</th>
                    <th style="width: 20%;">Rate (Inc.)</th>
                    <th style="width: 10%;">Nights</th>
                    <th style="width: 20%; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>${tx.rooms?.map(r => `<tr><td>${r.roomType}<br/><small style="color: #64748b;">${r.checkIn} to ${r.checkOut}</small></td><td>${r.quantity}</td><td>${formatNaira(r.ratePerNight)}</td><td>${r.nights}</td><td style="text-align: right;">${formatNaira(r.ratePerNight * r.nights * r.quantity)}</td></tr>`).join('')}</tbody>
              </table>
              <div class="totals">
                <div class="total-row"><span>Subtotal (Net + SC)</span><span>${formatNaira(tx.subtotal + tx.serviceCharge)}</span></div>
                <div class="total-row"><span>VAT (7.5%)</span><span>${formatNaira(tx.vat)}</span></div>
                <div class="total-row"><span>Discount</span><span>${displayDiscount}</span></div>
                <div class="total-row grand-total"><span>Total Due</span><span>${formatNaira(tx.totalDue)}</span></div>
                <div class="total-row"><span>Total Paid</span><span>${formatNaira(tx.totalPaid)}</span></div>
                <div class="total-row" style="color:${isOwing ? 'red' : 'green'}; font-weight: bold;">
                  <span>${isOwing ? 'Balance Due' : 'Balance'}</span><span>${formatNaira(absBalance)}</span>
                </div>
              </div>
              ${isOwing ? `
                <div class="bank-box">
                  <h4 style="margin:0 0 8px 0; font-size:10pt; color:#a16207;">OFFICIAL SETTLEMENT INFO</h4>
                  ${BANK_DETAILS.map(b => `<p style="font-size:9pt; margin:3px 0;"><strong>${b.bank}</strong> | ${b.account} | ${b.name}</p>`).join('')}
                </div>
              ` : ''}
            </div>
            <div class="footer">
              <p>Thank you for choosing Tidè Hotels. We look forward to welcoming you again soon.</p>
              <div class="tagline">Where Boldness Meets Elegance</div>
            </div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
  } else {
    p.document.write(`
      <html>
        <head>
          <style>
            @page { margin: 0; }
            body { font-family: 'monospace'; width: 72mm; margin: 0 auto; padding: 10px; font-size: 11px; line-height: 1.2; text-align: center; }
            .row { display: flex; justify-content: space-between; text-align: left; margin: 2px 0; }
            .sep { border-bottom: 1px dashed #000; margin: 8px 0; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="bold" style="font-size: 14px;">TIDÈ HOTELS</div>
          <div style="font-size: 9px;">${HOTEL_ADDRESS}</div>
          <div class="sep"></div>
          <div class="bold">WALK-IN DOCKET</div>
          <div class="row"><span>ID:</span><span>#${tx.id}</span></div>
          <div class="row"><span>Guest:</span><span>${tx.guestName}</span></div>
          <div class="row"><span>Date:</span><span>${issueDateStr}</span></div>
          <div class="sep"></div>
          ${tx.items?.map(i => `<div class="row"><span>${i.description}</span><span>${formatNaira(i.amount)}</span></div>`).join('')}
          <div class="sep"></div>
          <div class="row"><span>VAT (7.5%):</span><span>${formatNaira(tx.vat)}</span></div>
          <div class="row bold"><span>TOTAL:</span><span>${formatNaira(tx.totalDue)}</span></div>
          <div class="row"><span>PAID:</span><span>${formatNaira(tx.totalPaid)}</span></div>
          <div class="row bold"><span>${isOwing ? 'OWING' : 'BAL'}:</span><span>${formatNaira(absBalance)}</span></div>
          ${isOwing ? `<div class="sep"></div><div class="bold" style="margin-bottom:4px;">TRANSFER TO:</div>${BANK_DETAILS.map(b => `<div style="font-size:9px; text-align:left;">${b.bank}: ${b.account}</div>`).join('')}` : ''}
          <div class="sep"></div>
          <div style="font-style:italic; font-size:9px;">Boldness Meets Elegance</div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
  }
  p.document.close();
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// UI WRAPPERS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const GlassCard = ({ children, className = "" }: { children?: ReactNode, className?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: "circOut" }}
    className={`bg-[#1e293b]/80 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl p-6 ${className}`}
  >
    {children}
  </motion.div>
);

const InputField = ({ label, ...props }: any) => (
  <div className="space-y-1 w-full overflow-hidden">
    <label className="text-[10px] font-black uppercase text-[#c4a66a] tracking-widest pl-1 block truncate">
      {label} {props.required && <span className="text-red-500">*</span>}
    </label>
    <input 
      {...props} 
      className="w-full bg-[#0f172a] border border-white/10 text-white p-4 rounded-2xl outline-none focus:border-[#c4a66a] transition-all font-medium text-sm placeholder:text-white/20" 
    />
  </div>
);

const SelectField = ({ label, options, ...props }: any) => (
  <div className="space-y-1 w-full overflow-hidden">
    <label className="text-[10px] font-black uppercase text-[#c4a66a] tracking-widest pl-1 block truncate">{label}</label>
    <select {...props} className="w-full bg-[#0f172a] border border-white/10 text-white p-4 rounded-2xl outline-none focus:border-[#c4a66a] transition-all font-medium text-sm appearance-none cursor-pointer">
      {options.map((o: any) => <option key={o.value || o} value={o.value || o} className="bg-[#1a252f] text-white">{o.label || o}</option>)}
    </select>
  </div>
);

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// RESERVATION MODAL
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const ReservationModal = ({ onSave, onClose, initial, cashierName }: any) => {
  // Try to load draft if not editing existing
  const draftKey = 'tide_res_draft';
  const getInitial = (key: string, def: any) => {
    if (initial) return initial[key];
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try { return JSON.parse(saved)[key]; } catch { return def; }
    }
    return def;
  };

  const [guest, setGuest] = useState(() => getInitial('guestName', ''));
  const [email, setEmail] = useState(() => getInitial('guestEmail', ''));
  const [phone, setPhone] = useState(() => getInitial('guestPhone', ''));
  const [idType, setIdType] = useState<IDType>(() => getInitial('guestIDType', IDType.NIN));
  const [idOther, setIdOther] = useState(() => getInitial('guestIDOtherSpec', ''));
  const [idNum, setIdNum] = useState(() => getInitial('guestIDNumber', ''));
  const [roomNo, setRoomNo] = useState(() => getInitial('roomNumber', ''));
  const [rooms, setRooms] = useState<BookingRoom[]>(() => getInitial('rooms', [{ 
    id: uuid(), 
    roomType: RoomType.SOJOURN_ROOM, 
    checkIn: new Date().toISOString().split('T')[0], 
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0], 
    nights: 1, 
    ratePerNight: ROOM_RATES[RoomType.SOJOURN_ROOM],
    quantity: 1
  }]));
  const [payments, setPayments] = useState<PaymentEntry[]>(() => getInitial('payments', [{ id: uuid(), amount: 0, method: PaymentMethod.POS }]));
  const [discount, setDiscount] = useState(() => getInitial('discount', 0));
  const [manualSvc, setManualSvc] = useState<number | null>(() => getInitial('serviceCharge', null));
  const [manualVat, setManualVat] = useState<number | null>(() => getInitial('vat', null));

  // Auto-save logic
  useEffect(() => {
    if (!initial) {
      const draft = { guestName: guest, guestEmail: email, guestPhone: phone, guestIDType: idType, guestIDOtherSpec: idOther, guestIDNumber: idNum, roomNumber: roomNo, rooms, payments, discount, serviceCharge: manualSvc, vat: manualVat };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    }
  }, [guest, email, phone, idType, idOther, idNum, roomNo, rooms, payments, discount, manualSvc, manualVat]);

  const grossSubtotal = useMemo(() => rooms.reduce((s, r) => s + (r.ratePerNight * r.nights * (r.quantity || 1)), 0), [rooms]);
  const { net, svc, vat } = useMemo(() => calculateInclusiveFinancials(grossSubtotal), [grossSubtotal]);
  
  const finalSvc = manualSvc ?? svc;
  const finalVat = manualVat ?? vat;
  const totalDue = grossSubtotal - discount; 
  
  const totalPaid = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);
  const currentBalance = totalPaid - totalDue;

  const updateNights = (rid: string, cin: string, cout: string) => {
    const start = new Date(cin);
    const end = new Date(cout);
    const diff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
    setRooms(rooms.map(r => r.id === rid ? { ...r, checkIn: cin, checkOut: cout, nights: diff } : r));
  };

  const handleSave = () => {
    if (!guest.trim()) return alert("VALIDATION ERROR: Guest Name is required.");
    if (!email.trim()) return alert("VALIDATION ERROR: Email is required for reservations.");
    
    // Clear draft on successful auth
    if (!initial) localStorage.removeItem(draftKey);

    onSave({
      id: initial?.id || `RES-${uuid()}`, type: 'RESERVATION', date: new Date().toISOString(),
      guestName: guest, guestEmail: email, guestPhone: phone, guestIDType: idType, guestIDOtherSpec: idOther, guestIDNumber: idNum,
      roomNumber: roomNo, rooms, subtotal: net, serviceCharge: finalSvc, vat: finalVat, discount, totalDue,
      payments, totalPaid, balance: currentBalance, cashier: cashierName
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} className="max-w-7xl w-full max-h-[92vh] flex flex-col">
        <GlassCard className="!p-0 border-[#c4a66a]/20 h-full flex flex-col overflow-hidden">
          <div className="p-6 bg-[#1a252f] flex justify-between items-center border-b border-white/5 shrink-0">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <span className="w-1.5 h-6 bg-[#c4a66a] rounded-full"></span>
              Reservation Folio
            </h2>
            <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all">&times;</button>
          </div>
          
          <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <div className="md:col-span-2"><InputField label="Guest Full Name" value={guest} onChange={(e:any)=>setGuest(e.target.value)} required /></div>
              <InputField label="Primary Phone" value={phone} onChange={(e:any)=>setPhone(e.target.value)} />
              <InputField label="Folio Reference" value={roomNo} placeholder="e.g. Room 301 / Corporate" onChange={(e:any)=>setRoomNo(e.target.value)} />
              
              <SelectField label="ID Protocol" value={idType} options={Object.values(IDType)} onChange={(e:any)=>setIdType(e.target.value)} />
              {idType === IDType.OTHER && <InputField label="Specify ID Type" value={idOther} onChange={(e:any)=>setIdOther(e.target.value)} />}
              <div className={`${idType === IDType.OTHER ? 'md:col-span-1' : 'md:col-span-2'}`}><InputField label="ID Serial Number" value={idNum} onChange={(e:any)=>setIdNum(e.target.value)} /></div>
              <InputField label="Electronic Mail" type="email" value={email} onChange={(e:any)=>setEmail(e.target.value)} required />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h3 className="text-[10px] font-black text-[#c4a66a] uppercase tracking-widest">Stay Configuration</h3>
                <button onClick={()=>setRooms([...rooms, { id: uuid(), roomType: RoomType.SOJOURN_ROOM, checkIn: '', checkOut: '', nights: 1, ratePerNight: ROOM_RATES[RoomType.SOJOURN_ROOM], quantity: 1 }])} className="text-[#c4a66a] text-[10px] font-black uppercase hover:opacity-70 transition-opacity bg-[#c4a66a]/10 px-4 py-2 rounded-lg">+ Add Stay Unit</button>
              </div>
              <div className="space-y-4">
                {rooms.map((r, i) => (
                  <motion.div initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} key={r.id} className="grid grid-cols-1 md:grid-cols-8 lg:grid-cols-12 gap-4 bg-[#0f172a] p-5 rounded-2xl border border-white/5 items-end">
                    <div className="md:col-span-2 lg:col-span-3"><SelectField label="Room Category" value={r.roomType} options={Object.values(RoomType)} onChange={(e:any)=>setRooms(rooms.map(rx=>rx.id===r.id?{...rx, roomType: e.target.value, ratePerNight: ROOM_RATES[e.target.value as RoomType]}:rx))} /></div>
                    <div className="md:col-span-1 lg:col-span-1"><InputField label="Qty" type="number" value={r.quantity} min="1" onChange={(e:any)=>setRooms(rooms.map(rx=>rx.id===r.id?{...rx, quantity: Math.max(1, parseInt(e.target.value)||1)}:rx))} /></div>
                    <div className="md:col-span-1 lg:col-span-2"><InputField label="Rate" type="number" value={r.ratePerNight} onChange={(e:any)=>setRooms(rooms.map(rx=>rx.id===r.id?{...rx, ratePerNight: Math.max(0, parseFloat(e.target.value)||0)}:rx))} /></div>
                    <div className="md:col-span-2 lg:col-span-2"><InputField label="Check-In" type="date" value={r.checkIn} onChange={(e:any)=>updateNights(r.id, e.target.value, r.checkOut)} /></div>
                    <div className="md:col-span-2 lg:col-span-2"><InputField label="Check-Out" type="date" value={r.checkOut} onChange={(e:any)=>updateNights(r.id, r.checkIn, e.target.value)} /></div>
                    <div className="flex flex-col items-center justify-center bg-[#1a252f] p-3.5 rounded-xl border border-white/5 text-center min-w-[60px] lg:col-span-1">
                      <span className="text-[9px] text-white/30 uppercase font-bold">Nights</span>
                      <span className="font-black text-[#c4a66a]">{r.nights}</span>
                    </div>
                    <button onClick={()=>setRooms(rooms.filter(rx=>rx.id!==r.id))} className="text-red-500/20 hover:text-red-500 p-4 transition-colors flex items-center justify-center lg:col-span-1">&times;</button>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 border-t border-white/5 pt-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center"><h3 className="text-[10px] font-black text-[#c4a66a] uppercase tracking-widest">Settlement</h3><button onClick={()=>setPayments([...payments, {id: uuid(), amount: 0, method: PaymentMethod.POS}])} className="text-[#c4a66a] text-[10px] font-black uppercase bg-[#c4a66a]/10 px-4 py-2 rounded-lg">+ Add Split</button></div>
                <div className="space-y-3">
                  {payments.map(p => (
                    <div key={p.id} className="flex gap-3 bg-[#0f172a] p-3.5 rounded-2xl border border-white/5 group">
                      <select className="bg-transparent text-xs text-white outline-none flex-1 font-bold cursor-pointer" value={p.method} onChange={e=>setPayments(payments.map(px=>px.id===p.id?{...px, method: e.target.value as any}:px))}>
                        {Object.values(PaymentMethod).map(m=><option key={m} value={m} className="bg-[#1e293b]">{m}</option>)}
                      </select>
                      <input type="number" className="bg-transparent text-right font-black w-32 outline-none border-b border-white/10 group-focus-within:border-[#c4a66a] transition-all" placeholder="Amount" value={p.amount || ''} onChange={e=>setPayments(payments.map(px=>px.id===p.id?{...px, amount: Math.max(0, parseFloat(e.target.value)||0)}:px))} />
                      <button onClick={() => setPayments(payments.filter(px => px.id !== p.id))} className="text-red-500/30 hover:text-red-500 transition-colors px-2">&times;</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5 space-y-5">
                <div className="flex justify-between text-xs font-bold text-white/40 uppercase tracking-widest"><span>Gross Subtotal</span><span>{formatNaira(grossSubtotal)}</span></div>
                <div className="grid grid-cols-2 gap-6 opacity-60">
                  <div className="flex flex-col"><span className="text-[10px] uppercase font-black text-[#c4a66a]">SC (10% Inc.)</span><span className="text-sm font-bold">{formatNaira(finalSvc)}</span></div>
                  <div className="flex flex-col"><span className="text-[10px] uppercase font-black text-[#c4a66a]">VAT (7.5% Inc.)</span><span className="text-sm font-bold">{formatNaira(finalVat)}</span></div>
                </div>
                <InputField label="Corporate Discount" type="number" value={discount || ''} onChange={(e:any)=>setDiscount(Math.max(0, parseFloat(e.target.value)||0))} />
                <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Total Valuation</span>
                    <span className="text-4xl font-black text-[#c4a66a] tracking-tighter">{formatNaira(totalDue)}</span>
                  </div>
                  <div className="text-right flex flex-col">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{currentBalance < -0.1 ? 'Balance Due' : 'Balance'}</span>
                    <span className={`text-2xl font-black tracking-tighter ${currentBalance < -0.1 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatNaira(Math.abs(currentBalance))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="p-8 bg-[#1a252f] border-t border-white/5 shrink-0">
            <button onClick={handleSave} className="w-full bg-gradient-to-r from-[#c4a66a] to-[#a38954] text-[#1a252f] py-6 rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl hover:brightness-110 active:scale-[0.99] transition-all">Authorize & Print Master Folio</button>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// WALK-IN MODAL
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const WalkInModal = ({ user, initial, onSave, onClose }: any) => {
  const draftKey = 'tide_walkin_draft';
  const getInitial = (key: string, def: any) => {
    if (initial) return initial[key];
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try { return JSON.parse(saved)[key]; } catch { return def; }
    }
    return def;
  };

  const [guest, setGuest] = useState(() => getInitial('guestName', 'Walk-In Guest'));
  const [items, setItems] = useState(() => getInitial('items', [{ description: 'Bar/Restaurant', amount: 0 }]));
  const [payments, setPayments] = useState<PaymentEntry[]>(() => getInitial('payments', [{ id: uuid(), amount: 0, method: PaymentMethod.POS }]));

  // Auto-save logic
  useEffect(() => {
    if (!initial) {
      const draft = { guestName: guest, items, payments };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    }
  }, [guest, items, payments]);

  const grossSubtotal = useMemo(() => items.reduce((s:any, i:any) => s + i.amount, 0), [items]);
  const { net, svc, vat } = useMemo(() => calculateInclusiveFinancials(grossSubtotal), [grossSubtotal]);
  const totalDue = grossSubtotal;
  
  const totalPaid = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);
  const currentBalance = totalPaid - totalDue;

  const handleSave = () => {
    if (!guest.trim()) return alert("VALIDATION ERROR: Guest/Customer Label is required.");
    
    // Clear draft on successful auth
    if (!initial) localStorage.removeItem(draftKey);

    onSave({
      id: initial?.id || `W-${uuid()}`, type: 'WALK-IN', date: new Date().toISOString(),
      guestName: guest, items, subtotal: net, serviceCharge: svc, vat, discount: 0,
      totalDue, payments, totalPaid, balance: currentBalance, cashier: user
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-xl w-full">
        <GlassCard className="space-y-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">POS Direct Sale</h2>
            <button onClick={onClose} className="text-white/20 text-3xl hover:text-white transition-all">&times;</button>
          </div>
          
          <InputField label="Customer / Tab Label" value={guest} onChange={(e:any)=>setGuest(e.target.value)} required />
          
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase text-[#c4a66a] tracking-widest">
              <span>Order Items</span>
              <button onClick={()=>setItems([...items, {description: '', amount: 0}])} className="bg-[#c4a66a]/10 p-1 px-3 rounded-md hover:bg-[#c4a66a]/20 transition-all">+</button>
            </div>
            <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="flex gap-2">
                  <input className="flex-1 bg-black/40 p-3.5 rounded-xl text-sm outline-none text-white border border-white/5 focus:border-[#c4a66a]/50" value={it.description} placeholder="Description" onChange={e=>setItems(items.map((x,i)=>i===idx?{...x, description: e.target.value}:x))} />
                  <input type="number" className="w-28 bg-black/40 p-3.5 rounded-xl text-right font-black text-[#c4a66a] outline-none border border-white/5 focus:border-[#c4a66a]/50" value={it.amount || ''} onChange={e=>setItems(items.map((x,i)=>i===idx?{...x, amount: Math.max(0, parseFloat(e.target.value)||0)}:x))} />
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-6 bg-black/50 rounded-3xl border border-white/5 space-y-3">
            <div className="flex justify-between text-[10px] font-bold text-white/30 uppercase tracking-widest">
              <span>Net Subtotal</span>
              <span>{formatNaira(net)}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-[#c4a66a] uppercase">Service Charge (Inc.)</span>
                <span className="text-xs font-bold text-white/60">{formatNaira(svc)}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[9px] font-black text-[#c4a66a] uppercase">VAT (Inc.)</span>
                <span className="text-xs font-bold text-white/60">{formatNaira(vat)}</span>
              </div>
            </div>
            <div className="flex justify-between text-2xl font-black pt-3 border-t border-white/10 tracking-tighter">
              <span>Grand Total</span>
              <span className="text-[#c4a66a]">{formatNaira(totalDue)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-1 border-t border-white/5 text-white/40">
              <span>{currentBalance < -0.1 ? 'Balance Due:' : 'Balance:'}</span>
              <span className={currentBalance < -0.1 ? 'text-red-400' : 'text-emerald-400'}>
                {formatNaira(Math.abs(currentBalance))}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-[10px] font-black uppercase text-[#c4a66a] tracking-widest">
              <span>Settlement (Amount Paid)</span>
              <button onClick={() => setPayments([...payments, {id: uuid(), amount: 0, method: PaymentMethod.POS}])} className="text-[9px] bg-[#c4a66a]/20 px-2 py-1 rounded hover:bg-[#c4a66a]/30 transition-all">+</button>
            </div>
            <div className="max-h-[140px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {payments.map(p => (
                <div key={p.id} className="flex gap-2 bg-white/5 p-2 rounded-2xl items-center">
                  <select className="flex-1 bg-transparent p-2 text-xs text-white outline-none cursor-pointer font-bold" value={p.method} onChange={e=>setPayments(payments.map(px=>px.id===p.id?{...px, method: e.target.value as any}:px))}>
                    {Object.values(PaymentMethod).map(m=><option key={m} value={m} className="bg-[#1e293b]">{m}</option>)}
                  </select>
                  <input type="number" className="w-32 bg-transparent p-2 text-right font-black text-white outline-none border-b border-white/10 focus:border-[#c4a66a] transition-all" placeholder="0.00" value={p.amount || ''} onChange={e=>setPayments(payments.map(px=>px.id===p.id?{...px, amount: Math.max(0, parseFloat(e.target.value)||0)}:px))} />
                  <button onClick={() => setPayments(payments.filter(px => px.id !== p.id))} className="text-red-500/30 hover:text-red-500 transition-colors px-2">&times;</button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex gap-4 pt-6">
             <button onClick={onClose} className="flex-1 text-[10px] font-black uppercase text-white/20 tracking-widest hover:text-white transition-all">Cancel</button>
             <button onClick={handleSave} className="flex-[2] bg-[#c4a66a] text-[#1a252f] py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl hover:brightness-110 active:scale-95 transition-all">Authorize & Print</button>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// MAIN APPLICATION
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const App = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [modalType, setModalType] = useState<'RES' | 'WALK' | null>(null);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2800);
    const saved = localStorage.getItem('tide_v25_ultra');
    if (saved) setTransactions(JSON.parse(saved));
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => { localStorage.setItem('tide_v25_ultra', JSON.stringify(transactions)); }, [transactions]);

  const stats = useMemo(() => ({
    revenue: transactions.reduce((s,t)=>s+t.totalPaid, 0),
    receivables: transactions.reduce((s,t)=>s+(t.balance < -0.1 ? Math.abs(t.balance) : 0), 0),
    total: transactions.length
  }), [transactions]);

  const handleDelete = (id: string) => {
    if (window.confirm("CRITICAL ACTION: Are you sure you want to permanently delete this record?")) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  if (loading) return (
    <div className="fixed inset-0 bg-[#0f172a] flex flex-col items-center justify-center overflow-hidden">
      <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.2, ease: "circOut" }}>
        <h1 className="text-9xl md:text-[14rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-[#c4a66a] to-[#7c633a] tracking-tighter leading-none select-none">TIDÈ</h1>
        <div className="h-1 bg-gradient-to-r from-transparent via-[#c4a66a]/40 to-transparent mt-2 relative">
          <motion.div initial={{ left: '-100%' }} animate={{ left: '100%' }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }} className="absolute h-full w-1/2 bg-[#c4a66a] blur-sm" />
        </div>
      </motion.div>
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 0.3, y: 0 }} transition={{ delay: 0.5 }} className="mt-12 text-white uppercase tracking-[1.8em] font-black text-[10px] pl-[1.8em]">Sovereign Management Suite</motion.p>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1e293b] via-[#0f172a] to-[#0f172a]">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md">
        <GlassCard className="border-[#c4a66a]/10 backdrop-blur-3xl p-10">
          <div className="text-center mb-12"><h2 className="text-5xl font-black text-white uppercase tracking-tighter">Terminal</h2><p className="text-[#c4a66a] text-[10px] font-black uppercase mt-3 tracking-widest opacity-60">Authentication Authority</p></div>
          <form onSubmit={(e:any) => { e.preventDefault(); setUser(e.target.u.value || 'Admin'); }} className="space-y-6">
            <InputField label="Staff Alias" name="u" placeholder="Your Official Name" required />
            <InputField label="Secure Key" type="password" placeholder="••••" required />
            <button type="submit" className="w-full bg-[#c4a66a] text-[#1a252f] py-6 rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-amber-950/20 active:scale-95 transition-all mt-4">Initiate Session</button>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-white selection:bg-[#c4a66a]/40">
      <nav className="px-8 py-7 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[#0f172a]/95 backdrop-blur-3xl z-40">
        <div className="flex items-center gap-6">
          <motion.div whileHover={{ scale: 1.05 }} className="w-16 h-16 bg-gradient-to-br from-[#c4a66a] to-[#7c633a] rounded-[1.25rem] flex items-center justify-center font-black text-[#1a252f] text-4xl shadow-xl shadow-amber-950/20">T</motion.div>
          <div className="hidden sm:block">
            <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">Tidè Hotels</h1>
            <p className="text-[#c4a66a] text-[10px] font-black uppercase tracking-widest mt-1.5 opacity-60">Central Audit Ledger</p>
          </div>
        </div>
        <div className="flex items-center gap-10">
          <div className="text-right hidden md:block"><p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Active Operator</p><p className="font-black text-base text-white/90 tracking-tight">{user}</p></div>
          <button onClick={()=>setUser(null)} className="p-4 px-8 rounded-2xl bg-white/5 hover:bg-red-500/10 border border-white/5 text-[9px] font-black uppercase tracking-widest transition-all hover:text-red-400">Terminate</button>
        </div>
      </nav>

      <main className="p-8 md:p-14 max-w-7xl mx-auto space-y-16">
        <div className="flex flex-col lg:flex-row justify-between items-end gap-10 border-b border-white/5 pb-14">
          <div className="w-full lg:w-auto">
            <motion.h2 initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="text-7xl font-black uppercase tracking-tighter leading-[0.85]">Ledger Control</motion.h2>
            <p className="text-[#c4a66a] font-black text-sm uppercase tracking-[0.4em] opacity-40 mt-4">Financial Authority Hub</p>
          </div>
          <div className="flex gap-4 w-full lg:w-auto">
            <button onClick={()=>{setEditTarget(null); setModalType('WALK');}} className="flex-1 lg:flex-none bg-[#1e293b] px-12 py-6 rounded-[2rem] font-black text-[10px] uppercase border border-white/10 hover:border-[#c4a66a]/40 transition-all shadow-xl tracking-widest">POS ENTRY</button>
            <button onClick={()=>{setEditTarget(null); setModalType('RES');}} className="flex-1 lg:flex-none bg-[#c4a66a] text-[#1a252f] px-12 py-6 rounded-[2rem] font-black text-[10px] uppercase shadow-2xl hover:brightness-110 active:scale-95 transition-all tracking-widest">RESERVATION</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
           <GlassCard className="border-l-8 border-emerald-500/40 hover:scale-[1.02] transition-transform cursor-default">
             <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Gross Liquidity</p>
             <p className="text-5xl font-black mt-4 tracking-tighter">{formatNaira(stats.revenue)}</p>
           </GlassCard>
           <GlassCard className="border-l-8 border-red-500/40 hover:scale-[1.02] transition-transform cursor-default">
             <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Outstanding Receivables</p>
             <p className="text-5xl font-black mt-4 text-red-400 tracking-tighter">{formatNaira(stats.receivables)}</p>
           </GlassCard>
           <GlassCard className="border-l-8 border-[#c4a66a]/40 hover:scale-[1.02] transition-transform cursor-default">
             <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Total Folios</p>
             <p className="text-5xl font-black mt-4 tracking-tighter">{stats.total}</p>
           </GlassCard>
        </div>

        <GlassCard className="!p-0 border-white/5 bg-[#1e293b]/40 backdrop-blur-2xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-black/30 text-[10px] font-black uppercase text-white/20 border-b border-white/5">
                  <th className="p-8">Registry ID</th>
                  <th className="p-8">Entity Details</th>
                  <th className="p-8">Net Valuation</th>
                  <th className="p-8">Audit Status</th>
                  <th className="p-8 text-right">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence>
                  {transactions.sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).map(t=>(
                    <motion.tr layout key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/[0.03] group transition-all">
                      <td className="p-8 align-top">
                        <span className={`text-[9px] px-4 py-1.5 rounded-full border font-black tracking-widest ${t.type === 'RESERVATION' ? 'text-blue-400 border-blue-400/20 bg-blue-400/5' : 'text-purple-400 border-purple-400/20 bg-purple-400/5'}`}>{t.type}</span>
                        <p className="font-mono text-[10px] mt-5 text-white/20 tracking-tighter font-bold">#{t.id}</p>
                      </td>
                      <td className="p-8 align-top">
                        <p className="font-black group-hover:text-[#c4a66a] transition-colors text-xl tracking-tight leading-none truncate max-w-[280px]">{t.guestName}</p>
                        <p className="text-[10px] text-white/20 uppercase font-black mt-3 tracking-widest">{t.roomNumber || 'Quick POS Service'}</p>
                      </td>
                      <td className="p-8 align-top font-black text-[#c4a66a] text-xl tracking-tight">{formatNaira(t.totalDue)}</td>
                      <td className="p-8 align-top">
                        <div className={`text-[10px] font-black uppercase font-bold flex items-center gap-4 tracking-widest ${t.balance >= -0.1 ? 'text-emerald-500' : 'text-red-500'}`}>
                          <div className={`w-2.5 h-2.5 rounded-full ${t.balance >= -0.1 ? 'bg-emerald-500 shadow-[0_0_12px_#10b981]' : 'bg-red-500 shadow-[0_0_12px_#ef4444]'}`}></div>
                          {t.balance >= -0.1 ? 'Settled' : 'Owing'}
                        </div>
                      </td>
                      <td className="p-8 text-right space-x-2 align-top">
                        <div className="flex flex-wrap gap-2 justify-end">
                           <button onClick={()=>{setEditTarget(t); setModalType(t.type==='RESERVATION'?'RES':'WALK')}} className="p-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase border border-white/5 transition-all tracking-widest">Edit</button>
                           <button onClick={()=>printReceipt(t)} className="p-3 px-5 rounded-xl bg-[#c4a66a]/10 text-[#c4a66a] hover:bg-[#c4a66a] hover:text-[#1a252f] text-[9px] font-black uppercase border border-[#c4a66a]/20 transition-all tracking-widest">Docket</button>
                           <button onClick={()=>handleDelete(t.id)} className="p-3 px-5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white text-[9px] font-black uppercase border border-red-500/20 transition-all tracking-widest">Delete</button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {transactions.length === 0 && <tr><td colSpan={5} className="p-40 text-center text-white/5 font-black uppercase tracking-[3em] italic">No Records Identified</td></tr>}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </main>

      <AnimatePresence>
        {modalType === 'RES' && <ReservationModal initial={editTarget} cashierName={user} onSave={(tx:any)=>{setTransactions([tx,...transactions.filter(o=>o.id!==tx.id)]); setModalType(null); printReceipt(tx);}} onClose={()=>setModalType(null)} />}
        {modalType === 'WALK' && <WalkInModal initial={editTarget} user={user} onSave={(tx:any)=>{setTransactions([tx,...transactions.filter(o=>o.id!==tx.id)]); setModalType(null); printReceipt(tx);}} onClose={()=>setModalType(null)} />}
      </AnimatePresence>
      <footer className="p-20 text-center opacity-10 hover:opacity-50 transition-opacity cursor-default"><p className="text-[10px] font-black uppercase tracking-[1em]">Tidè Hotels & Resorts &bull; Sovereign Management Interface &bull; Est 2025</p></footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<ErrorBoundary><App /></ErrorBoundary>);
