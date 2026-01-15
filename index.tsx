
import React, { Component, useState, useEffect, useMemo, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ERROR BOUNDARY
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };
  declare props: Readonly<ErrorBoundaryProps>;

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
          <div className="bg-white p-8 rounded shadow-xl max-w-lg w-full border-l-4 border-red-500">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong.</h1>
            <p className="text-gray-700 mb-4">The application encountered an unexpected error.</p>
            <div className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-40 mb-4 font-mono">
              {this.state.error?.toString()}
            </div>
            <button 
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 w-full"
            >
              Clear Data & Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// GLOBAL DECLARATIONS & TYPES
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
declare const window: any;

export enum RoomType {
  SOJOURN_ROOM = 'The Sojourn Room (Standard)',
  TRANQUIL_ROOM = 'The Tranquil Room (Double)',
  HARMONY_STUDIO = 'The Harmony Studio (Double Deluxe/Superior Executive)',
  SERENITY_STUDIO = 'The Serenity Studio (Studio, Executive Room)',
  NARRATIVE_SUITE = 'The Narrative Suite (One Bedroom Business Suite)',
  ODYSSEY_SUITE = 'The Odyssey Suite (One Bedroom Executive Suite)',
  TIDE_SIGNATURE_SUITE = 'The Tidé Signature Suite (One Bedroom Presidential Suite)',
}

export enum PaymentMethod {
  CASH = 'Cash',
  POS = 'POS',
  BANK_TRANSFER = 'Bank Transfer',
  PENDING = 'Pending',
  OTHER = 'Other',
}

export enum InvoiceStatus {
  PENDING = 'Pending Payment',
  PARTIAL = 'Partially Paid',
  PAID = 'Fully Paid',
}

export interface AdditionalChargeItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface BookingItem {
  id:string;
  roomType: RoomType;
  quantity: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  ratePerNight: number;
  subtotal: number;
}

export interface PaymentItem {
  id: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  recordedBy: string;
}

export interface VerificationDetails {
  paymentReference: string;
  verifiedBy: string;
  dateVerified: string;
}

export interface InvoiceData {
  id: string;
  invoiceNo?: string;
  receiptNo: string;
  date: string;
  lastUpdatedAt: string;
  guestName: string;
  guestEmail: string;
  phoneContact: string;
  roomNumber: string;
  documentType: 'reservation' | 'receipt';
  status: InvoiceStatus;
  bookings: BookingItem[];
  additionalChargeItems: AdditionalChargeItem[];
  subtotal: number;
  discount: number;
  holidaySpecialDiscountName: string;
  holidaySpecialDiscount: number;
  serviceCharge: number; 
  taxPercentage: number;
  taxAmount: number;
  totalAmountDue: number;
  payments: PaymentItem[];
  amountReceived: number;
  balance: number;
  amountInWords: string;
  paymentPurpose: string;
  receivedBy: string;
  designation: string;
  currency: 'NGN' | 'USD';
  verificationDetails?: VerificationDetails;
}

export enum WalkInService {
  RESTAURANT = 'Restaurant',
  BAR = 'Bar',
  LAUNDRY = 'Laundry',
  OTHER = 'Other',
}

export interface WalkInChargeItem {
  id: string;
  date: string;
  service: WalkInService;
  otherServiceDescription?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  paymentMethod: PaymentMethod;
}

export interface WalkInPayment {
  id: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
}

export interface WalkInTransaction {
  id: string;
  transactionDate: string;
  charges: WalkInChargeItem[];
  currency: 'NGN' | 'USD';
  subtotal: number;
  discount: number;
  serviceCharge: number;
  tax: number; 
  amountPaid: number;
  balance: number;
  cashier: string;
  paymentMethod: PaymentMethod; // Deprecated but kept for backward compatibility
  payments: WalkInPayment[]; 
}

export interface RecordedTransaction {
  id: string; 
  type: 'Hotel Stay' | 'Walk-In';
  date: string;
  guestName: string; 
  amount: number; 
  balance: number;
  currency: 'NGN' | 'USD';
  data: InvoiceData | WalkInTransaction;
}

const ROOM_RATES_NGN: Record<RoomType, number> = {
  [RoomType.SOJOURN_ROOM]: 94050,
  [RoomType.TRANQUIL_ROOM]: 115140,
  [RoomType.HARMONY_STUDIO]: 128250,
  [RoomType.SERENITY_STUDIO]: 179550,
  [RoomType.NARRATIVE_SUITE]: 222300,
  [RoomType.ODYSSEY_SUITE]: 235125,
  [RoomType.TIDE_SIGNATURE_SUITE]: 265050,
};

const ROOM_RATES_USD: Record<RoomType, number> = {
  [RoomType.SOJOURN_ROOM]: 100,
  [RoomType.TRANQUIL_ROOM]: 130,
  [RoomType.HARMONY_STUDIO]: 150,
  [RoomType.SERENITY_STUDIO]: 200,
  [RoomType.NARRATIVE_SUITE]: 250,
  [RoomType.ODYSSEY_SUITE]: 280,
  [RoomType.TIDE_SIGNATURE_SUITE]: 350,
};

const DRINK_LIST = [
  { name: 'Heineken (Can)', price: 2000, category: 'Beer' },
  { name: 'Heineken (Bottle)', price: 2500, category: 'Beer' },
  { name: 'Desperado', price: 1150, category: 'Beer' },
  { name: 'Guinness Stout (Small)', price: 1500, category: 'Beer' },
  { name: 'Guinness Stout (Large)', price: 2500, category: 'Beer' },
  { name: 'Star Lager', price: 1500, category: 'Beer' },
  { name: 'Gulder', price: 1500, category: 'Beer' },
  { name: 'Budweiser', price: 1800, category: 'Beer' },
  { name: 'Legend Extra Stout', price: 1500, category: 'Beer' },
  { name: 'Smirnoff Double Black', price: 1150, category: 'Beer' },
  { name: 'Trophy Lager', price: 1200, category: 'Beer' },
  { name: 'Heros Lager', price: 1200, category: 'Beer' },
  { name: 'Water (75cl)', price: 1000, category: 'Soft' },
  { name: 'Water (1.5L)', price: 1500, category: 'Soft' },
  { name: 'Coca Cola', price: 1000, category: 'Soft' },
  { name: 'Fanta Orange', price: 1000, category: 'Soft' },
  { name: 'Sprite', price: 1000, category: 'Soft' },
  { name: 'Pepsi', price: 1000, category: 'Soft' },
  { name: 'Amstel Malt', price: 700, category: 'Soft' },
  { name: 'Maltina', price: 700, category: 'Soft' },
  { name: 'Schweppes (Tonic/Bitter Lemon/Ginger)', price: 1200, category: 'Soft' },
  { name: 'Bitter Lemon', price: 1000, category: 'Soft' },
  { name: 'Red Bull', price: 1700, category: 'Energy' },
  { name: 'Monster Energy', price: 1800, category: 'Energy' },
  { name: 'Power Horse', price: 1500, category: 'Energy' },
  { name: 'Black Bullet', price: 1500, category: 'Energy' },
  { name: 'Chi Exotic', price: 2500, category: 'Juice' },
  { name: 'Chivita (1L)', price: 2500, category: 'Juice' },
  { name: 'Five Alive', price: 2500, category: 'Juice' },
  { name: 'Chi Ice Tea', price: 2000, category: 'Juice' },
  { name: 'Chamdor (Sparkling)', price: 6000, category: 'Wine' },
  { name: 'Andre Rose', price: 15000, category: 'Wine' },
  { name: 'Carlo Rossi (Red/White)', price: 12000, category: 'Wine' },
  { name: 'Moet & Chandon Imperial', price: 95000, category: 'Champagne' },
  { name: 'Veuve Clicquot', price: 110000, category: 'Champagne' },
  { name: 'Don Perignon', price: 450000, category: 'Champagne' },
  { name: 'Hennessy VS', price: 75000, category: 'Spirit' },
  { name: 'Hennessy VSOP', price: 110000, category: 'Spirit' },
  { name: 'Martell Blue Swift', price: 95000, category: 'Spirit' },
  { name: 'Glenfiddich 12yrs', price: 85000, category: 'Spirit' },
  { name: 'Glenfiddich 15yrs', price: 125000, category: 'Spirit' },
  { name: 'Jameson Irish Whiskey', price: 45000, category: 'Spirit' },
  { name: 'Jack Daniels', price: 55000, category: 'Spirit' },
  { name: 'Absolut Vodka', price: 35000, category: 'Spirit' },
  { name: 'Gordon Gin (Small)', price: 4000, category: 'Spirit' },
  { name: 'Gordon Gin (Large)', price: 25000, category: 'Spirit' },
  { name: 'Olmeca Tequila White', price: 40000, category: 'Spirit' },
  { name: 'Campari (Medium)', price: 35000, category: 'Spirit' },
  { name: 'Campari (Small)', price: 13000, category: 'Spirit' },
  { name: 'Vermouth Rosso', price: 30000, category: 'Spirit' },
];

const uuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion'];

function convertChunkToWords(num: number): string {
  if (num === 0) return '';
  if (num < 20) return ONES[num];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    return TENS[ten] + (one > 0 ? ' ' + ONES[one] : '');
  }
  const hundred = Math.floor(num / 100);
  const remainder = num % 100;
  let words = ONES[hundred] + ' hundred';
  if (remainder > 0) words += ' ' + convertChunkToWords(remainder);
  return words;
}

function numberToWords(num: number): string {
  if (num === 0) return 'zero';
  let words = '';
  let scaleIndex = 0;
  while (num > 0) {
    const chunk = num % 1000;
    if (chunk !== 0) {
      const chunkWords = convertChunkToWords(chunk);
      const scaleWord = SCALES[scaleIndex] ? ' ' + SCALES[scaleIndex] : '';
      words = chunkWords + scaleWord + (words ? ' ' + words : '');
    }
    num = Math.floor(num / 1000);
    scaleIndex++;
  }
  return words.trim();
}

function capitalizeFirstLetter(s: string): string {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatCurrencyAmountInWords(amount: number, currencyMajor: string, currencyMinor: string): string {
  if (isNaN(amount) || amount < 0) return 'Invalid Amount';
  let majorUnit = Math.floor(amount);
  let minorUnit = Math.round((amount - majorUnit) * 100);
  if (minorUnit === 100) { majorUnit += 1; minorUnit = 0; }
  const majorWords = capitalizeFirstLetter(numberToWords(majorUnit));
  let result = `${majorWords} ${currencyMajor}`;
  if (minorUnit > 0) {
    const minorWords = capitalizeFirstLetter(numberToWords(minorUnit));
    result += ` and ${minorWords} ${currencyMinor}`;
  }
  return `${result} only`;
}

function convertAmountToWords(amount: number, currency: 'NGN' | 'USD'): string {
    return currency === 'USD' 
      ? formatCurrencyAmountInWords(amount, 'Dollars', 'Cents') 
      : formatCurrencyAmountInWords(amount, 'Naira', 'Kobo');
}

const formatDateForDisplay = (dateString: string): string => {
  if (!dateString) return '';
  try {
      let d = new Date(dateString);
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
          const parts = dateString.split('-');
          d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
      if (isNaN(d.getTime())) return dateString;
      const day = d.getDate();
      const month = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      let suffix = 'th';
      if (day % 10 === 1 && day !== 11) suffix = 'st';
      else if (day % 10 === 2 && day !== 12) suffix = 'nd';
      else if (day % 10 === 3 && day !== 13) suffix = 'rd';
      return `${month} ${day}${suffix} ${year}`;
  } catch (e) { return dateString; }
};

const calculateNights = (checkIn: string, checkOut: string): number => {
    if (!checkIn || !checkOut) return 0;
    try {
        const startDate = new Date(checkIn);
        const endDate = new Date(checkOut);
        startDate.setHours(12, 0, 0, 0);
        endDate.setHours(12, 0, 0, 0);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) return 0;
        const diffTime = endDate.getTime() - startDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    } catch (e) { return 0; }
};

const formatCurrencyWithCode = (amount: number, currency: 'NGN' | 'USD') => {
  const formatter = new Intl.NumberFormat('en-NG', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const symbol = currency === 'NGN' ? '₦' : '$';
  return amount < 0 ? `-${symbol} ${formatter.format(Math.abs(amount))}` : `${symbol} ${formatter.format(amount)}`;
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// GENERATORS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const createInvoiceDoc = (data: InvoiceData): any => {
  try {
    const jsPDF = (window as any).jsPDF;
    if (!jsPDF) { alert("PDF Library not loaded."); return null; }
    const doc = new jsPDF();
    if (typeof doc.autoTable !== 'function') { alert("PDF Plugin error."); return null; }

    const isReservation = data.documentType === 'reservation';
    const amountReceived = data.amountReceived;
    const decimalFormatter = new Intl.NumberFormat('en-NG', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const symbol = data.currency === 'NGN' ? 'N' : '$'; 
    const formatMoney = (amount: number) => decimalFormatter.format(amount);
    const formatMoneyWithPrefix = (amount: number) => {
        const formattedAbs = decimalFormatter.format(Math.abs(amount));
        return amount < 0 ? `-${symbol} ${formattedAbs}` : `${symbol} ${formattedAbs}`;
    }

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#c4a66a');
    doc.text('TIDE HOTELS AND RESORTS', 105, 15, { align: 'center' }); 
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#2c3e50');
    doc.text('Where Boldness Meets Elegance.', 105, 22, { align: 'center' }); 
    doc.setFontSize(9);
    doc.text('38 S.O Williams Street Off Anthony Enahoro Street Utako Abuja', 105, 27, { align: 'center' }); 
    doc.setLineWidth(0.5);
    doc.line(80, 30, 130, 30); 

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isReservation ? '#E53E3E' : '#2c3e50');
    doc.text(isReservation ? 'INVOICE FOR RESERVATION' : 'OFFICIAL RECEIPT', 105, 40, { align: 'center' });
    doc.setTextColor('#2c3e50');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${isReservation ? 'Invoice No:' : 'Receipt No:'} ${data.receiptNo}`, 14, 50); 
    doc.text(`Date: ${formatDateForDisplay(data.date)}`, 196, 50, { align: 'right' });
    let finalY = 50;

    if (data.verificationDetails && !isReservation) {
        doc.autoTable({
            startY: finalY + 4,
            body: [
                ['Payment Reference:', data.verificationDetails.paymentReference || 'N/A'],
                ['Verified By:', data.verificationDetails.verifiedBy],
                ['Date Verified:', formatDateForDisplay(data.verificationDetails.dateVerified)],
            ],
            theme: 'plain',
            styles: { font: 'helvetica', fontSize: 10, cellPadding: 1, fillColor: '#f0fff4' },
            columnStyles: { 0: { fontStyle: 'bold' } },
            margin: { left: 14, right: 14 }
        });
        finalY = doc.lastAutoTable.finalY;
    }
    
    doc.autoTable({
        startY: finalY + (data.verificationDetails && !isReservation ? 2 : 4),
        body: [
            ['Received From (Guest):', data.guestName],
            ['Email:', data.guestEmail],
            ['Phone/Contact:', data.phoneContact],
            ['Room Number(s):', data.roomNumber],
        ],
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 10, cellPadding: 1.5 },
        columnStyles: { 0: { fontStyle: 'bold' } },
        margin: { left: 14, right: 14 }
    });
    finalY = doc.lastAutoTable.finalY;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Bookings', 14, finalY + 8); 

    doc.autoTable({
      startY: finalY + 11,
      head: [["S/N", "Room Type", "Qty", "Duration", "Check-In", "Check-Out", "Nights", `Rate/Night`, `Subtotal (${symbol})`]],
      body: data.bookings.map((booking, index) => [
        index + 1,
        booking.roomType,
        booking.quantity,
        `${booking.nights} night${booking.nights > 1 ? 's' : ''}`,
        formatDateForDisplay(booking.checkIn),
        formatDateForDisplay(booking.checkOut),
        booking.nights,
        formatMoney(booking.ratePerNight),
        formatMoney(booking.subtotal)
      ]),
      theme: 'grid',
      headStyles: { fillColor: '#2c3e50', fontSize: 8 },
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.5 }, 
      columnStyles: { 2: { halign: 'center' }, 6: { halign: 'center' }, 7: { halign: 'right' }, 8: { halign: 'right' } }
    });
    finalY = doc.lastAutoTable.finalY;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100);
    doc.text('Note: Festive Season Offer applied.', 14, finalY + 5);
    finalY += 5;

    if (data.additionalChargeItems.length > 0) {
        finalY += 4;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Additional Charges', 14, finalY + 8);
        doc.autoTable({
          startY: finalY + 11,
          head: [["S/N", "Description", "Qty", `Unit Price (${symbol})`, `Amount (${symbol})`]],
          body: data.additionalChargeItems.map((item, index) => [
            index+1, 
            item.description, 
            item.quantity || 1, 
            formatMoney(item.unitPrice || item.amount), 
            formatMoney(item.amount)
          ]),
          theme: 'grid',
          headStyles: { fillColor: '#2c3e50' },
          styles: { font: 'helvetica', fontSize: 9, cellPadding: 1.5 },
          columnStyles: { 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
        });
        finalY = doc.lastAutoTable.finalY;
    }
    
    if (data.payments.length > 0) {
        finalY += 4;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Payments Received', 14, finalY + 8);
        doc.autoTable({
          startY: finalY + 11,
          head: [["Date", "Method", "Reference", `Amount (${symbol})`]],
          body: data.payments.map(item => [formatDateForDisplay(item.date), item.paymentMethod, item.reference || 'N/A', formatMoney(item.amount)]),
          theme: 'grid',
          headStyles: { fillColor: '#16a34a' },
          styles: { font: 'helvetica', fontSize: 9, cellPadding: 1.5 },
          columnStyles: { 3: { halign: 'right' } }
        });
        finalY = doc.lastAutoTable.finalY;
    }

    const pageHeight = doc.internal.pageSize.height;
    let y = finalY + 8;
    const checkPageBreak = (h: number) => { if (y + h > pageHeight - 15) { doc.addPage(); y = 20; } };

    checkPageBreak(65);
    const sxL = 155, sxV = 196, lh = 6;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', sxL, y, { align: 'right' });
    doc.setFont('helvetica', 'bold'); doc.text(formatMoneyWithPrefix(data.subtotal), sxV, y, { align: 'right' });
    y += lh;
    if (data.discount > 0) {
      doc.setFont('helvetica', 'normal'); doc.text('Discount:', sxL, y, { align: 'right' });
      doc.setFont('helvetica', 'bold'); doc.text(formatMoneyWithPrefix(-data.discount), sxV, y, { align: 'right' });
      y += lh;
    }
    if (data.holidaySpecialDiscount > 0) {
      doc.setFont('helvetica', 'normal'); doc.text(`${data.holidaySpecialDiscountName}:`, sxL, y, { align: 'right' });
      doc.setFont('helvetica', 'bold'); doc.text(formatMoneyWithPrefix(-data.holidaySpecialDiscount), sxV, y, { align: 'right' });
      y += lh;
    }
    doc.setFont('helvetica', 'normal'); doc.text('Tax (7.5% Inclusive):', sxL, y, { align: 'right' });
    doc.setFont('helvetica', 'bold'); doc.text(formatMoneyWithPrefix(data.taxAmount), sxV, y, { align: 'right' });
    y += 2;
    doc.setLineWidth(0.3); doc.line(sxL - 35, y, sxV, y); y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL AMOUNT DUE:', sxL, y, { align: 'right' }); doc.text(formatMoneyWithPrefix(data.totalAmountDue), sxV, y, { align: 'right' });
    y += lh;
    doc.text('AMOUNT RECEIVED:', sxL, y, { align: 'right' }); doc.text(formatMoneyWithPrefix(amountReceived), sxV, y, { align: 'right' });
    y += 2;
    doc.setLineWidth(0.3); doc.line(sxL - 35, y, sxV, y); y += 5;
    const balanceLabel = data.balance > 0 ? 'BALANCE DUE:' : data.balance < 0 ? 'CREDIT:' : 'BALANCE:';
    doc.text(balanceLabel, sxL, y, { align: 'right' });
    if (data.balance < 0) doc.setTextColor('#38A169'); else if (data.balance > 0) doc.setTextColor('#E53E3E'); 
    doc.text(formatMoneyWithPrefix(Math.abs(data.balance)), sxV, y, { align: 'right' });
    doc.setTextColor('#2c3e50'); y += 8;

    checkPageBreak(20);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    const amountReceivedText = amountReceived > 0 ? data.amountInWords : 'Zero Naira only';
    const splitAmountWords = doc.splitTextToSize(`Amount in Words: ${amountReceivedText}`, 180); 
    doc.text(splitAmountWords, 14, y);
    y += (splitAmountWords.length * 6) + 4;

    if (data.status !== InvoiceStatus.PAID) {
        checkPageBreak(70); 
        const titleText = data.status === InvoiceStatus.PARTIAL ? 'Partial Payment Received.' : 'Payment Status: Pending';
        doc.setFont('helvetica', 'bold'); doc.setTextColor(data.status === InvoiceStatus.PARTIAL ? '#E53E3E' : '#f59e0b');
        doc.text(titleText, 14, y); y += 4;
        doc.setTextColor(44, 62, 80); doc.setFont('helvetica', 'normal');
        doc.text('Kindly settle the outstanding using the bank details below.', 14, y); y += 2;
        doc.autoTable({
            startY: y,
            head: [['NAIRA ACCOUNTS', 'DOMICILIARY ACCOUNTS (PROVIDUS BANK)']],
            body: [
                ['MONIEPOINT: 5169200615\nPROVIDUS: 1306538190\nName: TIDE HOTELS & RESORTS', 'USD: 1308430669\nGBP: 1308430676\nEURO: 1308430683\nSwift: UMPLNGLA'],
            ],
            theme: 'grid',
            styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.5, textColor: '#2c3e50', valign: 'top' },
            headStyles: { fillColor: '#e2e8f0', textColor: '#2c3e50', fontStyle: 'bold', halign: 'center', fontSize: 8 },
            margin: { left: 14, right: 14 }
        });
        y = (doc as any).lastAutoTable.finalY + 3;
    } else {
        checkPageBreak(25); y += 5;
        doc.setFont('helvetica', 'bold'); doc.setTextColor('#38A169'); doc.setFontSize(12);
        doc.text('FULL PAYMENT RECEIVED. THANK YOU.', 105, y, { align: 'center' });
        y += 10; doc.setTextColor('#2c3e50');
    }
    
    checkPageBreak(30); y += 10; 
    doc.setLineWidth(0.5); doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor('#000000');
    doc.line(14, y, 14 + 60, y); doc.text("Guest Signature", 14, y + 5);
    doc.line(136, y, 196, y); doc.text("Cashier Signature", 136, y + 5);

    return doc;
  } catch (e) { alert("Error generating PDF."); return null; }
};

const printInvoice = (data: InvoiceData) => {
  const decimalFormatter = new Intl.NumberFormat('en-NG', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatMoney = (amount: number) => decimalFormatter.format(amount);
  const symbol = data.currency === 'NGN' ? '₦' : '$';
  const formatMoneyWithPrefix = (amount: number) => {
      const formattedAbs = decimalFormatter.format(Math.abs(amount));
      return amount < 0 ? `-${symbol} ${formattedAbs}` : `${symbol} ${formattedAbs}`;
  }
  const printWindow = window.open('', '_blank');
  if (!printWindow) { alert('Please allow popups'); return; }
  const isReservation = data.documentType === 'reservation';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${isReservation ? 'Invoice' : 'Receipt'} - ${data.receiptNo}</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="p-8 bg-white max-w-4xl mx-auto text-gray-900">
      <div class="text-center mb-6">
        <h1 class="text-3xl font-bold text-[#c4a66a]">TIDÈ HOTELS AND RESORTS</h1>
        <p class="text-xs text-gray-600 mt-1">38 S.O Williams Street Utako Abuja</p>
      </div>
      <h2 class="text-xl font-bold text-center ${isReservation ? 'text-red-700' : 'text-[#2c3e50]'} mb-2">${isReservation ? 'INVOICE FOR RESERVATION' : 'OFFICIAL RECEIPT'}</h2>
      <div class="flex justify-between text-sm mb-4">
          <p><span class="font-bold">No:</span> ${data.receiptNo}</p>
          <p><span class="font-bold">Date:</span> ${formatDateForDisplay(data.date)}</p>
      </div>
      <div class="mb-4 border border-gray-200 rounded p-3 text-sm">
        <p><span class="font-bold">Guest:</span> ${data.guestName}</p>
        <p><span class="font-bold">Room:</span> ${data.roomNumber}</p>
      </div>
      <table class="w-full text-sm mb-4">
        <thead class="bg-[#2c3e50] text-white"><tr><th class="p-1">Room</th><th class="p-1">Qty</th><th class="p-1">Nights</th><th class="p-1 text-right">Total</th></tr></thead>
        <tbody>${data.bookings.map(b => `<tr><td class="p-1 border-b">${b.roomType}</td><td class="p-1 border-b text-center">${b.quantity}</td><td class="p-1 border-b text-center">${b.nights}</td><td class="p-1 border-b text-right">${formatMoney(b.subtotal)}</td></tr>`).join('')}</tbody>
      </table>
      <div class="flex justify-end mb-6">
        <div class="w-1/2 text-sm">
          <div class="flex justify-between"><span>Subtotal:</span><span class="font-bold">${formatMoneyWithPrefix(data.subtotal)}</span></div>
          <div class="flex justify-between font-bold border-t mt-2"><span>Total Due:</span><span>${formatMoneyWithPrefix(data.totalAmountDue)}</span></div>
          <div class="flex justify-between"><span>Received:</span><span>${formatMoneyWithPrefix(data.amountReceived)}</span></div>
          <div class="flex justify-between text-lg font-bold border-t"><span>Balance:</span><span>${formatMoneyWithPrefix(Math.abs(data.balance))}</span></div>
        </div>
      </div>
      <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
    </body>
    </html>
  `;
  printWindow.document.write(html); printWindow.document.close();
};

const printWalkInReceipt = (data: WalkInTransaction, guestName: string) => {
  const decimalFormatter = new Intl.NumberFormat('en-NG', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatMoney = (amount: number) => decimalFormatter.format(amount);
  const symbol = data.currency === 'NGN' ? '₦' : '$';
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) { alert('Please allow popups'); return; }

  const chargesRows = data.charges.map((item) => {
    const qty = item.quantity || 1;
    const desc = item.otherServiceDescription || (item.service as string);
    const displayDesc = qty > 1 ? `${qty}x ${desc}` : desc;
    return `
      <div class="row">
        <div class="col-left">${displayDesc}</div>
        <div class="col-right">${symbol}${formatMoney(item.amount)}</div>
      </div>
    `}).join('');

  const totalDue = data.subtotal - data.discount + data.serviceCharge;

  let paymentsHtml = '';
  if (data.payments && data.payments.length > 0) {
      const rows = data.payments.map(p => `
        <div class="row">
          <div class="col-left">${p.method} ${p.reference ? `(${p.reference})` : ''}</div>
          <div class="col-right">${symbol}${formatMoney(p.amount)}</div>
        </div>
      `).join('');
      paymentsHtml = `<div class="separator"></div><div class="bold mb-1">Payments</div>${rows}`;
  }

  let bankDetailsHtml = '';
  if (data.balance < 0) {
      bankDetailsHtml = `
      <div class="separator"></div>
      <div class="text-center bold mb-1">BANK DETAILS</div>
      <div class="text-xs">Moniepoint: 5169200615</div>
      <div class="text-xs">Providus: 1306538190</div>
      <div class="text-xs">Name: Tide Hotels & Resorts</div>
      `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Docket - ${data.id}</title>
      <style> 
        @media print { body { margin: 0; padding: 0; } } 
        body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 13px;
            width: 80mm;
            margin: 0 auto;
            background: #fff;
            color: #000;
            padding: 5px 15px;
            box-sizing: border-box;
            line-height: 1.4;
        }
        .text-center { text-align: center; }
        .bold { font-weight: 700; }
        .mb-1 { margin-bottom: 4px; }
        .mb-2 { margin-bottom: 8px; }
        .separator { border-bottom: 1px solid #000; margin: 8px 0; border-style: double; }
        .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
        .col-left { text-align: left; max-width: 65%; word-wrap: break-word; }
        .col-right { text-align: right; flex: 1; }
        .title { font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
        .footer { font-size: 11px; margin-top: 20px; color: #444; }
        .sig-block { margin-top: 25px; display: flex; justify-content: space-between; gap: 10px; }
        .sig-line { border-top: 1px solid #000; width: 45%; padding-top: 4px; font-size: 10px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="text-center mb-2">
        <div class="title bold">TIDÈ HOTELS</div>
        <div class="bold">AND RESORTS</div>
        <div style="font-size: 11px;">Utako, Abuja</div>
        <div class="separator"></div>
        <div class="bold" style="font-size: 14px;">WALK-IN DOCKET</div>
        <div style="font-size: 11px;">${formatDateForDisplay(data.transactionDate.split('T')[0])} | ${new Date(data.transactionDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
      </div>

      <div class="row"><span>Receipt:</span><span>${data.id}</span></div>
      <div class="row"><span>Guest:</span><span class="bold">${guestName}</span></div>
      <div class="row"><span>Cashier:</span><span>${data.cashier}</span></div>

      <div class="separator"></div>

      <div class="row bold mb-1">
        <div class="col-left">Description</div>
        <div class="col-right">Amount</div>
      </div>
      
      ${chargesRows}

      <div class="separator"></div>

      <div class="row"><span>Subtotal</span><span>${symbol}${formatMoney(data.subtotal)}</span></div>
      ${data.discount > 0 ? `<div class="row"><span>Discount</span><span>-${symbol}${formatMoney(data.discount)}</span></div>` : ''}
      <div class="row"><span>Svc Charge</span><span>${symbol}${formatMoney(data.serviceCharge)}</span></div>
      <div class="row" style="font-size: 11px; opacity: 0.8;"><span>Incl. VAT (7.5%)</span><span>${symbol}${formatMoney(data.tax)}</span></div>
      
      <div class="row bold" style="font-size: 16px; margin-top: 5px;">
        <div class="col-left">TOTAL</div>
        <div class="col-right">${symbol}${formatMoney(totalDue)}</div>
      </div>

      ${paymentsHtml}

      <div class="separator"></div>

      <div class="row"><span>Total Paid</span><span>${symbol}${formatMoney(data.amountPaid)}</span></div>
      <div class="row bold">
        <span>${data.balance < 0 ? 'DUE' : 'BALANCE'}</span>
        <span>${symbol}${formatMoney(Math.abs(data.balance))}</span>
      </div>

      ${bankDetailsHtml}

      <div class="sig-block">
        <div class="sig-line">Guest Signature</div>
        <div class="sig-line">Cashier Signature</div>
      </div>
      
      <div class="text-center footer">
        Thank you for your patronage.<br>
        Boldness Meets Elegance.
      </div>
      
      <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
    </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
};

const generateCSV = (transactions: RecordedTransaction[]): string => {
    const headers = ['ID', 'Type', 'Date', 'Guest Name', 'Amount Due', 'Balance', 'Status', 'Currency'];
    const rows = transactions.map(t => {
        let status = 'N/A';
        let amountDue = t.amount;
        if (t.type === 'Hotel Stay') {
            const d = t.data as InvoiceData; status = d.status; amountDue = d.totalAmountDue;
        } else { status = t.balance < 0 ? 'Owing' : 'Paid'; }
        return [t.id, t.type, t.date, `"${t.guestName}"`, amountDue.toFixed(2), t.balance.toFixed(2), status, t.currency].join(',');
    });
    return [headers.join(','), ...rows].join('\n');
};

const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// COMPONENTS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const USERS = [
  { username: 'Faith', password: 'F@i7h#92X!', role: 'Front Desk' },
  { username: 'Goodness', password: 'G00d*N3ss$4', role: 'Front Desk' },
  { username: 'Benjamin', password: 'B3nJ&9m_84', role: 'Front Desk' },
  { username: 'Sandra', password: 'S@ndR4!51%', role: 'Front Desk' },
  { username: 'David', password: 'D@v1D#73Q', role: 'Front Desk' },
  { username: 'Ifeanyi', password: '1F3@yN!88*', role: 'Front Desk' },
  { username: 'Margret', password: 'M@rG7eT_42', role: 'Front Desk' },
  { username: 'Miriam', password: 'M1r!@m#97W', role: 'Front Desk' },
  { username: 'Francis', password: 'Fr@nC1$62!', role: 'Admin' },
];

const WelcomeScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => { const timer = setTimeout(onComplete, 1500); return () => clearTimeout(timer); }, [onComplete]);
  return (
    <div className="fixed inset-0 bg-[#2c3e50] flex flex-col items-center justify-center z-50 animate-fade-in-up">
      <div className="text-center px-4">
        <h1 className="text-4xl md:text-6xl font-bold text-[#c4a66a] mb-6 tracking-wider">Tidè Hotels and Resorts</h1>
        <div className="h-1 w-32 bg-[#c4a66a] mx-auto mb-6 rounded"></div>
        <p className="text-white text-lg md:text-xl tracking-[0.3em] uppercase font-light animate-pulse-slow">Where Boldness Meets Elegance</p>
      </div>
    </div>
  );
};

const LoginScreen = ({ onLogin }: { onLogin: (user: any) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const foundUser = USERS.find(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password.trim());
    if (foundUser) onLogin({ name: foundUser.username, role: foundUser.role });
    else setError('Invalid credentials');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-[#2c3e50] p-10 rounded-lg shadow-2xl w-96 border-t-4 border-[#c4a66a] animate-fade-in-up">
        <div className="text-center mb-8">
             <h2 className="text-lg font-medium text-gray-300 mb-1">Welcome to</h2>
             <h1 className="text-2xl font-bold text-[#c4a66a]">Invoice Generator</h1>
             <p className="text-xs text-[#c4a66a] italic mt-1">Tidè Hotels and Resorts</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-5">
          <input type="text" className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-[#c4a66a]" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          <div className="relative">
            <input type={showPassword ? "text" : "password"} className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-[#c4a66a]" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" className="w-full bg-[#c4a66a] text-white py-3 rounded font-bold hover:bg-[#b39556] transition-colors shadow-lg">Login</button>
        </form>
      </div>
    </div>
  );
};

const Dashboard = ({ user, onLogout, onCreateInvoice, transactions, onDeleteTransaction, onEditTransaction, onCreateWalkIn }: any) => {
  const today = new Date().toISOString().split('T')[0];
  const todaysTransactions = transactions.filter((t: RecordedTransaction) => t.date === today);
  const revenueTodayNGN = todaysTransactions.filter((t: RecordedTransaction) => t.currency === 'NGN').reduce((sum: number, t: RecordedTransaction) => sum + (t.type === 'Hotel Stay' ? (t.data as InvoiceData).amountReceived : (t.data as WalkInTransaction).amountPaid), 0);
  const totalOwingNGN = transactions.filter((t: RecordedTransaction) => t.currency === 'NGN').reduce((sum: number, t: RecordedTransaction) => sum + (t.balance > 0 ? t.balance : 0), 0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All Types');
  const filteredTransactions = useMemo(() => {
      return transactions.filter((t: RecordedTransaction) => {
          const matchesSearch = t.guestName.toLowerCase().includes(searchTerm.toLowerCase()) || t.id.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesType = filterType === 'All Types' || t.type === filterType;
          return matchesSearch && matchesType;
      }).sort((a: RecordedTransaction, b: RecordedTransaction) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, filterType]);

  const handleExportCSV = () => {
    const csvContent = generateCSV(filteredTransactions);
    downloadCSV(csvContent, `tide_transactions_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow p-4 flex justify-between items-center">
        <div><h1 className="text-xl font-bold text-[#c4a66a]">Tidè Hotels and Resorts</h1></div>
        <div className="flex items-center gap-4">
            <span className="text-sm">Welcome, {user.name}</span>
            <button onClick={onLogout} className="bg-[#2c3e50] text-white px-4 py-2 rounded text-sm">Logout</button>
        </div>
      </nav>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
            <h2 className="text-xl font-bold">Dashboard</h2>
            <div className="flex gap-3">
                 <button onClick={onCreateWalkIn} className="bg-[#2c3e50] text-white px-4 py-2 rounded shadow hover:bg-[#34495e]">New Walk-In</button>
                 <button onClick={onCreateInvoice} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded shadow-sm">+ New Reservation</button>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
             <div className="bg-[#2c3e50] text-white p-6 rounded-lg"><h3>Today</h3><p className="text-3xl font-bold">{todaysTransactions.length}</p></div>
             <div className="bg-[#2c3e50] text-white p-6 rounded-lg"><h3>Revenue NGN</h3><p className="text-3xl font-bold">₦{revenueTodayNGN.toLocaleString()}</p></div>
              <div className="bg-red-700 text-white p-6 rounded-lg"><h3>Outstanding</h3><p className="text-3xl font-bold">₦{totalOwingNGN.toLocaleString()}</p></div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between mb-4">
                <h2 className="text-lg font-bold">Transactions</h2>
                <button onClick={handleExportCSV} className="text-[#c4a66a] border border-[#c4a66a] px-3 py-1 rounded text-sm">Export CSV</button>
            </div>
            <div className="flex gap-4 mb-4">
                <input type="text" placeholder="Search..." className="flex-1 border rounded p-2 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-[#2c3e50] text-white"><tr><th className="p-3">ID</th><th className="p-3">Type</th><th className="p-3">Guest</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
                    <tbody>
                        {filteredTransactions.map((t: RecordedTransaction) => (
                            <tr key={t.id} className="border-b hover:bg-gray-50">
                                <td className="p-3">{t.id}</td>
                                <td className="p-3">{t.type}</td>
                                <td className="p-3 font-bold">{t.guestName}</td>
                                <td className="p-3">{formatCurrencyWithCode(t.amount, t.currency)}</td>
                                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${t.balance === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{t.balance === 0 ? 'Paid' : 'Pending'}</span></td>
                                <td className="p-3 text-right">
                                    <button onClick={() => onEditTransaction(t)} className="text-blue-600 mr-2">View</button>
                                    <button onClick={() => { if(confirm('Delete?')) onDeleteTransaction(t.id); }} className="text-red-600">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};

const InvoiceForm = ({ initialData, onSave, onCancel, user }: any) => {
  const DRAFT_KEY = 'tide_invoice_draft';
  const [isAutoServiceCharge, setIsAutoServiceCharge] = useState(true);
  const [data, setData] = useState<InvoiceData>(() => {
      if (initialData) return { ...initialData };
      try {
          const saved = localStorage.getItem(DRAFT_KEY);
          if (saved) return JSON.parse(saved);
      } catch (e) {}
      return {
        id: uuid(), receiptNo: `RCPT-${Date.now()}`, date: new Date().toISOString().split('T')[0], lastUpdatedAt: new Date().toISOString(),
        guestName: '', guestEmail: '', phoneContact: '', roomNumber: '', documentType: 'reservation', status: InvoiceStatus.PENDING,
        bookings: [], additionalChargeItems: [], subtotal: 0, discount: 0, holidaySpecialDiscountName: 'Holiday Offer',
        holidaySpecialDiscount: 0, serviceCharge: 0, taxPercentage: 7.5, taxAmount: 0, totalAmountDue: 0,
        payments: [], amountReceived: 0, balance: 0, amountInWords: '', paymentPurpose: '', receivedBy: user.name, designation: 'Staff', currency: 'NGN',
      };
  });

  const totals = useMemo(() => {
      let sub = 0;
      data.bookings.forEach(b => sub += b.subtotal);
      data.additionalChargeItems.forEach(c => sub += c.amount);
      const taxable = sub - data.discount - data.holidaySpecialDiscount;
      const svc = isAutoServiceCharge ? Math.round(taxable * 0.05) : data.serviceCharge;
      const tax = Math.max(0, taxable - (taxable / 1.075));
      const total = Math.max(0, taxable + svc);
      let received = 0;
      data.payments.forEach(p => received += p.amount);
      return { subtotal: sub, serviceCharge: svc, taxAmount: tax, totalAmountDue: total, amountReceived: received, balance: total - received, amountInWords: convertAmountToWords(received, data.currency) };
  }, [data.bookings, data.additionalChargeItems, data.payments, data.discount, data.holidaySpecialDiscount, data.currency, data.serviceCharge, isAutoServiceCharge]);

  useEffect(() => {
      const timer = setTimeout(() => {
          const fullData = { ...data, ...totals };
          if (!initialData) localStorage.setItem(DRAFT_KEY, JSON.stringify(fullData));
      }, 2000); 
      return () => clearTimeout(timer);
  }, [data, totals, initialData]);

  const addBooking = () => {
      const rates = data.currency === 'USD' ? ROOM_RATES_USD : ROOM_RATES_NGN;
      const nb: BookingItem = { id: uuid(), roomType: RoomType.SOJOURN_ROOM, quantity: 1, checkIn: data.date, checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0], nights: 1, ratePerNight: rates[RoomType.SOJOURN_ROOM], subtotal: rates[RoomType.SOJOURN_ROOM] };
      setData(prev => ({ ...prev, bookings: [...prev.bookings, nb] }));
  };

  const addCharge = () => setData(prev => ({ ...prev, additionalChargeItems: [...prev.additionalChargeItems, { id: uuid(), description: '', quantity: 1, unitPrice: 0, amount: 0 }] }));
  const addPayment = () => setData(prev => ({ ...prev, payments: [...prev.payments, { id: uuid(), date: new Date().toISOString().split('T')[0], amount: 0, paymentMethod: PaymentMethod.CASH, recordedBy: user.name }] }));

  const updateBooking = (id: string, f: string, v: any) => {
    const rates = data.currency === 'USD' ? ROOM_RATES_USD : ROOM_RATES_NGN;
    setData(prev => ({
        ...prev,
        bookings: prev.bookings.map(b => {
            if (b.id !== id) return b;
            const updated = { ...b, [f]: v };
            if (f === 'roomType') updated.ratePerNight = rates[v as RoomType];
            if (f === 'checkIn' || f === 'checkOut') updated.nights = calculateNights(updated.checkIn, updated.checkOut);
            updated.subtotal = updated.nights * updated.quantity * updated.ratePerNight;
            return updated;
        })
    }));
  };

  const updateCharge = (id: string, f: string, v: any) => {
    setData(prev => ({
        ...prev,
        additionalChargeItems: prev.additionalChargeItems.map(c => {
            if (c.id !== id) return c;
            const updated = { ...c, [f]: v };
            if (f === 'description' && v) {
                const drink = DRINK_LIST.find(d => d.name.toLowerCase() === v.toLowerCase());
                if (drink) { updated.description = drink.name; updated.unitPrice = drink.price; }
            }
            updated.amount = (updated.quantity || 1) * (updated.unitPrice || 0);
            return updated;
        })
    }));
  };

  const handleSave = () => { onSave({ ...data, ...totals }); localStorage.removeItem(DRAFT_KEY); };

  return (
    <div className="bg-white min-h-screen p-8 text-gray-900">
       <div className="flex justify-between items-center mb-8">
           <h1 className="text-3xl font-bold text-[#c4a66a]">{initialData ? 'Edit Record' : 'New Reservation'}</h1>
           <div className="flex gap-2">
               <button onClick={handleSave} className="bg-[#c4a66a] text-white px-6 py-2 rounded font-bold">Save & Close</button>
               <button onClick={onCancel} className="text-gray-500">Cancel</button>
           </div>
       </div>
       <div className="max-w-4xl mx-auto space-y-6">
           <div className="bg-gray-50 p-6 rounded-lg border">
               <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Guest Name" className="p-2 border rounded" value={data.guestName} onChange={e => setData({...data, guestName: e.target.value})} />
                    <input type="text" placeholder="Room Number" className="p-2 border rounded" value={data.roomNumber} onChange={e => setData({...data, roomNumber: e.target.value})} />
               </div>
           </div>
           <div>
               <div className="flex justify-between mb-2"><h3 className="font-bold">Bookings</h3><button onClick={addBooking} className="text-xs text-[#c4a66a] font-bold">+ Add</button></div>
               <div className="bg-white border rounded">
                   {data.bookings.map(b => (
                       <div key={b.id} className="p-3 border-b flex gap-3 items-center">
                           <select className="flex-1 p-1" value={b.roomType} onChange={e => updateBooking(b.id, 'roomType', e.target.value)}>{Object.values(RoomType).map(rt => <option key={rt} value={rt}>{rt}</option>)}</select>
                           <input type="number" className="w-16 border p-1" value={b.quantity} onChange={e => updateBooking(b.id, 'quantity', parseInt(e.target.value))} />
                           <input type="date" className="w-32 border p-1" value={b.checkIn} onChange={e => updateBooking(b.id, 'checkIn', e.target.value)} />
                           <div className="font-bold">₦{b.subtotal.toLocaleString()}</div>
                       </div>
                   ))}
               </div>
           </div>
           <div>
               <div className="flex justify-between mb-2"><h3 className="font-bold">Payments</h3><button onClick={addPayment} className="text-xs text-green-600 font-bold">+ Add</button></div>
               {data.payments.map(p => (
                   <div key={p.id} className="p-3 border rounded mb-2 flex gap-3 items-center">
                        <select className="p-1" value={p.paymentMethod} onChange={e => setData({...data, payments: data.payments.map(px => px.id === p.id ? {...px, paymentMethod: e.target.value as any} : px)})}>{Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}</select>
                        <input type="number" className="flex-1 border p-1" placeholder="Amount" value={p.amount} onChange={e => setData({...data, payments: data.payments.map(px => px.id === p.id ? {...px, amount: parseFloat(e.target.value) || 0} : px)})} />
                   </div>
               ))}
           </div>
           <div className="bg-[#2c3e50] text-white p-6 rounded-lg text-right">
               <div className="text-lg opacity-80">Total Due</div>
               <div className="text-3xl font-bold text-[#c4a66a]">{formatCurrencyWithCode(totals.totalAmountDue, data.currency)}</div>
           </div>
       </div>
    </div>
  );
};

const WalkInGuestModal = ({ onClose, onSave, user, initialData, initialGuestName }: any) => {
    const [guestName, setGuestName] = useState(initialGuestName || 'Walk-In Guest');
    const [currency, setCurrency] = useState<'NGN'|'USD'>(initialData?.currency || 'NGN');
    const [items, setItems] = useState<WalkInChargeItem[]>(initialData?.charges || [{ id: uuid(), date: new Date().toISOString().split('T')[0], service: WalkInService.RESTAURANT, amount: 0, quantity: 1, unitPrice: 0, paymentMethod: PaymentMethod.POS }]);
    const [payments, setPayments] = useState<WalkInPayment[]>(initialData?.payments || []);
    const [discount, setDiscount] = useState(initialData?.discount || 0);

    const subtotal = items.reduce((sum, i) => sum + (i.amount || 0), 0);
    const serviceCharge = Math.round((subtotal - discount) * 0.05);
    const tax = Math.max(0, (subtotal - discount) - ((subtotal - discount) / 1.075));
    const totalDue = Math.max(0, (subtotal - discount) + serviceCharge);
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const balance = totalPaid - totalDue;

    const addItem = () => setItems([...items, { id: uuid(), date: new Date().toISOString().split('T')[0], service: WalkInService.RESTAURANT, quantity: 1, unitPrice: 0, amount: 0, paymentMethod: PaymentMethod.POS }]);
    const addDrink = (name: string) => {
        const d = DRINK_LIST.find(dx => dx.name === name);
        if (d) setItems([...items, { id: uuid(), date: new Date().toISOString().split('T')[0], service: WalkInService.BAR, otherServiceDescription: d.name, quantity: 1, unitPrice: d.price, amount: d.price, paymentMethod: PaymentMethod.POS }]);
    };
    const addPayment = () => setPayments([...payments, { id: uuid(), amount: 0, method: PaymentMethod.POS, reference: '' }]);
    const handleSave = () => { if (!guestName) return; onSave({ id: initialData?.id || `WIG-${Date.now().toString().slice(-6)}`, transactionDate: initialData?.transactionDate || new Date().toISOString(), charges: items, currency, subtotal, discount, serviceCharge, tax, amountPaid: totalPaid, balance: balance < 0 ? balance : 0, cashier: user.name, paymentMethod: PaymentMethod.POS, payments }, guestName); };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">New Walk-In Docket</h2>
                    <button onClick={onClose} className="text-2xl">&times;</button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    <input type="text" className="w-full border p-3 rounded font-bold" placeholder="Guest Name" value={guestName} onChange={e => setGuestName(e.target.value)} />
                    <div className="flex justify-between items-center"><span className="font-bold">Charges</span> <button onClick={addItem} className="text-xs bg-[#c4a66a] text-white px-2 py-1 rounded">+ Add Item</button></div>
                    <select className="w-full text-xs p-1 border" onChange={e => { addDrink(e.target.value); e.target.value = ''; }}><option value="">+ Quick Add Drink</option>{DRINK_LIST.map(d => <option key={d.name} value={d.name}>{d.name} (₦{d.price})</option>)}</select>
                    {items.map(item => (
                        <div key={item.id} className="p-3 border rounded bg-gray-50 flex gap-2 items-center">
                            <input type="text" className="flex-1 text-sm border-none bg-transparent" placeholder="Description" value={item.otherServiceDescription || ''} onChange={e => setItems(items.map(ix => ix.id === item.id ? {...ix, otherServiceDescription: e.target.value} : ix))} />
                            <input type="number" className="w-20 text-right font-bold text-[#c4a66a]" value={item.amount} onChange={e => setItems(items.map(ix => ix.id === item.id ? {...ix, amount: parseFloat(e.target.value) || 0} : ix))} />
                        </div>
                    ))}
                    <div className="bg-[#2c3e50] text-white p-4 rounded-lg">
                        <div className="flex justify-between text-lg font-bold"><span>Total Due</span> <span>₦{totalDue.toLocaleString()}</span></div>
                    </div>
                    <div className="flex justify-between items-center"><span className="font-bold">Payments</span> <button onClick={addPayment} className="text-xs text-green-600 font-bold">+ Split</button></div>
                    {payments.map(p => (
                        <div key={p.id} className="flex gap-2 p-2 border rounded">
                             <select className="text-xs" value={p.method} onChange={e => setPayments(payments.map(px => px.id === p.id ? {...px, method: e.target.value as any} : px))}>{Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}</select>
                             <input type="number" className="flex-1 text-right font-bold" placeholder="Paid" value={p.amount} onChange={e => setPayments(payments.map(px => px.id === p.id ? {...px, amount: parseFloat(e.target.value) || 0} : px))} />
                        </div>
                    ))}
                </div>
                <div className="p-6 bg-gray-50 border-t flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 border rounded font-bold">Cancel</button>
                    <button onClick={handleSave} className="flex-1 py-3 bg-[#c4a66a] text-white rounded font-bold">Print & Save</button>
                </div>
            </div>
        </div>
    );
};

const App = () => {
    const [showWelcome, setShowWelcome] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [view, setView] = useState<'login' | 'dashboard' | 'invoice'>('login');
    const [transactions, setTransactions] = useState<RecordedTransaction[]>([]);
    const [editingInvoice, setEditingInvoice] = useState<InvoiceData | null>(null);
    const [showWalkInModal, setShowWalkInModal] = useState(false);
    const [editingWalkIn, setEditingWalkIn] = useState<{data: WalkInTransaction, guestName: string} | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem('tide_transactions');
        if (stored) { try { setTransactions(JSON.parse(stored)); } catch(e) {} }
        const storedUser = localStorage.getItem('tide_user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    useEffect(() => { localStorage.setItem('tide_transactions', JSON.stringify(transactions)); }, [transactions]);

    const handleLogin = (u: any) => { setUser(u); localStorage.setItem('tide_user', JSON.stringify(u)); setView('dashboard'); };
    const handleLogout = () => { setUser(null); localStorage.removeItem('tide_user'); setView('login'); };
    const handleSaveInvoice = (id: InvoiceData) => {
        const existing = transactions.findIndex(t => (t.data as any).id === id.id);
        const record: RecordedTransaction = { id: id.receiptNo, type: 'Hotel Stay', date: id.date, guestName: id.guestName, amount: id.totalAmountDue, balance: id.balance, currency: id.currency, data: id };
        if (existing >= 0) { const upd = [...transactions]; upd[existing] = record; setTransactions(upd); } else { setTransactions([record, ...transactions]); }
        setView('dashboard'); setEditingInvoice(null);
    };

    const handleSaveWalkIn = (data: WalkInTransaction, guestName: string) => {
        const existing = transactions.findIndex(t => t.id === data.id);
        const record: RecordedTransaction = { id: data.id, type: 'Walk-In', date: data.transactionDate.split('T')[0], guestName, amount: data.amountPaid, balance: data.balance, currency: data.currency, data };
        if (existing >= 0) { const upd = [...transactions]; upd[existing] = record; setTransactions(upd); } else { setTransactions([record, ...transactions]); }
        setShowWalkInModal(false); printWalkInReceipt(data, guestName);
    };

    if (showWelcome) return <WelcomeScreen onComplete={() => setShowWelcome(false)} />;
    if (!user) return <LoginScreen onLogin={handleLogin} />;
    if (view === 'invoice') return <InvoiceForm initialData={editingInvoice} onSave={handleSaveInvoice} onCancel={() => setView('dashboard')} user={user} />;

    return (
        <>
            <Dashboard user={user} onLogout={handleLogout} onCreateInvoice={() => { setEditingInvoice(null); setView('invoice'); }} transactions={transactions} onDeleteTransaction={(id: string) => setTransactions(transactions.filter(t => t.id !== id))} onEditTransaction={(t: RecordedTransaction) => { if (t.type === 'Hotel Stay') { setEditingInvoice(t.data as InvoiceData); setView('invoice'); } else { setEditingWalkIn({ data: t.data as WalkInTransaction, guestName: t.guestName }); setShowWalkInModal(true); } }} onCreateWalkIn={() => { setEditingWalkIn(null); setShowWalkInModal(true); }} />
            {showWalkInModal && <WalkInGuestModal onClose={() => setShowWalkInModal(false)} onSave={handleSaveWalkIn} user={user} initialData={editingWalkIn?.data} initialGuestName={editingWalkIn?.guestName} />}
        </>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<ErrorBoundary><App /></ErrorBoundary>);
