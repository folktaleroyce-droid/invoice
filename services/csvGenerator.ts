import { InvoiceData } from '../types';

// Function to escape values for CSV format (handles commas and quotes)
const escapeCsvCell = (cell: any): string => {
    const cellString = String(cell);
    if (cellString.includes(',') || cellString.includes('"') || cellString.includes('\n')) {
        return `"${cellString.replace(/"/g, '""')}"`;
    }
    return cellString;
};

export const generateInvoiceCSV = (data: InvoiceData) => {
    const headers = [
        'Receipt No', 'Date', 'Guest Name', 'Guest Email', 'Phone/Contact',
        'Room Type', 'Nights', 
        `Rate per Night (${data.currency})`, 
        `Room Charge (${data.currency})`, 
        `Additional Charges (${data.currency})`,
        `Discount (${data.currency})`, 
        `Subtotal (${data.currency})`, 
        'Tax (%)', 
        `Tax Amount (${data.currency})`, 
        `Amount Received (${data.currency})`,
        'Amount in Words', 'Purpose of Payment', 'Payment Method', 'Received By', 'Designation',
        'Currency'
    ];

    const rowData = [
        data.receiptNo,
        data.date,
        data.guestName,
        data.guestEmail,
        data.phoneContact,
        data.roomType,
        data.nights,
        data.ratePerNight,
        data.roomCharge,
        data.additionalCharges,
        data.discount,
        data.subtotal,
        data.taxPercentage,
        data.taxAmount,
        data.amountReceived,
        data.amountInWords,
        data.paymentPurpose,
        data.paymentMethod,
        data.receivedBy,
        data.designation,
        data.currency,
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
        link.setAttribute('download', `TideHotels_Receipt_${data.receiptNo}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};