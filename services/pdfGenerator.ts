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

  doc.setFont('helvetica', 'bold');
  doc.text('Room Number:', 14, 89);
  doc.setFont('helvetica', 'normal');
  doc.text(data.roomNumber, 60, 89);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Arrival Date:', 100, 89);
  doc.setFont('helvetica', 'normal');
  doc.text(data.arrivalDate, 125, 89);

  doc.setFont('helvetica', 'bold');
  doc.text('Departure Date:', 14, 96);
  doc.setFont('helvetica', 'normal');
  doc.text(data.departureDate, 60, 96);

  doc.line(14, 102, 196, 102);

  // Invoice Table
  const tableColumn = ["Date", "Description", "Details", `Amount (${data.currency})`];
  const tableRows = [
    [data.arrivalDate, "Room Charge", `${data.roomType}, ${data.nights} night(s) @ ${currencyFormatter.format(data.ratePerNight)}`, currencyFormatter.format(data.roomCharge)],
    ...data.additionalChargeItems.map(item => [item.date, item.description || 'Additional Charge', '', currencyFormatter.format(item.amount)]),
  ];
  
  doc.autoTable({
    startY: 106,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: '#2c3e50' },
    styles: { font: 'helvetica', fontSize: 10 },
    columnStyles: {
        3: { halign: 'right' }
    }
  });

  // Totals
  const finalY = doc.autoTable.previous.finalY;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', 155, finalY + 8, { align: 'right' });
  doc.text(currencyFormatter.format(data.subtotal), 196, finalY + 8, { align: 'right' });
  
  doc.text('Discount:', 155, finalY + 14, { align: 'right' });
  doc.text(`-${currencyFormatter.format(data.discount)}`, 196, finalY + 14, { align: 'right' });

  doc.text(`Tax (${data.taxPercentage}%):`, 155, finalY + 20, { align: 'right' });
  doc.text(currencyFormatter.format(data.taxAmount), 196, finalY + 20, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL AMOUNT DUE:', 155, finalY + 28, { align: 'right' });
  doc.text(currencyFormatter.format(data.totalAmountDue), 196, finalY + 28, { align: 'right' });
  
  doc.text('AMOUNT RECEIVED:', 155, finalY + 34, { align: 'right' });
  doc.text(currencyFormatter.format(data.amountReceived), 196, finalY + 34, { align: 'right' });

  doc.setFontSize(12);
  doc.text('BALANCE:', 155, finalY + 42, { align: 'right' });
  doc.text(currencyFormatter.format(data.balance), 196, finalY + 42, { align: 'right' });


  // Amount in words
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Amount in Words (for Amount Received):', 14, finalY + 52);
  doc.setFont('helvetica', 'normal');
  doc.text(data.amountInWords, 14, finalY + 57, { maxWidth: 180 });

  // Footer Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Purpose of Payment:', 14, finalY + 70);
  doc.setFont('helvetica', 'normal');
  doc.text(data.paymentPurpose || 'Hotel Accommodation', 55, finalY + 70);

  doc.setFont('helvetica', 'bold');
  doc.text('Payment Method:', 14, finalY + 77);
  doc.setFont('helvetica', 'normal');
  doc.text(data.paymentMethod, 55, finalY + 77);

  // Signature area
  doc.line(14, finalY + 90, 80, finalY + 90);
  doc.setFont('helvetica', 'bold');
  doc.text('Received By:', 14, finalY + 95);
  doc.text(data.receivedBy, 40, finalY + 95);
  doc.text('Designation:', 14, finalY + 102);
  doc.text(data.designation, 40, finalY + 102);

  doc.setFontSize(8);
  doc.setTextColor('#888');
  doc.text('Page 1 of 1', 105, 280, { align: 'center' });
  doc.text('NOTE: This is a system-generated receipt and does not require a physical signature.', 105, 285, { align: 'center' });
  doc.text('Thank you for choosing Tidè Hotels and Resorts!', 105, 290, { align: 'center' });

  // Save the PDF
  doc.save(`TideHotels_Receipt_${data.receiptNo}.pdf`);
};