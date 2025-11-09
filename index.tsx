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

export interface AdditionalChargeItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
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

export interface InvoiceData {
  receiptNo: string;
  date: string;
  guestName: string;
  guestEmail: string;
  phoneContact: string;
  roomNumber: string; // "Multiple" or specific numbers can be entered here
  
  documentType: 'reservation' | 'receipt';
  paymentRefNo?: string;

  bookings: BookingItem[]; // Replaces single booking fields

  roomCharge: number;
  additionalChargeItems: AdditionalChargeItem[];
  additionalCharges: number;
  discount: number;
  festiveDiscountName?: string;
  festiveDiscountAmount?: number;
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
    words += ' and ' + convertChunkToWords(remainder);
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
    const minorWords = numberToWords(minorUnit);
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

  const currencyFormatter = new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: data.currency, 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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


  // Invoice Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(isReservation ? 'INVOICE FOR RESERVATION' : 'OFFICIAL RECEIPT', 105, 45, { align: 'center' });

  // Receipt Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(isReservation ? 'Invoice No:' : 'Receipt No:', 14, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(data.receiptNo, 40, 60);

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 150, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(data.date, 165, 60);

  // Guest Info
  doc.setLineWidth(0.5);
  doc.line(14, 65, 196, 65);

  doc.setFont('helvetica', 'bold');
  doc.text('Received From (Guest):', 14, 73);
  doc.setFont('helvetica', 'normal');
  doc.text(data.guestName, 60, 73);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Email:', 14, 80);
  doc.setFont('helvetica', 'normal');
  doc.text(data.guestEmail, 60, 80);

  doc.setFont('helvetica', 'bold');
  doc.text('Phone/Contact:', 14, 87);
  doc.setFont('helvetica', 'normal');
  doc.text(data.phoneContact, 60, 87);

  doc.setFont('helvetica', 'bold');
  doc.text('Room Number(s):', 14, 94);
  doc.setFont('helvetica', 'normal');
  doc.text(data.roomNumber, 60, 94);
  
  doc.line(14, 100, 196, 100);

  // Booking Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bookings', 14, 107);

  const bookingTableColumn = ["S/N", "Room Type", "Qty", "Duration", "Check-In", "Check-Out", "Nights", `Rate/Night`, `Subtotal`];
  const bookingTableRows = data.bookings.map((booking, index) => [
      index + 1,
      booking.roomType,
      booking.quantity,
      `${booking.nights} night${booking.nights > 1 ? 's' : ''}`,
      formatDateForDisplay(booking.checkIn),
      formatDateForDisplay(booking.checkOut),
      booking.nights,
      currencyFormatter.format(booking.ratePerNight),
      currencyFormatter.format(booking.subtotal)
  ]);
  
  doc.autoTable({
    startY: 111,
    head: [bookingTableColumn],
    body: bookingTableRows,
    theme: 'grid',
    headStyles: { fillColor: '#2c3e50', fontSize: 8 },
    styles: { font: 'helvetica', fontSize: 8 },
    columnStyles: {
        2: { halign: 'center' },
        6: { halign: 'center' },
        7: { halign: 'right' },
        8: { halign: 'right' }
    }
  });

  let finalY = doc.autoTable.previous.finalY;

  // Additional Charges Table
  if (data.additionalChargeItems.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Additional Charges', 14, finalY + 10);
      const chargesColumn = ["Date", "Description", "Payment Method", `Amount (${data.currency})`];
      const chargesRows = data.additionalChargeItems.map(item => [item.date, item.description, item.paymentMethod, currencyFormatter.format(item.amount)]);
      doc.autoTable({
        startY: finalY + 14,
        head: [chargesColumn],
        body: chargesRows,
        theme: 'grid',
        headStyles: { fillColor: '#2c3e50' },
        styles: { font: 'helvetica', fontSize: 10 },
        columnStyles: { 3: { halign: 'right' } }
      });
      finalY = doc.autoTable.previous.finalY;
  }


  // Totals
  let currentY = finalY;

  // Tax Note
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Note: All rates are inclusive of 7.5% tax. No additional tax is required.', 14, currentY + 5);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(44, 62, 80);
  currentY += 12;

  doc.text('Subtotal:', 155, currentY, { align: 'right' });
  doc.text(currencyFormatter.format(data.subtotal), 196, currentY, { align: 'right' });
  currentY += 6;
  
  doc.text('Discount:', 155, currentY, { align: 'right' });
  doc.text(`-${currencyFormatter.format(data.discount)}`, 196, currentY, { align: 'right' });
  currentY += 6;

  if (data.festiveDiscountAmount && data.festiveDiscountAmount > 0) {
      doc.text(`${data.festiveDiscountName || 'Festive Season Discount'}:`, 155, currentY, { align: 'right' });
      doc.text(`-${currencyFormatter.format(data.festiveDiscountAmount)}`, 196, currentY, { align: 'right' });
      currentY += 6;
  }

  doc.text(`Tax (7.5% included):`, 155, currentY, { align: 'right' });
  doc.text(currencyFormatter.format(data.taxAmount), 196, currentY, { align: 'right' });
  currentY += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL AMOUNT DUE:', 155, currentY, { align: 'right' });
  doc.text(currencyFormatter.format(data.totalAmountDue), 196, currentY, { align: 'right' });
  currentY += 6;
  
  doc.text('AMOUNT RECEIVED:', 155, currentY, { align: 'right' });
  doc.text(currencyFormatter.format(data.amountReceived), 196, currentY, { align: 'right' });
  currentY += 8;

  doc.setFontSize(12);
  doc.text('BALANCE:', 155, currentY, { align: 'right' });
  doc.text(currencyFormatter.format(data.balance), 196, currentY, { align: 'right' });
  currentY += 10;
  
  if (!isReservation) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Verification:', 14, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Reference: ${data.paymentRefNo || 'N/A'}`, 14, currentY + 5);
    doc.text(`Verified By: ${data.receivedBy} (${data.designation})`, 14, currentY + 10);
    doc.text(`Date Verified: ${data.date}`, 14, currentY + 15);
    currentY += 22;
  }

  // Amount in words
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Amount in Words (for Amount Received):', 14, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.amountInWords, 14, currentY + 5, { maxWidth: 180 });
  currentY += 10;
  
  // Conditional Payment Status & Bank Details
  let statusOffsetY = 0;
  if (isReservation || data.balance > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(217, 119, 6); // A shade of yellow/orange for pending
      doc.text('⚠️ Payment Pending – Kindly complete your payment using the bank details below.', 14, currentY + statusOffsetY, { maxWidth: 180 });
      statusOffsetY += 12;

      if (isReservation) {
        doc.setTextColor(44, 62, 80); // Reset to default dark color
        doc.setFontSize(9);
        
        const bankStartY = currentY + statusOffsetY;
        doc.setFont('helvetica', 'bold');
        doc.text('ZENITH BANK', 14, bankStartY);
        doc.setFont('helvetica', 'normal');
        doc.text('Account Number: 1229000080', 14, bankStartY + 5);
        doc.text('Account Name: TIDE’ HOTELS AND RESORTS', 14, bankStartY + 10);
        
        doc.setFont('helvetica', 'bold');
        doc.text('PROVIDUS BANK', 80, bankStartY);
        doc.setFont('helvetica', 'normal');
        doc.text('Account Number: 1306538190', 80, bankStartY + 5);
        doc.text('Account Name: TIDE’ HOTELS AND RESORTS', 80, bankStartY + 10);
        
        statusOffsetY += 15;
        const secondBankRowY = currentY + statusOffsetY;
        doc.setFont('helvetica', 'bold');
        doc.text('SUNTRUST BANK', 14, secondBankRowY);
        doc.setFont('helvetica', 'normal');
        doc.text('Account Number: 0025840833', 14, secondBankRowY + 5);
        doc.text('Account Name: TIDE’ HOTELS AND RESORTS', 14, secondBankRowY + 10);
        statusOffsetY += 15;

        doc.setFontSize(8);
        doc.text('Please make your payment using any of the accounts above and include your invoice reference number for confirmation.', 14, currentY + statusOffsetY, { maxWidth: 180 });
        statusOffsetY += 5;
      }
  } else {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 163, 74); // A shade of green for success
      doc.text('✅ Payment Received – Thank you for your business.', 14, currentY + statusOffsetY);
      statusOffsetY += 5;
  }
  // Reset styles
  doc.setTextColor(44, 62, 80);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  currentY += statusOffsetY + 5;

  // Footer Details (with offset)
  doc.setFont('helvetica', 'bold');
  doc.text('Purpose of Payment:', 14, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.paymentPurpose || 'Hotel Accommodation', 55, currentY);
  currentY += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('Payment Method:', 14, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.paymentMethod, 55, currentY);
  currentY += 15;

  // Signature area (with offset)
  const signatureY = currentY;
  doc.line(14, signatureY, 80, signatureY);
  doc.setFont('helvetica', 'bold');
  doc.text('Received By:', 14, signatureY + 5);
  doc.text(data.receivedBy, 40, signatureY + 5);
  doc.text('Designation:', 14, signatureY + 12);
  doc.text(data.designation, 40, signatureY + 12);

  let footerY = 280;
  if(isReservation) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor('#888');
    doc.text('This is a reservation invoice. Payment is pending. A final receipt will be issued upon confirmation of payment.', 105, footerY - 5, { align: 'center' });
  }

  doc.setFontSize(8);
  doc.setTextColor('#888');
  doc.text('Page 1 of 1', 105, footerY, { align: 'center' });
  doc.text('NOTE: This is a system-generated receipt and does not require a physical signature.', 105, footerY + 5, { align: 'center' });
  doc.text('Thank you for choosing Tidè Hotels and Resorts!', 105, footerY + 10, { align: 'center' });

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
  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: data.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const bookingRows = data.bookings.map((booking, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${booking.roomType}</td>
      <td>${booking.quantity}</td>
      <td>${booking.nights} night${booking.nights > 1 ? 's' : ''}</td>
      <td>${formatDateForDisplay(booking.checkIn)}</td>
      <td>${formatDateForDisplay(booking.checkOut)}</td>
      <td>${booking.nights}</td>
      <td class="text-right">${currencyFormatter.format(booking.ratePerNight)}</td>
      <td class="text-right">${currencyFormatter.format(booking.subtotal)}</td>
    </tr>
  `).join('');

  const additionalChargesTable = data.additionalChargeItems.length > 0 ? `
    <h3 class="table-title" style="margin-top: 20px;">Additional Charges</h3>
    <table class="charges-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Payment Method</th>
          <th class="text-right">Amount (${data.currency})</th>
        </tr>
      </thead>
      <tbody>
        ${data.additionalChargeItems.map(item => `
          <tr>
            <td>${item.date}</td>
            <td>${item.description || 'Additional Charge'}</td>
            <td>${item.paymentMethod}</td>
            <td class="text-right">${currencyFormatter.format(item.amount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';

  const paymentVerificationSection = !isReservation ? `
    <div class="payment-verification">
        <h4 class="section-title">Payment Verification</h4>
        <p><strong>Payment Reference:</strong> ${data.paymentRefNo || 'N/A'}</p>
        <p><strong>Verified By:</strong> ${data.receivedBy} (${data.designation})</p>
        <p><strong>Date Verified:</strong> ${data.date}</p>
    </div>
  ` : '';

  const bankDetailsSection = (isReservation || data.balance > 0) ? `
    <div class="payment-details">
      <p class="status pending">⚠️ Payment Status: Pending</p>
      ${isReservation ? `
        <p>Kindly complete your payment using the bank details below.</p>
        <div class="bank-accounts">
          <div class="bank-account-item">
            <strong>ZENITH BANK</strong><br>
            Account Number: 1229000080<br>
            Account Name: TIDE’ HOTELS AND RESORTS
          </div>
          <div class="bank-account-item">
            <strong>PROVIDUS BANK</strong><br>
            Account Number: 1306538190<br>
            Account Name: TIDE’ HOTELS AND RESORTS
          </div>
          <div class="bank-account-item">
            <strong>SUNTRUST BANK</strong><br>
            Account Number: 0025840833<br>
            Account Name: TIDE’ HOTELS AND RESORTS
          </div>
        </div>
        <p class="payment-note">Please make your payment using any of the accounts above and include your invoice reference number for confirmation.</p>
      ` : ''}
    </div>
  ` : `
    <div class="payment-details">
      <p class="status success">✅ Payment Received – Thank you for your business.</p>
    </div>
  `;

  const footerNote = isReservation ? `
    <p class="footer-note">This is a reservation invoice. Payment is pending. A final receipt will be issued upon confirmation of payment.</p>
  ` : '';

  const printContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${isReservation ? 'Invoice' : 'Receipt'} ${data.receiptNo}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
        body { font-family: 'Roboto', sans-serif; font-size: 10pt; color: #2c3e50; line-height: 1.6; }
        .receipt-container { width: 900px; margin: auto; padding: 40px; background: #fff; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #c4a66a; padding-bottom: 10px; }
        .header h1 { margin: 0; font-size: 24pt; color: #c4a66a; font-weight: 700; }
        .header p { margin: 5px 0 0 0; font-size: 9pt; }
        .receipt-title { text-align: center; font-size: 16pt; font-weight: 700; margin: 20px 0; }
        .info-section { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .guest-info { border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 15px 0; margin-bottom: 20px; }
        .guest-info table { width: 100%; }
        .guest-info td { padding: 4px 0; }
        .guest-info td:first-child { font-weight: 700; width: 130px; }
        .charges-table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 5px; }
        .charges-table th, .charges-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        .charges-table th { background-color: #2c3e50; color: #fff; font-weight: 700; }
        .text-right { text-align: right; }
        .table-title, .section-title { font-size: 12pt; font-weight: 700; margin: 20px 0 10px 0; color: #2c3e50; }
        .summary-section { display: flex; justify-content: flex-end; margin-top: 15px; }
        .summary-table { width: 350px; }
        .summary-table td { padding: 5px 10px; }
        .summary-table td:first-child { font-weight: 700; }
        .summary-table .total-row td { font-size: 12pt; font-weight: 700; border-top: 2px solid #2c3e50; padding-top: 10px; }
        .amount-in-words { margin-top: 20px; font-weight: 700; }
        .payment-verification { margin-top: 20px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 5px; background-color: #f8f9fa; }
        .payment-details { margin-top: 20px; padding: 15px; border-radius: 5px; background-color: #f8f9fa; }
        .payment-details .status { font-weight: 700; font-size: 11pt; margin-bottom: 10px; }
        .payment-details .status.pending { color: #d97706; }
        .payment-details .status.success { color: #16a34a; }
        .bank-accounts { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 10px; font-size: 9pt; }
        .payment-note { font-size: 8pt; color: #555; font-style: italic; margin-top: 10px; }
        .footer-section { margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
        .signature-area { margin-top: 30px; }
        .signature-line { border-bottom: 1px solid #000; height: 40px; width: 200px; }
        .signature-label { font-size: 9pt; }
        .thank-you { text-align: center; margin-top: 40px; font-style: italic; color: #555; }
        .footer-note { font-size: 9pt; text-align: center; margin-top: 20px; font-style: italic; color: #555; }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header">
          <h1>TIDÈ HOTELS AND RESORTS</h1>
          <p>Where Boldness Meets Elegance.</p>
          <p>38 S.O Williams Street Off Anthony Enahoro Street Utako Abuja</p>
        </div>
        <h2 class="receipt-title">${isReservation ? 'INVOICE FOR RESERVATION' : 'OFFICIAL RECEIPT'}</h2>
        <div class="info-section">
          <div><strong>${isReservation ? 'Invoice No:' : 'Receipt No:'}</strong> ${data.receiptNo}</div>
          <div><strong>Date:</strong> ${data.date}</div>
        </div>
        <div class="guest-info">
          <table>
            <tr><td>Received From (Guest):</td><td>${data.guestName}</td></tr>
            <tr><td>Email:</td><td>${data.guestEmail}</td></tr>
            <tr><td>Phone/Contact:</td><td>${data.phoneContact}</td></tr>
            <tr><td>Room Number(s):</td><td>${data.roomNumber}</td></tr>
          </table>
        </div>

        <h3 class="table-title">Bookings</h3>
        <table class="charges-table">
          <thead>
            <tr>
              <th>S/N</th>
              <th>Room Type</th>
              <th>Qty</th>
              <th>Duration</th>
              <th>Check-In</th>
              <th>Check-Out</th>
              <th>Nights</th>
              <th class="text-right">Rate/Night</th>
              <th class="text-right">Subtotal (${data.currency})</th>
            </tr>
          </thead>
          <tbody>
            ${bookingRows}
          </tbody>
        </table>

        ${additionalChargesTable}

        <p style="font-size: 8pt; font-style: italic; color: #555; text-align: left;">Note: All rates are inclusive of 7.5% tax. No additional tax is required.</p>

        <div class="summary-section">
          <table class="summary-table">
            <tr><td>Subtotal:</td><td class="text-right">${currencyFormatter.format(data.subtotal)}</td></tr>
            <tr><td>Discount:</td><td class="text-right">-${currencyFormatter.format(data.discount)}</td></tr>
            ${data.festiveDiscountAmount && data.festiveDiscountAmount > 0 ? `
              <tr>
                <td>${data.festiveDiscountName || 'Festive Season Discount'}:</td>
                <td class="text-right">-${currencyFormatter.format(data.festiveDiscountAmount)}</td>
              </tr>
            ` : ''}
            <tr><td>Tax (7.5% included):</td><td class="text-right">${currencyFormatter.format(data.taxAmount)}</td></tr>
            <tr class="total-row"><td>TOTAL AMOUNT DUE:</td><td class="text-right">${currencyFormatter.format(data.totalAmountDue)}</td></tr>
            <tr><td>AMOUNT RECEIVED:</td><td class="text-right">${currencyFormatter.format(data.amountReceived)}</td></tr>
            <tr class="total-row"><td>BALANCE:</td><td class="text-right">${currencyFormatter.format(data.balance)}</td></tr>
          </table>
        </div>
        
        <p class="amount-in-words">Amount in Words (for Amount Received): ${data.amountInWords}</p>
        
        ${paymentVerificationSection}
        ${bankDetailsSection}

        <div class="footer-section">
            <div>
                <p><strong>Purpose of Payment:</strong> ${data.paymentPurpose || 'Hotel Accommodation'}</p>
                <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
            </div>
            <div class="signature-area">
                <div class="signature-line"></div>
                <p class="signature-label">Received By: ${data.receivedBy} (${data.designation})</p>
            </div>
        </div>
        
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
        'ID', 'Document Type', 'Date', 'Guest Name', 'Guest Email', 'Phone/Contact', 'Room Number(s)',
        'Booking Details', 'Additional Charges Details',
        `Room Charge (${data.currency})`, `Additional Charges (${data.currency})`, `Discount (${data.currency})`,
        'Festive Discount Name', `Festive Discount Amount (${data.currency})`,
        `Subtotal (${data.currency})`, 'Tax (%)', `Tax Amount (${data.currency})`, `Total Amount Due (${data.currency})`,
        `Amount Received (${data.currency})`, `Balance (${data.currency})`,
        'Amount in Words', 'Purpose of Payment', 'Payment Method', 'Customer Payment Reference', 'Received By', 'Designation',
        'Currency'
    ];
    
    const bookingDetails = data.bookings.map(b => 
        `{Room Type: ${b.roomType}; Qty: ${b.quantity}; Nights: ${b.nights}; Rate: ${b.ratePerNight}; CheckIn: ${b.checkIn}; CheckOut: ${b.checkOut}}`
    ).join(' | ');

    const additionalChargesDetails = data.additionalChargeItems
      .map(item => `${item.description || 'N/A'} (${item.paymentMethod}) on ${item.date}: ${item.amount}`)
      .join('; ');

    const rowData = [
        data.receiptNo, data.documentType, data.date, data.guestName, data.guestEmail, data.phoneContact, data.roomNumber,
        bookingDetails, additionalChargesDetails,
        data.roomCharge, data.additionalCharges, data.discount,
        data.festiveDiscountName || '', data.festiveDiscountAmount || 0,
        data.subtotal, data.taxPercentage, data.taxAmount, data.totalAmountDue,
        data.amountReceived, data.balance, data.amountInWords, data.paymentPurpose,
        data.paymentMethod, data.paymentRefNo || '', data.receivedBy, data.designation, data.currency,
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
        'ID', 'Type', 'Issue Date', 'Guest Name', 'Amount Due', 'Currency',
        'Guest Email', 'Phone', 'Room No', 'Arrival Date', 'Departure Date',
        'Total Room Nights', 'Room Types', 'Walk-In Services',
        'Subtotal', 'Discount', 'Festive Discount Name', 'Festive Discount Amount', 'Tax', 'Amount Paid', 'Balance',
        'Payment Method', 'Cashier/Received By', 'Designation'
    ];

    const rows = history.map(record => {
        if (record.type === 'Hotel Stay') {
            const data = record.data as InvoiceData;
            const earliestCheckIn = data.bookings.length ? data.bookings.reduce((min, b) => b.checkIn < min ? b.checkIn : min, data.bookings[0].checkIn) : '';
            const latestCheckOut = data.bookings.length ? data.bookings.reduce((max, b) => b.checkOut > max ? b.checkOut : max, data.bookings[0].checkOut) : '';
            const totalRoomNights = data.bookings.reduce((sum, b) => sum + (b.nights * b.quantity), 0);
            const roomTypes = [...new Set(data.bookings.map(b => b.roomType))].join(', ');

            return [
                data.receiptNo, record.type, data.date, data.guestName, data.totalAmountDue, data.currency,
                data.guestEmail, data.phoneContact, data.roomNumber, 
                earliestCheckIn, latestCheckOut,
                totalRoomNights, roomTypes, '',
                data.subtotal, data.discount,
                data.festiveDiscountName || '',
                data.festiveDiscountAmount || 0,
                data.taxAmount, data.amountReceived, data.balance,
                data.paymentMethod, data.receivedBy, data.designation
            ].map(escapeCsvCell);
        } else { // Walk-In
            const data = record.data as WalkInTransaction;
            const services = data.charges.map(c => 
                c.service === WalkInService.OTHER ? c.otherServiceDescription : c.service
            ).join('; ');

            return [
                data.id, record.type, data.transactionDate, 'Walk-In Guest', (data.subtotal - data.discount), data.currency,
                '', '', '', '', '', '', '', services,
                data.subtotal, data.discount, '', 0, 0,
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

const saveTransaction = async (newRecord: RecordedTransaction) => {
  const allTransactions = await _fetchAllTransactionsFromCloud();
  const updatedHistory = [newRecord, ...allTransactions.filter(r => r.id !== newRecord.id)];
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
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, label, name, required = false }) => {
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
        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm text-gray-900 font-medium"
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

        const pendingReservations = history.filter(t =>
            t.type === 'Hotel Stay' &&
            (t.data as InvoiceData).documentType === 'reservation' &&
            (t.data as InvoiceData).balance > 0
        ).length;

        return {
            transactionsTodayCount: transactionsForToday.length,
            revenueTodayNGN,
            revenueTodayUSD,
            pendingReservations,
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
                    <p className="text-sm font-medium text-yellow-800">Pending Reservations</p>
                    <p className="text-3xl font-bold text-yellow-900 mt-2">{stats.pendingReservations}</p>
                </div>
            </div>
        </div>
    );
};


// --- TransactionHistory Component ---
interface TransactionHistoryProps {
  history: RecordedTransaction[];
  isAdmin: boolean;
  onDeleteTransaction: (id: string) => void;
  highlightedTxId?: string | null;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ history, isAdmin, onDeleteTransaction, highlightedTxId }) => {
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

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-7xl mx-auto">
      <div className="mb-6 border-b pb-4">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h2 className="text-2xl font-bold text-tide-dark flex items-center gap-3">
            <span>Transaction History</span>
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
        {history.length === 0 ? <p className="text-center text-gray-500 py-8">No receipts have been issued yet.</p> : filteredHistory.length === 0 ? <p className="text-center text-gray-500 py-8">No transactions found for the selected filters.</p> : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt No.</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Name</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                {isAdmin && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>}
                {isAdmin && <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.map((record) => (
                <tr key={record.id} className={`transition-colors duration-1000 ease-out ${record.id === highlightedTxId ? 'bg-yellow-100' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ record.type === 'Hotel Stay' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800' }`}>{record.type}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.guestName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right font-semibold">{currencyFormatter(record.amount, record.currency)}</td>
                  {isAdmin && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.type === 'Hotel Stay' ? (record.data as InvoiceData).receivedBy : (record.data as WalkInTransaction).cashier}</td>}
                  {isAdmin && <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => handleDelete(record)} className="text-red-600 hover:text-red-900 transition-colors">Delete</button></td>}
                </tr>
              ))}
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
  onInvoiceGenerated: (record: RecordedTransaction) => Promise<void>;
  currentUser: string;
}

const FormInput: React.FC<{ label: string; name: string; type?: string; value: string | number; onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; required?: boolean; error?: string; disabled?: boolean; placeholder?: string; }> = ({ label, name, type = 'text', value, onChange, required = false, error, disabled = false, placeholder = '' }) => (<div><label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label><input type={type} id={name} name={name} value={value} onChange={onChange} required={required} disabled={disabled} placeholder={placeholder} className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-tide-gold sm:text-sm ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-tide-gold'}`} />{error && <p className="mt-1 text-xs text-red-600">{error}</p>}</div>);
const FormSelect: React.FC<{ label: string; name: string; value: string; onChange: (e: ChangeEvent<HTMLSelectElement>) => void; options: string[]; required?: boolean; disabled?: boolean; children?: React.ReactNode; }> = ({ label, name, value, onChange, options, required = false, disabled = false, children }) => (<div><label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label><select id={name} name={name} value={value} onChange={onChange} required={required} disabled={disabled} className={`mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-gray-300 focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm rounded-md ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}>{children}{options.map(option => <option key={option} value={option}>{option}</option>)}</select></div>);
const CalculatedField: React.FC<{ label: string; value: string; }> = ({ label, value }) => (<div><p className="block text-sm font-medium text-gray-700">{label}</p><p className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-md shadow-sm sm:text-sm text-gray-800 font-semibold">{value}</p></div>);

const InvoiceForm: React.FC<InvoiceFormProps> = ({ onInvoiceGenerated, currentUser }) => {
  const roomRates: Record<RoomType, number> = {
    [RoomType.SOJOURN_ROOM]: 150000,
    [RoomType.TRANQUIL_ROOM]: 187500,
    [RoomType.HARMONY_STUDIO]: 210000,
    [RoomType.SERENITY_STUDIO]: 300000,
    [RoomType.NARRATIVE_SUITE]: 375000,
    [RoomType.ODYSSEY_SUITE]: 397500,
    [RoomType.TIDE_SIGNATURE_SUITE]: 450000
  };
  const roomRatesUSD: Record<RoomType, number> = {
    [RoomType.SOJOURN_ROOM]: 100,
    [RoomType.TRANQUIL_ROOM]: 125,
    [RoomType.HARMONY_STUDIO]: 140,
    [RoomType.SERENITY_STUDIO]: 200,
    [RoomType.NARRATIVE_SUITE]: 250,
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
    const festiveDiscountAmount = data.festiveDiscountAmount || 0;
    const discount = data.discount || 0;

    const subtotal = roomCharge + additionalCharges;
    const taxAmount = (subtotal / (1 + data.taxPercentage / 100)) * (data.taxPercentage / 100);
    const totalAmountDue = subtotal - discount - festiveDiscountAmount;
    const balance = totalAmountDue - data.amountReceived;
    
    let amountInWords;
    if (data.amountReceived === amountInWordsCache.current.amount && data.currency === amountInWordsCache.current.currency) {
        amountInWords = amountInWordsCache.current.words;
    } else {
        amountInWords = convertAmountToWords(data.amountReceived, data.currency);
        amountInWordsCache.current = { amount: data.amountReceived, currency: data.currency, words: amountInWords };
    }

    return { ...data, bookings: updatedBookings, roomCharge, additionalCharges, subtotal, taxAmount, totalAmountDue, balance, amountInWords };
  };

  const getTodayLocalString = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const generateNewInvoiceState = (currentUser: string, mode: 'reservation' | 'receipt' = 'reservation'): InvoiceData => {
    const today = getTodayLocalString();
    const defaultRoomType = RoomType.SOJOURN_ROOM;
    const defaultBooking: BookingItem = { id: `booking-${Date.now()}`, roomType: defaultRoomType, quantity: 1, checkIn: today, checkOut: today, nights: 0, ratePerNight: roomRates[defaultRoomType], subtotal: 0 };
    
    const isReservation = mode === 'reservation';
    const receiptNo = isReservation
        ? `INV-TIDE-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`
        : `TH${Date.now().toString().slice(-6)}`;

    const initialState: InvoiceData = { 
        receiptNo, 
        date: today, 
        guestName: '', 
        guestEmail: '', 
        phoneContact: '', 
        roomNumber: '',
        documentType: mode,
        paymentRefNo: '',
        bookings: [defaultBooking], 
        roomCharge: 0, 
        additionalChargeItems: [], 
        additionalCharges: 0, 
        discount: 0, 
        festiveDiscountName: '', 
        festiveDiscountAmount: 0, 
        subtotal: 0, 
        taxPercentage: 7.5, 
        taxAmount: 0, 
        totalAmountDue: 0, 
        amountReceived: isReservation ? 0 : 0, 
        balance: 0, 
        amountInWords: '', 
        paymentPurpose: 'Hotel Accommodation', 
        paymentMethod: isReservation ? PaymentMethod.PENDING : PaymentMethod.POS, 
        receivedBy: currentUser, 
        designation: '', 
        currency: 'NGN' 
    };
    return calculateInvoiceTotals(initialState);
  };
  
  const [formMode, setFormMode] = useState<'reservation' | 'receipt'>('reservation');
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(() => {
    try {
      const savedData = localStorage.getItem('savedInvoiceData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        parsedData.receivedBy = currentUser;
        parsedData.taxPercentage = 7.5;
        if (!Array.isArray(parsedData.bookings)) {
            parsedData.bookings = [];
        }
        // Infer mode from saved data
        const isReservation = parsedData.receiptNo.startsWith('INV-');
        setFormMode(isReservation ? 'reservation' : 'receipt');
        parsedData.documentType = isReservation ? 'reservation' : 'receipt';
        
        return calculateInvoiceTotals(parsedData);
      }
    } catch (error) { console.error("Failed to load or parse saved invoice data:", error); localStorage.removeItem('savedInvoiceData'); }
    return generateNewInvoiceState(currentUser, 'reservation');
  });

  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [emailError, setEmailError] = useState<string>('');
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const saveTimerRef = useRef<number | null>(null);
  const statusTimerRef = useRef<number | null>(null);

  const handleModeChange = (newMode: 'reservation' | 'receipt') => {
    if (formMode === newMode) return;
    setFormMode(newMode);
    setInvoiceData(prev => {
        const isReservation = newMode === 'reservation';
        const newReceiptNo = isReservation 
            ? `INV-TIDE-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`
            : `TH${Date.now().toString().slice(-6)}`;
        
        return calculateInvoiceTotals({
            ...prev,
            documentType: newMode,
            receiptNo: newReceiptNo,
            paymentMethod: isReservation ? PaymentMethod.PENDING : PaymentMethod.POS,
            amountReceived: isReservation ? 0 : prev.amountReceived,
            paymentRefNo: isReservation ? '' : prev.paymentRefNo,
        });
    });
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'guestEmail') { /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || !value ? setEmailError('') : setEmailError('Please enter a valid email address.'); }
    setInvoiceData(prev => {
        let nextData = { ...prev };
        const numericFields = ['discount', 'taxPercentage', 'amountReceived', 'festiveDiscountAmount'];
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


  const handleDateChange = (name: string, date: string) => { setInvoiceData(prev => calculateInvoiceTotals({ ...prev, [name]: date })); };
  const handleAddChargeItem = () => { setInvoiceData(prev => calculateInvoiceTotals({ ...prev, additionalChargeItems: [...prev.additionalChargeItems, { id: `item-${Date.now()}`, description: '', amount: 0, date: getTodayLocalString(), paymentMethod: prev.paymentMethod }] })); };
  const handleChargeItemChange = (index: number, field: 'description' | 'amount' | 'paymentMethod', value: string | number) => { setInvoiceData(prev => { const newItems = [...prev.additionalChargeItems]; newItems[index] = { ...newItems[index], [field]: field === 'amount' ? parseFloat(value as string) || 0 : value }; return calculateInvoiceTotals({ ...prev, additionalChargeItems: newItems }); }); };
  const handleChargeItemDateChange = (index: number, date: string) => { setInvoiceData(prev => { const newItems = [...prev.additionalChargeItems]; newItems[index] = { ...newItems[index], date }; return calculateInvoiceTotals({ ...prev, additionalChargeItems: newItems }); }); };
  const handleRemoveChargeItem = (id: string) => { setInvoiceData(prev => calculateInvoiceTotals({ ...prev, additionalChargeItems: prev.additionalChargeItems.filter(item => item.id !== id) })); };

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
  
    saveTimerRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem('savedInvoiceData', JSON.stringify(invoiceData));
        setSaveStatus('saved');
        statusTimerRef.current = window.setTimeout(() => { setSaveStatus('idle'); }, 1500);
      } catch (error) {
        console.error("Failed to save invoice data:", error);
        setSaveStatus('idle');
      }
    }, 750);
  
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, [invoiceData]);

  const validateForm = () => {
    const requiredFields: { key: keyof InvoiceData; label: string }[] = [ { key: 'guestName', label: 'Guest Name' }, { key: 'guestEmail', label: 'Guest Email' }, { key: 'phoneContact', label: 'Phone/Contact' }, { key: 'roomNumber', label: 'Room Number(s)' }, { key: 'receivedBy', label: 'Received By' }, { key: 'designation', label: 'Designation' }, { key: 'paymentPurpose', label: 'Purpose of Payment' } ];
    
    if (invoiceData.documentType === 'receipt' && (!invoiceData.paymentRefNo || invoiceData.paymentRefNo.trim() === '')) {
      alert('The "Customer Payment Reference" is required for official receipts.');
      return false;
    }
    
    for (const field of requiredFields) { if (!invoiceData[field.key]) { alert(`The field "${field.label}" is required.`); return false; } }
    if (invoiceData.bookings.length === 0) { alert("At least one booking is required."); return false; }
    for (const booking of invoiceData.bookings) { if (booking.nights <= 0) { alert(`A booking for "${booking.roomType}" has an invalid date range or zero nights.`); return false; } }
    if (emailError) { alert("Please fix the email address format."); return false; }
    return true;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;
    const record: RecordedTransaction = { id: invoiceData.receiptNo, type: 'Hotel Stay', date: invoiceData.date, guestName: invoiceData.guestName, amount: invoiceData.totalAmountDue, currency: invoiceData.currency, data: { ...invoiceData } };
    onInvoiceGenerated(record);
    printInvoice(invoiceData);
    setIsGenerated(true);
    setTimeout(() => setIsGenerated(false), 5000);
  };

  const handleOpenEmailModal = () => {
    if (!validateForm()) return;
    setRecipientEmail(invoiceData.guestEmail);
    setEmailStatus('idle'); 
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
        alert("Please enter a valid recipient email address.");
        return;
    }

    setEmailStatus('sending');
    const record: RecordedTransaction = { id: invoiceData.receiptNo, type: 'Hotel Stay', date: invoiceData.date, guestName: invoiceData.guestName, amount: invoiceData.totalAmountDue, currency: invoiceData.currency, data: { ...invoiceData } };
    await onInvoiceGenerated(record);
    
    const result = await emailInvoicePDF(invoiceData, recipientEmail);
    
    if (result.success) {
        setEmailStatus('sent');
        alert(result.message);
        setIsEmailModalOpen(false);
    } else {
        setEmailStatus('error');
        alert(`Error: ${result.message}`);
    }
    setTimeout(() => setEmailStatus('idle'), 4000);
  };
  
  const handleNewInvoice = () => {
    if (window.confirm("Are you sure you want to start a new document? All current data will be cleared.")) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      localStorage.removeItem('savedInvoiceData');
      setFormMode('reservation');
      setInvoiceData(generateNewInvoiceState(currentUser, 'reservation'));
      setIsGenerated(false); setSaveStatus('idle'); setEmailError('');
    }
  };

  const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: invoiceData.currency, minimumFractionDigits: 2 });
  
  return (
    <>
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-tide-dark">Create New Document</h2>
            <div className="flex items-center p-1 bg-gray-200 rounded-lg">
                <button
                    onClick={() => handleModeChange('reservation')}
                    className={`px-4 py-1 text-sm font-semibold rounded-md transition-colors ${formMode === 'reservation' ? 'bg-white text-tide-dark shadow' : 'text-gray-600 hover:bg-gray-300'}`}
                >
                    Reservation Invoice
                </button>
                <button
                    onClick={() => handleModeChange('receipt')}
                    className={`px-4 py-1 text-sm font-semibold rounded-md transition-colors ${formMode === 'receipt' ? 'bg-white text-tide-dark shadow' : 'text-gray-600 hover:bg-gray-300'}`}
                >
                    Official Receipt
                </button>
            </div>
        </div>
        {isGenerated && (<div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-md" role="alert"><p className="font-bold">Success!</p><p>The print dialog should have opened. You can print or save as PDF from there.</p></div>)}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormInput label={formMode === 'reservation' ? 'Invoice No.' : 'Receipt No.'} name="receiptNo" value={invoiceData.receiptNo} onChange={handleInputChange} required />
            <DatePicker label="Date" name="date" value={invoiceData.date} onChange={(date) => handleDateChange('date', date)} required />
            <FormSelect label="Currency" name="currency" value={invoiceData.currency} onChange={handleInputChange} options={['NGN', 'USD']} />
          </div>
          <div className="border-t pt-6"><h3 className="text-lg font-semibold text-gray-800 mb-4">Guest Information</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><FormInput label="Guest Name (or Company)" name="guestName" value={invoiceData.guestName} onChange={handleInputChange} required /><FormInput label="Guest Email" name="guestEmail" type="email" value={invoiceData.guestEmail} onChange={handleInputChange} required error={emailError} /><FormInput label="Phone/Contact" name="phoneContact" type="tel" value={invoiceData.phoneContact} onChange={handleInputChange} required /><FormInput label="Room Number(s) (e.g. 101, 102)" name="roomNumber" value={invoiceData.roomNumber} onChange={handleInputChange} required /></div></div>
          
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Bookings</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room Type</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-In</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-Out</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nights</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate/Night</th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                            <th className="px-2 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {invoiceData.bookings.map((booking, index) => (
                            <tr key={booking.id}>
                                <td className="px-2 py-2 whitespace-nowrap" style={{minWidth: '200px'}}><select name={`roomType-${index}`} value={booking.roomType} onChange={(e) => handleBookingChange(index, 'roomType', e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-gray-300 focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm rounded-md font-semibold text-gray-800">{Object.values(RoomType).map(option => <option key={option} value={option}>{option}</option>)}</select></td>
                                <td className="px-2 py-2 whitespace-nowrap" style={{minWidth: '80px'}}><input type="number" name={`quantity-${index}`} value={booking.quantity} onChange={(e) => handleBookingChange(index, 'quantity', e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-tide-gold sm:text-sm border-gray-300 text-gray-900 font-medium text-center" /></td>
                                <td className="px-2 py-2 whitespace-nowrap" style={{minWidth: '150px'}}><DatePicker name={`checkIn-${index}`} value={booking.checkIn} onChange={(date) => handleBookingChange(index, 'checkIn', date)} /></td>
                                <td className="px-2 py-2 whitespace-nowrap" style={{minWidth: '150px'}}><DatePicker name={`checkOut-${index}`} value={booking.checkOut} onChange={(date) => handleBookingChange(index, 'checkOut', date)} /></td>
                                <td className="px-2 py-2 whitespace-nowrap"><p className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-md sm:text-sm text-center font-bold text-gray-900">{booking.nights}</p></td>
                                <td className="px-2 py-2 whitespace-nowrap" style={{minWidth: '150px'}}><input type="number" name={`ratePerNight-${index}`} value={booking.ratePerNight} onChange={(e) => handleBookingChange(index, 'ratePerNight', e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-tide-gold sm:text-sm border-gray-300 text-gray-900 font-medium text-right" /></td>
                                <td className="px-2 py-2 whitespace-nowrap" style={{minWidth: '150px'}}><p className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-md sm:text-sm text-right font-bold text-gray-900">{currencyFormatter.format(booking.subtotal)}</p></td>
                                <td className="px-2 py-2 whitespace-nowrap text-center"><button type="button" onClick={() => handleRemoveBooking(booking.id)} disabled={invoiceData.bookings.length <= 1} className="text-red-600 hover:text-red-800 disabled:text-gray-300 disabled:cursor-not-allowed text-sm font-medium p-2 rounded-full hover:bg-red-50" aria-label={`Remove booking ${index+1}`}>✕</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button type="button" onClick={handleAddBooking} className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold">+ Add Booking</button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <CalculatedField label="Total Room Charge" value={currencyFormatter.format(invoiceData.roomCharge)} />
                <FormInput label={`Discount (${invoiceData.currency})`} name="discount" type="number" value={invoiceData.discount} onChange={handleInputChange} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <FormInput label="Festive Season Discount Name" name="festiveDiscountName" type="text" value={invoiceData.festiveDiscountName || ''} onChange={handleInputChange} placeholder="e.g., Holiday Special" />
                <FormInput label={`Festive Discount Amount (${invoiceData.currency})`} name="festiveDiscountAmount" type="number" value={invoiceData.festiveDiscountAmount || ''} onChange={handleInputChange} />
            </div>
            <div className="border-t pt-6 mt-6"><h4 className="text-md font-semibold text-gray-700 mb-4">Additional Charges</h4><div className="space-y-4">{invoiceData.additionalChargeItems.map((item, index) => (<div key={item.id} className="grid grid-cols-12 gap-x-4 items-end"><div className="col-span-12 sm:col-span-4"><FormInput label={`Description #${index + 1}`} name={`description-${index}`} value={item.description} onChange={(e) => handleChargeItemChange(index, 'description', e.target.value)} required /></div><div className="col-span-6 sm:col-span-2"><DatePicker label="Date" name={`chargeDate-${index}`} value={item.date} onChange={(date) => handleChargeItemDateChange(index, date)} required /></div><div className="col-span-6 sm:col-span-2"><FormSelect label="Payment" name={`paymentMethod-${index}`} value={item.paymentMethod} onChange={(e) => handleChargeItemChange(index, 'paymentMethod', e.target.value as PaymentMethod)} options={Object.values(PaymentMethod)} required /></div><div className="col-span-6 sm:col-span-2"><FormInput label="Amount" name={`amount-${index}`} type="number" value={item.amount} onChange={(e) => handleChargeItemChange(index, 'amount', e.target.value)} required/></div><div className="col-span-6 sm:col-span-2 flex items-center"><button type="button" onClick={() => handleRemoveChargeItem(item.id)} className="text-red-600 hover:text-red-800 text-sm font-medium p-2 rounded-full hover:bg-red-50" aria-label={`Remove item ${index+1}`}>Remove</button></div></div>))}</div><button type="button" onClick={handleAddChargeItem} className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold">+ Add Charge</button></div>
          </div>
          
          <div className="border-t pt-6"><h3 className="text-lg font-semibold text-gray-800 mb-4">Summary & Payment</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start"><div className="space-y-4 p-4 bg-gray-50 rounded-lg"><CalculatedField label="Additional Charges" value={currencyFormatter.format(invoiceData.additionalCharges)} /><CalculatedField label="Subtotal" value={currencyFormatter.format(invoiceData.subtotal)} /><CalculatedField label="Tax (7.5% included)" value={currencyFormatter.format(invoiceData.taxAmount)} /><div className="border-t pt-2 mt-2"><CalculatedField label="TOTAL AMOUNT DUE" value={currencyFormatter.format(invoiceData.totalAmountDue)} /></div></div><div className="space-y-4"><FormInput label={`Amount Received (${invoiceData.currency})`} name="amountReceived" type="number" value={invoiceData.amountReceived} onChange={handleInputChange} required disabled={formMode === 'reservation'} /><CalculatedField label="BALANCE" value={currencyFormatter.format(invoiceData.balance)} /><p className="text-xs text-gray-600 font-medium bg-gray-100 p-2 rounded-md">Amount in Words: {invoiceData.amountInWords}</p></div></div></div>
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Confirmation Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput label="Purpose of Payment" name="paymentPurpose" value={invoiceData.paymentPurpose} onChange={handleInputChange} required />
                <FormSelect label="Payment Method" name="paymentMethod" value={invoiceData.paymentMethod} onChange={handleInputChange} options={Object.values(PaymentMethod)} required disabled={formMode === 'reservation'} />
            </div>
            {formMode === 'receipt' && (
              <div className="mt-6">
                  <FormInput
                      label="Customer Payment Reference"
                      name="paymentRefNo"
                      value={invoiceData.paymentRefNo || ''}
                      onChange={handleInputChange}
                      placeholder="Enter reference from bank transfer, etc."
                      required
                  />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <FormInput label="Received By (User)" name="receivedBy" value={invoiceData.receivedBy} onChange={handleInputChange} required disabled />
                <FormInput label="Designation" name="designation" value={invoiceData.designation} onChange={handleInputChange} required />
            </div>
        </div>
          <div className="border-t pt-6 flex flex-wrap gap-4 items-center justify-between"><div className="flex flex-wrap gap-4"><button type="submit" className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-tide-dark hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold">Generate & Print</button><button type="button" onClick={handleOpenEmailModal} disabled={emailStatus === 'sending' || !!emailError} className="inline-flex justify-center py-2 px-6 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold disabled:bg-gray-200 disabled:cursor-not-allowed">{emailStatus === 'sending' ? 'Sending...' : 'Email Document'}</button><button type="button" onClick={() => generateInvoiceCSV(invoiceData)} className="inline-flex justify-center py-2 px-6 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold">Download Excel (CSV)</button></div><div className="flex flex-wrap gap-4"><button type="button" onClick={() => setIsWalkInModalOpen(true)} className="inline-flex justify-center py-2 px-6 border border-dashed border-tide-gold text-sm font-medium rounded-md text-tide-gold bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold">Walk-in Guest</button><button type="button" onClick={handleNewInvoice} className="text-sm font-medium text-gray-600 hover:text-red-600">New Document</button></div></div>
        </form>
        <div className="text-xs text-gray-500 mt-4 text-right">Auto-save status: <span className={`font-semibold ${saveStatus === 'saved' ? 'text-green-600' : ''}`}>{saveStatus}</span></div>
      </div>
      <EmailModal 
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSend={handleSendEmail}
        email={recipientEmail}
        setEmail={setRecipientEmail}
        emailStatus={emailStatus}
      />
      <WalkInGuestModal isOpen={isWalkInModalOpen} onClose={() => setIsWalkInModalOpen(false)} onTransactionGenerated={onInvoiceGenerated} currentUser={currentUser} />
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

  const isAdmin = useMemo(() => ADMIN_USERS.includes(currentUser || ''), [currentUser]);
  const historyRef = useRef(history);
  useEffect(() => {
    historyRef.current = history;
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
  }, [currentUser, isAdmin]); // Rerun effect if user or admin status changes

  const addTransactionToHistory = async (record: RecordedTransaction) => {
    await saveTransaction(record);
    await loadHistory();
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    await deleteTransaction(transactionId);
    await loadHistory();
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
          {isAdmin && <AdminDashboard history={history} />}
          <InvoiceForm onInvoiceGenerated={addTransactionToHistory} currentUser={currentUser} />
          <TransactionHistory 
            history={history} 
            isAdmin={isAdmin}
            onDeleteTransaction={handleDeleteTransaction}
            highlightedTxId={highlightedTxId}
          />
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