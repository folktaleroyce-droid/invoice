
import React, { useState, useEffect, ChangeEvent, useRef, useMemo } from 'react';
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
  if (data.verificationDetails) {
      const verificationInfo = [
          ['Payment Reference:', data.verificationDetails.paymentReference],
          ['Verified By:', data.verificationDetails.verifiedBy],
          ['Date Verified:', data.verificationDetails.dateVerified],
      ];
      doc.autoTable({
          startY: finalY + 5,
          body: verificationInfo,
          theme: 'plain',
          styles: { font: 'helvetica', fontSize: 10, cellPadding: 1 },
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
      startY: finalY + (data.verificationDetails ? 2 : 5),
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
  if (data.status === InvoiceStatus.PENDING || data.status === InvoiceStatus.PARTIAL) {
      let paymentY = currentY > 210 ? currentY + 5 : 215;
      doc.setFont('helvetica', 'bold');
      
      let statusText = 'Pending';
      let statusColor = '#f59e0b'; // Amber/Orange
      if (data.status === InvoiceStatus.PARTIAL) {
        statusText = 'Partial Payment';
        statusColor = '#E53E3E'; // Red
      }
      doc.setTextColor(statusColor);
      doc.text(`▲ Payment Status: ${statusText}`, 14, paymentY);
      
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
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#2c3e50');

  const footerStartY = pageHeight - 45;
  doc.text(`Purpose of Payment: ${data.paymentPurpose}`, 14, footerStartY);
  
  let paymentMethodsText = 'Pending';
  if (data.documentType === 'receipt') {
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
  if (data.status === InvoiceStatus.PAID) {
      statusHTML = `<p class="status paid">✅ Payment Received – Thank you for your business.</p>`;
  } else if (data.status === InvoiceStatus.PENDING || data.status === InvoiceStatus.PARTIAL) {
      const statusClass = data.status === InvoiceStatus.PARTIAL ? 'partial' : 'pending';
      const statusText = data.status === InvoiceStatus.PARTIAL ? 'Partial Payment' : 'Pending';
      statusHTML = `
        <div class="payment-details">
          <p class="status ${statusClass}">▲ Payment Status: ${statusText}</p>
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
  }

  const verificationSection = data.verificationDetails ? `
    <div class="verification-info">
      <h3 class="info-subtitle">Payment Verification</h3>
      <table class="info-table">
        <tr><td>Payment Reference:</td><td>${data.verificationDetails.paymentReference}</td></tr>
        <tr><td>Verified By:</td><td>${data.verificationDetails.verifiedBy}</td></tr>
        <tr><td>Date Verified:</td><td>${data.verificationDetails.dateVerified}</td></tr>
      </table>
    </div>
  ` : '';


  const footerNote = isReservation ? `
    <p class="footer-note">This is a reservation invoice. Payment is pending. A final receipt will be issued upon confirmation of payment.</p>
  ` : '';
  
  let paymentMethodsText = 'Pending';
  if (data.documentType === 'receipt') {
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

            return [
                data.receiptNo, record.type, data.status, data.date, data.guestName, data.totalAmountDue, data.currency,
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
}

const getTodayLocalStringModal = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const WalkInGuestModal: React.FC<WalkInGuestModalProps> = ({ isOpen, onClose, onTransactionGenerated, currentUser }) => {
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

  const subtotal = useMemo(() => charges.reduce((sum, item) => sum + (item.amount || 0), 0), [charges]);
  const balance = useMemo(() => (subtotal - (typeof discount === 'number' ? discount : 0)) - (typeof amountPaid === 'number' ? amountPaid : 0), [subtotal, amountPaid, discount]);
  const currencyFormatter = useMemo(() => new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }), [currency]);

  if (!isOpen) return null;

  const handleReset = () => {
    setNewCharge({ date: getTodayLocalStringModal(), service: WalkInService.RESTAURANT, otherServiceDescription: '', amount: '', paymentMethod: PaymentMethod.CASH });
    setCharges([]); setCurrency('NGN'); setDiscount(''); setAmountPaid(''); setCashier(currentUser); setPaymentMethod(PaymentMethod.CASH); setError('');
  };
  const handleClose = () => { handleReset(); onClose(); };

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
    return { id: `WI-${Date.now()}`, transactionDate: getTodayLocalStringModal(), charges, currency, subtotal, discount: typeof discount === 'number' ? discount : 0, amountPaid: typeof amountPaid === 'number' ? amountPaid : 0, balance, cashier, paymentMethod };
  };

  const handleGenerate = (action: 'print' | 'csv') => {
    const transaction = validateAndCreateTransaction();
    if (transaction) {
      const record: RecordedTransaction = { id: transaction.id, type: 'Walk-In', date: transaction.transactionDate, guestName: 'Walk-In Guest', amount: (transaction.subtotal - transaction.discount), currency: transaction.currency, data: { ...transaction } };
      onTransactionGenerated(record);
      if (action === 'print') { printWalkInReceipt(transaction); alert('Receipt generated for printing!'); } else { generateWalkInCSV(transaction); alert('CSV record downloaded!'); }
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 relative flex flex-col" style={{ maxHeight: '90vh' }}>
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" aria-label="Close"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        <h2 className="text-2xl font-bold text-tide-dark mb-4 border-b pb-3">Walk-In Guest Charge</h2>
        <div className="overflow-y-auto flex-grow pr-2">
            <div className="grid grid-cols-12 gap-4 items-end p-1">
                <div className="col-span-12 sm:col-span-2"><DatePicker label="Date" name="newChargeDate" value={newCharge.date} onChange={date => setNewCharge(p => ({...p, date}))} /></div>
                <div className="col-span-12 sm:col-span-3"><label className="block text-sm font-medium text-gray-700">Service</label><select value={newCharge.service} onChange={e => setNewCharge(p => ({...p, service: e.target.value as WalkInService}))} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-gray-300 focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm rounded-md">{Object.values(WalkInService).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="col-span-12 sm:col-span-3"><label className="block text-sm font-medium text-gray-700">Payment</label><select value={newCharge.paymentMethod} onChange={e => setNewCharge(p => ({...p, paymentMethod: e.target.value as PaymentMethod}))} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-gray-300 focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm rounded-md">{Object.values(PaymentMethod).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="col-span-12 sm:col-span-2"><label className="block text-sm font-medium text-gray-700">Amount</label><input type="number" value={newCharge.amount} onChange={e => setNewCharge(p => ({...p, amount: e.target.value === '' ? '' : parseFloat(e.target.value)}))} min="0" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm"/></div>
                <div className="col-span-12 sm:col-span-2"><button type="button" onClick={handleAddCharge} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-tide-dark text-base font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold sm:text-sm">Add</button></div>
                 {newCharge.service === WalkInService.OTHER && (<div className="col-span-12"><label className="block text-sm font-medium text-gray-700">Service Description</label><input type="text" value={newCharge.otherServiceDescription} onChange={e => setNewCharge(p => ({...p, otherServiceDescription: e.target.value}))} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm" placeholder="Please specify service"/></div>)}
            </div>
            <div className="mt-4 border-t pt-4"><h3 className="text-lg font-semibold text-gray-800 mb-2">Charges</h3><div className="bg-gray-50 rounded-md p-2">{charges.length === 0 ? <p className="text-center text-gray-500 py-4">No charges added yet.</p> : <table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-100"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th><th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"></th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{charges.map(charge => (<tr key={charge.id}><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{charge.date}</td><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{charge.service === WalkInService.OTHER ? charge.otherServiceDescription : charge.service}</td><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{charge.paymentMethod}</td><td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 text-right">{currencyFormatter.format(charge.amount)}</td><td className="px-4 py-2 whitespace-nowrap text-center"><button onClick={() => handleRemoveCharge(charge.id)} className="text-red-600 hover:text-red-800 text-xs">Remove</button></td></tr>))}</tbody></table>}</div></div>
            <div className="mt-4 border-t pt-4"><div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4"><div><label className="block text-sm font-medium text-gray-700">Currency</label><select value={currency} onChange={e => setCurrency(e.target.value as 'NGN' | 'USD')} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-gray-300 focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm rounded-md"><option value="NGN">Naira (NGN)</option><option value="USD">Dollar (USD)</option></select></div><div><label className="block text-sm font-medium text-gray-700">Overall Payment Method</label><select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-gray-300 focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm rounded-md">{Object.values(PaymentMethod).map(s => <option key={s} value={s}>{s}</option>)}</select></div><div><label className="block text-sm font-medium text-gray-700">Cashier (User)</label><input type="text" value={cashier} readOnly disabled className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm cursor-not-allowed"/></div></div><div className="mt-4 p-4 bg-gray-100 rounded-lg space-y-2"><div className="flex justify-between items-center text-md font-semibold text-gray-800"><span>Subtotal:</span><span>{currencyFormatter.format(subtotal)}</span></div><div className="flex justify-between items-center"><label className="text-sm font-medium text-gray-700">Discount:</label><input type="number" value={discount} onChange={e => setDiscount(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-32 text-right px-2 py-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm"/></div><div className="flex justify-between items-center"><label className="text-sm font-medium text-gray-700">Amount Paid:</label><input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-32 text-right px-2 py-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm"/></div><div className="flex justify-between items-center text-lg font-bold text-tide-dark border-t border-gray-300 pt-2"><span>Balance:</span><span className={balance < 0 ? 'text-green-600' : ''}>{currencyFormatter.format(balance)}</span></div></div></div>
        </div>
        {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}
        <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row-reverse gap-3"><button type="button" onClick={() => handleGenerate('print')} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-tide-dark text-base font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold sm:ml-3 sm:w-auto sm:text-sm">Generate & Print Receipt</button><button type="button" onClick={() => handleGenerate('csv')} className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold sm:mt-0 sm:w-auto sm:text-sm">Download Excel (CSV)</button></div>
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
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-tide-dark mb-4 border-b pb-3">Admin Dashboard: Today's Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Transactions Today */}
                <div className="bg-blue-100 border border-blue-200 p-5 rounded-lg text-center">
                    <p className="text-sm font-medium text-blue-800">Transactions Today</p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">{stats.transactionsTodayCount}</p>
                </div>
                {/* Revenue Today (NGN) */}
                <div className="bg-green-100 border border-green-200 p-5 rounded-lg text-center">
                    <p className="text-sm font-medium text-green-800">Revenue Today (NGN)</p>
                    <p className="text-3xl font-bold text-green-900 mt-2">{formatNgn(stats.revenueTodayNGN)}</p>
                </div>
                {/* Revenue Today (USD) */}
                <div className="bg-green-100 border border-green-200 p-5 rounded-lg text-center">
                    <p className="text-sm font-medium text-green-800">Revenue Today (USD)</p>
                    <p className="text-3xl font-bold text-green-900 mt-2">{formatUsd(stats.revenueTodayUSD)}</p>
                </div>
                {/* Pending Reservations */}
                <div className="bg-yellow-100 border border-yellow-200 p-5 rounded-lg text-center">
                    <p className="text-sm font-medium text-yellow-800">Invoices Requiring Action</p>
                    <p className="text-3xl font-bold text-yellow-900 mt-2">{stats.pendingOrPartial}</p>
                </div>
            </div>
        </div>
    );
};


// --- PendingInvoices Component ---
interface PendingInvoicesProps {
  invoices: RecordedTransaction[];
  isAdmin: boolean;
  onDeleteTransaction: (id: string) => void;
  onCompletePayment: (id: string) => void;
}

const PendingInvoices: React.FC<PendingInvoicesProps> = ({ invoices, isAdmin, onDeleteTransaction, onCompletePayment }) => {

    const currencyFormatter = (amount: number, currency: 'NGN' | 'USD') => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
    };

    const handleDelete = (record: RecordedTransaction) => {
        const creator = (record.data as InvoiceData).receivedBy;
        if (window.confirm(`Are you sure you want to delete invoice ${record.id} for "${record.guestName}" created by ${creator}? This action cannot be undone.`)) {
            onDeleteTransaction(record.id);
        }
    };

    const handleView = (record: RecordedTransaction) => {
        printInvoice(record.data as InvoiceData);
    };

    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-7xl mx-auto">
            <div className="mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-tide-dark">Pending Reservations</h2>
                <p className="text-sm text-gray-500 mt-1">These invoices have been generated and are awaiting payment confirmation.</p>
            </div>
            <div className="overflow-x-auto max-h-[400px]">
                {invoices.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No pending reservations found.</p>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No.</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Name</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Due</th>
                                {isAdmin && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>}
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {invoices.map((record) => (
                                <tr key={record.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.guestName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right font-semibold">{currencyFormatter(record.amount, record.currency)}</td>
                                    {isAdmin && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(record.data as InvoiceData).receivedBy}</td>}
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => onCompletePayment(record.id)} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-tide-dark hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold">Complete Payment</button>
                                        <button onClick={() => handleView(record)} className="text-tide-dark hover:text-tide-gold transition-colors">View</button>
                                        {isAdmin && <button onClick={() => handleDelete(record)} className="text-red-600 hover:text-red-900 transition-colors">Delete</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};


// --- TransactionHistory Component ---
interface TransactionHistoryProps {
  history: RecordedTransaction[];
  isAdmin: boolean;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (id: string) => void;
  highlightedTxId?: string | null;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ history, isAdmin, onDeleteTransaction, onEditTransaction, highlightedTxId }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const currencyFormatter = (amount: number, currency: 'NGN' | 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
  };

  const filteredHistory = useMemo(() => {
    const lowercasedQuery = searchQuery.toLowerCase().trim();

    return history.filter(record => {
      // Date filtering
      if (startDate && record.date < startDate) return false;
      if (endDate && record.date > endDate) return false;

      // Search query filtering
      if (lowercasedQuery) {
        const checkCommon = record.id.toLowerCase().includes(lowercasedQuery) ||
                            record.guestName.toLowerCase().includes(lowercasedQuery);
        if (checkCommon) return true;

        if (record.type === 'Hotel Stay') {
          const data = record.data as InvoiceData;
          const checkHotelStay = (data.guestEmail || '').toLowerCase().includes(lowercasedQuery) ||
                                 (data.phoneContact || '').toLowerCase().includes(lowercasedQuery) ||
                                 (data.roomNumber || '').toLowerCase().includes(lowercasedQuery);
          if (checkHotelStay) return true;
        } else { // Walk-In
          const data = record.data as WalkInTransaction;
          const checkWalkIn = data.charges.some(charge =>
              charge.service.toLowerCase().includes(lowercasedQuery) ||
              (charge.otherServiceDescription || '').toLowerCase().includes(lowercasedQuery)
          );
          if (checkWalkIn) return true;
        }
        
        // If query exists and no match found, filter out
        return false;
      }

      // If no query, don't filter out based on search
      return true;
    });
  }, [history, startDate, endDate, searchQuery]);

  const handleClearFilter = () => {
    if (window.confirm("Are you sure you want to clear all filters? This will reset the date range and search query.")) {
      setStartDate('');
      setEndDate('');
      setSearchQuery('');
    }
  };
  
  const handleDelete = (record: RecordedTransaction) => {
    const creator = record.type === 'Hotel Stay' 
        ? (record.data as InvoiceData).receivedBy 
        : (record.data as WalkInTransaction).cashier;
    
    if (window.confirm(`Are you sure you want to delete receipt ${record.id} for "${record.guestName}" created by ${creator}? This action cannot be undone.`)) {
        onDeleteTransaction(record.id);
    }
  };
  
  const getStatusBadge = (status: InvoiceStatus) => {
    switch(status) {
        case InvoiceStatus.PAID:
            return 'bg-green-100 text-green-800';
        case InvoiceStatus.PARTIAL:
            return 'bg-red-100 text-red-800';
        case InvoiceStatus.PENDING:
            return 'bg-yellow-100 text-yellow-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-7xl mx-auto">
      <div className="mb-6 border-b pb-4">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h2 className="text-2xl font-bold text-tide-dark flex items-center gap-3">
            <span>Completed Transaction History</span>
            {isAdmin && <span className="text-sm font-semibold text-tide-dark bg-tide-gold px-3 py-1 rounded-md">ADMIN VIEW</span>}
          </h2>
          <button onClick={() => generateHistoryCSV(filteredHistory)} disabled={filteredHistory.length === 0} className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-tide-dark bg-tide-gold hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">Download Filtered List (CSV)</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-end gap-4">
            <div className="lg:col-span-1"><DatePicker label="Start Date" name="startDate" value={startDate} onChange={setStartDate} /></div>
            <div className="lg:col-span-1"><DatePicker label="End Date" name="endDate" value={endDate} onChange={setEndDate} /></div>
            <div className="sm:col-span-2 lg:col-span-1">
                <label htmlFor="history-search" className="block text-sm font-medium text-gray-700">Search</label>
                <input
                    type="text"
                    id="history-search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Guest name, receipt no..."
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm"
                />
            </div>
            <div className="lg:col-span-1">
                <button onClick={handleClearFilter} className="w-full py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold transition-colors">
                    Clear Filters
                </button>
            </div>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[500px]">
        {history.length === 0 ? <p className="text-center text-gray-500 py-8">No completed transactions yet.</p> : filteredHistory.length === 0 ? <p className="text-center text-gray-500 py-8">No transactions found for the selected filters.</p> : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt No.</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Due</th>
                 <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                {isAdmin && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>}
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.map((record) => {
                const isHotelStay = record.type === 'Hotel Stay';
                const status = isHotelStay ? (record.data as InvoiceData).status : InvoiceStatus.PAID;
                const balance = isHotelStay ? (record.data as InvoiceData).balance : (record.data as WalkInTransaction).balance;
                
                return (
                <tr key={record.id} className={`transition-colors duration-1000 ease-out ${record.id === highlightedTxId ? 'bg-yellow-100' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.guestName}</td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isHotelStay ? getStatusBadge(status) : 'bg-blue-100 text-blue-800'}`}>
                        {isHotelStay ? status : 'Walk-In'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right font-semibold">{currencyFormatter(record.amount, record.currency)}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${balance > 0.01 ? 'text-red-600' : 'text-green-600'}`}>{currencyFormatter(balance, record.currency)}</td>
                  {isAdmin && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.type === 'Hotel Stay' ? (record.data as InvoiceData).receivedBy : (record.data as WalkInTransaction).cashier}</td>}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                      {isHotelStay && <button onClick={() => onEditTransaction(record.id)} className="text-tide-dark hover:text-tide-gold font-semibold transition-colors">View/Edit</button>}
                      {isAdmin && <button onClick={() => handleDelete(record)} className="text-red-600 hover:text-red-900 transition-colors">Delete</button>}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};


// --- EmailModal Component ---
const EmailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSend: () => void;
  email: string;
  setEmail: (email: string) => void;
  emailStatus: 'idle' | 'sending' | 'sent' | 'error';
}> = ({ isOpen, onClose, onSend, email, setEmail, emailStatus }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" aria-label="Close"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        <h3 className="text-lg font-bold text-tide-dark mb-4">Send Document via Email</h3>
        <p className="text-sm text-gray-600 mb-4">Please confirm or enter the recipient's email address below.</p>
        <div>
            <label htmlFor="recipient-email" className="block text-sm font-medium text-gray-700">Recipient Email</label>
            <input
                type="email"
                id="recipient-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm"
                autoFocus
            />
        </div>
        <div className="mt-6 flex justify-end gap-3">
            <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold"
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={onSend}
                disabled={emailStatus === 'sending'}
                className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-tide-dark hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                {emailStatus === 'sending' ? 'Sending...' : 'Send Email'}
            </button>
        </div>
      </div>
    </div>
  );
};


// --- InvoiceForm Component ---
interface InvoiceFormProps {
  onSaveInvoice: (record: RecordedTransaction, oldRecordId?: string) => Promise<void>;
  currentUser: string;
  transactionToEdit?: InvoiceData | null;
  onEditComplete: () => void;
}

const FormInput: React.FC<{ label: string; name: string; type?: string; value: string | number; onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; required?: boolean; error?: string; disabled?: boolean; placeholder?: string; }> = ({ label, name, type = 'text', value, onChange, required = false, error, disabled = false, placeholder = '' }) => (<div><label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label><input type={type} id={name} name={name} value={value} onChange={onChange} required={required} disabled={disabled} placeholder={placeholder} className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-tide-gold sm:text-sm ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-tide-gold'}`} />{error && <p className="mt-1 text-xs text-red-600">{error}</p>}</div>);
const FormSelect: React.FC<{ label: string; name: string; value: string; onChange: (e: ChangeEvent<HTMLSelectElement>) => void; options: string[]; required?: boolean; disabled?: boolean; children?: React.ReactNode; }> = ({ label, name, value, onChange, options, required = false, disabled = false, children }) => (<div><label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label><select id={name} name={name} value={value} onChange={onChange} required={required} disabled={disabled} className={`mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-gray-300 focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm rounded-md ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}>{children}{options.map(option => <option key={option} value={option}>{option}</option>)}</select></div>);
const CalculatedField: React.FC<{ label: string; value: string; isBalance?: boolean; balance?: number; }> = ({ label, value, isBalance = false, balance = 0 }) => (<div><p className="block text-sm font-medium text-gray-700">{label}</p><p className={`mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-md shadow-sm sm:text-sm text-gray-800 font-semibold ${isBalance ? (balance > 0.01 ? 'text-red-700' : 'text-green-700') : ''}`}>{value}</p></div>);

const InvoiceForm: React.FC<InvoiceFormProps> = ({ onSaveInvoice, currentUser, transactionToEdit, onEditComplete }) => {
  const roomRates: Record<RoomType, number> = {
    [RoomType.SOJOURN_ROOM]: 165000,
    [RoomType.TRANQUIL_ROOM]: 187500,
    [RoomType.HARMONY_STUDIO]: 210000,
    [RoomType.SERENITY_STUDIO]: 300000,
    [RoomType.NARRATIVE_SUITE]: 390000,
    [RoomType.ODYSSEY_SUITE]: 397500,
    [RoomType.TIDE_SIGNATURE_SUITE]: 450000
  };
  const roomRatesUSD: Record<RoomType, number> = {
    [RoomType.SOJOURN_ROOM]: 110,
    [RoomType.TRANQUIL_ROOM]: 125,
    [RoomType.HARMONY_STUDIO]: 140,
    [RoomType.SERENITY_STUDIO]: 200,
    [RoomType.NARRATIVE_SUITE]: 260,
    [RoomType.ODYSSEY_SUITE]: 265,
    [RoomType.TIDE_SIGNATURE_SUITE]: 300
  };

  const amountInWordsCache = useRef({ amount: -1, currency: '', words: '' });

  const calculateInvoiceTotals = (data: InvoiceData): InvoiceData => {
    const updatedBookings = data.bookings.map(booking => {
        const nights = calculateNights(booking.checkIn, booking.checkOut);
        const subtotal = booking.quantity * nights * booking.ratePerNight;
        return { ...booking, nights, subtotal };
    });

    const roomCharge = updatedBookings.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const additionalCharges = data.additionalChargeItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const subtotal = roomCharge + additionalCharges;

    const taxAmount = subtotal - (subtotal / (1 + data.taxPercentage / 100));
    const totalAmountDue = subtotal - (data.discount || 0) - (data.holidaySpecialDiscount || 0);
    
    const amountReceived = data.payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = totalAmountDue - amountReceived;

    let status: InvoiceStatus;
    if (data.documentType === 'reservation') {
        status = InvoiceStatus.PENDING;
    } else { // It's a receipt
        if (balance > 0.01) { // Use a small epsilon for float comparison
            status = InvoiceStatus.PARTIAL;
        } else {
            status = InvoiceStatus.PAID;
        }
    }
    
    let amountInWords;
    const received = isNaN(amountReceived) ? 0 : amountReceived;
    if (received === amountInWordsCache.current.amount && data.currency === amountInWordsCache.current.currency) {
        amountInWords = amountInWordsCache.current.words;
    } else {
        amountInWords = convertAmountToWords(received, data.currency);
        amountInWordsCache.current = { amount: received, currency: data.currency, words: amountInWords };
    }

    return { ...data, bookings: updatedBookings, subtotal, taxAmount, totalAmountDue, amountReceived, balance, amountInWords, status, lastUpdatedAt: new Date().toISOString() };
  };

  const getTodayLocalString = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const generateNewInvoiceState = (currentUser: string): InvoiceData => {
    const today = getTodayLocalString();
    const defaultRoomType = RoomType.SOJOURN_ROOM;
    const defaultBooking: BookingItem = { id: `booking-${Date.now()}`, roomType: defaultRoomType, quantity: 1, checkIn: today, checkOut: today, nights: 0, ratePerNight: roomRates[defaultRoomType], subtotal: 0 };
    
    const invoiceNo = `INV-TIDE-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;

    const initialState: InvoiceData = { 
        id: invoiceNo,
        invoiceNo: invoiceNo,
        receiptNo: invoiceNo, 
        date: today,
        lastUpdatedAt: new Date().toISOString(),
        guestName: '', 
        guestEmail: '', 
        phoneContact: '', 
        roomNumber: '',
        documentType: 'reservation',
        status: InvoiceStatus.PENDING,
        bookings: [defaultBooking], 
        additionalChargeItems: [], 
        subtotal: 0, 
        discount: 0, 
        holidaySpecialDiscountName: 'Holiday Special Discount',
        holidaySpecialDiscount: 0, 
        taxPercentage: 7.5, 
        taxAmount: 0, 
        totalAmountDue: 0, 
        payments: [],
        amountReceived: 0,
        balance: 0, 
        amountInWords: 'Zero Naira only', 
        paymentPurpose: 'Hotel Accommodation', 
        receivedBy: currentUser, 
        designation: '', 
        currency: 'NGN' 
    };
    return calculateInvoiceTotals(initialState);
  };
  
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(() => generateNewInvoiceState(currentUser));
  const [paymentReference, setPaymentReference] = useState('');
  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [emailError, setEmailError] = useState<string>('');
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [newPayment, setNewPayment] = useState({
    date: getTodayLocalString(),
    amount: '' as number | '',
    paymentMethod: PaymentMethod.POS,
    reference: ''
  });

  const isEditing = useMemo(() => !!transactionToEdit, [transactionToEdit]);
  
  useEffect(() => {
    if (transactionToEdit) {
        setInvoiceData(calculateInvoiceTotals(transactionToEdit));
        setPaymentReference(transactionToEdit.verificationDetails?.paymentReference || '');
    } else {
        setInvoiceData(generateNewInvoiceState(currentUser));
        setPaymentReference('');
    }
  }, [transactionToEdit, currentUser]);


  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'guestEmail') { /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || !value ? setEmailError('') : setEmailError('Please enter a valid email address.'); }
    setInvoiceData(prev => {
        let nextData = { ...prev };
        const numericFields = ['discount', 'taxPercentage', 'holidaySpecialDiscount'];
        if (numericFields.includes(name)) { (nextData as any)[name] = parseFloat(value) || 0; } else { (nextData as any)[name] = value; }
        if (name === 'currency') {
            const newCurrency = value as 'NGN' | 'USD';
            nextData.bookings = nextData.bookings.map(booking => ({ ...booking, ratePerNight: newCurrency === 'USD' ? roomRatesUSD[booking.roomType] : roomRates[booking.roomType] }));
        }
        return calculateInvoiceTotals(nextData);
    });
  };

  const handleBookingChange = (index: number, field: keyof BookingItem, value: string | number) => {
      setInvoiceData(prev => {
          const newBookings = [...prev.bookings];
          const bookingToUpdate = { ...newBookings[index] };
          (bookingToUpdate as any)[field] = value;
          
          if (field === 'roomType') {
              const newRoomType = value as RoomType;
              bookingToUpdate.ratePerNight = prev.currency === 'USD' ? roomRatesUSD[newRoomType] : roomRates[newRoomType];
          }

          if (field === 'quantity') {
            bookingToUpdate.quantity = Math.max(0, Number(value));
          }

          newBookings[index] = bookingToUpdate;
          return calculateInvoiceTotals({ ...prev, bookings: newBookings });
      });
  };

  const handleAddBooking = () => {
      setInvoiceData(prev => {
          const today = getTodayLocalString();
          const defaultRoomType = RoomType.SOJOURN_ROOM;
          const newBooking: BookingItem = {
              id: `booking-${Date.now()}`, roomType: defaultRoomType, quantity: 1, checkIn: today, checkOut: today,
              nights: 0, ratePerNight: prev.currency === 'USD' ? roomRatesUSD[defaultRoomType] : roomRates[defaultRoomType], subtotal: 0
          };
          return calculateInvoiceTotals({ ...prev, bookings: [...prev.bookings, newBooking] });
      });
  };

  const handleRemoveBooking = (id: string) => {
      setInvoiceData(prev => {
          if (prev.bookings.length <= 1) return prev;
          const newBookings = prev.bookings.filter(b => b.id !== id);
          return calculateInvoiceTotals({ ...prev, bookings: newBookings });
      });
  };

  const handleAddPayment = () => {
      if (!newPayment.amount || newPayment.amount <= 0) {
          alert("Please enter a valid payment amount.");
          return;
      }
      const paymentToAdd: PaymentItem = {
          id: `payment-${Date.now()}`,
          recordedBy: currentUser,
          date: newPayment.date,
          amount: newPayment.amount as number,
          paymentMethod: newPayment.paymentMethod,
          reference: newPayment.reference,
      };
      setInvoiceData(prev => calculateInvoiceTotals({ ...prev, payments: [...prev.payments, paymentToAdd] }));
      setNewPayment({ date: getTodayLocalString(), amount: '', paymentMethod: PaymentMethod.POS, reference: '' });
  };

  const handleRemovePayment = (id: string) => {
      if (window.confirm("Are you sure you want to remove this payment?")) {
          setInvoiceData(prev => calculateInvoiceTotals({ ...prev, payments: prev.payments.filter(p => p.id !== id) }));
      }
  };

  const handleDateChange = (name: string, date: string) => { setInvoiceData(prev => calculateInvoiceTotals({ ...prev, [name]: date })); };
  const handleAddChargeItem = () => { setInvoiceData(prev => calculateInvoiceTotals({ ...prev, additionalChargeItems: [...prev.additionalChargeItems, { id: `item-${Date.now()}`, description: '', amount: 0 }] })); };
  const handleChargeItemChange = (index: number, field: 'description' | 'amount', value: string | number) => { setInvoiceData(prev => { const newItems = [...prev.additionalChargeItems]; newItems[index] = { ...newItems[index], [field]: field === 'amount' ? parseFloat(value as string) || 0 : value }; return calculateInvoiceTotals({ ...prev, additionalChargeItems: newItems }); }); };
  const handleRemoveChargeItem = (id: string) => { setInvoiceData(prev => calculateInvoiceTotals({ ...prev, additionalChargeItems: prev.additionalChargeItems.filter(item => item.id !== id) })); };
  
  const validateForm = () => {
    const requiredFields: { key: keyof InvoiceData; label: string }[] = [ { key: 'guestName', label: 'Guest Name' }, { key: 'guestEmail', label: 'Guest Email' }, { key: 'phoneContact', label: 'Phone/Contact' }, { key: 'roomNumber', label: 'Room Number(s)' }, { key: 'receivedBy', label: 'Created By' }, { key: 'designation', label: 'Designation' }, { key: 'paymentPurpose', label: 'Purpose of Payment' } ];
    
    for (const field of requiredFields) { if (!invoiceData[field.key]) { alert(`The field "${field.label}" is required.`); return false; } }
    if (invoiceData.bookings.length === 0) { alert("At least one booking is required."); return false; }
    for (const booking of invoiceData.bookings) { if (booking.nights <= 0) { alert(`A booking for "${booking.roomType}" has an invalid date range or zero nights.`); return false; } }
    if (emailError) { alert("Please fix the email address format."); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return { success: false, data: null };
    
    let finalInvoiceData = calculateInvoiceTotals(invoiceData);
    let oldRecordId: string | undefined = undefined;
    
    const isConverting = isEditing && transactionToEdit?.documentType === 'reservation';
    const isEditingReceipt = isEditing && transactionToEdit?.documentType === 'receipt';
    
    if (isConverting) {
      if (!paymentReference.trim()) {
        alert("Payment Reference from the customer is required to generate the official receipt.");
        return { success: false, data: null };
      }
      oldRecordId = transactionToEdit.id; // The old invoice ID to be deleted
      const newReceiptNo = `TIDE-RCPT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      finalInvoiceData = {
        ...finalInvoiceData,
        documentType: 'receipt',
        id: newReceiptNo,
        receiptNo: newReceiptNo,
        invoiceNo: transactionToEdit.receiptNo, // Keep track of original invoice no
        verificationDetails: {
          paymentReference: paymentReference.trim(),
          verifiedBy: currentUser,
          dateVerified: getTodayLocalString(),
        }
      };
    } else if (isEditingReceipt) {
        if (!paymentReference.trim()) {
          alert("Payment Reference from the customer is required for the official receipt.");
          return { success: false, data: null };
        }
        finalInvoiceData.verificationDetails = {
          paymentReference: paymentReference.trim(),
          verifiedBy: finalInvoiceData.verificationDetails?.verifiedBy || currentUser,
          dateVerified: finalInvoiceData.verificationDetails?.dateVerified || getTodayLocalString(),
        }
    }
    
    const record: RecordedTransaction = { 
      id: finalInvoiceData.id, 
      type: 'Hotel Stay', 
      date: finalInvoiceData.date, 
      guestName: finalInvoiceData.guestName, 
      amount: finalInvoiceData.totalAmountDue, 
      currency: finalInvoiceData.currency, 
      data: { ...finalInvoiceData } 
    };
    
    await onSaveInvoice(record, oldRecordId);
    return { success: true, data: finalInvoiceData };
  }

  const handleSaveAndPrint = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { success, data } = await handleSave();
    if(success && data) {
        printInvoice(data);
        setIsGenerated(true);
        setTimeout(() => setIsGenerated(false), 5000);
        onEditComplete(); // Clear the form after any successful save/print
    }
  };

  const handleOpenEmailModal = async () => {
    if (!validateForm()) return;
    const { success, data } = await handleSave();
    if (success && data) {
        setInvoiceData(data); // Ensure latest data is used
        setRecipientEmail(data.guestEmail);
        setEmailStatus('idle'); 
        setIsEmailModalOpen(true);
    } else {
        alert("Could not save the document before sending. Please check for errors.");
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
        alert("Please enter a valid recipient email address.");
        return;
    }

    setEmailStatus('sending');
    const result = await emailInvoicePDF(invoiceData, recipientEmail);
    
    if (result.success) {
        setEmailStatus('sent');
        alert(result.message);
        setIsEmailModalOpen(false);
        onEditComplete();
    } else {
        setEmailStatus('error');
        alert(`Error: ${result.message}`);
    }
    setTimeout(() => setEmailStatus('idle'), 4000);
  };
  
  const handleBackOrClear = () => {
    const message = isEditing 
        ? "Are you sure you want to go back to the dashboard? All unsaved changes will be lost."
        : "Are you sure you want to clear the form and go back to the dashboard?";
    if (window.confirm(message)) {
        onEditComplete();
    }
  };

  const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: invoiceData.currency, minimumFractionDigits: 2 });
  
  const isConvertingToReceipt = isEditing && transactionToEdit?.documentType === 'reservation';
  const isEditingReceipt = isEditing && transactionToEdit?.documentType === 'receipt';
  
  let formTitle = "Create New Reservation Invoice";
  let submitButtonText = "Generate Invoice & Print";
  
  if (isConvertingToReceipt) {
    formTitle = `Finalize Guest Account for Invoice #${transactionToEdit.receiptNo}`;
    submitButtonText = 'Generate Receipt & Print';
  } else if (isEditingReceipt) {
    formTitle = `Editing Receipt #${transactionToEdit.receiptNo}`;
    submitButtonText = 'Update Receipt & Print';
  }

  const showPaymentSections = isConvertingToReceipt || isEditingReceipt;
  
  return (
    <>
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-tide-dark">{formTitle}</h2>
        </div>
        {isGenerated && !isEditing && (<div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-md" role="alert"><p className="font-bold">Success!</p><p>Invoice generated and added to 'Pending Reservations'. The print dialog should have opened.</p></div>)}
        <form onSubmit={handleSaveAndPrint} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CalculatedField label={invoiceData.documentType === 'reservation' ? 'Invoice No.' : 'Receipt No.'} value={invoiceData.receiptNo} />
            <DatePicker label="Date" name="date" value={invoiceData.date} onChange={(date) => handleDateChange('date', date)} required />
            <FormSelect label="Currency" name="currency" value={invoiceData.currency} onChange={handleInputChange} options={['NGN', 'USD']} />
          </div>
          <div className="border-t pt-6"><h3 className="text-lg font-semibold text-gray-800 mb-4">Guest Information</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><FormInput label="Guest Name (or Company)" name="guestName" value={invoiceData.guestName} onChange={handleInputChange} required /><FormInput label="Guest Email" name="guestEmail" type="email" value={invoiceData.guestEmail} onChange={handleInputChange} required error={emailError} /><FormInput label="Phone/Contact" name="phoneContact" type="tel" value={invoiceData.phoneContact} onChange={handleInputChange} required /><FormInput label="Room Number(s) (e.g. 101, 102)" name="roomNumber" value={invoiceData.roomNumber} onChange={handleInputChange} required /></div></div>
          
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Bookings</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"><tr><th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room Type</th><th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th><th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-In</th><th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-Out</th><th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nights</th><th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate/Night</th><th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th><th className="px-2 py-3"></th></tr></thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {invoiceData.bookings.map((booking, index) => (
                            <tr key={booking.id}>
                                <td className="px-2 py-2 whitespace-nowrap" style={{minWidth: '200px'}}><select name={`roomType-${index}`} value={booking.roomType} onChange={(e) => handleBookingChange(index, 'roomType', e.target.value)} className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm rounded-md font-semibold text-gray-800 bg-white`}>{Object.values(RoomType).map(option => <option key={option} value={option}>{option}</option>)}</select></td>
                                <td className="px-2 py-2 whitespace-nowrap" style={{minWidth: '80px'}}><input type="number" name={`quantity-${index}`} value={booking.quantity} onChange={(e) => handleBookingChange(index, 'quantity', e.target.value)} className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-tide-gold sm:text-sm border-gray-300 text-gray-900 font-medium text-center`} /></td>
                                <td className="px-2 py-2 whitespace-nowrap" style={{minWidth: '150px'}}><DatePicker name={`checkIn-${index}`} value={booking.checkIn} onChange={(date) => handleBookingChange(index, 'checkIn', date)} /></td>
                                <td className="px-2 py-2 whitespace-nowrap" style={{minWidth: '150px'}}><DatePicker name={`checkOut-${index}`} value={booking.checkOut} onChange={(date) => handleBookingChange(index, 'checkOut', date)} /></td>
                                <td className="px-2 py-2 whitespace-nowrap"><p className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-md sm:text-sm text-center font-bold text-gray-900">{booking.nights}</p></td>
                                <td className="px-2 py-2 whitespace-nowrap" style={{minWidth: '150px'}}><input type="number" name={`ratePerNight-${index}`} value={booking.ratePerNight} onChange={(e) => handleBookingChange(index, 'ratePerNight', e.target.value)} className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-tide-gold sm:text-sm border-gray-300 text-gray-900 font-medium text-right`} /></td>
                                <td className="px-2 py-2 whitespace-nowrap" style={{minWidth: '150px'}}><p className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-md sm:text-sm text-right font-bold text-gray-900">{currencyFormatter.format(booking.subtotal)}</p></td>
                                <td className="px-2 py-2 whitespace-nowrap text-center"><button type="button" onClick={() => handleRemoveBooking(booking.id)} disabled={invoiceData.bookings.length <= 1} className="text-red-600 hover:text-red-800 disabled:text-gray-300 disabled:cursor-not-allowed text-sm font-medium p-2 rounded-full hover:bg-red-50" aria-label={`Remove booking ${index+1}`}>✕</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button type="button" onClick={handleAddBooking} className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold">+ Add Booking</button>
          </div>

          {showPaymentSections && (
            <>
            <div className="border-t pt-6">
                <h4 className="text-lg font-semibold text-gray-700 mb-4">Payment Verification</h4>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <FormInput
                        label="Payment Reference (from customer)"
                        name="paymentReference"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        required
                        placeholder="e.g., Bank transaction ID, POS receipt no."
                    />
                </div>
            </div>
            <div className="border-t pt-6"><h4 className="text-lg font-semibold text-gray-700 mb-4">Additional Charges (e.g. Restaurant, Bar)</h4><div className="space-y-4">{invoiceData.additionalChargeItems.map((item, index) => (<div key={item.id} className="grid grid-cols-12 gap-x-4 items-end"><div className="col-span-12 sm:col-span-8"><FormInput label={`Description #${index + 1}`} name={`description-${index}`} value={item.description} onChange={(e) => handleChargeItemChange(index, 'description', e.target.value)} required /></div><div className="col-span-6 sm:col-span-2"><FormInput label="Amount" name={`amount-${index}`} type="number" value={item.amount} onChange={(e) => handleChargeItemChange(index, 'amount', e.target.value)} required /></div><div className="col-span-6 sm:col-span-2 flex items-center"><button type="button" onClick={() => handleRemoveChargeItem(item.id)} className="text-red-600 hover:text-red-800 text-sm font-medium p-2 rounded-full hover:bg-red-50 disabled:text-gray-300 disabled:cursor-not-allowed" aria-label={`Remove item ${index+1}`}>Remove</button></div></div>))}</div><button type="button" onClick={handleAddChargeItem} className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold">+ Add Charge</button></div>
            <div className="border-t pt-6">
                <h4 className="text-lg font-semibold text-gray-700 mb-4">Record Payments</h4>
                <div className="p-4 border rounded-lg space-y-4">
                    <DatePicker label="Payment Date" name="paymentDate" value={newPayment.date} onChange={date => setNewPayment(p => ({...p, date}))} />
                    <FormInput label={`Amount (${invoiceData.currency})`} name="paymentAmount" type="number" value={newPayment.amount} onChange={e => setNewPayment(p => ({...p, amount: e.target.value === '' ? '' : parseFloat(e.target.value)}))} />
                    <FormSelect label="Payment Method" name="paymentMethod" value={newPayment.paymentMethod} onChange={e => setNewPayment(p => ({...p, paymentMethod: e.target.value as PaymentMethod}))} options={Object.values(PaymentMethod).filter(p => p !== PaymentMethod.PENDING)} />
                    <FormInput label="Reference (Optional)" name="paymentReference" value={newPayment.reference} onChange={e => setNewPayment(p => ({...p, reference: e.target.value}))} />
                    <button type="button" onClick={handleAddPayment} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-tide-dark text-base font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold sm:text-sm">+ Add Payment</button>
                </div>
                <h5 className="text-md font-semibold text-gray-700 mt-4">Payment History</h5>
                <div className="space-y-2">{invoiceData.payments.length === 0 ? <p className="text-sm text-gray-500">No payments recorded.</p> : invoiceData.payments.map(p => (<div key={p.id} className="flex justify-between items-center bg-gray-100 p-2 rounded-md"><div className="text-sm"><strong>{currencyFormatter.format(p.amount)}</strong> via {p.paymentMethod} on {p.date} <span className="text-xs text-gray-500">(by {p.recordedBy})</span></div><button type="button" onClick={() => handleRemovePayment(p.id)} className="text-red-500 hover:text-red-700 text-xs">remove</button></div>))}</div>
            </div>
            </>
          )}

          <div className="border-t pt-6"><h3 className="text-lg font-semibold text-gray-800 mb-4">Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <FormInput label={`Discount (${invoiceData.currency})`} name="discount" type="number" value={invoiceData.discount} onChange={handleInputChange} />
                    <div className="grid grid-cols-2 gap-4 items-end">
                        <FormInput label={`Special Discount Name`} name="holidaySpecialDiscountName" type="text" value={invoiceData.holidaySpecialDiscountName} onChange={handleInputChange} />
                        <FormInput label={`Amount (${invoiceData.currency})`} name="holidaySpecialDiscount" type="number" value={invoiceData.holidaySpecialDiscount} onChange={handleInputChange} />
                    </div>
                </div>
                <div className="space-y-2 p-4 bg-gray-100 rounded-lg">
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-600">Subtotal:</span><span className="font-semibold">{currencyFormatter.format(invoiceData.subtotal)}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-600">Total Discount:</span><span className="font-semibold text-red-600">-{currencyFormatter.format(invoiceData.discount + invoiceData.holidaySpecialDiscount)}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-600">Tax (7.5% Included):</span><span className="font-semibold">{currencyFormatter.format(invoiceData.taxAmount)}</span></div>
                    <div className="flex justify-between items-center text-lg font-bold border-t pt-2 mt-2"><span className="text-tide-dark">TOTAL AMOUNT DUE:</span><span>{currencyFormatter.format(invoiceData.totalAmountDue)}</span></div>
                    <div className="flex justify-between items-center text-md"><span className="text-gray-600">AMOUNT RECEIVED:</span><span className="font-semibold">{currencyFormatter.format(invoiceData.amountReceived)}</span></div>
                    <div className="flex justify-between items-center text-lg font-bold border-t pt-2 mt-2"><span className="text-tide-dark">BALANCE:</span><span className={invoiceData.balance > 0.01 ? 'text-red-600' : 'text-green-600'}>{currencyFormatter.format(invoiceData.balance)}</span></div>
                </div>
            </div>
          </div>
          
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Confirmation Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormInput label="Purpose of Payment" name="paymentPurpose" value={invoiceData.paymentPurpose} onChange={handleInputChange} required />
                 <FormInput label="Designation" name="designation" value={invoiceData.designation} onChange={handleInputChange} required />
                 <FormInput label="Created By (User)" name="receivedBy" value={invoiceData.receivedBy} onChange={() => {}} required disabled />
                <div>
                     <p className="block text-sm font-medium text-gray-700">Amount in Words (for Total Amount Received)</p>
                     <p className="mt-1 text-xs text-gray-600 font-medium bg-gray-100 p-2 rounded-md h-full">{invoiceData.amountInWords}</p>
                </div>
            </div>
        </div>
          <div className="border-t pt-6 flex flex-wrap gap-4 items-center justify-between"><div className="flex flex-wrap gap-4"><button type="submit" className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-tide-dark hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold">{submitButtonText}</button><button type="button" onClick={handleOpenEmailModal} disabled={emailStatus === 'sending' || !!emailError} className="inline-flex justify-center py-2 px-6 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold disabled:bg-gray-200 disabled:cursor-not-allowed">{emailStatus === 'sending' ? 'Sending...' : 'Email Document'}</button><button type="button" onClick={() => generateInvoiceCSV(invoiceData)} className="inline-flex justify-center py-2 px-6 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold">Download Excel (CSV)</button></div><div className="flex flex-wrap gap-4"><button type="button" onClick={() => setIsWalkInModalOpen(true)} className="inline-flex justify-center py-2 px-6 border border-dashed border-tide-gold text-sm font-medium rounded-md text-tide-gold bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold">Walk-in Guest</button><button type="button" onClick={handleBackOrClear} className="text-sm font-medium text-gray-600 hover:text-red-600">{isEditing ? 'Cancel & Back to Dashboard' : 'Clear & Back to Dashboard'}</button></div></div>
        </form>
      </div>
      <EmailModal 
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSend={handleSendEmail}
        email={recipientEmail}
        setEmail={setRecipientEmail}
        emailStatus={emailStatus}
      />
      <WalkInGuestModal isOpen={isWalkInModalOpen} onClose={() => setIsWalkInModalOpen(false)} onTransactionGenerated={onSaveInvoice} currentUser={currentUser} />
    </>
  );
};
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// END: COMPONENTS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// START: App.tsx
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<RecordedTransaction[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [highlightedTxId, setHighlightedTxId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<InvoiceData | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'form'>('dashboard');

  const isAdmin = useMemo(() => ADMIN_USERS.includes(currentUser || ''), [currentUser]);
  const historyRef = useRef(history);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const { pendingInvoices, completedTransactions } = useMemo(() => {
    const pending: RecordedTransaction[] = [];
    const completed: RecordedTransaction[] = [];
    history.forEach(record => {
      if (record.type === 'Hotel Stay' && record.data.documentType === 'reservation') {
        pending.push(record);
      } else {
        completed.push(record);
      }
    });
    return { pendingInvoices: pending, completedTransactions: completed };
  }, [history]);

  const loadHistory = async () => {
      if (currentUser) {
        const userHistory = await fetchUserTransactionHistory(currentUser, isAdmin);
        setHistory(userHistory);
      } else {
        setHistory([]);
      }
    };

  useEffect(() => {
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser) {
      setCurrentUser(rememberedUser);
    }
    const timer = setTimeout(() => { setIsLoading(false); }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [currentUser, isAdmin]);
  
  // Real-time update listener
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === CLOUD_STORAGE_KEY && event.newValue) {
            try {
              const newHistory: RecordedTransaction[] = JSON.parse(event.newValue);
              const oldHistory = historyRef.current;
              let message = 'Transaction history updated.';

              if (newHistory.length > oldHistory.length) {
                const oldIds = new Set(oldHistory.map(t => t.id));
                const newTransaction = newHistory.find(t => !oldIds.has(t.id));
                if (newTransaction) {
                    const creator = newTransaction.type === 'Hotel Stay' ? (newTransaction.data as InvoiceData).receivedBy : (newTransaction.data as WalkInTransaction).cashier;
                    message = `New transaction created by ${creator}.`;
                    setHighlightedTxId(newTransaction.id);
                    setTimeout(() => setHighlightedTxId(null), 3500); // Highlight for 3.5 seconds
                }
              } else if (newHistory.length < oldHistory.length) {
                message = 'A transaction was deleted by another user.';
              } else {
                message = 'A transaction was updated by another user.';
              }
              
              setNotification(message);
              setTimeout(() => setNotification(null), 4000); // Show notification for 4 seconds

            } catch (e) {
              console.error("Could not parse storage update.", e);
            }
            loadHistory();
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentUser, isAdmin]);

  const handleSaveInvoice = async (record: RecordedTransaction, oldRecordId?: string) => {
    await saveTransaction(record, oldRecordId);
    await loadHistory();
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    await deleteTransaction(transactionId);
    if(transactionToEdit?.id === transactionId || transactionToEdit?.receiptNo === transactionId) {
        setTransactionToEdit(null); // Clear form if deleted item was being edited
    }
    await loadHistory();
  };
  
  const handleEditTransaction = (transactionId: string) => {
    const transaction = history.find(t => t.id === transactionId);
    if (transaction && transaction.type === 'Hotel Stay') {
        setTransactionToEdit(transaction.data as InvoiceData);
        setViewMode('form');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        console.warn(`Could not find transaction with ID: ${transactionId} to edit.`);
        alert('Could not find the specified transaction.');
    }
  };

  const handleCreateNewInvoice = () => {
    setTransactionToEdit(null);
    setViewMode('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormCompletion = () => {
    setTransactionToEdit(null);
    setViewMode('dashboard');
  };

  const handleLogin = (name: string, rememberMe: boolean) => {
    setCurrentUser(name);
    if (rememberMe) {
      localStorage.setItem('rememberedUser', name);
    } else {
      localStorage.removeItem('rememberedUser');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('rememberedUser');
  };

  if (isLoading) { return <WelcomeScreen />; }
  if (!currentUser) { return <LoginScreen onLogin={handleLogin} />; }

  return (
    <>
      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-20px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .animate-fadeInOut {
          animation: fadeInOut 4s ease-in-out forwards;
        }
      `}</style>
      <div className="min-h-screen bg-gray-50 text-tide-dark font-sans">
        {notification && (
          <div className="fixed top-5 right-5 bg-tide-dark text-white py-2 px-4 rounded-lg shadow-lg z-50 animate-fadeInOut" role="status">
            {notification}
          </div>
        )}
        <Header currentUser={currentUser} onLogout={handleLogout} isAdmin={isAdmin} />
        <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
          {viewMode === 'dashboard' ? (
            <>
              <div className="text-center">
                <button
                  onClick={handleCreateNewInvoice}
                  className="inline-flex justify-center py-3 px-8 border border-transparent shadow-lg text-lg font-medium rounded-md text-white bg-tide-dark hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold transition-transform hover:scale-105"
                >
                  + Create New Reservation Invoice
                </button>
              </div>
              {isAdmin && <AdminDashboard history={history} />}
              <PendingInvoices
                invoices={pendingInvoices}
                isAdmin={isAdmin}
                onDeleteTransaction={handleDeleteTransaction}
                onCompletePayment={handleEditTransaction}
              />
              <TransactionHistory 
                history={completedTransactions} 
                isAdmin={isAdmin}
                onDeleteTransaction={handleDeleteTransaction}
                onEditTransaction={handleEditTransaction}
                highlightedTxId={highlightedTxId}
              />
            </>
          ) : (
            <InvoiceForm
              onSaveInvoice={handleSaveInvoice}
              currentUser={currentUser}
              transactionToEdit={transactionToEdit}
              onEditComplete={handleFormCompletion}
            />
          )}
        </main>
        <footer className="text-center py-4 text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Tidè Hotels and Resorts. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
};
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// END: App.tsx
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// RENDER LOGIC
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
