import { RecordedTransaction, InvoiceData, WalkInTransaction, WalkInService } from '../types';

const escapeCsvCell = (cell: any): string => {
    const cellString = String(cell ?? ''); // Handle null/undefined
    if (cellString.includes(',') || cellString.includes('"') || cellString.includes('\n')) {
        return `"${cellString.replace(/"/g, '""')}"`;
    }
    return cellString;
};

export const generateHistoryCSV = (history: RecordedTransaction[]) => {
    if (history.length === 0) {
        alert("No transaction history to export.");
        return;
    }

    const headers = [
        'ID', 'Type', 'Issue Date', 'Guest Name', 'Amount Due', 'Currency',
        'Guest Email', 'Phone', 'Room No', 'Arrival Date', 'Departure Date',
        'Nights', 'Room Type', 'Walk-In Services',
        'Subtotal', 'Discount', 'Tax', 'Amount Paid', 'Balance',
        'Payment Method', 'Cashier/Received By', 'Designation'
    ];

    const rows = history.map(record => {
        if (record.type === 'Hotel Stay') {
            const data = record.data as InvoiceData;
            return [
                data.receiptNo, record.type, data.date, data.guestName, data.totalAmountDue, data.currency,
                data.guestEmail, data.phoneContact, data.roomNumber, data.arrivalDate, data.departureDate,
                data.nights, data.roomType, '', // No walk-in services
                data.subtotal, data.discount, data.taxAmount, data.amountReceived, data.balance,
                data.paymentMethod, data.receivedBy, data.designation
            ].map(escapeCsvCell);
        } else { // Walk-In
            const data = record.data as WalkInTransaction;
            const services = data.charges.map(c => 
                c.service === WalkInService.OTHER ? c.otherServiceDescription : c.service
            ).join('; ');

            return [
                data.id, record.type, data.transactionDate, 'Walk-In Guest', (data.subtotal - data.discount), data.currency,
                '', '', '', '', '', // No stay details
                '', '', services,
                data.subtotal, data.discount, 0, // No tax for walk-ins
                data.amountPaid, data.balance,
                data.paymentMethod, data.cashier, '' // No designation
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
