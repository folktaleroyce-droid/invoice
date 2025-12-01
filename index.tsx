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
  serviceCharge: number;
  tax: number; 
  amountPaid: number;
  balance: number;
  cashier: string;
  paymentMethod: PaymentMethod;
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


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// UTILITY FUNCTIONS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const parts = dateString.split('-');
      if (parts.length !== 3) return dateString;
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      
      const day = d.getDate();
      const month = d.toLocaleString('default', { month: 'short' });
      let suffix = 'th';
      if (day % 10 === 1 && day !== 11) suffix = 'st';
      else if (day % 10 === 2 && day !== 12) suffix = 'nd';
      else if (day % 10 === 3 && day !== 13) suffix = 'rd';
      return `${day}${suffix} ${month}`;
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
    if (!jsPDF) {
      alert("PDF Library not loaded. Please refresh the page and try again.");
      return null;
    }
    
    const doc = new jsPDF();
    if (typeof doc.autoTable !== 'function') {
      alert("PDF Plugin error. Please refresh the page.");
      return null;
    }

    const isReservation = data.documentType === 'reservation';
    const amountReceived = data.amountReceived;

    const decimalFormatter = new Intl.NumberFormat('en-NG', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const symbol = data.currency === 'NGN' ? 'N' : '$'; 
    const formatMoney = (amount: number) => decimalFormatter.format(amount);
    const formatMoneyWithPrefix = (amount: number) => {
        const formattedAbs = decimalFormatter.format(Math.abs(amount));
        return amount < 0 ? `-${symbol} ${formattedAbs}` : `${symbol} ${formattedAbs}`;
    }

    // Header (Compact)
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#c4a66a');
    doc.text('TIDE HOTELS AND RESORTS', 105, 15, { align: 'center' }); // Reduced Y
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#2c3e50');
    doc.text('Where Boldness Meets Elegance.', 105, 22, { align: 'center' }); // Reduced Y
    doc.setFontSize(9);
    doc.text('38 S.O Williams Street Off Anthony Enahoro Street Utako Abuja', 105, 27, { align: 'center' }); // Reduced Y
    doc.setLineWidth(0.5);
    doc.line(80, 30, 130, 30); // Reduced Y

    // Document Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isReservation ? '#E53E3E' : '#2c3e50');
    doc.text(isReservation ? 'INVOICE FOR RESERVATION' : 'OFFICIAL RECEIPT', 105, 40, { align: 'center' }); // Reduced Y
    doc.setTextColor('#2c3e50');

    // Document Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${isReservation ? 'Invoice No:' : 'Receipt No:'} ${data.receiptNo}`, 14, 50); // Reduced Y
    doc.text(`Date: ${formatDateForDisplay(data.date)}`, 196, 50, { align: 'right' });
    let finalY = 50;

    // Verification Info
    if (data.verificationDetails && !isReservation) {
        const verificationInfo = [
            ['Payment Reference:', data.verificationDetails.paymentReference || 'N/A'],
            ['Verified By:', data.verificationDetails.verifiedBy],
            ['Date Verified:', data.verificationDetails.dateVerified],
        ];
        doc.autoTable({
            startY: finalY + 4,
            body: verificationInfo,
            theme: 'plain',
            styles: { font: 'helvetica', fontSize: 10, cellPadding: 1, fillColor: '#f0fff4' },
            columnStyles: { 0: { fontStyle: 'bold' } },
            margin: { left: 14, right: 14 }
        });
        finalY = doc.lastAutoTable.finalY;
    }
    
    // Guest Info
    const guestInfo = [
        ['Received From (Guest):', data.guestName],
        ['Email:', data.guestEmail],
        ['Phone/Contact:', data.phoneContact],
        ['Room Number(s):', data.roomNumber],
    ];
    doc.autoTable({
        startY: finalY + (data.verificationDetails && !isReservation ? 2 : 4),
        body: guestInfo,
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 10, cellPadding: 1.5 },
        columnStyles: { 0: { fontStyle: 'bold' } },
        margin: { left: 14, right: 14 }
    });
    finalY = doc.lastAutoTable.finalY;

    // Booking Table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Bookings', 14, finalY + 8); // Reduced gap

    const bookingTableColumn = ["S/N", "Room Type", "Qty", "Duration", "Check-In", "Check-Out", "Nights", `Rate/Night`, `Subtotal (${symbol})`];
    const bookingTableRows = data.bookings.map((booking, index) => [
        index + 1,
        booking.roomType,
        booking.quantity,
        `${booking.nights} night${booking.nights > 1 ? 's' : ''}`,
        formatDateForDisplay(booking.checkIn),
        formatDateForDisplay(booking.checkOut),
        booking.nights,
        formatMoney(booking.ratePerNight),
        formatMoney(booking.subtotal)
    ]);
    
    doc.autoTable({
      startY: finalY + 11,
      head: [bookingTableColumn],
      body: bookingTableRows,
      theme: 'grid',
      headStyles: { fillColor: '#2c3e50', fontSize: 8 },
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.5 }, // Reduced padding
      columnStyles: { 2: { halign: 'center' }, 6: { halign: 'center' }, 7: { halign: 'right' }, 8: { halign: 'right' } }
    });
    finalY = doc.lastAutoTable.finalY;
    
    // Tax Note
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100);
    doc.text('Note: Festive Season Offer applied.', 14, finalY + 5);
    finalY += 5;

    // Additional Charges Table
    if (data.additionalChargeItems.length > 0) {
        finalY += 4;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Additional Charges', 14, finalY + 8);
        const chargesColumn = ["S/N", "Description", `Amount (${symbol})`];
        const chargesRows = data.additionalChargeItems.map((item, index) => [index+1, item.description, formatMoney(item.amount)]);
        doc.autoTable({
          startY: finalY + 11,
          head: [chargesColumn],
          body: chargesRows,
          theme: 'grid',
          headStyles: { fillColor: '#2c3e50' },
          styles: { font: 'helvetica', fontSize: 9, cellPadding: 1.5 },
          columnStyles: { 2: { halign: 'right' } }
        });
        finalY = doc.lastAutoTable.finalY;
    }
    
    // Payments Table
    if (data.payments.length > 0) {
        finalY += 4;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Payments Received', 14, finalY + 8);
        const paymentsColumn = ["Date", "Method", "Reference", `Amount (${symbol})`];
        const paymentsRows = data.payments.map(item => [item.date, item.paymentMethod, item.reference || 'N/A', formatMoney(item.amount)]);
        doc.autoTable({
          startY: finalY + 11,
          head: [paymentsColumn],
          body: paymentsRows,
          theme: 'grid',
          headStyles: { fillColor: '#16a34a' },
          styles: { font: 'helvetica', fontSize: 9, cellPadding: 1.5 },
          columnStyles: { 3: { halign: 'right' } }
        });
        finalY = doc.lastAutoTable.finalY;
    }

    const pageHeight = doc.internal.pageSize.height;
    const margin = 14;
    let y = finalY + 8; // Reduced gap

    const checkPageBreak = (heightNeeded: number) => {
        if (y + heightNeeded > pageHeight - 15) {
            doc.addPage();
            y = 20;
        }
    };

    // 1. SUMMARY SECTION
    checkPageBreak(65);

    const summaryX_Label = 155;
    const summaryX_Value = 196;
    const lineHeight = 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    doc.text('Subtotal:', summaryX_Label, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatMoneyWithPrefix(data.subtotal), summaryX_Value, y, { align: 'right' });
    y += lineHeight;

    if (data.discount > 0) {
      doc.setFont('helvetica', 'normal');
      doc.text('Discount:', summaryX_Label, y, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(formatMoneyWithPrefix(-data.discount), summaryX_Value, y, { align: 'right' });
      y += lineHeight;
    }
    
    if (data.holidaySpecialDiscount > 0) {
      doc.setFont('helvetica', 'normal');
      doc.text(`${data.holidaySpecialDiscountName}:`, summaryX_Label, y, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(formatMoneyWithPrefix(-data.holidaySpecialDiscount), summaryX_Value, y, { align: 'right' });
      y += lineHeight;
    }

    doc.setFont('helvetica', 'normal');
    doc.text('Tax (7.5% Inclusive):', summaryX_Label, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatMoneyWithPrefix(data.taxAmount), summaryX_Value, y, { align: 'right' });
    y += 2;
    
    doc.setLineWidth(0.3);
    doc.line(summaryX_Label - 35, y, summaryX_Value, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL AMOUNT DUE:', summaryX_Label, y, { align: 'right' });
    doc.text(formatMoneyWithPrefix(data.totalAmountDue), summaryX_Value, y, { align: 'right' });
    y += lineHeight;

    doc.text('AMOUNT RECEIVED:', summaryX_Label, y, { align: 'right' });
    doc.text(formatMoneyWithPrefix(amountReceived), summaryX_Value, y, { align: 'right' });
    y += 2;

    doc.setLineWidth(0.3);
    doc.line(summaryX_Label - 35, y, summaryX_Value, y);
    y += 5;
    
    const balanceLabel = data.balance > 0 ? 'BALANCE DUE:' : data.balance < 0 ? 'CREDIT:' : 'BALANCE:';
    doc.text(balanceLabel, summaryX_Label, y, { align: 'right' });
    if (data.balance < 0) doc.setTextColor('#38A169'); 
    else if (data.balance > 0) doc.setTextColor('#E53E3E'); 
    doc.text(formatMoneyWithPrefix(Math.abs(data.balance)), summaryX_Value, y, { align: 'right' });
    doc.setTextColor('#2c3e50');
    
    y += 8;

    // 2. AMOUNT IN WORDS SECTION
    checkPageBreak(20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const amountReceivedText = amountReceived > 0 ? data.amountInWords : 'Zero Naira only';
    const wordsLabel = `Amount in Words (for Amount Received): ${amountReceivedText}`;
    const splitAmountWords = doc.splitTextToSize(wordsLabel, 180); 
    doc.text(splitAmountWords, margin, y);
    y += (splitAmountWords.length * 6) + 4;

    // 3. PAYMENT STATUS & BANK DETAILS BLOCK
    if (data.status !== InvoiceStatus.PAID) {
        // Ensure there is enough space for status and bank details table to stay together
        // Reduced height threshold to avoid unnecessary page break
        checkPageBreak(70); 

        if (data.status === InvoiceStatus.PARTIAL) {
             doc.setFont('helvetica', 'bold');
             doc.setTextColor('#E53E3E'); 
             doc.text('Partial Payment Received.', margin, y);
             y += 4;
             doc.setTextColor(44, 62, 80); 
             doc.setFont('helvetica', 'normal');
             doc.text('Kindly settle the outstanding balance using the bank details below.', margin, y);
             y += 2;
        } else {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor('#f59e0b'); 
            doc.text(`Payment Status: Pending`, margin, y);
            y += 4;
            doc.setTextColor(44, 62, 80); 
            doc.setFont('helvetica', 'normal');
            doc.text('Kindly complete your payment using the bank details below.', margin, y);
            y += 2;
        }

        const usdDetails = 'USD\nBeneficiary Bank Swift Code: UMPLNGLA\nBeneficiary Bank Name: Providus Account\n(F59) Beneficiary Account: 1308430669\nBeneficiary Name: Tide` Hotels and Resorts\nBeneficiary Address: No. 38 S.O Williams Street, Utako, Abuja';
        const gbpDetails = 'GBP\nBeneficiary Bank Swift Code: UMPLNGLA\nBeneficiary Bank Name: Providus Account\n(F59) Beneficiary Account: 1308430676\nBeneficiary Name: Tide` Hotels and Resorts';
        const euroDetails = 'EURO\nBeneficiary Bank Swift Code: UMPLNGLA\nBeneficiary Bank Name: Providus Account\n(F59) Beneficiary Account: 1308430683\nBeneficiary Name: Tide` Hotels and Resorts\nBeneficiary Address: No. 38 S.O Williams Street, Utako, Abuja';

        // Use autoTable for bank details to avoid overlap
        doc.autoTable({
            startY: y,
            head: [['NAIRA ACCOUNTS', 'DOMICILIARY ACCOUNTS (PROVIDUS BANK)']],
            body: [
                [
                    'MONIEPOINT MFB\nAccount Number: 5169200615\nAccount Name: TIDE HOTELS & RESORTS', 
                    usdDetails
                ],
                [
                    'PROVIDUS BANK\nAccount Number: 1306538190\nAccount Name: TIDE\' HOTELS AND RESORTS',
                    gbpDetails
                ],
                [
                    '',
                    euroDetails
                ]
            ],
            theme: 'grid',
            styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.5, textColor: '#2c3e50', valign: 'top' },
            headStyles: { fillColor: '#e2e8f0', textColor: '#2c3e50', fontStyle: 'bold', halign: 'center', fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 70 },
                1: { cellWidth: 'auto' }
            },
            margin: { left: 14, right: 14 }
        });
        
        y = (doc as any).lastAutoTable.finalY + 3;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        const noteText = 'Please make your payment using any of the accounts above and include your invoice reference number for confirmation.';
        const splitNote = doc.splitTextToSize(noteText, 180);
        doc.text(splitNote, 105, y, { align: 'center', maxWidth: 180 });
        
    } else {
        checkPageBreak(25);
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#38A169'); 
        doc.setFontSize(12);
        doc.text('FULL PAYMENT RECEIVED. THANK YOU FOR YOUR PATRONAGE.', 105, y, { align: 'center' });
        y += 10;
        doc.setTextColor('#2c3e50');
    }
    
    // Signatures
    checkPageBreak(30);
    y += 10; 
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0); 
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor('#000000');

    doc.line(margin, y, margin + 60, y); 
    doc.text("Guest Signature", margin, y + 5);

    doc.line(136, y, 196, y); 
    doc.text("Cashier/Receptionist Signature", 136, y + 5);

    // Footer note moved to bottom of page regardless of flow
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor('#7f8c8d');
    doc.text('Thank you for choosing Tidè Hotels and Resorts.', 105, pageHeight - 10, { align: 'center' });

    return doc;
  } catch (e) {
    alert("An error occurred while generating the PDF. Please check console for details.");
    return null;
  }
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
  if (!printWindow) { alert('Please allow popups for this website'); return; }

  const isReservation = data.documentType === 'reservation';
  const bookingRows = data.bookings.map((booking, idx) => `
    <tr>
      <td class="px-2 py-1 border-b border-gray-200 text-center">${idx + 1}</td>
      <td class="px-2 py-1 border-b border-gray-200">${booking.roomType}</td>
      <td class="px-2 py-1 border-b border-gray-200 text-center">${booking.quantity}</td>
      <td class="px-2 py-1 border-b border-gray-200 text-center">${booking.nights} night${booking.nights > 1 ? 's' : ''}</td>
      <td class="px-2 py-1 border-b border-gray-200 text-right">${formatMoney(booking.ratePerNight)}</td>
      <td class="px-2 py-1 border-b border-gray-200 text-right">${formatMoney(booking.subtotal)}</td>
    </tr>
  `).join('');
  
  const chargesRows = data.additionalChargeItems.map((item, idx) => `
    <tr>
      <td class="px-2 py-1 border-b border-gray-200 text-center">${idx + 1}</td>
      <td class="px-2 py-1 border-b border-gray-200">${item.description}</td>
      <td class="px-2 py-1 border-b border-gray-200 text-right">${formatMoney(item.amount)}</td>
    </tr>
  `).join('');
  
  const paymentRows = data.payments.map(item => `
    <tr>
      <td class="px-2 py-1 border-b border-gray-200">${item.date}</td>
      <td class="px-2 py-1 border-b border-gray-200">${item.paymentMethod}</td>
      <td class="px-2 py-1 border-b border-gray-200">${item.reference || '-'}</td>
      <td class="px-2 py-1 border-b border-gray-200 text-right">${formatMoney(item.amount)}</td>
    </tr>
  `).join('');
  
  const bankDetailsHtml = `
    <div class="grid grid-cols-2 gap-2 text-[10px] leading-snug">
      <div class="border-r border-gray-200 pr-2">
        <h4 class="font-bold underline mb-1 text-[#c4a66a] uppercase">Naira Accounts</h4>
        <div class="mb-2">
            <p class="font-bold text-gray-800">MONIEPOINT MFB</p>
            <p>Account No: 5169200615</p>
            <p>Name: TIDE HOTELS & RESORTS</p>
        </div>
        <div>
            <p class="font-bold text-gray-800">PROVIDUS BANK</p>
            <p>Account No: 1306538190</p>
            <p>Name: TIDE' HOTELS AND RESORTS</p>
        </div>
      </div>
      <div class="pl-2">
        <h4 class="font-bold underline mb-1 text-[#c4a66a] uppercase">Domiciliary Accounts (Providus)</h4>
        
        <div class="mb-2 border-b border-gray-100 pb-1">
            <p class="font-bold text-gray-800">USD</p>
            <p>Beneficiary Bank Swift Code: UMPLNGLA</p>
            <p>Beneficiary Bank Name: Providus Account</p>
            <p>(F59) Beneficiary Account: 1308430669</p>
            <p>Beneficiary Name: Tide\` Hotels and Resorts</p>
            <p class="text-[9px] text-gray-500">Beneficiary Address: No. 38 S.O Williams Street, Utako, Abuja</p>
        </div>
        
        <div class="mb-2 border-b border-gray-100 pb-1">
            <p class="font-bold text-gray-800">GBP</p>
            <p>Beneficiary Bank Swift Code: UMPLNGLA</p>
            <p>Beneficiary Bank Name: Providus Account</p>
            <p>(F59) Beneficiary Account: 1308430676</p>
            <p>Beneficiary Name: Tide\` Hotels and Resorts</p>
        </div>

        <div>
            <p class="font-bold text-gray-800">EURO</p>
            <p>Beneficiary Bank Swift Code: UMPLNGLA</p>
            <p>Beneficiary Bank Name: Providus Account</p>
            <p>(F59) Beneficiary Account: 1308430683</p>
            <p>Beneficiary Name: Tide\` Hotels and Resorts</p>
            <p class="text-[9px] text-gray-500">Beneficiary Address: No. 38 S.O Williams Street, Utako, Abuja</p>
        </div>
      </div>
    </div>
  `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${isReservation ? 'Reservation Invoice' : 'Receipt'} - ${data.receiptNo}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style> @media print { body { -webkit-print-color-adjust: exact; } } </style>
    </head>
    <body class="p-8 bg-white max-w-4xl mx-auto text-gray-900">
      <div class="text-center mb-6">
        <h1 class="text-3xl font-bold text-[#c4a66a]">TIDÈ HOTELS AND RESORTS</h1>
        <p class="text-[#2c3e50] text-sm">Where Boldness Meets Elegance.</p>
        <p class="text-xs text-gray-600 mt-1">38 S.O Williams Street Off Anthony Enahoro Street Utako Abuja</p>
        <div class="border-b border-gray-300 w-1/2 mx-auto mt-2"></div>
      </div>
      
      <div class="mb-4">
        <h2 class="text-xl font-bold text-center ${isReservation ? 'text-red-700' : 'text-[#2c3e50]'} mb-2">${isReservation ? 'INVOICE FOR RESERVATION' : 'OFFICIAL RECEIPT'}</h2>
        <div class="flex justify-between text-sm">
          <div>
            <p><span class="font-bold">${isReservation ? 'Invoice No:' : 'Receipt No:'}</span> ${data.receiptNo}</p>
            ${!isReservation && data.verificationDetails ? `
                <div class="mt-2 bg-green-50 p-2 rounded">
                    <p><span class="font-bold">Payment Ref:</span> ${data.verificationDetails.paymentReference}</p>
                    <p><span class="font-bold">Verified By:</span> ${data.verificationDetails.verifiedBy}</p>
                    <p><span class="font-bold">Date:</span> ${data.verificationDetails.dateVerified}</p>
                </div>
            ` : ''}
          </div>
          <div class="text-right">
            <p><span class="font-bold">Date:</span> ${formatDateForDisplay(data.date)}</p>
          </div>
        </div>
      </div>
      
      <div class="mb-4 border border-gray-200 rounded p-3 text-sm">
        <p><span class="font-bold">Guest Name:</span> ${data.guestName}</p>
        <p><span class="font-bold">Email:</span> ${data.guestEmail}</p>
        <p><span class="font-bold">Phone:</span> ${data.phoneContact}</p>
        <p><span class="font-bold">Room Number(s):</span> ${data.roomNumber}</p>
      </div>
      
      <div class="mb-2">
        <h3 class="font-bold text-[#2c3e50] mb-2">Bookings</h3>
        <table class="w-full text-sm mb-2">
          <thead class="bg-[#2c3e50] text-white">
            <tr>
              <th class="px-2 py-1">S/N</th>
              <th class="px-2 py-1 text-left">Room Type</th>
              <th class="px-2 py-1">Qty</th>
              <th class="px-2 py-1">Duration</th>
              <th class="px-2 py-1 text-right">Rate</th>
              <th class="px-2 py-1 text-right">Subtotal (${symbol})</th>
            </tr>
          </thead>
          <tbody>${bookingRows}</tbody>
        </table>
        <p class="text-xs italic text-gray-500 mb-4">Note: Festive Season Offer applied.</p>
      </div>
      
      ${data.additionalChargeItems.length > 0 ? `
        <div class="mb-4">
          <h3 class="font-bold text-[#2c3e50] mb-2">Additional Charges</h3>
          <table class="w-full text-sm">
            <thead class="bg-[#2c3e50] text-white">
              <tr>
                <th class="px-2 py-1 w-12">S/N</th>
                <th class="px-2 py-1 text-left">Description</th>
                <th class="px-2 py-1 text-right w-32">Amount (${symbol})</th>
              </tr>
            </thead>
            <tbody>${chargesRows}</tbody>
          </table>
        </div>
      ` : ''}
      
      ${data.payments.length > 0 ? `
        <div class="mb-4">
          <h3 class="font-bold text-[#2c3e50] mb-2">Payments Received</h3>
          <table class="w-full text-sm">
            <thead class="bg-green-600 text-white">
              <tr>
                <th class="px-2 py-1 text-left">Date</th>
                <th class="px-2 py-1 text-left">Method</th>
                <th class="px-2 py-1 text-left">Ref</th>
                <th class="px-2 py-1 text-right">Amount (${symbol})</th>
              </tr>
            </thead>
            <tbody>${paymentRows}</tbody>
          </table>
        </div>
      ` : ''}
      
      <div class="flex justify-end mb-6">
        <div class="w-1/2">
          <div class="flex justify-between mb-1 text-sm">
            <span>Subtotal:</span>
            <span class="font-bold">${formatMoneyWithPrefix(data.subtotal)}</span>
          </div>
          <div class="flex justify-between mb-1 text-sm">
            <span>Discount:</span>
            <span class="font-bold">${formatMoneyWithPrefix(-data.discount)}</span>
          </div>
          <div class="flex justify-between mb-1 text-sm">
            <span>${data.holidaySpecialDiscountName}:</span>
            <span class="font-bold">${formatMoneyWithPrefix(-data.holidaySpecialDiscount)}</span>
          </div>
           
           <div class="flex justify-between mb-2 text-sm border-b border-gray-300 pb-1">
            <span>Tax (7.5% Inclusive):</span>
            <span class="font-bold">${formatMoneyWithPrefix(data.taxAmount)}</span>
          </div>
           <div class="flex justify-between mb-2 text-base">
            <span class="font-bold">TOTAL AMOUNT DUE:</span>
            <span class="font-bold">${formatMoneyWithPrefix(data.totalAmountDue)}</span>
          </div>
           <div class="flex justify-between mb-2 text-base border-b border-gray-300 pb-1">
            <span>AMOUNT RECEIVED:</span>
            <span>${formatMoneyWithPrefix(data.amountReceived)}</span>
          </div>
           <div class="flex justify-between text-lg">
            <span class="font-bold">${data.balance > 0 ? 'BALANCE DUE:' : data.balance < 0 ? 'CREDIT:' : 'BALANCE:'}</span>
            <span class="font-bold ${data.balance !== 0 ? (data.balance > 0 ? 'text-red-600' : 'text-green-600') : ''}">${formatMoneyWithPrefix(Math.abs(data.balance))}</span>
          </div>
        </div>
      </div>
      
      <div class="mb-2 text-sm">
        <p><span class="font-bold">Amount in Words (for Amount Received):</span> ${data.amountReceived > 0 ? data.amountInWords : 'Zero Naira only'}</p>
      </div>
      
      ${data.status !== InvoiceStatus.PAID ? `
        <div class="mb-2 bg-gray-50 p-1 rounded border border-gray-200" style="page-break-inside: avoid; break-inside: avoid;">
          <h3 class="font-bold text-[#2c3e50] mb-1 text-sm">Bank Details for Payment</h3>
          ${bankDetailsHtml}
        </div>
      ` : `
        <div class="mb-8 text-center p-4 rounded border border-green-200 bg-green-50">
            <h3 class="font-bold text-green-700 text-lg">FULL PAYMENT RECEIVED. THANK YOU FOR YOUR PATRONAGE.</h3>
        </div>
      `}
      
      <div class="flex justify-between mt-8 mb-4 text-sm">
        <div class="text-center">
            <div class="border-b border-gray-400 w-48 mb-2"></div>
            <p class="font-bold text-gray-700">Guest Signature</p>
        </div>
        <div class="text-center">
            <div class="border-b border-gray-400 w-48 mb-2"></div>
            <p class="font-bold text-gray-700">Cashier/Receptionist Signature</p>
        </div>
      </div>
      
      <div class="text-center text-xs text-gray-500 mt-8">
        <p>Thank you for choosing Tidè Hotels and Resorts.</p>
      </div>
      <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
    </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
};

const printWalkInReceipt = (data: WalkInTransaction, guestName: string) => {
  const decimalFormatter = new Intl.NumberFormat('en-NG', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatMoney = (amount: number) => decimalFormatter.format(amount);
  const symbol = data.currency === 'NGN' ? '₦' : '$';
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) { alert('Please allow popups for this website'); return; }

  const chargesRows = data.charges.map((item) => `
    <div class="row">
      <div class="col-left">${item.service} ${item.otherServiceDescription ? `(${item.otherServiceDescription})` : ''}</div>
      <div class="col-right">${symbol}${formatMoney(item.amount)}</div>
    </div>
  `).join('');

  const totalDue = data.subtotal - data.discount + data.serviceCharge;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Walk-In Docket - ${data.id}</title>
      <style> 
        @media print { body { -webkit-print-color-adjust: exact; } } 
        body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            width: 300px;
            margin: 0 auto;
            background: #fff;
            color: #000;
            padding: 10px;
            box-sizing: border-box;
        }
        .text-center { text-align: center; }
        .bold { font-weight: bold; }
        .dashed { border-bottom: 1px dashed #000; margin: 10px 0; display: block; width: 100%; }
        .row { display: flex; justify-content: space-between; margin-bottom: 4px; width: 100%; }
        .col-left { text-align: left; max-width: 70%; word-break: break-all; }
        .col-right { text-align: right; flex: 1; white-space: nowrap; margin-left: 5px; }
        .title { font-size: 14px; margin-bottom: 5px; }
        .footer { font-size: 10px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="text-center">
        <div class="title bold">TIDÈ HOTELS AND RESORTS</div>
        <div>Utako, Abuja</div>
        <div class="dashed"></div>
        <div class="bold">WALK-IN DOCKET</div>
        <div>${data.transactionDate.split('T')[0]} | ${new Date(data.transactionDate).toLocaleTimeString()}</div>
        <div class="dashed"></div>
      </div>

      <div class="row">
        <span class="bold">Receipt No:</span>
        <span>${data.id}</span>
      </div>
      <div class="row">
        <span class="bold">Guest:</span>
        <span>${guestName}</span>
      </div>
      <div class="row">
        <span class="bold">Cashier:</span>
        <span>${data.cashier}</span>
      </div>

      <div class="dashed"></div>

      <div class="row bold" style="margin-bottom: 8px;">
        <div class="col-left">Item</div>
        <div class="col-right">Amount</div>
      </div>
      
      ${chargesRows}

      <div class="dashed"></div>

      <div class="row">
        <div class="col-left">Subtotal</div>
        <div class="col-right">${symbol}${formatMoney(data.subtotal)}</div>
      </div>
      ${data.discount > 0 ? `
      <div class="row">
        <div class="col-left">Discount</div>
        <div class="col-right">-${symbol}${formatMoney(data.discount)}</div>
      </div>
      ` : ''}
      
      <div class="row">
        <div class="col-left">Service Charge</div>
        <div class="col-right">${symbol}${formatMoney(data.serviceCharge)}</div>
      </div>

      <div class="row">
        <div class="col-left">Tax (7.5% Inclusive)</div>
        <div class="col-right">${symbol}${formatMoney(data.tax)}</div>
      </div>
      
      <div class="dashed"></div>

      <div class="row bold" style="font-size: 14px;">
        <div class="col-left">Total Due</div>
        <div class="col-right">${symbol}${formatMoney(totalDue)}</div>
      </div>

      <div class="row">
        <div class="col-left">Amount Paid</div>
        <div class="col-right">${symbol}${formatMoney(data.amountPaid)}</div>
      </div>

      <div class="row bold">
        <div class="col-left">Balance</div>
        <div class="col-right">${symbol}${formatMoney(data.balance)}</div>
      </div>
      
      <div class="row">
        <div class="col-left">Payment Method:</div>
        <div class="col-right">${data.paymentMethod}</div>
      </div>

      <div class="dashed"></div>

      <div style="margin-top: 30px;">
        <div style="border-bottom: 1px solid #000; width: 100%; margin-bottom: 5px;"></div>
        <div class="text-center bold">Guest Signature</div>
      </div>
      
      <div style="margin-top: 30px;">
        <div style="border-bottom: 1px solid #000; width: 100%; margin-bottom: 5px;"></div>
        <div class="text-center bold">Cashier Signature</div>
      </div>
      
      <div class="text-center footer">
        Thank you for visiting.<br>
        Where Boldness Meets Elegance.
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
            const d = t.data as InvoiceData;
            status = d.status;
            amountDue = d.totalAmountDue;
        } else { status = 'Walk-In'; }
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
  useEffect(() => {
    // Reduced to 1500 for faster load
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-[#2c3e50] flex flex-col items-center justify-center z-50 animate-fade-in-up">
      <div className="text-center px-4">
        <h1 className="text-4xl md:text-6xl font-bold text-[#c4a66a] mb-6 tracking-wider">
          Tidè Hotels and Resorts
        </h1>
        <div className="h-1 w-32 bg-[#c4a66a] mx-auto mb-6 rounded"></div>
        <p className="text-white text-lg md:text-xl tracking-[0.3em] uppercase font-light animate-pulse-slow">
          Where Boldness Meets Elegance
        </p>
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
    
    if (foundUser) {
      onLogin({ name: foundUser.username, role: foundUser.role });
    } else {
      setError('Invalid credentials');
    }
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
          <div>
            <input 
              type="text" 
              className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-[#c4a66a] focus:ring-1 focus:ring-[#c4a66a]" 
              placeholder="Enter your username"
              value={username} 
              onChange={e => setUsername(e.target.value)} 
            />
          </div>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-[#c4a66a] focus:ring-1 focus:ring-[#c4a66a]" 
              placeholder="Enter your password"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
          
          <div className="flex items-center">
              <input 
                type="checkbox" 
                id="remember" 
                className="h-4 w-4 text-[#c4a66a] bg-gray-700 border-gray-600 rounded focus:ring-[#c4a66a] ring-offset-gray-800"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-gray-300">Remember me</label>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          
          <button type="submit" className="w-full bg-[#c4a66a] text-white py-3 rounded font-bold hover:bg-[#b39556] transition-colors shadow-lg">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

const Dashboard = ({ user, onLogout, onCreateInvoice, transactions, onDeleteTransaction, onEditTransaction, onCreateWalkIn }: any) => {
  const today = new Date().toISOString().split('T')[0];
  const todaysTransactions = transactions.filter((t: RecordedTransaction) => t.date === today);
  
  const revenueTodayNGN = todaysTransactions
    .filter((t: RecordedTransaction) => t.currency === 'NGN')
    .reduce((sum: number, t: RecordedTransaction) => sum + (t.type === 'Hotel Stay' ? (t.data as InvoiceData).amountReceived : (t.data as WalkInTransaction).amountPaid), 0);
    
  const revenueTodayUSD = todaysTransactions
    .filter((t: RecordedTransaction) => t.currency === 'USD')
    .reduce((sum: number, t: RecordedTransaction) => sum + (t.type === 'Hotel Stay' ? (t.data as InvoiceData).amountReceived : (t.data as WalkInTransaction).amountPaid), 0);

  const totalOwingNGN = transactions
    .filter((t: RecordedTransaction) => t.currency === 'NGN' && t.balance > 0)
    .reduce((sum: number, t: RecordedTransaction) => sum + t.balance, 0);

  const totalCreditNGN = transactions
    .filter((t: RecordedTransaction) => t.currency === 'NGN' && t.balance < 0)
    .reduce((sum: number, t: RecordedTransaction) => sum + Math.abs(t.balance), 0);

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
    const date = new Date().toISOString().split('T')[0];
    downloadCSV(csvContent, `tide_transactions_${date}.csv`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow p-4 flex justify-between items-center">
        <div>
            <h1 className="text-xl font-bold text-[#c4a66a]">Tidè Hotels and Resorts</h1>
            <p className="text-xs text-gray-500">Where Boldness Meets Elegance.</p>
        </div>
        <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {user.name} <span className="bg-[#c4a66a] text-white text-xs px-2 py-0.5 rounded-full">{user.role}</span></span>
            <button onClick={onLogout} className="bg-[#2c3e50] text-white px-4 py-2 rounded text-sm hover:bg-[#34495e]">Logout</button>
        </div>
      </nav>

      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8 bg-white p-6 rounded-lg shadow-sm flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Dashboard Actions</h2>
            <div className="flex gap-3">
                 <button onClick={onCreateWalkIn} className="bg-[#2c3e50] text-white px-4 py-2 rounded shadow hover:bg-[#34495e] flex items-center gap-2">New Walk-In Guest Charge</button>
                 <button onClick={onCreateInvoice} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded shadow-sm hover:bg-gray-50 flex items-center gap-2">+ Create Reservation Invoice</button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
             <div className="bg-[#2c3e50] text-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xs opacity-80 uppercase tracking-wider">Transactions Today</h3>
                <p className="text-3xl font-bold mt-2">{todaysTransactions.length}</p>
             </div>
             <div className="bg-[#2c3e50] text-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xs opacity-80 uppercase tracking-wider">Revenue Today (NGN)</h3>
                <p className="text-3xl font-bold mt-2">₦{revenueTodayNGN.toLocaleString()}</p>
             </div>
              <div className="bg-red-700 text-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xs opacity-80 uppercase tracking-wider">Total Outstanding (Owing)</h3>
                <p className="text-3xl font-bold mt-2">₦{totalOwingNGN.toLocaleString()}</p>
             </div>
             <div className="bg-green-700 text-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xs opacity-80 uppercase tracking-wider">Total Credit (Hotel Owes)</h3>
                <p className="text-3xl font-bold mt-2">₦{totalCreditNGN.toLocaleString()}</p>
             </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-800">Completed Transaction History</h2>
                <button onClick={handleExportCSV} className="bg-[#c4a66a] text-white border border-[#c4a66a] px-4 py-2 rounded text-sm hover:bg-[#b39556] font-bold shadow-sm">Export CSV</button>
            </div>
            <div className="flex gap-4 mb-4">
                <input type="text" placeholder="Search by ID, Name, Email, Phone..." className="flex-1 border rounded p-2 text-sm bg-white text-gray-900" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <select className="border rounded p-2 text-sm min-w-[150px] bg-white text-gray-900" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="All Types">All Types</option>
                    <option value="Hotel Stay">Hotel Stay</option>
                    <option value="Walk-In">Walk-In</option>
                </select>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-[#2c3e50] text-white uppercase text-xs">
                        <tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Guest Name</th><th className="px-4 py-3">Amount Due</th><th className="px-4 py-3">Balance</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredTransactions.length === 0 ? (
                            <tr><td colSpan={8} className="text-center py-8 text-gray-500">No transactions found.</td></tr>
                        ) : (
                            filteredTransactions.map((t: RecordedTransaction) => {
                                let statusColor = 'bg-gray-100 text-gray-800';
                                let statusText = 'N/A';
                                if (t.type === 'Hotel Stay') {
                                    const d = t.data as InvoiceData;
                                    statusText = d.status;
                                    if (d.status === InvoiceStatus.PAID) statusColor = 'bg-green-100 text-green-800 border border-green-200';
                                    else if (d.status === InvoiceStatus.PARTIAL) statusColor = 'bg-yellow-100 text-yellow-800 border border-yellow-200';
                                    else statusColor = 'bg-red-50 text-red-700 border border-red-200 font-bold';
                                } else {
                                    statusText = 'Paid';
                                    if (t.balance > 0) { statusText = 'Partial/Pending'; statusColor = 'bg-red-50 text-red-700 border border-red-200 font-bold'; }
                                    else { statusColor = 'bg-green-100 text-green-800'; }
                                }
                                return (
                                    <tr key={t.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium">{t.id}</td>
                                        <td className="px-4 py-3 text-gray-500">{t.type}</td>
                                        <td className="px-4 py-3 text-gray-500">{t.date}</td>
                                        <td className="px-4 py-3">{t.guestName}</td>
                                        <td className="px-4 py-3">{formatCurrencyWithCode(t.amount, t.currency)}</td>
                                        <td className="px-4 py-3 font-medium">
                                          {t.balance > 0 ? (
                                            <span className="text-red-600 font-bold">{formatCurrencyWithCode(t.balance, t.currency)} (Owing)</span>
                                          ) : t.balance < 0 ? (
                                            <span className="text-green-600 font-bold">{formatCurrencyWithCode(Math.abs(t.balance), t.currency)} (Credit)</span>
                                          ) : (
                                            <span className="text-gray-500">-</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>{statusText}</span></td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            <button onClick={() => onEditTransaction(t)} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs">View/Edit</button>
                                            <button onClick={() => { if(confirm('Are you sure you want to delete?')) onDeleteTransaction(t.id); }} className="border border-red-300 text-red-600 px-3 py-1 rounded hover:bg-red-50 text-xs">Delete</button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
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
      if (initialData) return initialData;
      try {
          const saved = localStorage.getItem(DRAFT_KEY);
          if (saved) {
              const parsed = JSON.parse(saved);
              return {
                  ...parsed,
                  receivedBy: user.name || 'Francis',
                  designation: user.role === 'Admin' ? 'Manager' : 'Front Desk'
              };
          }
      } catch (e) { console.error("Error parsing draft", e); }
      return {
        id: uuid(),
        receiptNo: `RCPT-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        lastUpdatedAt: new Date().toISOString(),
        guestName: '',
        guestEmail: '',
        phoneContact: '',
        roomNumber: '',
        documentType: 'reservation',
        status: InvoiceStatus.PENDING,
        bookings: [],
        additionalChargeItems: [],
        subtotal: 0,
        discount: 0,
        holidaySpecialDiscountName: 'Holiday/Special Discount',
        holidaySpecialDiscount: 0,
        serviceCharge: 0,
        taxPercentage: 7.5,
        taxAmount: 0,
        totalAmountDue: 0,
        payments: [],
        amountReceived: 0,
        balance: 0,
        amountInWords: '',
        paymentPurpose: '',
        receivedBy: user.name || 'Francis',
        designation: user.role === 'Admin' ? 'Manager' : 'Front Desk',
        currency: 'NGN',
      };
  });

  useEffect(() => {
      if (!isAutoServiceCharge && initialData) return; 
      if (!isAutoServiceCharge) return;

      let sub = 0;
      data.bookings.forEach(b => sub += b.subtotal);
      data.additionalChargeItems.forEach(c => sub += c.amount);
      const taxable = Math.max(0, sub - data.discount - data.holidaySpecialDiscount);
      const autoServiceCharge = Math.round(taxable * 0.05);

      setData(prev => {
          if (prev.serviceCharge === autoServiceCharge) return prev;
          return { ...prev, serviceCharge: autoServiceCharge };
      });
  }, [data.bookings, data.additionalChargeItems, data.discount, data.holidaySpecialDiscount, isAutoServiceCharge, initialData]);

  const totals = useMemo(() => {
      let sub = 0;
      data.bookings.forEach(b => sub += b.subtotal);
      data.additionalChargeItems.forEach(c => sub += c.amount);
      
      const taxableAmount = sub - data.discount - data.holidaySpecialDiscount;
      
      const serviceCharge = data.serviceCharge || 0;
      const tax = Math.max(0, taxableAmount - (taxableAmount / 1.075)); 
      const total = Math.max(0, taxableAmount + serviceCharge);
      
      let received = 0;
      data.payments.forEach(p => received += p.amount);
      
      return {
          subtotal: sub,
          serviceCharge: serviceCharge,
          taxAmount: tax,
          totalAmountDue: total,
          amountReceived: received,
          balance: total - received,
          status: received >= total ? InvoiceStatus.PAID : (received > 0 ? InvoiceStatus.PARTIAL : InvoiceStatus.PENDING),
          amountInWords: convertAmountToWords(received, data.currency)
      };
  }, [data.bookings, data.additionalChargeItems, data.payments, data.discount, data.holidaySpecialDiscount, data.currency, data.serviceCharge]);

  useEffect(() => {
      const timer = setTimeout(() => {
          const fullData = { ...data, ...totals };
          if (initialData) {
              if (fullData.guestName && fullData.receiptNo) {
                  onSave(fullData, true);
              }
          } else {
              localStorage.setItem(DRAFT_KEY, JSON.stringify(fullData));
          }
      }, 2000); 
      return () => clearTimeout(timer);
  }, [data, totals, initialData, onSave]);

  const getCurrentRates = () => data.currency === 'USD' ? ROOM_RATES_USD : ROOM_RATES_NGN;

  const handleCurrencyChange = (newCurrency: 'NGN' | 'USD') => {
      if (newCurrency === data.currency) return;
      
      const newRates = newCurrency === 'USD' ? ROOM_RATES_USD : ROOM_RATES_NGN;
      const updatedBookings = data.bookings.map(b => ({
          ...b,
          ratePerNight: newRates[b.roomType],
          subtotal: b.nights * b.quantity * newRates[b.roomType]
      }));

      setData({
          ...data,
          currency: newCurrency,
          bookings: updatedBookings
      });
  };

  const updateBooking = (id: string, field: string, value: any) => {
      const rates = getCurrentRates();
      setData(prev => {
          const newBookings = prev.bookings.map(b => {
              if (b.id === id) {
                  const updated = { ...b, [field]: value };
                  if (field === 'roomType') updated.ratePerNight = rates[value as RoomType];
                  if (field === 'checkIn' || field === 'checkOut') {
                      updated.nights = calculateNights(updated.checkIn, updated.checkOut);
                  }
                  if (field === 'nights') {
                       const n = parseInt(value) || 0;
                       updated.nights = n;
                       if (updated.checkIn) {
                           const d = new Date(updated.checkIn);
                           d.setDate(d.getDate() + n);
                           updated.checkOut = d.toISOString().split('T')[0];
                       }
                  }
                  updated.subtotal = updated.nights * updated.quantity * updated.ratePerNight;
                  return updated;
              }
              return b;
          });
          return { ...prev, bookings: newBookings };
      });
  };

  const addBooking = () => {
      const rates = getCurrentRates();
      const newBooking: BookingItem = {
          id: uuid(),
          roomType: RoomType.SOJOURN_ROOM,
          quantity: 1,
          checkIn: data.date,
          checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          nights: 1,
          ratePerNight: rates[RoomType.SOJOURN_ROOM],
          subtotal: rates[RoomType.SOJOURN_ROOM]
      };
      setData(prev => ({ ...prev, bookings: [...prev.bookings, newBooking] }));
  };

  const addCharge = () => {
      const newCharge: AdditionalChargeItem = { id: uuid(), description: '', amount: 0 };
      setData(prev => ({ ...prev, additionalChargeItems: [...prev.additionalChargeItems, newCharge] }));
  };

  const addPayment = () => {
      const newPayment: PaymentItem = {
          id: uuid(),
          date: new Date().toISOString().split('T')[0],
          amount: 0,
          paymentMethod: PaymentMethod.CASH,
          recordedBy: user.name
      };
      setData(prev => ({ ...prev, payments: [...prev.payments, newPayment] }));
  };

  const removeBooking = (id: string) => {
      setData(prev => ({ ...prev, bookings: prev.bookings.filter(b => b.id !== id) }));
  };

  const removeCharge = (id: string) => {
      setData(prev => ({ ...prev, additionalChargeItems: prev.additionalChargeItems.filter(c => c.id !== id) }));
  };

  const removePayment = (id: string) => {
      setData(prev => ({ ...prev, payments: prev.payments.filter(p => p.id !== id) }));
  };

  const updatePayment = (id: string, field: string, value: any) => {
      setData(prev => ({
          ...prev,
          payments: prev.payments.map(p => p.id === id ? { ...p, [field]: value } : p)
      }));
  };
  
  const updateCharge = (id: string, field: string, value: any) => {
      setData(prev => ({
          ...prev,
          additionalChargeItems: prev.additionalChargeItems.map(c => c.id === id ? { ...c, [field]: value } : c)
      }));
  };

  const handleSave = () => {
      const fullData = { ...data, ...totals };
      if (!fullData.guestName) { alert('Guest Name is required.'); return; }
      onSave(fullData);
      localStorage.removeItem(DRAFT_KEY);
  };
  
  const handlePrint = () => {
      const fullData = { ...data, ...totals };
      if (!fullData.guestName) { alert('Guest Name is required.'); return; }
      // Auto-save before printing (pass true for isAutoSave to prevent navigating away)
      onSave(fullData, true);
      printInvoice(fullData);
  };

  const handleGeneratePdf = () => {
      const fullData = { ...data, ...totals };
      if (!fullData.guestName) { alert('Guest Name is required.'); return; }
      // Auto-save before generating PDF
      onSave(fullData, true);
      const doc = createInvoiceDoc(fullData);
      if (doc) doc.save(`${fullData.receiptNo}_${fullData.guestName}.pdf`);
  };

  const symbol = data.currency === 'NGN' ? '₦' : '$';

  return (
    <div className="bg-white min-h-screen p-8 text-gray-900 font-sans pb-20">
       {/* Header */}
       <div className="flex justify-between items-center mb-8">
           <h1 className="text-3xl font-bold text-[#c4a66a]">
               {initialData ? 'Edit Invoice / Receipt' : 'New Invoice / Receipt'}
           </h1>
           <div className="flex gap-2">
               <button onClick={handlePrint} className="bg-[#2c3e50] text-white px-4 py-2 rounded hover:bg-[#34495e] text-sm">Print</button>
               <button onClick={handleGeneratePdf} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm">Download PDF</button>
               <button onClick={handleSave} className="bg-[#2c3e50] text-white px-4 py-2 rounded hover:bg-[#34495e] text-sm">Save & Close</button>
               <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 px-4 py-2 text-sm">Cancel</button>
           </div>
       </div>

       <div className="max-w-5xl mx-auto space-y-8">
           {/* Document Type & Currency */}
           <div className="grid grid-cols-2 gap-8 mb-6">
               <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase">Document Type</label>
                   <select 
                     className="w-full mt-1 border rounded p-2 bg-white text-gray-900"
                     value={data.documentType} 
                     onChange={(e) => setData({...data, documentType: e.target.value as any})}
                   >
                       <option value="reservation">Reservation Invoice</option>
                       <option value="receipt">Official Receipt</option>
                   </select>
               </div>
               <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase">Currency</label>
                   <select 
                     className="w-full mt-1 border rounded p-2 bg-white text-gray-900"
                     value={data.currency} 
                     onChange={(e) => handleCurrencyChange(e.target.value as 'NGN' | 'USD')}
                   >
                       <option value="NGN">NGN (Naira)</option>
                       <option value="USD">USD (Dollars)</option>
                   </select>
               </div>
           </div>

           {/* Guest Information Panel */}
           <div className="border border-gray-200 rounded">
               <div className="bg-gray-100 p-3 border-b border-gray-200 flex justify-between items-center">
                   <h3 className="font-bold text-gray-800">Guest Information</h3>
                   <div className="flex items-center gap-2">
                       <span className="text-sm text-gray-600">Date:</span>
                       <input 
                         type="date" 
                         className="border rounded p-1 text-sm bg-white text-gray-900" 
                         value={data.date} 
                         onChange={(e) => setData({...data, date: e.target.value})} 
                       />
                   </div>
               </div>
               <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase">Guest Name <span className="text-red-500">*</span></label>
                       <input type="text" className="w-full mt-1 border rounded p-2 bg-white text-gray-900" value={data.guestName} onChange={(e) => setData({...data, guestName: e.target.value})} placeholder="Full Name" />
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase">Email</label>
                       <input type="email" className="w-full mt-1 border rounded p-2 bg-white text-gray-900" value={data.guestEmail} onChange={(e) => setData({...data, guestEmail: e.target.value})} placeholder="guest@example.com" />
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase">Phone</label>
                       <input type="text" className="w-full mt-1 border rounded p-2 bg-white text-gray-900" value={data.phoneContact} onChange={(e) => setData({...data, phoneContact: e.target.value})} placeholder="+234..." />
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase">Room Number Assigned <span className="text-red-500">*</span></label>
                       <input type="text" className="w-full mt-1 border rounded p-2 bg-white text-gray-900" value={data.roomNumber} onChange={(e) => setData({...data, roomNumber: e.target.value})} placeholder="e.g. 101, 102" />
                   </div>
               </div>
           </div>

           {/* Room Bookings */}
           <div>
               <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg text-[#2c3e50]">Room Bookings</h3>
                    <button onClick={addBooking} className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded hover:bg-blue-200">+ Add Room</button>
               </div>
               <div className="overflow-x-auto">
                   <table className="w-full text-sm">
                       <thead className="bg-[#2c3e50] text-white">
                           <tr>
                               <th className="p-2 text-left">Room Type</th>
                               <th className="p-2 text-center w-16">Qty</th>
                               <th className="p-2 text-left">Check In</th>
                               <th className="p-2 text-left">Check Out</th>
                               <th className="p-2 text-center w-16">Nights</th>
                               <th className="p-2 text-right w-24">Rate</th>
                               <th className="p-2 text-right w-28">Subtotal</th>
                               <th className="p-2 w-10"></th>
                           </tr>
                       </thead>
                       <tbody className="divide-y text-gray-900 border border-gray-200">
                           {data.bookings.map(b => (
                               <tr key={b.id}>
                                   <td className="p-2">
                                       <select className="w-full border rounded p-1 bg-white text-gray-900" value={b.roomType} onChange={(e) => updateBooking(b.id, 'roomType', e.target.value)}>
                                           {Object.values(RoomType).map(rt => <option key={rt} value={rt}>{rt}</option>)}
                                       </select>
                                   </td>
                                   <td className="p-2"><input type="number" min="1" className="w-full border rounded p-1 text-center bg-white text-gray-900" value={b.quantity} onChange={(e) => updateBooking(b.id, 'quantity', parseInt(e.target.value))} /></td>
                                   <td className="p-2"><input type="date" className="w-full border rounded p-1 bg-white text-gray-900" value={b.checkIn} onChange={(e) => updateBooking(b.id, 'checkIn', e.target.value)} /></td>
                                   <td className="p-2"><input type="date" className="w-full border rounded p-1 bg-white text-gray-900" value={b.checkOut} onChange={(e) => updateBooking(b.id, 'checkOut', e.target.value)} /></td>
                                   <td className="p-2"><input type="number" min="0" className="w-full border rounded p-1 text-center bg-gray-100 text-gray-900" value={b.nights} onChange={(e) => updateBooking(b.id, 'nights', e.target.value)} /></td>
                                   <td className="p-2"><input type="number" className="w-full border rounded p-1 text-right bg-white text-gray-900" value={b.ratePerNight} onChange={(e) => updateBooking(b.id, 'ratePerNight', parseFloat(e.target.value))} /></td>
                                   <td className="p-2 text-right font-medium">{formatCurrencyWithCode(b.subtotal, data.currency)}</td>
                                   <td className="p-2"><button onClick={() => removeBooking(b.id)} className="text-red-500 hover:text-red-700 font-bold">✕</button></td>
                               </tr>
                           ))}
                           {data.bookings.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-gray-500 italic">No rooms added.</td></tr>}
                       </tbody>
                   </table>
               </div>
           </div>

           {/* Additional Charges */}
           <div>
               <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg text-[#2c3e50]">Additional Charges</h3>
                    <button onClick={addCharge} className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded hover:bg-blue-200">+ Add Charge</button>
               </div>
               <table className="w-full text-sm">
                   <thead className="bg-[#2c3e50] text-white">
                       <tr>
                           <th className="p-2 text-left">Description</th>
                           <th className="p-2 text-right w-32">Amount</th>
                           <th className="p-2 w-10"></th>
                       </tr>
                   </thead>
                   <tbody className="divide-y text-gray-900 border border-gray-200">
                       {data.additionalChargeItems.map(c => (
                           <tr key={c.id}>
                               <td className="p-2"><input type="text" className="w-full border rounded p-1 bg-white text-gray-900" placeholder="Item description" value={c.description} onChange={(e) => updateCharge(c.id, 'description', e.target.value)} /></td>
                               <td className="p-2"><input type="number" className="w-full border rounded p-1 text-right bg-white text-gray-900" value={c.amount} onChange={(e) => updateCharge(c.id, 'amount', parseFloat(e.target.value))} /></td>
                               <td className="p-2"><button onClick={() => removeCharge(c.id)} className="text-red-500 hover:text-red-700 font-bold">✕</button></td>
                           </tr>
                       ))}
                   </tbody>
               </table>
           </div>

           {/* Payments & Summary Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Left: Payments & Verification */}
               <div>
                   <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-lg text-[#2c3e50]">Payments</h3>
                        <button onClick={addPayment} className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded hover:bg-green-200">+ Add Payment</button>
                   </div>
                   <div className="border rounded mb-4">
                       <table className="w-full text-sm">
                           <thead className="bg-gray-100 border-b text-gray-700">
                               <tr>
                                   <th className="p-2 text-left w-28">Date</th>
                                   <th className="p-2 text-left">Method</th>
                                   <th className="p-2 text-right w-24">Amount</th>
                                   <th className="p-2 w-8"></th>
                               </tr>
                           </thead>
                           <tbody className="divide-y text-gray-900">
                               {data.payments.map(p => (
                                   <tr key={p.id}>
                                       <td className="p-2"><input type="date" className="w-full border rounded p-1 bg-white text-gray-900 text-xs" value={p.date} onChange={(e) => updatePayment(p.id, 'date', e.target.value)} /></td>
                                       <td className="p-2">
                                           <select className="w-full border rounded p-1 bg-white text-gray-900 text-xs" value={p.paymentMethod} onChange={(e) => updatePayment(p.id, 'paymentMethod', e.target.value)}>
                                               {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                                           </select>
                                           <input type="text" className="w-full border rounded p-1 bg-white text-gray-900 text-xs mt-1" placeholder="Ref" value={p.reference || ''} onChange={(e) => updatePayment(p.id, 'reference', e.target.value)} />
                                       </td>
                                       <td className="p-2"><input type="number" className="w-full border rounded p-1 text-right bg-white text-gray-900" value={p.amount} onChange={(e) => updatePayment(p.id, 'amount', parseFloat(e.target.value))} /></td>
                                       <td className="p-2"><button onClick={() => removePayment(p.id)} className="text-red-500 hover:text-red-700">✕</button></td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>

                   <div className="bg-blue-50 p-4 rounded border border-blue-200">
                        <h4 className="font-bold text-blue-800 text-sm mb-2">Payment Verification (Office Use)</h4>
                        <div className="space-y-2">
                             <input 
                                type="text" 
                                className="w-full border rounded p-2 text-sm bg-white text-gray-900" 
                                placeholder="Verified Payment Reference"
                                value={data.verificationDetails?.paymentReference || ''} 
                                onChange={(e) => setData({
                                    ...data, 
                                    verificationDetails: { 
                                        paymentReference: e.target.value, 
                                        verifiedBy: data.verificationDetails?.verifiedBy || user.name, 
                                        dateVerified: data.verificationDetails?.dateVerified || new Date().toISOString().split('T')[0]
                                    }
                                })} 
                             />
                        </div>
                   </div>
               </div>
               
               {/* Right: Summary */}
               <div className="bg-gray-50 p-6 rounded border border-gray-200">
                   <div className="grid grid-cols-2 gap-y-3 text-sm">
                       <div className="text-gray-600 self-center">Subtotal</div>
                       <div className="text-right font-bold">{formatCurrencyWithCode(totals.subtotal, data.currency)}</div>
                       
                       <div className="text-gray-600 self-center">Discount</div>
                       <div className="flex justify-end">
                           <input type="number" className="w-24 border rounded p-1 text-right text-sm bg-white text-gray-900" value={data.discount} onChange={(e) => setData({...data, discount: parseFloat(e.target.value) || 0})} />
                       </div>

                       <div className="text-gray-600 self-center">
                           <input 
                             type="text" 
                             className="border-b border-gray-300 bg-transparent text-gray-600 w-full text-xs" 
                             value={data.holidaySpecialDiscountName}
                             onChange={(e) => setData({...data, holidaySpecialDiscountName: e.target.value})}
                           />
                       </div>
                       <div className="flex justify-end">
                           <input type="number" className="w-24 border rounded p-1 text-right text-sm bg-white text-gray-900" value={data.holidaySpecialDiscount} onChange={(e) => setData({...data, holidaySpecialDiscount: parseFloat(e.target.value) || 0})} />
                       </div>

                       <div className="text-gray-600 self-center">Service Charge (5%)</div>
                       <div className="flex justify-end">
                           <input 
                                type="number" 
                                className="w-24 border rounded p-1 text-right text-sm bg-white text-gray-900" 
                                value={data.serviceCharge} 
                                onChange={(e) => {
                                    setData({...data, serviceCharge: parseFloat(e.target.value) || 0});
                                    setIsAutoServiceCharge(false); 
                                }} 
                           />
                       </div>

                       <div className="text-gray-600 self-center">Tax (7.5% Inclusive)</div>
                       <div className="text-right text-gray-500">{formatCurrencyWithCode(totals.taxAmount, data.currency)}</div>

                       <div className="col-span-2 border-t border-gray-300 my-1"></div>

                       <div className="font-bold text-[#2c3e50] self-center">Total Due</div>
                       <div className="text-right font-bold text-[#2c3e50] text-lg">{formatCurrencyWithCode(totals.totalAmountDue, data.currency)}</div>

                       <div className="text-green-700 self-center">Amount Paid</div>
                       <div className="flex justify-end">
                           <div className="text-right font-medium text-green-700 py-1">{formatCurrencyWithCode(totals.amountReceived, data.currency)}</div>
                       </div>
                       
                       <div className="col-span-2 border-t border-gray-300 my-1"></div>
                       
                       <div className="font-bold self-center text-lg">Balance</div>
                       <div className={`text-right font-bold text-lg ${totals.balance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                           {formatCurrencyWithCode(Math.abs(totals.balance), data.currency)}
                       </div>
                   </div>
               </div>
           </div>
       </div>
    </div>
  );
};

const WalkInGuestModal = ({ onClose, onSave, user }: any) => {
    const [guestName, setGuestName] = useState('Walk-In Guest');
    const [currency, setCurrency] = useState<'NGN'|'USD'>('NGN');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.POS);
    const [items, setItems] = useState<WalkInChargeItem[]>([
        { id: uuid(), date: new Date().toISOString().split('T')[0], service: WalkInService.RESTAURANT, amount: 0, paymentMethod: PaymentMethod.POS }
    ]);
    const [discount, setDiscount] = useState(0);
    const [customServiceCharge, setCustomServiceCharge] = useState<number | null>(null);
    const [tenderedAmount, setTenderedAmount] = useState<number | string>('');

    const addItem = () => {
        setItems([...items, { id: uuid(), date: new Date().toISOString().split('T')[0], service: WalkInService.RESTAURANT, amount: 0, paymentMethod: paymentMethod }]);
    };

    const removeItem = (id: string) => {
        if (items.length > 1) setItems(items.filter(i => i.id !== id));
        else setItems([{ ...items[0], amount: 0, service: WalkInService.RESTAURANT }]);
    };

    const updateItem = (id: string, field: keyof WalkInChargeItem, value: any) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const subtotal = items.reduce((sum, i) => sum + (i.amount || 0), 0);
    const taxable = Math.max(0, subtotal - discount);
    
    const calculatedServiceCharge = Math.round(taxable * 0.05);
    const serviceCharge = customServiceCharge !== null ? customServiceCharge : calculatedServiceCharge;
    
    const tax = Math.max(0, taxable - (taxable / 1.075));
    const totalDue = Math.max(0, taxable + serviceCharge);
    
    const paid = tenderedAmount === '' ? 0 : parseFloat(tenderedAmount as string);
    const balance = paid - totalDue;

    const handleSave = () => {
        if (!guestName) { alert('Guest Name is required'); return; }
        
        // Sync item payment methods with global transaction method for consistency
        const updatedItems = items.map(i => ({...i, paymentMethod: paymentMethod}));

        const transaction: WalkInTransaction = {
            id: `WIG-${Date.now().toString().slice(-6)}`,
            transactionDate: new Date().toISOString(),
            charges: updatedItems,
            currency,
            subtotal,
            discount,
            serviceCharge,
            tax,
            amountPaid: paid, 
            balance: balance < 0 ? balance : 0,
            cashier: user.name,
            paymentMethod: paymentMethod
        };
        onSave(transaction, guestName);
    };

    const symbol = currency === 'NGN' ? '₦' : '$';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 text-gray-900">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 pb-2 flex justify-between items-center bg-white z-10">
                    <h2 className="text-xl font-bold text-[#c4a66a]">New Walk-In Guest Charge</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-grow">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Guest Name / Descriptor <span className="text-red-500">*</span></label>
                        <input type="text" className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Walk-In Guest" />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Currency</label>
                        <select className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900" value={currency} onChange={(e) => setCurrency(e.target.value as any)}>
                            <option value="NGN">NGN (Naira)</option>
                            <option value="USD">USD</option>
                        </select>
                    </div>

                    <div className="border rounded p-4 bg-gray-50">
                        {items.map((item, index) => (
                           <div key={item.id} className={`flex flex-col gap-2 ${index < items.length - 1 ? 'border-b border-gray-200 pb-3 mb-3' : ''}`}>
                               <div className="flex gap-3 items-end">
                                   <div className="flex-grow">
                                       <label className="block text-xs font-bold text-gray-700 mb-1">Service</label>
                                       <select className="w-full border border-gray-300 rounded p-2 text-sm bg-white text-gray-900" value={item.service} onChange={(e) => updateItem(item.id, 'service', e.target.value)}>
                                            {Object.values(WalkInService).map(s => <option key={s} value={s}>{s}</option>)}
                                       </select>
                                   </div>
                                   <div className="w-24">
                                       <label className="block text-xs font-bold text-gray-700 mb-1">Amount</label>
                                       <input type="number" className="w-full border border-gray-300 rounded p-2 text-right text-sm bg-white text-gray-900" value={item.amount} onChange={(e) => updateItem(item.id, 'amount', parseFloat(e.target.value))} />
                                   </div>
                                   <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 p-2 mb-1">
                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                   </button>
                               </div>
                               {item.service === WalkInService.OTHER && (
                                   <div>
                                       <input 
                                          type="text" 
                                          className="w-full border border-gray-300 rounded p-2 text-sm bg-white text-gray-900 placeholder-gray-500" 
                                          placeholder="Description" 
                                          value={item.otherServiceDescription || ''} 
                                          onChange={(e) => updateItem(item.id, 'otherServiceDescription', e.target.value)} 
                                       />
                                   </div>
                               )}
                           </div>
                        ))}
                    </div>
                    
                    <button onClick={addItem} className="text-[#3182ce] font-medium text-sm hover:underline">+ Add Another Service</button>

                    <div className="mt-6 border-t pt-4 space-y-2">
                        <div className="flex justify-between text-sm font-bold">
                            <span>Subtotal:</span>
                            <span>{symbol} {subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                            <span className="font-bold">Discount:</span>
                            <input type="number" className="w-20 border rounded p-1 text-right text-sm bg-white text-gray-900" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 items-center">
                            <span className="font-bold">Service Charge (Flexible):</span>
                            <input 
                                type="number" 
                                className="w-20 border rounded p-1 text-right text-sm bg-white text-gray-900" 
                                value={serviceCharge} 
                                onChange={(e) => setCustomServiceCharge(parseFloat(e.target.value) || 0)} 
                            />
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 font-bold">
                            <span>Tax (7.5% Inclusive):</span>
                            <span>{symbol}{tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold text-[#c4a66a] mt-2 border-t pt-2">
                            <span>Total Due:</span>
                            <span>{symbol}{totalDue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        
                        <div className="flex justify-between items-center mt-2">
                             <span className="font-bold text-sm">Amount Paid:</span>
                             <input type="number" className="w-32 border rounded p-2 text-right font-bold bg-white text-gray-900" value={tenderedAmount} onChange={(e) => setTenderedAmount(e.target.value)} />
                        </div>

                        <div className="flex justify-between items-center mt-2 bg-yellow-50 p-2 rounded border border-yellow-100">
                             <span className="font-bold text-sm">Payment Method:</span>
                             <select 
                                className="w-32 border rounded p-2 bg-white text-gray-900 text-sm font-bold"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                             >
                                 {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                             </select>
                        </div>
                    </div>
                </div>

                <div className="p-6 pt-2 bg-gray-50 border-t border-gray-200">
                     <div className="flex justify-between items-end mb-4">
                        <div className="flex justify-between items-center text-lg font-bold w-full">
                            <span>Balance:</span>
                            <span className={balance >= 0 ? "text-green-600" : "text-red-600"}>
                                {symbol} {balance.toLocaleString(undefined, {minimumFractionDigits: 2})} 
                                <span className="text-xs font-normal text-gray-500 ml-1">(Change)</span>
                            </span>
                        </div>
                     </div>

                     <div className="flex gap-2 justify-end">
                        <button onClick={onClose} className="px-4 py-2 border border-red-200 text-red-600 rounded hover:bg-red-50 font-bold">Cancel</button>
                        <button onClick={handleSave} className="px-6 py-3 bg-[#2c3e50] text-white rounded font-bold shadow hover:bg-[#34495e] min-w-[120px]">
                           Print & Save
                        </button>
                     </div>
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

    useEffect(() => {
        const stored = localStorage.getItem('tide_transactions');
        if (stored) {
            try { setTransactions(JSON.parse(stored)); } catch(e) { console.error(e); }
        }
        
        const storedUser = localStorage.getItem('tide_user');
        if (storedUser) {
             setUser(JSON.parse(storedUser));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('tide_transactions', JSON.stringify(transactions));
    }, [transactions]);

    const handleLogin = (u: any) => {
        setUser(u);
        localStorage.setItem('tide_user', JSON.stringify(u));
        setView('dashboard');
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('tide_user');
        setView('login');
    };

    const handleCreateInvoice = () => {
        setEditingInvoice(null);
        setView('invoice');
    };

    const handleEditTransaction = (t: RecordedTransaction) => {
        if (t.type === 'Hotel Stay') {
            setEditingInvoice(t.data as InvoiceData);
            setView('invoice');
        } else {
            printWalkInReceipt(t.data as WalkInTransaction, t.guestName);
        }
    };

    const handleSaveInvoice = (invoiceData: InvoiceData, isAutoSave: boolean = false) => {
        const existingById = transactions.findIndex(t => 
             (t.data as any).id === invoiceData.id 
        );

        const newRecord: RecordedTransaction = {
            id: invoiceData.receiptNo,
            type: 'Hotel Stay',
            date: invoiceData.date,
            guestName: invoiceData.guestName,
            amount: invoiceData.totalAmountDue,
            balance: invoiceData.balance,
            currency: invoiceData.currency,
            data: invoiceData
        };

        if (existingById >= 0) {
            const updated = [...transactions];
            updated[existingById] = newRecord;
            setTransactions(updated);
        } else {
            setTransactions([newRecord, ...transactions]);
        }

        if (!isAutoSave) {
            setView('dashboard');
            setEditingInvoice(null);
        }
    };

    const handleDeleteTransaction = (id: string) => {
        setTransactions(transactions.filter(t => t.id !== id));
    };

    const handleSaveWalkIn = (data: WalkInTransaction, guestName: string) => {
        const newRecord: RecordedTransaction = {
            id: data.id,
            type: 'Walk-In',
            date: data.transactionDate.split('T')[0],
            guestName: guestName,
            amount: data.amountPaid,
            balance: 0,
            currency: data.currency,
            data: data
        };
        setTransactions([newRecord, ...transactions]);
        setShowWalkInModal(false);
        printWalkInReceipt(data, guestName);
    };

    if (showWelcome) {
        return <WelcomeScreen onComplete={() => setShowWelcome(false)} />;
    }

    if (!user) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    if (view === 'invoice') {
        return <InvoiceForm initialData={editingInvoice} onSave={handleSaveInvoice} onCancel={() => setView('dashboard')} user={user} />;
    }

    return (
        <>
            <Dashboard 
                user={user} 
                onLogout={handleLogout} 
                onCreateInvoice={handleCreateInvoice} 
                transactions={transactions}
                onDeleteTransaction={handleDeleteTransaction}
                onEditTransaction={handleEditTransaction}
                onCreateWalkIn={() => setShowWalkInModal(true)}
            />
            {showWalkInModal && (
                <WalkInGuestModal 
                    onClose={() => setShowWalkInModal(false)}
                    onSave={handleSaveWalkIn}
                    user={user}
                />
            )}
        </>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}