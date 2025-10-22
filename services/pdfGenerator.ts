import { InvoiceData } from '../types';

declare const jspdf: any;

export const generateInvoicePDF = (data: InvoiceData) => {
  const { jsPDF } = jspdf;
  const doc = new jsPDF();

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
  doc.text('Hospitality with Excellence', 105, 27, { align: 'center' });

  // Invoice Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GUEST RECEIPT', 105, 40, { align: 'center' });

  // Receipt Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Receipt No:', 14, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(data.receiptNo, 40, 55);

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 150, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(data.date, 165, 55);

  // Guest Info
  doc.setLineWidth(0.5);
  doc.line(14, 60, 196, 60);

  doc.setFont('helvetica', 'bold');
  doc.text('Received From (Guest):', 14, 68);
  doc.setFont('helvetica', 'normal');
  doc.text(data.guestName, 60, 68);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Email:', 14, 75);
  doc.setFont('helvetica', 'normal');
  doc.text(data.guestEmail, 60, 75);

  doc.setFont('helvetica', 'bold');
  doc.text('Phone/Contact:', 14, 82);
  doc.setFont('helvetica', 'normal');
  doc.text(data.phoneContact, 60, 82);

  doc.line(14, 88, 196, 88);

  // Invoice Table
  const tableColumn = ["Description", "Details", `Amount (${data.currency})`];
  const tableRows = [
    ["Room Type", data.roomType, ''],
    ["Number of Nights", data.nights, ''],
    ["Rate per Night", '', currencyFormatter.format(data.ratePerNight)],
    ["Room Charge", `${data.nights} night(s) @ ${currencyFormatter.format(data.ratePerNight)}`, currencyFormatter.format(data.roomCharge)],
    ["Additional Charges", '', currencyFormatter.format(data.additionalCharges)],
    ["Discount", '', `-${currencyFormatter.format(data.discount)}`],
    ["Subtotal", '', currencyFormatter.format(data.subtotal)],
    [`Tax (${data.taxPercentage}%)`, '', currencyFormatter.format(data.taxAmount)],
  ];
  
  doc.autoTable({
    startY: 92,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: '#2c3e50' },
    styles: { font: 'helvetica', fontSize: 10 },
    columnStyles: {
        2: { halign: 'right' }
    }
  });

  // Total
  const finalY = doc.autoTable.previous.finalY;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL AMOUNT RECEIVED:', 155, finalY + 10, { align: 'right' });
  doc.text(currencyFormatter.format(data.amountReceived), 196, finalY + 10, { align: 'right' });

  // Amount in words
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Amount in Words:', 14, finalY + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(data.amountInWords, 14, finalY + 25, { maxWidth: 180 });

  // Footer Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Purpose of Payment:', 14, finalY + 40);
  doc.setFont('helvetica', 'normal');
  doc.text(data.paymentPurpose || 'Hotel Accommodation', 55, finalY + 40);

  doc.setFont('helvetica', 'bold');
  doc.text('Payment Method:', 14, finalY + 47);
  doc.setFont('helvetica', 'normal');
  doc.text(data.paymentMethod, 55, finalY + 47);

  // Signature area
  doc.line(14, finalY + 70, 80, finalY + 70);
  doc.setFont('helvetica', 'bold');
  doc.text('Received By:', 14, finalY + 75);
  doc.text(data.receivedBy, 40, finalY + 75);
  doc.text('Designation:', 14, finalY + 82);
  doc.text(data.designation, 40, finalY + 82);

  doc.setFontSize(8);
  doc.setTextColor('#888');
  doc.text('NOTE: This is a system-generated receipt and does not require a physical signature.', 105, 280, { align: 'center' });
  doc.text('Thank you for choosing Tidè Hotels and Resorts!', 105, 285, { align: 'center' });

  // Save the PDF
  doc.save(`TideHotels_Receipt_${data.receiptNo}.pdf`);

  /*
    NOTE TO USER:
    The following features from your prompt require a backend server and cannot be implemented
    in a frontend-only React application:
    1. Saving data to Google Sheets: This requires secure handling of API keys and server-side logic.
    2. Sending confirmation emails: This also needs a backend service (like Node.js with Nodemailer) to send emails.
    3. Admin Dashboard: A dashboard to view all receipts would need a database (like Google Sheets) and an API to fetch the data from.

    This implementation focuses on providing a complete frontend experience with PDF generation.
  */
};