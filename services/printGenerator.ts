import { InvoiceData } from '../types';

export const printInvoice = (data: InvoiceData) => {
  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: data.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const chargesRows = `
    <tr>
      <td>${data.arrivalDate}</td>
      <td>Room Charge (${data.roomType}, ${data.nights} night(s))</td>
      <td class="text-right">${currencyFormatter.format(data.roomCharge)}</td>
    </tr>
    ${data.additionalChargeItems.map(item => `
      <tr>
        <td>${item.date}</td>
        <td>${item.description || 'Additional Charge'}</td>
        <td class="text-right">${currencyFormatter.format(item.amount)}</td>
      </tr>
    `).join('')}
  `;

  const printContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Receipt ${data.receiptNo}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 9pt; color: #2c3e50; line-height: 1.4; }
        .container { max-width: 800px; margin: auto; padding: 15px; }
        p { margin: 0; }
        .header { text-align: center; margin-bottom: 15px; }
        .header h1 { margin: 0; font-size: 20pt; color: #c4a66a; }
        .header p { margin: 2px 0 0 0; font-size: 9pt; }
        .receipt-title { text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 15px; }
        .info-section { display: flex; justify-content: space-between; padding-bottom: 8px; font-size: 9pt; }
        .guest-info { border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 8px 0; margin-bottom: 15px; }
        .guest-info p { margin: 5px 0; }
        .guest-info strong { display: inline-block; min-width: 120px; }
        table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 4px; }
        th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
        th { background-color: #2c3e50; color: white; }
        .text-right { text-align: right; }
        .totals-table { margin-top: 15px; float: right; width: 50%; border-collapse: collapse; }
        .totals-table td { border: none; padding: 3px 6px; }
        .totals-table .total-label { font-weight: bold; }
        .totals-table .grand-total { font-size: 11pt; font-weight: bold; border-top: 1px solid #2c3e50; padding-top: 6px; }
        .words-section { clear: both; padding-top: 15px; }
        .words-section p { margin-top: 4px; }
        .footer-details { margin-top: 20px; }
        .footer-details p { margin: 5px 0; }
        .footer-details strong { display: inline-block; min-width: 150px; }
        .signature-area { margin-top: 30px; }
        .signature-area p { margin: 5px 0; }
        .signature-area strong { display: inline-block; min-width: 100px; }
        .footer-note { text-align: center; font-size: 8pt; color: #888; margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee; }
        @media print {
            body { margin: 0; background-color: #fff; font-size: 9pt; }
            .container { margin: 0; padding: 20px 40px; max-width: 100%; box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TIDÈ HOTELS AND RESORTS</h1>
          <p>Hospitality with Excellence</p>
          <p>38 S.O Williams Street, off Anthony Enahoro Street, Utako Abuja Nigeria</p>
        </div>
        <div class="receipt-title">GUEST RECEIPT</div>
        <div class="info-section">
          <div><strong>Receipt No:</strong> ${data.receiptNo}</div>
          <div><strong>Date:</strong> ${data.date}</div>
        </div>
        <div class="guest-info">
          <p><strong>Received From (Guest):</strong> ${data.guestName}</p>
          <p><strong>Email:</strong> ${data.guestEmail}</p>
          <p><strong>Phone/Contact:</strong> ${data.phoneContact}</p>
          <p><strong>Room Number:</strong> ${data.roomNumber}</p>
          <p><strong>Arrival Date:</strong> ${data.arrivalDate}</p>
          <p><strong>Departure Date:</strong> ${data.departureDate}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th class="text-right">Amount (${data.currency})</th>
            </tr>
          </thead>
          <tbody>
            ${chargesRows}
          </tbody>
        </table>

        <table class="totals-table">
          <tbody>
            <tr><td>Subtotal</td><td class="text-right">${currencyFormatter.format(data.subtotal)}</td></tr>
            <tr><td>Discount</td><td class="text-right">-${currencyFormatter.format(data.discount)}</td></tr>
            <tr><td>Tax (${data.taxPercentage}%)</td><td class="text-right">${currencyFormatter.format(data.taxAmount)}</td></tr>
            <tr><td class="total-label">Total Amount Due:</td><td class="text-right">${currencyFormatter.format(data.totalAmountDue)}</td></tr>
            <tr><td class="total-label">Amount Received:</td><td class="text-right">${currencyFormatter.format(data.amountReceived)}</td></tr>
            <tr><td class="grand-total">Balance:</td><td class="text-right grand-total">${currencyFormatter.format(data.balance)}</td></tr>
          </tbody>
        </table>

        <div class="words-section">
          <p><strong>Amount in Words (for Amount Received):</strong> ${data.amountInWords}</p>
        </div>

        <div class="footer-details">
          <p><strong>Purpose of Payment:</strong> ${data.paymentPurpose || 'Hotel Accommodation'}</p>
          <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
        </div>
        
        <div class="signature-area">
          <p><strong>Received By:</strong> ${data.receivedBy}</p>
          <p><strong>Designation:</strong> ${data.designation}</p>
        </div>

        <div class="signature-area" style="margin-top: 50px;">
          <div style="border-bottom: 1px solid #2c3e50; width: 250px; height: 30px; margin-bottom: 5px;"></div>
          <p><strong>Guest Signature</strong></p>
        </div>

        <div class="footer-note">
          <p>Page 1 of 1</p>
          <p>NOTE: This is a system-generated receipt and does not require a physical signature.</p>
          <p>Thank you for choosing Tidè Hotels and Resorts!</p>
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
