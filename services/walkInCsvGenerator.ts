import { WalkInTransaction, WalkInService } from '../types';

const escapeCsvCell = (cell: any): string => {
    const cellString = String(cell);
    if (cellString.includes(',') || cellString.includes('"') || cellString.includes('\n')) {
        return `"${cellString.replace(/"/g, '""')}"`;
    }
    return cellString;
};

export const generateWalkInCSV = (data: WalkInTransaction) => {
    const headers = [
        'Transaction ID', 'Transaction Date', 'Currency', 'Cashier', 'Payment Method',
        'Charge Date', 'Service', 'Service Description', 'Amount',
        'Transaction Subtotal', 'Transaction Discount', 'Transaction Amount Paid', 'Transaction Balance'
    ];
    
    const rows = data.charges.map(charge => {
        const serviceName = charge.service;
        const serviceDescription = charge.service === WalkInService.OTHER ? charge.otherServiceDescription || '' : '';

        return [
            data.id,
            data.transactionDate,
            data.currency,
            data.cashier,
            data.paymentMethod,
            charge.date,
            serviceName,
            serviceDescription,
            charge.amount,
            data.subtotal,
            data.discount,
            data.amountPaid,
            data.balance,
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