import React, { useState, useMemo } from 'react';
import { RecordedTransaction } from '../types';
import { generateHistoryCSV } from '../services/historyCsvGenerator';
import DatePicker from './DatePicker';

interface TransactionHistoryProps {
  history: RecordedTransaction[];
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ history }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const currencyFormatter = (amount: number, currency: 'NGN' | 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const filteredHistory = useMemo(() => {
    return history.filter(record => {
      // The date format 'YYYY-MM-DD' allows for direct string comparison
      if (startDate && record.date < startDate) {
        return false;
      }
      if (endDate && record.date > endDate) {
        return false;
      }
      return true;
    });
  }, [history, startDate, endDate]);

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
      <div className="mb-6 border-b pb-4">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h2 className="text-2xl font-bold text-tide-dark">Transaction History</h2>
          <button
            onClick={() => generateHistoryCSV(filteredHistory)}
            disabled={filteredHistory.length === 0}
            className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-tide-dark bg-tide-gold hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Download Filtered List (CSV)
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 items-end gap-4">
            <div className="sm:col-span-1">
                <DatePicker 
                  label="Start Date" 
                  name="startDate" 
                  value={startDate} 
                  onChange={setStartDate} 
                />
            </div>
            <div className="sm:col-span-1">
                 <DatePicker 
                  label="End Date" 
                  name="endDate" 
                  value={endDate} 
                  onChange={setEndDate} 
                />
            </div>
            <div className="sm:col-span-1">
                 <button
                    onClick={handleClearFilter}
                    className="w-full py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold transition-colors"
                  >
                    Clear Filter
                  </button>
            </div>
        </div>
      </div>
      
      <div className="overflow-x-auto max-h-[500px]">
        {history.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No receipts have been issued yet.</p>
        ) : filteredHistory.length === 0 ? (
           <p className="text-center text-gray-500 py-8">No transactions found for the selected date range.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt No.</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Name</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.map((record) => (
                <tr key={record.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        record.type === 'Hotel Stay' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                     }`}>
                        {record.type}
                     </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.guestName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right font-semibold">{currencyFormatter(record.amount, record.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;