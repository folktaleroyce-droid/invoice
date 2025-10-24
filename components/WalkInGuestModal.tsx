import React, { useState, useMemo } from 'react';
import { WalkInService, Staff, WalkInTransaction, WalkInChargeItem, PaymentMethod } from '../types';
import { printWalkInReceipt } from '../services/walkInPrintGenerator';
import { generateWalkInCSV } from '../services/walkInCsvGenerator';
import DatePicker from './DatePicker';

interface WalkInGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalkInGuestModal: React.FC<WalkInGuestModalProps> = ({ isOpen, onClose }) => {
  // Form state for a single new charge
  const [newCharge, setNewCharge] = useState({
    date: new Date().toISOString().split('T')[0],
    service: WalkInService.RESTAURANT,
    otherServiceDescription: '',
    amount: '' as number | '',
  });

  // Transaction-level state
  const [charges, setCharges] = useState<WalkInChargeItem[]>([]);
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [cashier, setCashier] = useState<Staff | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [error, setError] = useState('');

  // Derived state with useMemo for performance
  const subtotal = useMemo(() => {
    return charges.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [charges]);

  const balance = useMemo(() => {
    const paid = typeof amountPaid === 'number' ? amountPaid : 0;
    return subtotal - paid;
  }, [subtotal, amountPaid]);

  const currencyFormatter = useMemo(() => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }), [currency]);

  if (!isOpen) return null;

  const handleReset = () => {
    setNewCharge({
      date: new Date().toISOString().split('T')[0],
      service: WalkInService.RESTAURANT,
      otherServiceDescription: '',
      amount: '',
    });
    setCharges([]);
    setCurrency('NGN');
    setAmountPaid('');
    setCashier('');
    setPaymentMethod(PaymentMethod.CASH);
    setError('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleAddCharge = () => {
    if (newCharge.amount === '' || newCharge.amount <= 0) {
      setError('Please enter a valid amount for the charge.');
      return;
    }
    if (newCharge.service === WalkInService.OTHER && !newCharge.otherServiceDescription.trim()) {
      setError('Please provide a description for the "Other" service.');
      return;
    }
    setError('');

    const chargeToAdd: WalkInChargeItem = {
      id: `charge-${Date.now()}`,
      date: newCharge.date,
      service: newCharge.service,
      amount: newCharge.amount as number,
      ...(newCharge.service === WalkInService.OTHER && { otherServiceDescription: newCharge.otherServiceDescription.trim() }),
    };

    setCharges(prev => [...prev, chargeToAdd]);
    setNewCharge({
      date: new Date().toISOString().split('T')[0],
      service: WalkInService.RESTAURANT,
      otherServiceDescription: '',
      amount: '',
    });
  };

  const handleRemoveCharge = (id: string) => {
    setCharges(prev => prev.filter(charge => charge.id !== id));
  };

  const validateAndCreateTransaction = (): WalkInTransaction | null => {
    if (charges.length === 0) {
      setError('Please add at least one service charge.');
      return null;
    }
    if (!cashier) {
      setError('Please select the cashier.');
      return null;
    }

    setError('');
    
    return {
      id: `WI-${Date.now()}`,
      transactionDate: new Date().toISOString().split('T')[0],
      charges,
      currency,
      subtotal,
      amountPaid: typeof amountPaid === 'number' ? amountPaid : 0,
      balance,
      cashier,
      paymentMethod,
    };
  };

  const saveTransaction = (transaction: WalkInTransaction) => {
    try {
      const existing = JSON.parse(localStorage.getItem('walkInTransactions') || '[]');
      localStorage.setItem('walkInTransactions', JSON.stringify([...existing, transaction]));
    } catch (e) {
      console.error('Failed to save walk-in transaction:', e);
      alert('There was an error saving the transaction record.');
    }
  };

  const handleGenerate = (action: 'print' | 'csv') => {
    const transaction = validateAndCreateTransaction();
    if (transaction) {
      if (action === 'print') {
        printWalkInReceipt(transaction);
        alert('Receipt generated for printing!');
      } else {
        generateWalkInCSV(transaction);
        alert('CSV record downloaded!');
      }
      saveTransaction(transaction);
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 relative flex flex-col" style={{ maxHeight: '90vh' }}>
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" aria-label="Close">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        <h2 className="text-2xl font-bold text-tide-dark mb-4 border-b pb-3">Walk-In Guest Charge</h2>
        
        <div className="overflow-y-auto flex-grow pr-2">
            {/* Add Charge Form */}
            <div className="grid grid-cols-12 gap-4 items-end p-1">
                <div className="col-span-12 sm:col-span-3">
                    <DatePicker label="Date" name="newChargeDate" value={newCharge.date} onChange={date => setNewCharge(p => ({...p, date}))} />
                </div>
                <div className="col-span-12 sm:col-span-4">
                    <label className="block text-sm font-medium text-gray-700">Service</label>
                    <select value={newCharge.service} onChange={e => setNewCharge(p => ({...p, service: e.target.value as WalkInService}))} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-gray-300 focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm rounded-md">
                        {Object.values(WalkInService).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="col-span-12 sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">Amount</label>
                    <input type="number" value={newCharge.amount} onChange={e => setNewCharge(p => ({...p, amount: e.target.value === '' ? '' : parseFloat(e.target.value)}))} min="0" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm"/>
                </div>
                <div className="col-span-12 sm:col-span-2">
                    <button type="button" onClick={handleAddCharge} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-tide-dark text-base font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold sm:text-sm">Add</button>
                </div>
                 {newCharge.service === WalkInService.OTHER && (
                    <div className="col-span-12">
                        <label className="block text-sm font-medium text-gray-700">Service Description</label>
                        <input type="text" value={newCharge.otherServiceDescription} onChange={e => setNewCharge(p => ({...p, otherServiceDescription: e.target.value}))} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm" placeholder="Please specify service"/>
                    </div>
                )}
            </div>

            {/* Charges Table */}
            <div className="mt-4 border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Charges</h3>
                <div className="bg-gray-50 rounded-md p-2">
                    {charges.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">No charges added yet.</p>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100"><tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                            </tr></thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {charges.map(charge => (
                                    <tr key={charge.id}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{charge.date}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{charge.service === WalkInService.OTHER ? charge.otherServiceDescription : charge.service}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 text-right">{currencyFormatter.format(charge.amount)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-center">
                                            <button onClick={() => handleRemoveCharge(charge.id)} className="text-red-600 hover:text-red-800 text-xs">Remove</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Summary & Payment */}
            <div className="mt-4 border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                    <div>
                         <label className="block text-sm font-medium text-gray-700">Currency</label>
                         <select value={currency} onChange={e => setCurrency(e.target.value as 'NGN' | 'USD')} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-gray-300 focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm rounded-md">
                            <option value="NGN">Naira (NGN)</option>
                            <option value="USD">Dollar (USD)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-gray-300 focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm rounded-md">
                            {Object.values(PaymentMethod).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Cashier</label>
                        <select value={cashier} onChange={e => setCashier(e.target.value as Staff)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-gray-300 focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm rounded-md">
                            <option value="" disabled>Select Staff</option>
                            {Object.values(Staff).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                 <div className="mt-4 p-4 bg-gray-100 rounded-lg space-y-2">
                    <div className="flex justify-between items-center text-md font-semibold text-gray-800">
                        <span>Subtotal:</span>
                        <span>{currencyFormatter.format(subtotal)}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-gray-700">Amount Paid:</label>
                        <input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-32 text-right px-2 py-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm"/>
                    </div>
                     <div className="flex justify-between items-center text-lg font-bold text-tide-dark border-t border-gray-300 pt-2">
                        <span>Balance:</span>
                        <span className={balance < 0 ? 'text-green-600' : ''}>{currencyFormatter.format(balance)}</span>
                    </div>
                </div>
            </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}

        <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row-reverse gap-3">
          <button type="button" onClick={() => handleGenerate('print')} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-tide-dark text-base font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold sm:ml-3 sm:w-auto sm:text-sm">
            Generate & Print Receipt
          </button>
          <button type="button" onClick={() => handleGenerate('csv')} className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold sm:mt-0 sm:w-auto sm:text-sm">
            Download Excel (CSV)
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalkInGuestModal;