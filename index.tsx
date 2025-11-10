
import React, { useState, useEffect, ChangeEvent, useRef, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// GLOBAL DECLARATIONS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
declare const jspdf: any;
declare const flatpickr: any;


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// START: types.ts
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
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
  id: string; // Unique ID for the transaction, changes from invoice to receipt
  invoiceNo?: string; // Original invoice number, kept for reference
  receiptNo: string; // The primary key, either an invoice or receipt number
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
  
  subtotal: number; // Combined total of bookings and additional charges
  discount: number;
  holidaySpecialDiscountName: string;
  holidaySpecialDiscount: number;
  taxPercentage: number;
  taxAmount: number;
  totalAmountDue: number;
  
  payments: PaymentItem[];
  amountReceived: number; // This will be calculated from payments
  balance: number;
  amountInWords: string;
  paymentPurpose: string;

  receivedBy: string; // The original creator
  designation: string;
  currency: 'NGN' | 'USD';
  
  verificationDetails?: VerificationDetails;
}


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

const ROOM_RATES: Record<RoomType, number> = {
  [RoomType.SOJOURN_ROOM]: 165000,
  [RoomType.TRANQUIL_ROOM]: 185000,
  [RoomType.HARMONY_STUDIO]: 250000,
  [RoomType.SERENITY_STUDIO]: 280000,
  [RoomType.NARRATIVE_SUITE]: 390000,
  [RoomType.ODYSSEY_SUITE]: 550000,
  [RoomType.TIDE_SIGNATURE_SUITE]: 850000,
};
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// END: types.ts
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// START: UTILITY FUNCTIONS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen'
];

const TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
];

const SCALES = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion'];

function convertChunkToWords(num: number): string {
  if (num === 0) {
    return '';
  }

  if (num < 20) {
    return ONES[num];
  }

  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    return TENS[ten] + (one > 0 ? ' ' + ONES[one] : '');
  }

  const hundred = Math.floor(num / 100);
  const remainder = num % 100;
  let words = ONES[hundred] + ' hundred';
  if (remainder > 0) {
    words += ' ' + convertChunkToWords(remainder); // Removed 'and' for modern style
  }
  return words;
}

function numberToWords(num: number): string {
  if (num === 0) {
    return 'zero';
  }

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

function formatCurrencyAmountInWords(
  amount: number,
  currencyMajor: string,
  currencyMinor: string
): string {
  if (isNaN(amount) || amount < 0) {
    return 'Invalid Amount';
  }

  let majorUnit = Math.floor(amount);
  let minorUnit = Math.round((amount - majorUnit) * 100);
  
  if (minorUnit === 100) {
      majorUnit += 1;
      minorUnit = 0;
  }

  const majorWords = capitalizeFirstLetter(numberToWords(majorUnit));
  let result = `${majorWords} ${currencyMajor}`;

  if (minorUnit > 0) {
    const minorWords = capitalizeFirstLetter(numberToWords(minorUnit));
    result += ` and ${minorWords} ${currencyMinor}`;
  }

  return `${result} only`;
}

function convertAmountToWords(amount: number, currency: 'NGN' | 'USD'): string {
    if (currency === 'USD') {
        return formatCurrencyAmountInWords(amount, 'Dollars', 'Cents');
    }
    return formatCurrencyAmountInWords(amount, 'Naira', 'Kobo');
}

const formatDateForDisplay = (dateString: string): string => {
  if (!dateString) return '';
  try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      // Adjust for timezone offset to prevent date changes
      const adjustedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
      const day = adjustedDate.getDate();
      const month = adjustedDate.toLocaleString('default', { month: 'short' });

      let suffix = 'th';
      if (day % 10 === 1 && day !== 11) suffix = 'st';
      else if (day % 10 === 2 && day !== 12) suffix = 'nd';
      else if (day % 10 === 3 && day !== 13) suffix = 'rd';

      return `${day}${suffix} ${month}`;
  } catch (e) {
      return dateString;
  }
};

const calculateNights = (checkIn: string, checkOut: string): number => {
    if (!checkIn || !checkOut) return 0;
    try {
        const startDate = new Date(checkIn);
        const endDate = new Date(checkOut);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
            return 0;
        }
        const diffTime = endDate.getTime() - startDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    } catch (e) {
        return 0;
    }
};
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// END: UTILITY FUNCTIONS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// START: services/pdfGenerator.ts
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const createInvoiceDoc = (data: InvoiceData): any => {
  const { jsPDF } = jspdf;
  const doc = new jsPDF();
  const isReservation = data.documentType === 'reservation';
  const amountReceived = data.amountReceived;

  const currencyFormatter = new Intl.NumberFormat('en-NG', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
  });
  const currencyPrefix = `${data.currency} `;
  
  const formatMoney = (amount: number) => {
    return currencyFormatter.format(amount);
  }
  const formatMoneyWithPrefix = (amount: number) => {
    return currencyPrefix + currencyFormatter.format(amount);
  }


  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#c4a66a');
  doc.text('TIDÈ HOTELS AND RESORTS', 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#2c3e50');
  doc.text('Where Boldness Meets Elegance.', 105, 27, { align: 'center' });
  doc.setFontSize(9);
  doc.text('38 S.O Williams Street Off Anthony Enahoro Street Utako Abuja', 105, 32, { align: 'center' });
  doc.setLineWidth(0.5);
  doc.line(80, 35, 130, 35);


  // Document Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#2c3e50');
  doc.text(isReservation ? 'INVOICE FOR RESERVATION' : 'OFFICIAL RECEIPT', 105, 45, { align: 'center' });

  // Document Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${isReservation ? 'Invoice No:' : 'Receipt No:'} ${data.receiptNo}`, 14, 55);
  doc.text(`Date: ${data.date}`, 196, 55, { align: 'right' });
  let finalY = 55;

  // Verification Info
  if (data.verificationDetails && !isReservation) {
      const verificationInfo = [
          ['Payment Reference:', data.verificationDetails.paymentReference || 'N/A'],
          ['Verified By:', data.verificationDetails.verifiedBy],
          ['Date Verified:', data.verificationDetails.dateVerified],
      ];
      doc.autoTable({
          startY: finalY + 5,
          body: verificationInfo,
          theme: 'plain',
          styles: { font: 'helvetica', fontSize: 10, cellPadding: 1, fillColor: '#f0fff4' },
          columnStyles: { 0: { fontStyle: 'bold' } },
          margin: { left: 14, right: 14 }
      });
      finalY = doc.autoTable.previous.finalY;
  }
  

  // Guest Info
  const guestInfo = [
      ['Received From (Guest):', data.guestName],
      ['Email:', data.guestEmail],
      ['Phone/Contact:', data.phoneContact],
      ['Room Number(s):', data.roomNumber],
  ];
  doc.autoTable({
      startY: finalY + (data.verificationDetails && !isReservation ? 2 : 5),
      body: guestInfo,
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 1.5 },
      columnStyles: { 0: { fontStyle: 'bold' } },
      margin: { left: 14, right: 14 }
  });
  finalY = doc.autoTable.previous.finalY;

  // Booking Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bookings', 14, finalY + 10);

  const bookingTableColumn = ["S/N", "Room Type", "Qty", "Duration", "Check-In", "Check-Out", "Nights", `Rate/Night`, `Subtotal (${data.currency})`];
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
    startY: finalY + 14,
    head: [bookingTableColumn],
    body: bookingTableRows,
    theme: 'grid',
    headStyles: { fillColor: '#2c3e50', fontSize: 8 },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2 },
    columnStyles: {
        2: { halign: 'center' },
        6: { halign: 'center' },
        7: { halign: 'right' },
        8: { halign: 'right' }
    }
  });
  finalY = doc.autoTable.previous.finalY;
  
  // Tax Note
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100);
  doc.text('Note: All rates are inclusive of 7.5% Tax. No additional tax is required.', 14, finalY + 5);
  finalY += 5;

  // Additional Charges Table
  if (data.additionalChargeItems.length > 0) {
      finalY += 5;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Additional Charges', 14, finalY + 10);
      const chargesColumn = ["S/N", "Description", `Amount (${data.currency})`];
      const chargesRows = data.additionalChargeItems.map((item, index) => [index+1, item.description, formatMoney(item.amount)]);
      doc.autoTable({
        startY: finalY + 14,
        head: [chargesColumn],
        body: chargesRows,
        theme: 'grid',
        headStyles: { fillColor: '#2c3e50' },
        styles: { font: 'helvetica', fontSize: 9 },
        columnStyles: { 2: { halign: 'right' } }
      });
      finalY = doc.autoTable.previous.finalY;
  }
  
  // Payments Table
  if (data.payments.length > 0) {
      finalY += 5;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Payments Received', 14, finalY + 10);
      const paymentsColumn = ["Date", "Method", "Reference", `Amount (${data.currency})`];
      const paymentsRows = data.payments.map(item => [item.date, item.paymentMethod, item.reference || 'N/A', formatMoney(item.amount)]);
      doc.autoTable({
        startY: finalY + 14,
        head: [paymentsColumn],
        body: paymentsRows,
        theme: 'grid',
        headStyles: { fillColor: '#16a34a' },
        styles: { font: 'helvetica', fontSize: 9 },
        columnStyles: { 3: { halign: 'right' } }
      });
      finalY = doc.autoTable.previous.finalY;
  }


  // Summary section (Manual placement for precision)
  let summaryY = finalY > 180 ? 20 : finalY + 15;
  const summaryX_Label = 155;
  const summaryX_Value = 196;
  const lineHeight = 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', summaryX_Label, summaryY, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(formatMoneyWithPrefix(data.subtotal), summaryX_Value, summaryY, { align: 'right' });
  summaryY += lineHeight;

  doc.setFont('helvetica', 'normal');
  doc.text('Discount:', summaryX_Label, summaryY, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(`-${formatMoneyWithPrefix(data.discount)}`, summaryX_Value, summaryY, { align: 'right' });
  summaryY += lineHeight;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.holidaySpecialDiscountName}:`, summaryX_Label, summaryY, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(`-${formatMoneyWithPrefix(data.holidaySpecialDiscount)}`, summaryX_Value, summaryY, { align: 'right' });
  summaryY += lineHeight;
  
  doc.setFont('helvetica', 'normal');
  doc.text('Tax (7.5% included):', summaryX_Label, summaryY, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(formatMoneyWithPrefix(data.taxAmount), summaryX_Value, summaryY, { align: 'right' });
  summaryY += 2; // Extra space before line
  
  // Line before TOTAL
  doc.setLineWidth(0.3);
  doc.line(summaryX_Label - 35, summaryY, summaryX_Value, summaryY);
  summaryY += 4;

  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL AMOUNT DUE:', summaryX_Label, summaryY, { align: 'right' });
  doc.text(formatMoneyWithPrefix(data.totalAmountDue), summaryX_Value, summaryY, { align: 'right' });
  summaryY += lineHeight;

  doc.text('AMOUNT RECEIVED:', summaryX_Label, summaryY, { align: 'right' });
  doc.text(formatMoneyWithPrefix(amountReceived), summaryX_Value, summaryY, { align: 'right' });
  summaryY += 2; // Extra space before line

  // Line before BALANCE
  doc.setLineWidth(0.3);
  doc.line(summaryX_Label - 35, summaryY, summaryX_Value, summaryY);
  summaryY += 4;
  
  doc.text('BALANCE:', summaryX_Label, summaryY, { align: 'right' });
  doc.text(formatMoneyWithPrefix(data.balance), summaryX_Value, summaryY, { align: 'right' });


  // Amount in words
  let currentY = finalY > 180 ? summaryY + 10 : 180;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const amountReceivedText = amountReceived > 0 ? data.amountInWords : 'Zero Naira only';
  const amountInWordsText = `Amount in Words (for Amount Received): ${amountReceivedText}`;
  const splitAmount = doc.splitTextToSize(amountInWordsText, 110); // Constrain width
  doc.text(splitAmount, 14, currentY);
  currentY += (splitAmount.length * 5);


  // Payment Status & Bank Details
  if (isReservation) {
      let paymentY = currentY > 210 ? currentY + 5 : 215;
      doc.setFont('helvetica', 'bold');
      
      doc.setTextColor('#f59e0b'); // Amber/Orange
      doc.text(`▲ Payment Status: Pending`, 14, paymentY);
      
      doc.setTextColor(44, 62, 80); // Reset color
      doc.setFont('helvetica', 'normal');
      doc.text('Kindly complete your payment using the bank details below.', 14, paymentY + 5);
      paymentY += 10;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold'); doc.text('ZENITH BANK', 14, paymentY);
      doc.setFont('helvetica', 'normal'); doc.text('Account Number: 1229000080', 14, paymentY + 4);
      doc.text('Account Name: TIDE\' HOTELS AND RESORTS', 14, paymentY + 8);
      
      doc.setFont('helvetica', 'bold'); doc.text('PROVIDUS BANK', 105, paymentY, {align: 'center'});
      doc.setFont('helvetica', 'normal'); doc.text('Account Number: 1306538190', 105, paymentY + 4, {align: 'center'});
      doc.text('Account Name: TIDE\' HOTELS AND RESORTS', 105, paymentY + 8, {align: 'center'});
      
      doc.setFont('helvetica', 'bold'); doc.text('SUNTRUST BANK', 14, paymentY + 14);
      doc.setFont('helvetica', 'normal'); doc.text('Account Number: 0025840833', 14, paymentY + 18);
      doc.text('Account Name: TIDE\' HOTELS AND RESORTS', 14, paymentY + 22);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('Please make your payment using any of the accounts above and include your invoice reference number for confirmation.', 105, paymentY + 30, { align: 'center', maxWidth: 180 });
  } else if (data.status === InvoiceStatus.PAID) {
      let paymentY = currentY > 210 ? currentY + 5 : 215;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor('#38A169'); // Green
      doc.text('✅ Payment Received – Thank you for your business.', 14, paymentY);
  } else if (data.status === InvoiceStatus.PARTIAL) {
      let paymentY = currentY > 210 ? currentY + 5 : 215;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor('#E53E3E'); // Red
      doc.text('▲ Partial Payment Received.', 14, paymentY);
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#2c3e50');

  const footerStartY = pageHeight - 45;
  doc.text(`Purpose of Payment: ${data.paymentPurpose}`, 14, footerStartY);
  
  let paymentMethodsText = 'Pending';
  if (!isReservation) {
     paymentMethodsText = data.payments.length > 0 ? [...new Set(data.payments.map(p=>p.paymentMethod))].join(', ') : 'Not Specified';
  }
  doc.text(`Payment Method: ${paymentMethodsText}`, 14, footerStartY + 5);
  
  doc.line(140, footerStartY + 15, 196, footerStartY + 15);
  doc.text(`Received By: ${data.receivedBy} (${data.designation})`, 196, footerStartY + 20, { align: 'right' });

  if(isReservation) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120);
    doc.text('This is a reservation invoice. Payment is pending. A final receipt will be issued upon confirmation of payment.', 105, footerStartY + 30, { align: 'center' });
  }
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(44, 62, 80);
  doc.text('Thank you for choosing Tidè Hotels and Resorts!', 105, footerStartY + 37, { align: 'center' });


  return doc;
}


const generateInvoicePDF = (data: InvoiceData) => {
  const doc = createInvoiceDoc(data);
  doc.save(`TideHotels_${data.documentType === 'reservation' ? 'Invoice' : 'Receipt'}_${data.receiptNo}.pdf`);
};

const emailInvoicePDF = async (data: InvoiceData, recipient: string): Promise<{success: boolean, message: string}> => {
    if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
        return { success: false, message: 'The provided email is invalid or missing.' };
    }

    try {
        const doc = createInvoiceDoc(data);
        const pdfBlob = doc.output('blob');
        console.log(`Simulating sending email with PDF attachment to: ${recipient}`);
        console.log('PDF Blob size:', pdfBlob.size);
        
        await new Promise(resolve => setTimeout(resolve, 1500));

        return { success: true, message: `Invoice successfully sent to ${recipient}.` };
    } catch (error) {
        console.error('Error generating or emailing PDF:', error);
        return { success: false, message: 'A system error occurred while trying to email the invoice.' };
    }
};
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// END: services/pdfGenerator.ts
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// START: services/printGenerator.ts
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const printInvoice = (data: InvoiceData) => {
  const isReservation = data.documentType === 'reservation';
  const amountReceived = data.amountReceived;

  const currencyFormatter = new Intl.NumberFormat('en-NG', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formatMoney = (amount: number) => {
      return `${data.currency} ${currencyFormatter.format(amount)}`;
  }

  const bookingRows = data.bookings.map((booking, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${booking.roomType}</td>
      <td class="text-center">${booking.quantity}</td>
      <td>${booking.nights} night${booking.nights > 1 ? 's' : ''}</td>
      <td>${formatDateForDisplay(booking.checkIn)}</td>
      <td>${formatDateForDisplay(booking.checkOut)}</td>
      <td class="text-center">${booking.nights}</td>
      <td class="text-right">${currencyFormatter.format(booking.ratePerNight)}</td>
      <td class="text-right">${currencyFormatter.format(booking.subtotal)}</td>
    </tr>
  `).join('');

  const additionalChargesTable = data.additionalChargeItems.length > 0 ? `
    <h3 class="table-title">Additional Charges</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>S/N</th>
          <th>Description</th>
          <th class="text-right">Amount (${data.currency})</th>
        </tr>
      </thead>
      <tbody>
        ${data.additionalChargeItems.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.description}</td>
            <td class="text-right">${currencyFormatter.format(item.amount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';
  
  const paymentsTable = data.payments.length > 0 ? `
    <h3 class="table-title">Payments Received</h3>
    <table class="data-table payments-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Payment Method</th>
          <th>Reference</th>
          <th class="text-right">Amount (${data.currency})</th>
        </tr>
      </thead>
      <tbody>
        ${data.payments.map(item => `
          <tr>
            <td>${item.date}</td>
            <td>${item.paymentMethod}</td>
            <td>${item.reference || 'N/A'}</td>
            <td class="text-right">${currencyFormatter.format(item.amount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';
  
  let statusHTML = '';
  if (isReservation) {
      statusHTML = `
        <div class="payment-details">
          <p class="status pending">▲ Payment Status: Pending</p>
          <p>Kindly complete your payment using the bank details below.</p>
          <div class="bank-accounts">
            <div class="bank-account-item">
              <strong>ZENITH BANK</strong><br>
              Account Number: 1229000080<br>
              Account Name: TIDE' HOTELS AND RESORTS
            </div>
            <div class="bank-account-item">
              <strong>PROVIDUS BANK</strong><br>
              Account Number: 1306538190<br>
              Account Name: TIDE' HOTELS AND RESORTS
            </div>
            <div class="bank-account-item">
              <strong>SUNTRUST BANK</strong><br>
              Account Number: 0025840833<br>
              Account Name: TIDE' HOTELS AND RESORTS
            </div>
          </div>
          <p class="payment-note">Please make your payment using any of the accounts above and include your invoice reference number for confirmation.</p>
        </div>
      `;
  } else if (data.status === InvoiceStatus.PAID) {
      statusHTML = `<p class="status paid">✅ Payment Received – Thank you for your business.</p>`;
  } else if (data.status === InvoiceStatus.PARTIAL) {
      statusHTML = `<p class="status partial">▲ Partial Payment Received.</p>`;
  }

  const verificationSection = data.verificationDetails && !isReservation ? `
    <div class="verification-info">
      <h3 class="info-subtitle">Payment Verification</h3>
      <table class="info-table">
        <tr><td>Payment Reference:</td><td>${data.verificationDetails.paymentReference || 'N/A'}</td></tr>
        <tr><td>Verified By:</td><td>${data.verificationDetails.verifiedBy}</td></tr>
        <tr><td>Date Verified:</td><td>${data.verificationDetails.dateVerified}</td></tr>
      </table>
    </div>
  ` : '';


  const footerNote = isReservation ? `
    <p class="footer-note">This is a reservation invoice. Payment is pending. A final receipt will be issued upon confirmation of payment.</p>
  ` : '';
  
  let paymentMethodsText = 'Pending';
  if (!isReservation) {
     paymentMethodsText = data.payments.length > 0 ? [...new Set(data.payments.map(p=>p.paymentMethod))].join(', ') : 'Not Specified';
  }

  const printContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${isReservation ? 'Invoice' : 'Receipt'} ${data.receiptNo}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
        body { font-family: 'Roboto', sans-serif; font-size: 10pt; color: #2c3e50; line-height: 1.6; }
        .receipt-container { width: 800px; margin: auto; padding: 40px; background: #fff; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 24pt; color: #c4a66a; font-weight: 700; }
        .header p { margin: 5px 0 0 0; font-size: 9pt; }
        .header-line { border-top: 2px solid #c4a66a; width: 150px; margin: 5px auto 0 auto; }
        .document-title { text-align: center; font-size: 16pt; font-weight: 700; margin: 20px 0; }
        .info-section { display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #ddd;}
        .info-subtitle { font-size: 11pt; font-weight: 700; margin: 15px 0 5px 0; color: #2c3e50; }
        .info-table { width: auto; }
        .info-table td { padding: 3px 0; }
        .info-table td:first-child { font-weight: 700; padding-right: 10px; }
        .verification-info { background-color: #f0fff4; border: 1px solid #c6f6d5; border-radius: 5px; padding: 10px; margin-top: 10px; }
        .guest-info { padding-bottom: 10px; margin-top: 10px; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 5px; }
        .data-table th, .data-table td { padding: 8px; text-align: left; border: 1px solid #ddd; }
        .data-table th { background-color: #2c3e50; color: #fff; font-weight: 700; font-size: 8pt; }
        .data-table.payments-table th { background-color: #16a34a; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .table-title { font-size: 12pt; font-weight: 700; margin: 20px 0 10px 0; color: #2c3e50; }
        
        .content-grid { display: flex; justify-content: space-between; align-items: flex-start; }
        .left-column { width: 58%; }
        .right-column { width: 40%; }

        .summary-table { width: 100%; font-size: 10pt; }
        .summary-table td { padding: 4px 5px; }
        .summary-table td:first-child { text-align: right; }
        .summary-table td:last-child { text-align: right; font-weight: bold; }
        .summary-table tr.total-row td, .summary-table tr.balance-row td { font-weight: 700; border-top: 1.5px solid #2c3e50; padding-top: 8px; }

        .amount-in-words { margin-top: 20px; }
        .payment-details { margin-top: 20px; font-size: 9pt; }
        .status { font-weight: 700; margin-bottom: 5px; font-size: 11pt; }
        .status.pending { color: #f59e0b; }
        .status.partial { color: #E53E3E; }
        .status.paid { color: #38A169; }
        .bank-accounts { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 10px 0; font-size: 9pt; }
        .payment-note { font-size: 8pt; color: #555; font-style: italic; text-align: center; margin-top: 20px; }

        .footer-section { margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; }
        .footer-signature { float: right; }
        .footer-line { border-bottom: 1px solid #000; height: 1px; width: 220px; margin-top: 30px; }
        .footer-text { text-align: right; font-size: 9pt; }
        .thank-you { text-align: center; margin-top: 20px; font-weight: bold; }
        .footer-note { font-size: 9pt; text-align: center; margin-top: 20px; font-style: italic; color: #555; }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header">
          <h1>TIDÈ HOTELS AND RESORTS</h1>
          <p>Where Boldness Meets Elegance.</p>
          <p>38 S.O Williams Street Off Anthony Enahoro Street Utako Abuja</p>
          <div class="header-line"></div>
        </div>
        <h2 class="document-title">${isReservation ? 'INVOICE FOR RESERVATION' : 'OFFICIAL RECEIPT'}</h2>
        <div class="info-section">
          <div><strong>${isReservation ? 'Invoice No:' : 'Receipt No:'}</strong> ${data.receiptNo}</div>
          <div><strong>Date:</strong> ${data.date}</div>
        </div>
        
        ${verificationSection}

        <div class="guest-info">
           <h3 class="info-subtitle">Guest Information</h3>
           <table class="info-table">
            <tr><td>Received From (Guest):</td><td>${data.guestName}</td></tr>
            <tr><td>Email:</td><td>${data.guestEmail}</td></tr>
            <tr><td>Phone/Contact:</td><td>${data.phoneContact}</td></tr>
            <tr><td>Room Number(s):</td><td>${data.roomNumber}</td></tr>
          </table>
        </div>

        <h3 class="table-title">Bookings</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>S/N</th><th>Room Type</th><th class="text-center">Qty</th><th>Duration</th><th>Check-In</th>
              <th>Check-Out</th><th class="text-center">Nights</th><th class="text-right">Rate/Night</th><th class="text-right">Subtotal (${data.currency})</th>
            </tr>
          </thead>
          <tbody>${bookingRows}</tbody>
        </table>
        <p style="font-size: 8pt; font-style: italic; color: #555;">Note: All rates are inclusive of 7.5% Tax. No additional tax is required.</p>

        ${additionalChargesTable}
        ${paymentsTable}
        
        <div class="content-grid">
            <div class="left-column">
              <div class="amount-in-words">
                <strong>Amount in Words (for Amount Received):</strong>
                <p>${amountReceived > 0 ? data.amountInWords : 'Zero Naira only'}</p>
              </div>
              ${statusHTML}
            </div>
            <div class="right-column">
              <table class="summary-table">
                <tr><td>Subtotal:</td><td>${formatMoney(data.subtotal)}</td></tr>
                <tr><td>Discount:</td><td>-${formatMoney(data.discount)}</td></tr>
                <tr><td>${data.holidaySpecialDiscountName}:</td><td>-${formatMoney(data.holidaySpecialDiscount)}</td></tr>
                <tr><td>Tax (7.5% included):</td><td>${formatMoney(data.taxAmount)}</td></tr>
                <tr class="total-row"><td>TOTAL AMOUNT DUE:</td><td>${formatMoney(data.totalAmountDue)}</td></tr>
                <tr><td>AMOUNT RECEIVED:</td><td>${formatMoney(amountReceived)}</td></tr>
                <tr class="balance-row"><td>BALANCE:</td><td>${formatMoney(data.balance)}</td></tr>
              </table>
            </div>
        </div>
        
        <div class="footer-section">
            <div>
              <p><strong>Purpose of Payment:</strong> ${data.paymentPurpose}</p>
              <p><strong>Payment Method:</strong> ${paymentMethodsText}</p>
            </div>
            <div class="footer-signature">
              <div class="footer-line"></div>
              <p class="footer-text">Received By: ${data.receivedBy} (${data.designation})</p>
            </div>
        </div>
        
        <div style="clear: both;"></div>
        ${footerNote}
        <p class="thank-you">Thank you for choosing Tidè Hotels and Resorts!</p>

      </div>
    </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 500);
  } else {
    alert('Could not open print window. Please check your pop-up blocker settings.');
  }
};
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// END: services/printGenerator.ts
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// START: services/walkInPrintGenerator.ts
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const printWalkInReceipt = (data: WalkInTransaction) => {
  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: data.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const chargesRows = data.charges.map(charge => {
    const serviceName = charge.service === WalkInService.OTHER 
      ? charge.otherServiceDescription || 'Other Service' 
      : charge.service;
    return `
      <tr>
        <td>${charge.date}</td>
        <td>${serviceName}<br><small style="font-style: italic; color: #555;">(${charge.paymentMethod})</small></td>
        <td class="text-right">${currencyFormatter.format(charge.amount)}</td>
      </tr>
    `;
  }).join('');

  const printContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Receipt ${data.id}</title>
      <style>
        body { font-family: 'Courier New', Courier, monospace; font-size: 10pt; color: #000; line-height: 1.4; }
        .receipt-container { width: 320px; margin: auto; padding: 15px; border: 1px solid #ccc; }
        p { margin: 0; }
        .header { text-align: center; margin-bottom: 15px; }
        .header h1 { margin: 0; font-size: 14pt; }
        .header p { margin: 2px 0 0 0; font-size: 8pt; }
        .info-section { padding-bottom: 8px; font-size: 10pt; }
        .info-section div { display: flex; justify-content: space-between; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 10pt; margin: 15px 0; }
        th, td { padding: 4px 2px; text-align: left; vertical-align: top; }
        th { border-bottom: 1px dashed #000; }
        .text-right { text-align: right; }
        .summary-table { width: 100%; margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px; }
        .summary-table td { padding: 2px 0; }
        .summary-table .total-row { font-weight: bold; }
        .signatures { margin-top: 40px; }
        .signature-line { border-bottom: 1px solid #000; height: 30px; margin-top: 20px; }
        .signature-label { font-size: 9pt; }
        .footer { text-align: center; font-size: 8pt; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header">
          <h1>TIDÈ HOTELS AND RESORTS</h1>
          <p>Where Boldness Meets Elegance.</p>
          <p>38 S.O Williams Street Off Anthony Enahoro Street Utako Abuja</p>
          <p style="margin-top: 8px; font-weight: bold;">Walk-In Guest Receipt</p>
        </div>
        <div class="info-section">
          <div><span>Receipt No:</span> <span>${data.id}</span></div>
          <div><span>Date:</span> <span>${data.transactionDate}</span></div>
          <div><span>Guest:</span> <span>Walk in Guest</span></div>
          <div><span>Cashier:</span> <span>${data.cashier}</span></div>
          <div><span>Payment Method:</span> <span>${data.paymentMethod}</span></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Service</th>
              <th class="text-right">Amount (${data.currency})</th>
            </tr>
          </thead>
          <tbody>
            ${chargesRows}
          </tbody>
        </table>

        <table class="summary-table">
          <tbody>
            <tr>
              <td>Subtotal:</td>
              <td class="text-right">${currencyFormatter.format(data.subtotal)}</td>
            </tr>
            <tr>
              <td>Discount:</td>
              <td class="text-right">-${currencyFormatter.format(data.discount)}</td>
            </tr>
            <tr>
              <td>Amount Paid:</td>
              <td class="text-right">${currencyFormatter.format(data.amountPaid)}</td>
            </tr>
            <tr class="total-row">
              <td>Balance:</td>
              <td class="text-right">${currencyFormatter.format(data.balance)}</td>
            </tr>
          </tbody>
        </table>

        <div class="signatures">
            <div class="signature-line"></div>
            <p class="signature-label">Guest Signature</p>
            <div class="signature-line"></div>
            <p class="signature-label">Cashier Signature</p>
        </div>

        <div class="footer">
          <p>Thank you!</p>
        </div>

      </div>
    </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 500);
  } else {
    alert('Could not open print window. Please check your pop-up blocker settings.');
  }
};
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// END: services/walkInPrintGenerator.ts
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// START: CSV UTILS (from multiple files)
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const escapeCsvCell = (cell: any): string => {
    const cellString = String(cell ?? ''); // Handle null/undefined
    if (cellString.includes(',') || cellString.includes('"') || cellString.includes('\n')) {
        return `"${cellString.replace(/"/g, '""')}"`;
    }
    return cellString;
};

const generateInvoiceCSV = (data: InvoiceData) => {
    const headers = [
        'ID', 'Document Type', 'Status', 'Date', 'Last Updated', 'Guest Name', 'Guest Email', 'Phone/Contact', 'Room Number(s)',
        'Booking Details', 'Additional Charges Details', 'Payment Details',
        'Payment Reference', 'Verified By', 'Date Verified',
        `Subtotal (${data.currency})`, `Discount (${data.currency})`,
        'Holiday Special Discount Name', `Holiday Special Discount (${data.currency})`,
        'Tax (%)', `Tax Amount (${data.currency})`, `Total Amount Due (${data.currency})`,
        `Amount Received (${data.currency})`, `Balance (${data.currency})`,
        'Amount in Words', 'Purpose of Payment', 'Created By', 'Designation',
        'Currency'
    ];
    
    const bookingDetails = data.bookings.map(b => 
        `{Room Type: ${b.roomType}; Qty: ${b.quantity}; Nights: ${b.nights}; Rate: ${b.ratePerNight}; CheckIn: ${b.checkIn}; CheckOut: ${b.checkOut}}`
    ).join(' | ');

    const additionalChargesDetails = data.additionalChargeItems
      .map(item => `${item.description || 'N/A'}: ${item.amount}`)
      .join('; ');
      
    const paymentDetails = data.payments
      .map(p => `Amount: ${p.amount}; Method: ${p.paymentMethod}; Date: ${p.date}; Ref: ${p.reference || 'N/A'}`)
      .join(' | ');

    const rowData = [
        data.receiptNo, data.documentType, data.status, data.date, data.lastUpdatedAt, data.guestName, data.guestEmail, data.phoneContact, data.roomNumber,
        bookingDetails, additionalChargesDetails, paymentDetails,
        data.verificationDetails?.paymentReference || '', data.verificationDetails?.verifiedBy || '', data.verificationDetails?.dateVerified || '',
        data.subtotal, data.discount,
        data.holidaySpecialDiscountName, data.holidaySpecialDiscount,
        data.taxPercentage, data.taxAmount, data.totalAmountDue,
        data.amountReceived, data.balance, data.amountInWords, data.paymentPurpose,
        data.receivedBy, data.designation, data.currency,
    ].map(escapeCsvCell);

    const csvContent = [
        headers.join(','),
        rowData.join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `TideHotels_${data.documentType === 'reservation' ? 'Invoice' : 'Receipt'}_${data.receiptNo}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

const generateWalkInCSV = (data: WalkInTransaction) => {
    const headers = [
        'Transaction ID', 'Transaction Date', 'Currency', 'Cashier', 'Transaction Payment Method',
        'Charge Date', 'Service', 'Service Description', 'Charge Payment Method', 'Amount',
        'Transaction Subtotal', 'Transaction Discount', 'Transaction Amount Paid', 'Transaction Balance'
    ];
    
    const rows = data.charges.map(charge => {
        const serviceName = charge.service;
        const serviceDescription = charge.service === WalkInService.OTHER ? charge.otherServiceDescription || '' : '';

        return [
            data.id, data.transactionDate, data.currency, data.cashier, data.paymentMethod,
            charge.date, serviceName, serviceDescription, charge.paymentMethod, charge.amount,
            data.subtotal, data.discount, data.amountPaid, data.balance,
        ].map(escapeCsvCell);
    });

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `TideHotels_WalkIn_${data.id}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

const generateHistoryCSV = (history: RecordedTransaction[]) => {
    if (history.length === 0) {
        alert("No transaction history to export.");
        return;
    }

    const headers = [
        'ID', 'Type', 'Status', 'Issue Date', 'Guest Name', 'Amount Due', 'Currency',
        'Guest Email', 'Phone', 'Room No', 'Arrival Date', 'Departure Date',
        'Total Room Nights', 'Room Types', 'Walk-In Services',
        'Subtotal', 'Discount', 'Holiday Special Discount', 'Tax', 'Amount Paid', 'Balance',
        'Payment Methods', 'Created By', 'Designation'
    ];

    const rows = history.map(record => {
        if (record.type === 'Hotel Stay') {
            const data = record.data as InvoiceData;
            const earliestCheckIn = data.bookings.length ? data.bookings.reduce((min, b) => b.checkIn < min ? b.checkIn : min, data.bookings[0].checkIn) : '';
            const latestCheckOut = data.bookings.length ? data.bookings.reduce((max, b) => b.checkOut > max ? b.checkOut : max, data.bookings[0].checkOut) : '';
            const totalRoomNights = data.bookings.reduce((sum, b) => sum + (b.nights * b.quantity), 0);
            const roomTypes = [...new Set(data.bookings.map(b => b.roomType))].join(', ');
            const paymentMethods = [...new Set(data.payments.map(p => p.paymentMethod))].join(', ');
            const status = data.documentType === 'reservation' ? 'Reservation' : data.status;

            return [
                data.receiptNo, record.type, status, data.date, data.guestName, data.totalAmountDue, data.currency,
                data.guestEmail, data.phoneContact, data.roomNumber, 
                earliestCheckIn, latestCheckOut,
                totalRoomNights, roomTypes, '',
                data.subtotal, data.discount,
                data.holidaySpecialDiscount || 0,
                data.taxAmount, data.amountReceived, data.balance,
                paymentMethods, data.receivedBy, data.designation
            ].map(escapeCsvCell);
        } else { // Walk-In
            const data = record.data as WalkInTransaction;
            const services = data.charges.map(c => 
                c.service === WalkInService.OTHER ? c.otherServiceDescription : c.service
            ).join('; ');
            const status = data.balance <= 0 ? 'Completed' : 'Partial';

            return [
                data.id, record.type, status, data.transactionDate, 'Walk-In Guest', (data.subtotal - data.discount), data.currency,
                '', '', '', '', '', '', '', services,
                data.subtotal, data.discount, '', 0,
                data.amountPaid, data.balance,
                data.paymentMethod, data.cashier, ''
            ].map(escapeCsvCell);
        }
    });

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `TideHotels_FullTransactionHistory.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// END: CSV UTILS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// START: utils/transactionHistory.ts
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const CLOUD_STORAGE_KEY = 'masterTransactionHistory';

const _fetchAllTransactionsFromCloud = async (): Promise<RecordedTransaction[]> => {
  await new Promise(resolve => setTimeout(resolve, 250));
  try {
    const savedHistory = localStorage.getItem(CLOUD_STORAGE_KEY);
    return savedHistory ? JSON.parse(savedHistory) : [];
  } catch (error) {
    console.error("Failed to load master transaction history:", error);
    localStorage.removeItem(CLOUD_STORAGE_KEY);
    return [];
  }
};

const _syncAllTransactionsToCloud = async (history: RecordedTransaction[]): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 250));
  try {
    localStorage.setItem(CLOUD_STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to save master transaction history:", error);
  }
};

const fetchUserTransactionHistory = async (username: string, isAdmin: boolean): Promise<RecordedTransaction[]> => {
  if (!username) return [];

  const allTransactions = await _fetchAllTransactionsFromCloud();
  
  if (isAdmin) {
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return allTransactions;
  }
  
  const userHistory = allTransactions.filter(record => {
    if (record.type === 'Hotel Stay') {
      return (record.data as InvoiceData).receivedBy === username;
    }
    if (record.type === 'Walk-In') {
      return (record.data as WalkInTransaction).cashier === username;
    }
    return false;
  });
  
  userHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return userHistory;
};

const saveTransaction = async (recordToSave: RecordedTransaction, oldRecordId?: string) => {
  let allTransactions = await _fetchAllTransactionsFromCloud();
  
  // If an oldRecordId is provided, it means we're converting an invoice to a receipt,
  // so we first remove the old invoice record.
  if (oldRecordId) {
      allTransactions = allTransactions.filter(r => r.id !== oldRecordId);
  }

  const index = allTransactions.findIndex(r => r.id === recordToSave.id);
  
  let updatedHistory;
  if (index !== -1) {
    // Update existing record
    updatedHistory = [...allTransactions];
    updatedHistory[index] = recordToSave;
  } else {
    // Add new record
    updatedHistory = [recordToSave, ...allTransactions];
  }
  
  // Sort by date to keep it consistent
  updatedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  await _syncAllTransactionsToCloud(updatedHistory);
};


const deleteTransaction = async (transactionId: string): Promise<void> => {
    const allTransactions = await _fetchAllTransactionsFromCloud();
    const updatedHistory = allTransactions.filter(r => r.id !== transactionId);
    await _syncAllTransactionsToCloud(updatedHistory);
};
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// END: utils/transactionHistory.ts
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// START: COMPONENTS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// --- DatePicker Component ---
interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  name: string;
  required?: boolean;
  disabled?: boolean;
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, label, name, required = false, disabled = false }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (inputRef.current) {
      fpInstanceRef.current = flatpickr(inputRef.current, {
        dateFormat: 'Y-m-d',
        defaultDate: value,
        onChange: (selectedDates: Date[]) => {
          if (selectedDates[0]) {
            const date = selectedDates[0];
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;
            onChange(dateString);
          }
        },
      });
    }

    return () => {
      if (fpInstanceRef.current) {
        fpInstanceRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
     if (fpInstanceRef.current && value !== fpInstanceRef.current.input.value) {
         fpInstanceRef.current.setDate(value, false);
     }
  }, [value]);
  
  useEffect(() => {
    if (fpInstanceRef.current) {
      if(disabled) {
        fpInstanceRef.current.close(); // Close picker if open
        fpInstanceRef.current.set('clickOpens', false);
      } else {
        fpInstanceRef.current.set('clickOpens', true);
      }
    }
  }, [disabled]);


  return (
    <div>
      {label && <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>}
      <input
        ref={inputRef}
        id={name}
        name={name}
        type="text"
        placeholder="YYYY-MM-DD"
        required={required}
        readOnly
        disabled={disabled}
        className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm text-gray-900 font-medium ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
      />
    </div>
  );
};


// --- Header Component ---
interface HeaderProps {
  currentUser?: string | null;
  onLogout?: () => void;
  isAdmin: boolean;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, isAdmin }) => {
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="text-center sm:text-left flex-grow">
            <h1 className="text-3xl sm:text-4xl font-bold text-tide-gold tracking-wider">
              Tidè Hotels and Resorts
            </h1>
            <p className="text-sm text-tide-dark mt-1">
              Where Boldness Meets Elegance.
            </p>
          </div>
          {currentUser && (
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                 <span className="text-sm text-gray-600">Welcome, <strong className="font-medium">{currentUser}</strong></span>
                 {isAdmin && <span className="px-2 py-0.5 text-xs font-semibold text-tide-dark bg-tide-gold rounded-full">Admin</span>}
              </div>
              <button
                onClick={onLogout}
                className="py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-tide-dark hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};


// --- WelcomeScreen Component ---
const WelcomeScreen: React.FC = () => {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const fadeOutTimer = setTimeout(() => {
      setFadingOut(true);
    }, 2500);

    return () => clearTimeout(fadeOutTimer);
  }, []);

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes expandWidth { from { width: 0%; } to { width: 100%; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
        .animate-fadeInUp { animation: fadeInUp 1s ease-out 0.5s forwards; opacity: 0; }
        .animate-expandWidth { animation: expandWidth 1.2s cubic-bezier(0.25, 1, 0.5, 1) 1s forwards; }
        .animate-fadeOut { animation: fadeOut 0.5s ease-in forwards; }
      `}</style>
      <div
        className={`fixed inset-0 bg-tide-dark z-50 flex flex-col justify-center items-center ${fadingOut ? 'animate-fadeOut' : 'animate-fadeIn'}`}
        aria-hidden="true"
        role="status"
      >
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-tide-gold tracking-wider animate-fadeInUp">
            Tidè Hotels and Resorts
          </h1>
          <div className="mt-4 h-1 bg-tide-gold/50 mx-auto animate-expandWidth"></div>
        </div>
      </div>
    </>
  );
};


// --- LoginScreen Component ---
const authorizedCredentials = {
  'Admin': 'Adm!n$ecur3', 'Faith': 'F@i7h#92X!', 'Goodness': 'G00d*N3ss$4', 'Benjamin': 'B3nJ&9m_84',
  'Sandra': 'S@ndR4!51%', 'David': 'D@v1D#73Q', 'Ifeanyi': '1F3@yN!88*',
  'Margret': 'M@rG7eT_42', 'Miriam': 'M1r!@m#97W', 'Francis': 'Fr@nC1$62!'
};
const ADMIN_USERS = ['Admin', 'Francis'];

interface LoginScreenProps {
  onLogin: (name: string, rememberMe: boolean) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPassword = password.trim();

    if (!trimmedName || !trimmedPassword) {
      setError('Please enter both username and password.');
      return;
    }
    
    const expectedPassword = authorizedCredentials[trimmedName as keyof typeof authorizedCredentials];
    const isCredentialsCorrect = expectedPassword && trimmedPassword === expectedPassword;

    if (isCredentialsCorrect) {
      onLogin(trimmedName, rememberMe);
    } else {
      setError('You are not authorized. Please contact Admin for account approval/update.');
    }
  };

  return (
    <div className="fixed inset-0 bg-tide-dark z-50 flex justify-center items-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-tide-gold mb-2">Welcome to</h1>
        <h2 className="text-xl font-semibold text-tide-dark mb-6">Invoice Generator</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="sr-only">Username</label>
            <input type="text" id="name" value={name} onChange={(e) => { setName(e.target.value); if (error) setError(''); }} placeholder="Enter your username" className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 sm:text-sm ${error ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-tide-gold focus:border-tide-gold'}`} autoFocus />
          </div>
           <div className="relative">
            <label htmlFor="password" className="sr-only">Password</label>
            <input type={showPassword ? 'text' : 'password'} id="password" value={password} onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }} placeholder="Enter your password" className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 sm:text-sm ${error ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-tide-gold focus:border-tide-gold'}`} />
             <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-tide-dark" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" /></svg> ) : ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> )}
            </button>
          </div>
          <div className="flex items-center text-left">
            <input id="remember-me" name="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 text-tide-gold focus:ring-tide-gold border-gray-300 rounded" />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">Remember me</label>
          </div>
          {error && <p id="login-error" className="mt-2 text-xs text-red-600">{error}</p>}
          <button type="submit" className="w-full inline-flex justify-center py-3 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-tide-dark hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold">Login</button>
        </form>
      </div>
    </div>
  );
};


// --- WalkInGuestModal Component ---
interface WalkInGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionGenerated: (record: RecordedTransaction) => Promise<void>;
  currentUser: string;
  transactionToEdit?: WalkInTransaction | null;
}

const getTodayLocalStringModal = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const WalkInGuestModal: React.FC<WalkInGuestModalProps> = ({ isOpen, onClose, onTransactionGenerated, currentUser, transactionToEdit }) => {
  const [newCharge, setNewCharge] = useState({
    date: getTodayLocalStringModal(),
    service: WalkInService.RESTAURANT,
    otherServiceDescription: '',
    amount: '' as number | '',
    paymentMethod: PaymentMethod.CASH,
  });
  const [charges, setCharges] = useState<WalkInChargeItem[]>([]);
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [discount, setDiscount] = useState<number | ''>('');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [cashier, setCashier] = useState<string>(currentUser);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [error, setError] = useState('');
  
  const isEditing = useMemo(() => !!transactionToEdit, [transactionToEdit]);

  const subtotal = useMemo(() => charges.reduce((sum, item) => sum + (item.amount || 0), 0), [charges]);
  const balance = useMemo(() => (subtotal - (typeof discount === 'number' ? discount : 0)) - (typeof amountPaid === 'number' ? amountPaid : 0), [subtotal, amountPaid, discount]);
  const currencyFormatter = useMemo(() => new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }), [currency]);

  const handleReset = () => {
    setNewCharge({ date: getTodayLocalStringModal(), service: WalkInService.RESTAURANT, otherServiceDescription: '', amount: '', paymentMethod: PaymentMethod.CASH });
    setCharges([]); setCurrency('NGN'); setDiscount(''); setAmountPaid(''); setCashier(currentUser); setPaymentMethod(PaymentMethod.CASH); setError('');
  };

  useEffect(() => {
    if (!isOpen) {
        handleReset();
        return;
    }
    if (isEditing && transactionToEdit) {
      setCharges(transactionToEdit.charges);
      setCurrency(transactionToEdit.currency);
      setDiscount(transactionToEdit.discount || '');
      
      // If there's an outstanding balance, pre-fill 'Amount Paid' with the total due to quickly settle the payment.
      // Otherwise, just show the amount that was originally paid.
      if (transactionToEdit.balance > 0) {
          const totalDue = (transactionToEdit.subtotal || 0) - (transactionToEdit.discount || 0);
          setAmountPaid(totalDue);
      } else {
          setAmountPaid(transactionToEdit.amountPaid || '');
      }

      setCashier(transactionToEdit.cashier);
      setPaymentMethod(transactionToEdit.paymentMethod);
    } else {
      handleReset();
    }
  }, [transactionToEdit, isOpen, isEditing]);


  if (!isOpen) return null;

  const handleClose = () => { onClose(); };

  const handleAddCharge = () => {
    if (newCharge.amount === '' || newCharge.amount <= 0) { setError('Please enter a valid amount for the charge.'); return; }
    if (newCharge.service === WalkInService.OTHER && !newCharge.otherServiceDescription.trim()) { setError('Please provide a description for the "Other" service.'); return; }
    setError('');
    const chargeToAdd: WalkInChargeItem = { id: `charge-${Date.now()}`, date: newCharge.date, service: newCharge.service, amount: newCharge.amount as number, paymentMethod: newCharge.paymentMethod, ...(newCharge.service === WalkInService.OTHER && { otherServiceDescription: newCharge.otherServiceDescription.trim() }) };
    setCharges(prev => [...prev, chargeToAdd]);
    setNewCharge({ date: getTodayLocalStringModal(), service: WalkInService.RESTAURANT, otherServiceDescription: '', amount: '', paymentMethod: newCharge.paymentMethod });
  };
  const handleRemoveCharge = (id: string) => { setCharges(prev => prev.filter(charge => charge.id !== id)); };

  const validateAndCreateTransaction = (): WalkInTransaction | null => {
    if (charges.length === 0) { setError('Please add at least one service charge.'); return null; }
    if (!cashier) { setError('Please select the cashier.'); return null; }
    setError('');
    const id = isEditing ? transactionToEdit!.id : `WI-${Date.now()}`;
    const date = isEditing ? transactionToEdit!.transactionDate : getTodayLocalStringModal();
    return { id, transactionDate: date, charges, currency, subtotal, discount: typeof discount === 'number' ? discount : 0, amountPaid: typeof amountPaid === 'number' ? amountPaid : 0, balance, cashier, paymentMethod };
  };

  const handleGenerate = async (action: 'print' | 'csv' | 'save') => {
    const transaction = validateAndCreateTransaction();
    if (transaction) {
      const record: RecordedTransaction = { id: transaction.id, type: 'Walk-In', date: transaction.transactionDate, guestName: 'Walk-In Guest', amount: (transaction.subtotal - (transaction.discount || 0)), currency: transaction.currency, data: { ...transaction } };
      await onTransactionGenerated(record);
      
      if (action === 'print') { 
        printWalkInReceipt(transaction); 
        alert(isEditing ? 'Receipt updated for printing!' : 'Receipt generated for printing!'); 
      } else if (action === 'csv') { 
        generateWalkInCSV(transaction); 
        alert(isEditing ? 'CSV record updated!' : 'CSV record downloaded!'); 
      } else if (action === 'save') { 
        alert(isEditing ? 'Transaction updated successfully!' : 'Transaction saved successfully!'); 
      }
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 relative flex flex-col" style={{ maxHeight: '90vh' }}>
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" aria-label="Close"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        <h2 className="text-2xl font-bold text-tide-dark mb-4 border-b pb-3">{isEditing ? `Edit Transaction #${transactionToEdit?.id}` : 'Walk-In Guest Charge'}</h2>
        <div className="overflow-y-auto flex-grow pr-2">
            <div className="grid grid-cols-12 gap-4 items-end p-1">
                <div className="col-span-12 sm:col-span-2"><DatePicker label="Date" name="newChargeDate" value={newCharge.date} onChange={date => setNewCharge(p => ({...p, date}))} /></div>
                <div className="col-span-12 sm:col-span-3"><label className="block text-sm font-medium text-gray-700">Service</label><select value={newCharge.service} onChange={e => setNewCharge(p => ({...p, service: e.target.value as WalkInService}))} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-gray-300 focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm rounded-md text-gray-900">{Object.values(WalkInService).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="col-span-12 sm:col-span-3"><label className="block text-sm font-medium text-gray-700">Payment</label><select value={newCharge.paymentMethod} onChange={e => setNewCharge(p => ({...p, paymentMethod: e.target.value as PaymentMethod}))} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-gray-300 focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm rounded-md text-gray-900">{Object.values(PaymentMethod).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="col-span-12 sm:col-span-2"><label className="block text-sm font-medium text-gray-700">Amount</label><input type="number" value={newCharge.amount} onChange={e => setNewCharge(p => ({...p, amount: e.target.value === '' ? '' : parseFloat(e.target.value)}))} min="0" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm text-gray-900"/></div>
                <div className="col-span-12 sm:col-span-2"><button type="button" onClick={handleAddCharge} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-tide-dark text-base font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold sm:text-sm">Add</button></div>
                 {newCharge.service === WalkInService.OTHER && (<div className="col-span-12"><label className="block text-sm font-medium text-gray-700">Service Description</label><input type="text" value={newCharge.otherServiceDescription} onChange={e => setNewCharge(p => ({...p, otherServiceDescription: e.target.value}))} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm text-gray-900" placeholder="Please specify service"/></div>)}
            </div>
            <div className="mt-4 border-t pt-4"><h3 className="text-lg font-semibold text-gray-800 mb-2">Charges</h3><div className="bg-gray-50 rounded-md p-2">{charges.length === 0 ? <p className="text-center text-gray-500 py-4">No charges added yet.</p> : <table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-100"><tr><th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th><th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Service</th><th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Payment</th><th className="px-4 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th><th className="px-4 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider"></th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{charges.map(charge => (<tr key={charge.id}><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{charge.date}</td><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{charge.service === WalkInService.OTHER ? charge.otherServiceDescription : charge.service}</td><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{charge.paymentMethod}</td><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 text-right">{currencyFormatter.format(charge.amount)}</td><td className="px-4 py-2 whitespace-nowrap text-center"><button onClick={() => handleRemoveCharge(charge.id)} className="text-red-600 hover:text-red-800 text-xs">Remove</button></td></tr>))}</tbody></table>}</div></div>
            <div className="mt-4 border-t pt-4"><div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4"><div><label className="block text-sm font-medium text-gray-700">Currency</label><select value={currency} onChange={e => setCurrency(e.target.value as 'NGN' | 'USD')} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-gray-300 focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm rounded-md text-gray-900"><option value="NGN">Naira (NGN)</option><option value="USD">Dollar (USD)</option></select></div><div><label className="block text-sm font-medium text-gray-700">Overall Payment Method</label><select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-gray-300 focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm rounded-md text-gray-900">{Object.values(PaymentMethod).map(s => <option key={s} value={s}>{s}</option>)}</select></div><div><label className="block text-sm font-medium text-gray-700">Cashier (User)</label><input type="text" value={cashier} readOnly disabled className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm cursor-not-allowed text-gray-900"/></div></div><div className="mt-4 p-4 bg-gray-100 rounded-lg space-y-2"><div className="flex justify-between items-center text-md font-semibold text-gray-800"><span>Subtotal:</span><span>{currencyFormatter.format(subtotal)}</span></div><div className="flex justify-between items-center"><label className="text-sm font-medium text-gray-700">Discount:</label><input type="number" value={discount} onChange={e => setDiscount(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-32 text-right px-2 py-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm text-gray-900"/></div><div className="flex justify-between items-center"><label className="text-sm font-medium text-gray-700">Amount Paid:</label><input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-32 text-right px-2 py-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm text-gray-900"/></div><div className="flex justify-between items-center text-lg font-bold text-tide-dark border-t border-gray-300 pt-2"><span>Balance:</span><span className={balance < 0 ? 'text-green-600' : ''}>{currencyFormatter.format(balance)}</span></div></div></div>
        </div>
        {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}
        <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row-reverse gap-3">
            {isEditing && <button type="button" onClick={() => handleGenerate('save')} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-tide-dark text-base font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold sm:ml-3 sm:w-auto sm:text-sm">Update & Close</button>}
            <button type="button" onClick={() => handleGenerate('print')} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-tide-dark text-base font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold sm:ml-3 sm:w-auto sm:text-sm">{isEditing ? 'Update & Print' : 'Generate & Print Receipt'}</button>
            <button type="button" onClick={() => handleGenerate('csv')} className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold sm:mt-0 sm:w-auto sm:text-sm">Download Excel (CSV)</button>
        </div>
      </div>
    </div>
  );
};


// --- AdminDashboard Component ---
interface AdminDashboardProps {
  history: RecordedTransaction[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ history }) => {
    const stats = useMemo(() => {
        const getTodayLocalString = (): string => {
            const today = new Date();
            const year = today.getFullYear();
            const month = (today.getMonth() + 1).toString().padStart(2, '0');
            const day = today.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const todayStr = getTodayLocalString();
        const transactionsForToday = history.filter(t => t.date === todayStr);

        let revenueTodayNGN = 0;
        let revenueTodayUSD = 0;

        transactionsForToday.forEach(t => {
            if (t.type === 'Hotel Stay') {
                const data = t.data as InvoiceData;
                if (data.currency === 'NGN') {
                    revenueTodayNGN += data.amountReceived;
                } else {
                    revenueTodayUSD += data.amountReceived;
                }
            } else { // Walk-In
                const data = t.data as WalkInTransaction;
                if (data.currency === 'NGN') {
                    revenueTodayNGN += data.amountPaid;
                } else {
                    revenueTodayUSD += data.amountPaid;
                }
            }
        });

        const pendingOrPartial = history.filter(t =>
            t.type === 'Hotel Stay' &&
            ((t.data as InvoiceData).documentType === 'reservation' || (t.data as InvoiceData).status === InvoiceStatus.PARTIAL)
        ).length;

        return {
            transactionsTodayCount: transactionsForToday.length,
            revenueTodayNGN,
            revenueTodayUSD,
            pendingOrPartial,
        };
    }, [history]);

    const formatNgn = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    const formatUsd = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    return (
        <div className="bg-tide-dark text-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-tide-gold mb-4">Admin Dashboard</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-700 p-4 rounded-md">
                    <h3 className="text-sm font-medium text-gray-300">Transactions Today</h3>
                    <p className="mt-1 text-3xl font-semibold text-white">{stats.transactionsTodayCount}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-md">
                    <h3 className="text-sm font-medium text-gray-300">Revenue Today (NGN)</h3>
                    <p className="mt-1 text-3xl font-semibold text-white">{formatNgn(stats.revenueTodayNGN)}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-md">
                    <h3 className="text-sm font-medium text-gray-300">Revenue Today (USD)</h3>
                    <p className="mt-1 text-3xl font-semibold text-white">{formatUsd(stats.revenueTodayUSD)}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-md">
                    <h3 className="text-sm font-medium text-gray-300">Pending/Partial Invoices</h3>
                    <p className="mt-1 text-3xl font-semibold text-white">{stats.pendingOrPartial}</p>
                </div>
            </div>
        </div>
    );
};


// --- TransactionHistory Component ---
interface TransactionHistoryProps {
    history: RecordedTransaction[];
    onViewEdit: (record: InvoiceData) => void;
    onViewEditWalkIn: (record: WalkInTransaction) => void;
    onDelete: (recordId: string) => void;
    isAdmin: boolean;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ history, onViewEdit, onDelete, isAdmin, onViewEditWalkIn }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    
    const filteredHistory = useMemo(() => {
        return history.filter(record => {
            const typeMatch = filterType === 'all' || (filterType === 'hotel' && record.type === 'Hotel Stay') || (filterType === 'walkin' && record.type === 'Walk-In');
            
            const term = searchTerm.toLowerCase();
            const searchMatch = !term ||
                record.id.toLowerCase().includes(term) ||
                record.guestName.toLowerCase().includes(term) ||
                (record.type === 'Hotel Stay' && (
                    (record.data as InvoiceData).guestEmail.toLowerCase().includes(term) ||
                    (record.data as InvoiceData).phoneContact.toLowerCase().includes(term)
                ));

            return typeMatch && searchMatch;
        });
    }, [history, searchTerm, filterType]);
    
    const getStatusChip = (record: RecordedTransaction) => {
        if (record.type === 'Hotel Stay') {
            const data = record.data as InvoiceData;
            if (data.documentType === 'reservation') {
                return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Reservation</span>;
            }
            switch (data.status) {
                case InvoiceStatus.PAID:
                    return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Fully Paid</span>;
                case InvoiceStatus.PARTIAL:
                    return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Partially Paid</span>;
                // PENDING is implicitly covered by 'reservation' type for clarity
                default: return null;
            }
        } else { // Walk-In
            const data = record.data as WalkInTransaction;
            if (data.balance <= 0) {
                return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Completed</span>;
            } else {
                return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Partial</span>;
            }
        }
    };
    
    const handleDelete = (recordId: string) => {
        if (window.confirm('Are you sure you want to permanently delete this transaction? This action cannot be undone.')) {
            onDelete(recordId);
        }
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <h2 className="text-2xl font-bold text-tide-dark">Completed Transaction History</h2>
                <div className="flex items-center gap-2">
                    <button onClick={() => generateHistoryCSV(filteredHistory)} className="py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        Export CSV
                    </button>
                </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
                 <input
                    type="text"
                    placeholder="Search by ID, Name, Email, Phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm"
                />
                <select 
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className="w-full md:w-48 pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm"
                >
                    <option value="all">All Types</option>
                    <option value="hotel">Hotel Stays</option>
                    <option value="walkin">Walk-Ins</option>
                </select>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                             <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredHistory.length > 0 ? filteredHistory.map(record => (
                            <tr key={record.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.type}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.date}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.guestName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Intl.NumberFormat('en-US', { style: 'currency', currency: record.currency }).format(record.amount)}</td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getStatusChip(record)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {record.type === 'Hotel Stay' ? (
                                        <button onClick={() => onViewEdit(record.data as InvoiceData)} className="py-1 px-3 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">View / Edit</button>
                                    ) : (
                                        (record.data as WalkInTransaction).balance > 0 ?
                                        <button onClick={() => onViewEditWalkIn(record.data as WalkInTransaction)} className="py-1 px-3 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700">Complete Payment</button>
                                        : <button onClick={() => onViewEditWalkIn(record.data as WalkInTransaction)} className="py-1 px-3 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">View/Edit</button>
                                    )}

                                    {isAdmin && (
                                        <button onClick={() => handleDelete(record.id)} className="ml-4 py-1 px-3 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50">Delete</button>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                                    No transaction history found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


// --- InvoiceForm Component ---
interface InvoiceFormProps {
    onSave: (data: RecordedTransaction, oldRecordId?: string) => void;
    onCancel: () => void;
    currentUser: string;
    designation: string;
    existingData?: InvoiceData | null;
}

const getTodayLocalString = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const InvoiceForm: React.FC<InvoiceFormProps> = ({ onSave, onCancel, currentUser, designation, existingData }) => {
    
    const createInitialInvoiceData = (): InvoiceData => ({
        id: `INV-${Date.now()}`,
        receiptNo: `INV-${Date.now()}`,
        date: getTodayLocalString(),
        lastUpdatedAt: getTodayLocalString(),
        guestName: '', guestEmail: '', phoneContact: '', roomNumber: '',
        documentType: 'reservation',
        status: InvoiceStatus.PENDING,
        bookings: [],
        additionalChargeItems: [],
        subtotal: 0,
        discount: 0,
        holidaySpecialDiscountName: 'Holiday Special',
        holidaySpecialDiscount: 0,
        taxPercentage: 7.5,
        taxAmount: 0,
        totalAmountDue: 0,
        payments: [],
        amountReceived: 0,
        balance: 0,
        amountInWords: '',
        paymentPurpose: '',
        receivedBy: currentUser,
        designation: designation,
        currency: 'NGN',
    });

    const [invoiceData, setInvoiceData] = useState<InvoiceData>(existingData ? JSON.parse(JSON.stringify(existingData)) : createInitialInvoiceData());
    const [newBooking, setNewBooking] = useState<Omit<BookingItem, 'id' | 'nights' | 'subtotal'>>({
        roomType: RoomType.SOJOURN_ROOM, quantity: 1, checkIn: '', checkOut: '', ratePerNight: ROOM_RATES[RoomType.SOJOURN_ROOM],
    });
    const [newAdditionalCharge, setNewAdditionalCharge] = useState<Omit<AdditionalChargeItem, 'id'>>({
        description: '', amount: 0,
    });
    const [newPayment, setNewPayment] = useState<Omit<PaymentItem, 'id'>>({
        date: getTodayLocalString(), amount: 0, paymentMethod: PaymentMethod.CASH, reference: '', recordedBy: currentUser,
    });
    const [verificationDetails, setVerificationDetails] = useState<VerificationDetails>(
        existingData?.verificationDetails || {
            paymentReference: '',
            verifiedBy: currentUser,
            dateVerified: getTodayLocalString(),
        }
    );
    const [emailToSend, setEmailToSend] = useState('');
    const [emailStatus, setEmailStatus] = useState<{message: string; type: 'success' | 'error'} | null>(null);

    const inputClasses = "block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm text-gray-900";
    const selectClasses = "block w-full pl-3 pr-10 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm text-gray-900";
    const summaryInputClasses = "w-full text-right px-2 py-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm text-gray-900";
    
    const isReservation = invoiceData.documentType === 'reservation';


    // Recalculate everything when dependencies change
    useEffect(() => {
        const bookingsSubtotal = invoiceData.bookings.reduce((sum, item) => sum + item.subtotal, 0);
        const chargesSubtotal = invoiceData.additionalChargeItems.reduce((sum, item) => sum + item.amount, 0);
        const subtotal = bookingsSubtotal + chargesSubtotal;
        
        // Tax is inclusive, so we calculate it from the subtotal before discounts.
        // Tax = (Subtotal / (1 + TaxRate)) * TaxRate
        const taxAmount = (subtotal / (1 + (invoiceData.taxPercentage / 100))) * (invoiceData.taxPercentage / 100);
        
        const totalAmountDue = subtotal - invoiceData.discount - invoiceData.holidaySpecialDiscount;
        const amountReceived = invoiceData.payments.reduce((sum, item) => sum + item.amount, 0);
        const balance = totalAmountDue - amountReceived;
        
        let status = InvoiceStatus.PENDING;
        if (amountReceived > 0) {
            status = balance <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL;
        }

        setInvoiceData(prev => ({
            ...prev,
            subtotal,
            taxAmount,
            totalAmountDue,
            amountReceived,
            balance,
            status: isReservation && amountReceived <= 0 ? InvoiceStatus.PENDING : status,
            amountInWords: convertAmountToWords(amountReceived, prev.currency),
            lastUpdatedAt: getTodayLocalString()
        }));
    }, [invoiceData.bookings, invoiceData.additionalChargeItems, invoiceData.payments, invoiceData.discount, invoiceData.holidaySpecialDiscount, invoiceData.taxPercentage, invoiceData.currency, isReservation]);

    useEffect(() => {
        if(existingData) {
            setEmailToSend(existingData.guestEmail);
        }
    }, [existingData]);
    
    useEffect(() => {
        setNewBooking(prev => ({ ...prev, ratePerNight: ROOM_RATES[prev.roomType] || 0 }));
    }, [newBooking.roomType]);
    
    // Handlers
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setInvoiceData(prev => ({ ...prev, [name]: name === 'discount' || name === 'holidaySpecialDiscount' ? parseFloat(value) || 0 : value }));
    };
    
    const handleVerificationChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setVerificationDetails(prev => ({ ...prev, [name]: value }));
    };

    const newBookingNights = useMemo(() => calculateNights(newBooking.checkIn, newBooking.checkOut), [newBooking.checkIn, newBooking.checkOut]);

    const newBookingSubtotal = useMemo(() => {
        return newBookingNights * newBooking.quantity * newBooking.ratePerNight;
    }, [newBookingNights, newBooking.quantity, newBooking.ratePerNight]);

    const handleAddBooking = () => {
        const nights = calculateNights(newBooking.checkIn, newBooking.checkOut);
        if (!newBooking.checkIn || !newBooking.checkOut || newBooking.ratePerNight <= 0) {
            alert("Please fill in Check-In, Check-Out dates, and a valid Rate per Night.");
            return;
        }
        if (nights <= 0) {
            alert("Check-Out date must be after Check-In date.");
            return;
        }
        const subtotal = nights * newBooking.quantity * newBooking.ratePerNight;
        const bookingToAdd: BookingItem = { 
            ...newBooking, 
            id: `booking-${Date.now()}`, 
            nights: nights, 
            subtotal: subtotal
        };
        setInvoiceData(prev => ({ ...prev, bookings: [...prev.bookings, bookingToAdd] }));
        setNewBooking({ roomType: RoomType.SOJOURN_ROOM, quantity: 1, checkIn: '', checkOut: '', ratePerNight: ROOM_RATES[RoomType.SOJOURN_ROOM] });
    };
    const handleRemoveBooking = (id: string) => {
        setInvoiceData(prev => ({ ...prev, bookings: prev.bookings.filter(b => b.id !== id) }));
    };
    
    const handleAddAdditionalCharge = () => {
        if (!newAdditionalCharge.description || newAdditionalCharge.amount <= 0) {
            alert("Please provide a valid description and amount for the charge.");
            return;
        }
        const chargeToAdd: AdditionalChargeItem = { ...newAdditionalCharge, id: `charge-${Date.now()}` };
        setInvoiceData(prev => ({ ...prev, additionalChargeItems: [...prev.additionalChargeItems, chargeToAdd] }));
        setNewAdditionalCharge({ description: '', amount: 0 });
    };
    const handleRemoveAdditionalCharge = (id: string) => {
        setInvoiceData(prev => ({ ...prev, additionalChargeItems: prev.additionalChargeItems.filter(item => item.id !== id) }));
    };
    
    const handleAddPayment = () => {
        if (newPayment.amount <= 0) {
            alert("Please enter a valid payment amount.");
            return;
        }
        const paymentToAdd: PaymentItem = { ...newPayment, id: `payment-${Date.now()}`, recordedBy: currentUser };
        setInvoiceData(prev => ({ ...prev, payments: [...prev.payments, paymentToAdd] }));
        setNewPayment({ date: getTodayLocalString(), amount: 0, paymentMethod: PaymentMethod.CASH, reference: '', recordedBy: currentUser });
    };
    const handleRemovePayment = (id: string) => {
        setInvoiceData(prev => ({ ...prev, payments: prev.payments.filter(p => p.id !== id) }));
    };

    const handleSave = (type: 'reservation' | 'receipt') => {
        if (!invoiceData.guestName) {
            alert('Guest name is required to save.');
            return;
        }
        const oldRecordId = (existingData && existingData.documentType === 'reservation' && type === 'receipt') ? existingData.receiptNo : undefined;
        
        const finalData = { ...invoiceData };
        finalData.documentType = type;
        
        if(type === 'receipt') {
            finalData.verificationDetails = verificationDetails;
            // If converting from INV to RCPT or creating a new receipt
            if (!finalData.receiptNo.startsWith('RCPT-')) {
                const newReceiptNo = `RCPT-${Date.now()}`;
                finalData.invoiceNo = finalData.receiptNo; // Keep old INV- number
                finalData.receiptNo = newReceiptNo;
                finalData.id = newReceiptNo;
            }
        } else {
             // Saving as reservation, clear verification details
            finalData.verificationDetails = undefined;
        }
        
        const record: RecordedTransaction = {
            id: finalData.receiptNo,
            type: 'Hotel Stay',
            date: finalData.date,
            guestName: finalData.guestName,
            amount: finalData.totalAmountDue,
            currency: finalData.currency,
            data: finalData
        };

        onSave(record, oldRecordId);
        alert(`Successfully saved ${type}!`);
    };
    
    const handleEmail = async () => {
        setEmailStatus(null);
        if (!emailToSend) {
            setEmailStatus({message: 'Please enter a recipient email.', type: 'error'});
            return;
        }
        const result = await emailInvoicePDF(invoiceData, emailToSend);
        setEmailStatus({message: result.message, type: result.success ? 'success' : 'error'});
    };


    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
                <h2 className="text-2xl font-bold text-tide-dark">{isReservation ? 'INVOICE FOR RESERVATION' : 'OFFICIAL RECEIPT'}</h2>
                <div>
                    <button onClick={onCancel} className="py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Back to Dashboard</button>
                </div>
            </div>

            {/* Guest Info Section (Full Width) */}
            <div className="mb-6 p-4 border rounded-md bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Guest Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700">Guest Name</label><input type="text" name="guestName" value={invoiceData.guestName} onChange={handleInputChange} className={`mt-1 ${inputClasses}`} required /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Room Number(s)</label><input type="text" name="roomNumber" value={invoiceData.roomNumber} onChange={handleInputChange} className={`mt-1 ${inputClasses}`} /></div>
                    <div className="lg:row-start-2"><label className="block text-sm font-medium text-gray-700">Guest Email</label><input type="email" name="guestEmail" value={invoiceData.guestEmail} onChange={handleInputChange} className={`mt-1 ${inputClasses}`} /></div>
                    <div className="lg:row-start-2"><label className="block text-sm font-medium text-gray-700">Phone/Contact</label><input type="tel" name="phoneContact" value={invoiceData.phoneContact} onChange={handleInputChange} className={`mt-1 ${inputClasses}`} /></div>
                    <div className="sm:col-span-2 lg:col-span-1 lg:row-start-1 lg:col-start-3"><label className="block text-sm font-medium text-gray-700">Purpose of Payment</label><input type="text" name="paymentPurpose" value={invoiceData.paymentPurpose} onChange={handleInputChange} className={`mt-1 ${inputClasses}`} /></div>
                </div>
            </div>
            
            {!isReservation && (
                <div className="mb-6 p-4 border border-green-200 rounded-md bg-green-50">
                    <h3 className="text-lg font-semibold text-green-800 mb-3">Payment Verification</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700">Payment Reference</label><input type="text" name="paymentReference" value={verificationDetails.paymentReference} onChange={handleVerificationChange} className={`mt-1 ${inputClasses}`} /></div>
                        <div><label className="block text-sm font-medium text-gray-700">Verified By</label><input type="text" name="verifiedBy" value={verificationDetails.verifiedBy} readOnly disabled className={`mt-1 ${inputClasses} bg-gray-100`} /></div>
                        <div><label className="block text-sm font-medium text-gray-700">Date Verified</label><input type="text" name="dateVerified" value={verificationDetails.dateVerified} readOnly disabled className={`mt-1 ${inputClasses} bg-gray-100`} /></div>
                    </div>
                </div>
            )}

            {/* Main Form Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Booking & Charges Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Booking Section */}
                    <div className="p-4 border rounded-md">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Bookings</h3>
                        <div className="mb-4 flow-root">
                          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                              <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                   <tr>
                                    <th className="py-2 pl-4 pr-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 sm:pl-0">Room Type</th>
                                    <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Qty</th>
                                    <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Nights</th>
                                    <th className="px-2 py-2 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Subtotal</th>
                                    <th></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                 {invoiceData.bookings.map(booking => (
                                  <tr key={booking.id}>
                                    <td className="whitespace-nowrap py-2 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">{booking.roomType}</td>
                                    <td className="whitespace-nowrap px-2 py-2 text-sm text-gray-500">{booking.quantity}</td>
                                    <td className="whitespace-nowrap px-2 py-2 text-sm text-gray-500">{booking.nights}</td>
                                    <td className="whitespace-nowrap px-2 py-2 text-sm text-gray-500 text-right">{new Intl.NumberFormat('en-US', { style: 'decimal' }).format(booking.subtotal)}</td>
                                    <td className="relative whitespace-nowrap py-2 pl-3 pr-4 text-right text-sm font-medium sm:pr-0"><button onClick={() => handleRemoveBooking(booking.id)} className="text-red-600 hover:text-red-800 text-xs">Remove</button></td>
                                  </tr>
                                ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end bg-gray-50 p-3 rounded-md">
                            <div className="lg:col-span-3">
                                <label className="block text-sm font-medium text-gray-700">Room Type</label>
                                <select value={newBooking.roomType} onChange={e => setNewBooking(p => ({ ...p, roomType: e.target.value as RoomType }))} className={`mt-1 ${selectClasses}`}>{Object.values(RoomType).map(rt => <option key={rt} value={rt}>{rt}</option>)}</select>
                            </div>
                            
                            <div><DatePicker name="checkIn" label="Check-In" value={newBooking.checkIn} onChange={date => setNewBooking(p => ({ ...p, checkIn: date }))} /></div>
                            <div><DatePicker name="checkOut" label="Check-Out" value={newBooking.checkOut} onChange={date => setNewBooking(p => ({ ...p, checkOut: date }))} /></div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nights</label>
                                <input type="number" value={newBookingNights} disabled readOnly className={`mt-1 ${inputClasses} bg-gray-100`}/>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                                <input type="number" min="1" value={newBooking.quantity} onChange={e => setNewBooking(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} className={`mt-1 ${inputClasses}`}/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Rate/Night</label>
                                <input type="number" min="0" value={newBooking.ratePerNight} onChange={e => setNewBooking(p => ({ ...p, ratePerNight: parseFloat(e.target.value) || 0 }))} className={`mt-1 ${inputClasses}`}/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Subtotal</label>
                                <div className="mt-1 flex items-center justify-end h-10 px-3 py-2 border border-gray-300 rounded-md bg-gray-100 sm:text-sm text-gray-900 font-semibold">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: invoiceData.currency }).format(newBookingSubtotal)}
                                </div>
                            </div>
                            
                            <div className="lg:col-span-3">
                                <button onClick={handleAddBooking} className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-tide-dark hover:bg-gray-700">Add Booking</button>
                            </div>
                         </div>
                    </div>
                    
                    <div className="p-4 border rounded-md">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Additional Charges</h3>
                         <div className="mb-4">
                            {invoiceData.additionalChargeItems.length > 0 && (
                                <div className="border-b border-gray-200">
                                {invoiceData.additionalChargeItems.map(item => (
                                    <div key={item.id} className="flex justify-between items-center py-2 text-sm border-t border-gray-200">
                                        <span className="text-gray-800">{item.description}</span>
                                        <div className="flex items-center gap-4">
                                            <span className="font-medium text-gray-800">{new Intl.NumberFormat('en-US', { style: 'decimal' }).format(item.amount)}</span>
                                            <button onClick={() => handleRemoveAdditionalCharge(item.id)} className="text-red-600 hover:text-red-800 text-xs">Remove</button>
                                        </div>
                                    </div>
                                ))}
                                </div>
                            )}
                         </div>
                        <div className="flex gap-4 items-end bg-gray-50 p-3 rounded-md">
                            <div className="flex-grow"><label className="block text-sm font-medium text-gray-700">Description</label><input type="text" value={newAdditionalCharge.description} onChange={e => setNewAdditionalCharge(p => ({ ...p, description: e.target.value }))} className={`mt-1 ${inputClasses}`}/></div>
                            <div className="w-32"><label className="block text-sm font-medium text-gray-700">Amount</label><input type="number" value={newAdditionalCharge.amount} onChange={e => setNewAdditionalCharge(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} min="0" className={`mt-1 ${inputClasses}`}/></div>
                            <div><button onClick={handleAddAdditionalCharge} className="py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-tide-dark hover:bg-gray-700">Add</button></div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Payments, Summary & Actions */}
                <div className="space-y-6">
                     <div className="p-4 border rounded-md">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Payments</h3>
                         <div className="mb-4">
                            {invoiceData.payments.length > 0 && (
                                <div className="border-b border-gray-200">
                                {invoiceData.payments.map(payment => (
                                    <div key={payment.id} className="flex justify-between items-center py-2 text-sm border-t border-gray-200">
                                        <div>
                                            <span className="block text-gray-800">{payment.date} - {payment.paymentMethod}</span>
                                            {payment.reference && <span className="text-xs text-gray-500">Ref: {payment.reference}</span>}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-medium text-gray-800">{new Intl.NumberFormat('en-US', { style: 'decimal' }).format(payment.amount)}</span>
                                            <button onClick={() => handleRemovePayment(payment.id)} className="text-red-600 hover:text-red-800 text-xs">Remove</button>
                                        </div>
                                    </div>
                                ))}
                                </div>
                             )}
                         </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end bg-gray-50 p-3 rounded-md">
                            <div><DatePicker name="paymentDate" label="Date" value={newPayment.date} onChange={date => setNewPayment(p => ({...p, date}))} /></div>
                            <div><label className="block text-sm font-medium text-gray-700">Amount</label><input type="number" min="0" value={newPayment.amount} onChange={e => setNewPayment(p => ({...p, amount: parseFloat(e.target.value) || 0}))} className={`mt-1 ${inputClasses}`}/></div>
                             <div><label className="block text-sm font-medium text-gray-700">Method</label><select value={newPayment.paymentMethod} onChange={e => setNewPayment(p => ({...p, paymentMethod: e.target.value as PaymentMethod}))} className={`mt-1 ${selectClasses}`}>{Object.values(PaymentMethod).filter(p => p !== PaymentMethod.PENDING).map(pm => <option key={pm} value={pm}>{pm}</option>)}</select></div>
                             <div><label className="block text-sm font-medium text-gray-700">Reference</label><input type="text" value={newPayment.reference} onChange={e => setNewPayment(p => ({...p, reference: e.target.value}))} className={`mt-1 ${inputClasses}`}/></div>
                             <div className="sm:col-span-2"><button onClick={handleAddPayment} className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-tide-dark hover:bg-gray-700">Add Payment</button></div>
                         </div>
                    </div>
                    
                    <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                         <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold text-gray-800">Summary</h3>
                            { (invoiceData.status === InvoiceStatus.PAID) && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">Fully Paid</span> }
                            { (invoiceData.status === InvoiceStatus.PARTIAL) && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">Partially Paid</span> }
                            { (isReservation && invoiceData.status === InvoiceStatus.PENDING) && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending Payment</span> }
                         </div>
                        <div className="flex justify-between items-center text-sm"><span className="text-gray-600">Subtotal</span><span className="font-medium text-gray-900">{new Intl.NumberFormat('en-US', { style: 'currency', currency: invoiceData.currency }).format(invoiceData.subtotal)}</span></div>
                        <div className="flex justify-between items-center text-sm">
                          <label htmlFor="discount" className="text-gray-600">Discount</label>
                          <div className="w-32"><input id="discount" type="number" name="discount" value={invoiceData.discount} onChange={handleInputChange} className={summaryInputClasses}/></div>
                        </div>
                        <div className="flex justify-between items-center text-sm gap-2">
                          <input type="text" name="holidaySpecialDiscountName" value={invoiceData.holidaySpecialDiscountName} onChange={handleInputChange} className={`flex-grow text-left ${summaryInputClasses.replace('text-right', '')}`}/>
                          <div className="w-32"><input type="number" name="holidaySpecialDiscount" value={invoiceData.holidaySpecialDiscount} onChange={handleInputChange} className={summaryInputClasses}/></div>
                        </div>
                        <div className="flex justify-between items-center text-sm"><span className="text-gray-600">Tax (7.5% incl.)</span><span className="font-medium text-gray-900">{new Intl.NumberFormat('en-US', { style: 'currency', currency: invoiceData.currency }).format(invoiceData.taxAmount)}</span></div>
                        <div className="border-t border-gray-300 !my-2"></div>
                        <div className="flex justify-between items-center font-bold text-lg"><span className="text-gray-800">TOTAL AMOUNT DUE</span><span className="text-gray-900">{new Intl.NumberFormat('en-US', { style: 'currency', currency: invoiceData.currency }).format(invoiceData.totalAmountDue)}</span></div>
                        <div className="flex justify-between items-center text-sm"><span className="text-gray-600">Amount Received</span><span className="font-medium text-green-700">{new Intl.NumberFormat('en-US', { style: 'currency', currency: invoiceData.currency }).format(invoiceData.amountReceived)}</span></div>
                        <div className="border-t border-gray-300 !my-2"></div>
                        <div className={`flex justify-between items-center font-bold text-xl ${invoiceData.balance > 0 ? 'text-red-600' : (invoiceData.balance < 0 ? 'text-green-600' : 'text-gray-900')}`}>
                            <span>BALANCE</span><span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: invoiceData.currency }).format(invoiceData.balance)}</span>
                        </div>
                    </div>
                     
                    <div className="p-4 border rounded-md">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Actions</h3>
                        <div className="flex flex-col gap-3">
                           <button onClick={() => printInvoice(invoiceData)} className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-tide-dark hover:bg-gray-700">Generate & Print Document</button>
                           <div className="flex gap-2">
                               <input type="email" placeholder="Recipient's email" value={emailToSend} onChange={e => setEmailToSend(e.target.value)} className={`flex-grow ${inputClasses}`} />
                               <button onClick={handleEmail} className="py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">Send Email</button>
                           </div>
                           {emailStatus && <p className={`text-xs ${emailStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{emailStatus.message}</p>}
                           <button onClick={() => generateInvoiceCSV(invoiceData)} className="w-full py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Download Excel (CSV)</button>
                           <div className="flex flex-col sm:flex-row gap-3 mt-2">
                                <button onClick={() => handleSave('receipt')} className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">Save as Official Receipt</button>
                                <button onClick={() => handleSave('reservation')} className="w-full py-2 px-4 border border-yellow-500 text-sm font-medium rounded-md text-yellow-800 bg-yellow-400 hover:bg-yellow-500">Save as Reservation Invoice</button>
                           </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- App Component (Main Controller) ---
const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState<'dashboard' | 'form'>('dashboard');
  const [transactionHistory, setTransactionHistory] = useState<RecordedTransaction[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<InvoiceData | null>(null);
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [editingWalkInTransaction, setEditingWalkInTransaction] = useState<WalkInTransaction | null>(null);


  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 3000);
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser) {
      handleLogin(rememberedUser, false); // Log in but don't set the cookie again
    }
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (name: string, rememberMe: boolean) => {
    setCurrentUser(name);
    setIsAdmin(ADMIN_USERS.includes(name));
    fetchHistory(name, ADMIN_USERS.includes(name));
    if (rememberMe) {
      localStorage.setItem('rememberedUser', name);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    localStorage.removeItem('rememberedUser');
  };
  
  const fetchHistory = useCallback(async (username: string, isAdminUser: boolean) => {
    const history = await fetchUserTransactionHistory(username, isAdminUser);
    setTransactionHistory(history);
  }, []);

  const handleSaveTransaction = async (record: RecordedTransaction, oldRecordId?: string) => {
    await saveTransaction(record, oldRecordId);
    if(currentUser){
        fetchHistory(currentUser, isAdmin);
    }
    setView('dashboard');
    setEditingTransaction(null);
  };
  
  const handleWalkInTransactionGenerated = async (record: RecordedTransaction) => {
    await saveTransaction(record);
    setTransactionHistory(prev => {
        const existingIndex = prev.findIndex(t => t.id === record.id);
        if (existingIndex > -1) {
            const newHistory = [...prev];
            newHistory[existingIndex] = record;
            return newHistory;
        }
        return [record, ...prev];
    });
  };

  const handleDeleteTransaction = async (recordId: string) => {
      await deleteTransaction(recordId);
      if(currentUser) {
          fetchHistory(currentUser, isAdmin);
      }
  };
  
  const handleCreateNew = () => {
    setEditingTransaction(null);
    setView('form');
  };
  
  const handleViewEdit = (data: InvoiceData) => {
      setEditingTransaction(data);
      setView('form');
  }
  
  const handleViewEditWalkIn = (data: WalkInTransaction) => {
      setEditingWalkInTransaction(data);
      setIsWalkInModalOpen(true);
  }
  
  const handleOpenWalkInModal = () => {
      setEditingWalkInTransaction(null);
      setIsWalkInModalOpen(true);
  }


  if (isLoading) return <WelcomeScreen />;
  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;

  return (
    <>
      <Header currentUser={currentUser} onLogout={handleLogout} isAdmin={isAdmin} />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {view === 'dashboard' ? (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-2xl font-bold text-tide-dark">Dashboard Actions</h2>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <button onClick={handleOpenWalkInModal} className="w-full sm:w-auto py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-tide-dark hover:bg-gray-700">New Walk-In Guest Charge</button>
                        <button onClick={handleCreateNew} className="w-full sm:w-auto py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">+ Create Reservation Invoice</button>
                    </div>
                </div>
            </div>

            {isAdmin && <AdminDashboard history={transactionHistory} />}
            <TransactionHistory 
                history={transactionHistory} 
                onViewEdit={handleViewEdit} 
                onViewEditWalkIn={handleViewEditWalkIn}
                onDelete={handleDeleteTransaction} 
                isAdmin={isAdmin}
            />
          </div>
        ) : (
          <InvoiceForm 
            onSave={handleSaveTransaction} 
            onCancel={() => setView('dashboard')} 
            currentUser={currentUser}
            designation={isAdmin ? 'Admin' : 'Staff'}
            existingData={editingTransaction}
          />
        )}
      </main>
      <WalkInGuestModal 
        isOpen={isWalkInModalOpen}
        onClose={() => setIsWalkInModalOpen(false)}
        onTransactionGenerated={handleWalkInTransactionGenerated}
        currentUser={currentUser}
        transactionToEdit={editingWalkInTransaction}
      />
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);