import { WalkInTransaction, WalkInService } from '../types';

export const printWalkInReceipt = (data: WalkInTransaction) => {
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
        <td>${serviceName}</td>
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
        th, td { padding: 4px 2px; text-align: left; }
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
          <h1>TIDÈ HOTELS</h1>
          <p>Walk-In Guest Receipt</p>
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