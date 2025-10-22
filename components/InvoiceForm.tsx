import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import { InvoiceData, RoomType, PaymentMethod, AdditionalChargeItem } from '../types';
import { convertAmountToWords } from '../utils/numberToWords';
import { printInvoice } from '../services/printGenerator';
import { generateInvoiceCSV } from '../services/csvGenerator';
import DatePicker from './DatePicker';

const roomRates: Record<RoomType, number> = {
    [RoomType.STANDARD]: 150000,
    [RoomType.DOUBLE]: 187500,
    [RoomType.DOUBLE_EXECUTIVE]: 210000,
    [RoomType.STUDIO]: 300000,
    [RoomType.AURA_STUDIO]: 375000,
    [RoomType.SERENITY_SUITES]: 397500,
    [RoomType.ILE_IFE_SUITE]: 450000,
};

const roomRatesUSD: Record<RoomType, number> = {
    [RoomType.STANDARD]: 100,
    [RoomType.DOUBLE]: 125,
    [RoomType.DOUBLE_EXECUTIVE]: 140,
    [RoomType.STUDIO]: 200,
    [RoomType.AURA_STUDIO]: 250,
    [RoomType.SERENITY_SUITES]: 265,
    [RoomType.ILE_IFE_SUITE]: 300,
};

// Centralized calculation function for a predictable state
const calculateInvoiceTotals = (data: InvoiceData): InvoiceData => {
    const roomCharge = data.nights * data.ratePerNight;
    const additionalCharges = data.additionalChargeItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const subtotal = roomCharge + additionalCharges - data.discount;
    const taxAmount = subtotal * (data.taxPercentage / 100);
    const amountReceived = subtotal + taxAmount;
    const amountInWords = convertAmountToWords(amountReceived, data.currency);

    return {
        ...data,
        roomCharge,
        additionalCharges,
        subtotal,
        taxAmount,
        amountReceived,
        amountInWords,
    };
};


// Function to generate a fresh, fully calculated invoice state
const generateNewInvoiceState = (): InvoiceData => {
  const defaultRoomType = RoomType.STANDARD;
  
  const initialState: InvoiceData = {
    receiptNo: `TH${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    guestName: '',
    guestEmail: '',
    phoneContact: '',
    roomType: defaultRoomType,
    nights: 1,
    ratePerNight: roomRates[defaultRoomType],
    roomCharge: 0, // Placeholder
    additionalChargeItems: [],
    additionalCharges: 0,
    discount: 0,
    subtotal: 0, // Placeholder
    taxPercentage: 7.5,
    taxAmount: 0, // Placeholder
    amountReceived: 0, // Placeholder
    amountInWords: '', // Placeholder
    paymentPurpose: 'Hotel Accommodation',
    paymentMethod: PaymentMethod.POS,
    receivedBy: '',
    designation: '',
    currency: 'NGN',
  };
  
  return calculateInvoiceTotals(initialState);
};

// Sub-components for better structure
const FormInput: React.FC<{ label: string; name: string; type?: string; value: string | number; onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; required?: boolean; error?: string; }> = 
({ label, name, type = 'text', value, onChange, required = false, error }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
    <input 
      type={type} 
      id={name} 
      name={name} 
      value={value} 
      onChange={onChange} 
      required={required} 
      className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-tide-gold sm:text-sm ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-tide-gold'}`}
      aria-invalid={!!error}
      aria-describedby={error ? `${name}-error` : undefined}
    />
    {error && <p id={`${name}-error`} className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

const FormSelect: React.FC<{ label: string; name: string; value: string; onChange: (e: ChangeEvent<HTMLSelectElement>) => void; options: string[]; }> =
({ label, name, value, onChange, options }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
        <select id={name} name={name} value={value} onChange={onChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-gray-300 focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm rounded-md">
            {options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
    </div>
);

const CalculatedField: React.FC<{ label: string; value: string; }> = ({ label, value }) => (
    <div>
        <p className="block text-sm font-medium text-gray-700">{label}</p>
        <p className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-md shadow-sm sm:text-sm text-gray-800 font-semibold">{value}</p>
    </div>
);

const InvoiceForm: React.FC = () => {
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(() => {
    try {
      const savedData = localStorage.getItem('savedInvoiceData');
      if (savedData) {
        // Ensure saved data is also run through calculation to add any new fields
        return calculateInvoiceTotals(JSON.parse(savedData));
      }
    } catch (error) {
      console.error("Failed to load or parse saved invoice data:", error);
      localStorage.removeItem('savedInvoiceData'); // Clear corrupted data
    }
    return generateNewInvoiceState();
  });

  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [emailError, setEmailError] = useState<string>('');

  const saveTimerRef = useRef<number | null>(null);
  const statusTimerRef = useRef<number | null>(null);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'guestEmail') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      // Show error only if the field is not empty and the format is wrong
      if (!emailRegex.test(value) && value) {
        setEmailError('Please enter a valid email address.');
      } else {
        setEmailError('');
      }
    }

    setInvoiceData(prev => {
        let nextData = { ...prev };

        const numericFields = ['nights', 'ratePerNight', 'discount', 'taxPercentage'];
        if (numericFields.includes(name)) {
            (nextData as any)[name] = parseFloat(value) || 0;
        } else {
            (nextData as any)[name] = value;
        }

        if (name === 'roomType' || name === 'currency') {
            const newRoomType = name === 'roomType' ? value as RoomType : nextData.roomType;
            const newCurrency = name === 'currency' ? value as 'NGN' | 'USD' : nextData.currency;
            
            if (newCurrency === 'USD') {
                nextData.ratePerNight = roomRatesUSD[newRoomType];
            } else {
                nextData.ratePerNight = roomRates[newRoomType];
            }
        }
        
        return calculateInvoiceTotals(nextData);
    });
  };

  const handleDateChange = (date: string) => {
    setInvoiceData(prev => calculateInvoiceTotals({ ...prev, date }));
  };

  const handleAddChargeItem = () => {
    setInvoiceData(prev => {
        const newItems = [...prev.additionalChargeItems, { id: `item-${Date.now()}`, description: '', amount: 0 }];
        return calculateInvoiceTotals({ ...prev, additionalChargeItems: newItems });
    });
  };

  const handleChargeItemChange = (index: number, field: 'description' | 'amount', value: string | number) => {
    setInvoiceData(prev => {
        const newItems = [...prev.additionalChargeItems];
        newItems[index] = { ...newItems[index], [field]: field === 'amount' ? parseFloat(value as string) || 0 : value };
        return calculateInvoiceTotals({ ...prev, additionalChargeItems: newItems });
    });
  };

  const handleRemoveChargeItem = (id: string) => {
    setInvoiceData(prev => {
        const newItems = prev.additionalChargeItems.filter(item => item.id !== id);
        return calculateInvoiceTotals({ ...prev, additionalChargeItems: newItems });
    });
  };

  // Effect for auto-saving to localStorage
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);

    setSaveStatus('saving');

    saveTimerRef.current = window.setTimeout(() => {
        try {
            localStorage.setItem('savedInvoiceData', JSON.stringify(invoiceData));
            setSaveStatus('saved');

            statusTimerRef.current = window.setTimeout(() => {
                setSaveStatus('idle');
            }, 2000); // Show 'saved' for 2 seconds

        } catch (error) {
            console.error("Failed to save invoice data:", error);
            setSaveStatus('idle');
        }
    }, 1000); // Debounce save for 1 second

    return () => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, [invoiceData]);


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (emailError) {
      alert("Please fix the errors before submitting.");
      return;
    }
    printInvoice(invoiceData);
    setIsGenerated(true);
    setTimeout(() => setIsGenerated(false), 5000);
  };
  
  const handleNewInvoice = () => {
    if (window.confirm("Are you sure you want to start a new invoice? All current data will be cleared.")) {
      // 1. Cancel any pending auto-save timers to prevent race conditions
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      
      // 2. Clear the saved data from browser storage
      localStorage.removeItem('savedInvoiceData');
      
      // 3. Reset all component state slices to their initial values
      setInvoiceData(generateNewInvoiceState());
      setIsGenerated(false);
      setSaveStatus('idle');
      setEmailError('');
    }
  };

  const currencyFormatter = new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: invoiceData.currency, 
    minimumFractionDigits: 2 
  });

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-tide-dark mb-6 border-b pb-4">Create New Invoice</h2>
      {isGenerated && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-md" role="alert">
          <p className="font-bold">Success!</p>
          <p>The print dialog should have opened. You can print or save as PDF from there.</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput label="Receipt No" name="receiptNo" value={invoiceData.receiptNo} onChange={handleInputChange} required />
            <DatePicker label="Date" name="date" value={invoiceData.date} onChange={handleDateChange} required />
        </div>
        {/* Section 2: Guest Details */}
        <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Guest Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput label="Guest Name (Received From)" name="guestName" value={invoiceData.guestName} onChange={handleInputChange} required />
                <FormInput label="Guest Email" name="guestEmail" type="email" value={invoiceData.guestEmail} onChange={handleInputChange} required error={emailError} />
                <FormInput label="Phone/Contact" name="phoneContact" type="tel" value={invoiceData.phoneContact} onChange={handleInputChange} />
            </div>
        </div>
         {/* Section 3: Room & Charges */}
        <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Stay & Charges Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <FormSelect label="Currency" name="currency" value={invoiceData.currency} onChange={handleInputChange} options={['NGN', 'USD']} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <FormSelect label="Room Type" name="roomType" value={invoiceData.roomType} onChange={handleInputChange} options={Object.values(RoomType)} />
                <FormInput label="Nights" name="nights" type="number" value={invoiceData.nights} onChange={handleInputChange} required/>
                <FormInput label={`Rate per Night (${invoiceData.currency})`} name="ratePerNight" type="number" value={invoiceData.ratePerNight} onChange={handleInputChange} required/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <CalculatedField label="Room Charge" value={currencyFormatter.format(invoiceData.roomCharge)} />
                <FormInput label={`Discount (${invoiceData.currency})`} name="discount" type="number" value={invoiceData.discount} onChange={handleInputChange} />
            </div>

            {/* Additional Charges Section */}
            <div className="border-t pt-6 mt-6">
                <h4 className="text-md font-semibold text-gray-700 mb-4">Additional Charges</h4>
                <div className="space-y-4">
                    {invoiceData.additionalChargeItems.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-12 gap-x-4 items-end">
                            <div className="col-span-12 sm:col-span-6">
                                <FormInput 
                                    label={`Charge #${index + 1} Description`}
                                    name={`description-${index}`}
                                    value={item.description} 
                                    onChange={(e) => handleChargeItemChange(index, 'description', e.target.value)}
                                />
                            </div>
                            <div className="col-span-8 sm:col-span-4">
                                <FormInput 
                                    label="Amount"
                                    name={`amount-${index}`}
                                    type="number" 
                                    value={item.amount}
                                    onChange={(e) => handleChargeItemChange(index, 'amount', e.target.value)}
                                />
                            </div>
                            <div className="col-span-4 sm:col-span-2">
                                <button 
                                    type="button" 
                                    onClick={() => handleRemoveChargeItem(item.id)}
                                    className="w-full text-red-600 hover:text-red-800 bg-red-100 hover:bg-red-200 rounded-md py-2 px-3 text-sm font-medium transition-colors"
                                    aria-label={`Remove charge #${index + 1}`}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <button 
                    type="button" 
                    onClick={handleAddChargeItem}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-dashed border-gray-400 text-sm font-medium rounded-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold"
                >
                    + Add Charge
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <CalculatedField label="Total Additional Charges" value={currencyFormatter.format(invoiceData.additionalCharges)} />
                <CalculatedField label="Subtotal" value={currencyFormatter.format(invoiceData.subtotal)} />
            </div>
        </div>
        {/* Section 4: Tax & Total */}
        <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Tax & Final Amount</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <FormInput label="Tax (%)" name="taxPercentage" type="number" value={invoiceData.taxPercentage} onChange={handleInputChange} />
                <CalculatedField label="Tax Amount" value={currencyFormatter.format(invoiceData.taxAmount)} />
                <CalculatedField label="Amount Received" value={currencyFormatter.format(invoiceData.amountReceived)} />
            </div>
            <div className="mt-6">
                <CalculatedField label="Amount in Words" value={invoiceData.amountInWords} />
            </div>
        </div>
        {/* Section 5: Payment Details */}
        <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="paymentPurpose" className="block text-sm font-medium text-gray-700">Purpose of Payment / Notes</label>
                  <textarea id="paymentPurpose" name="paymentPurpose" value={invoiceData.paymentPurpose} onChange={handleInputChange} rows={3} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-tide-gold focus:border-tide-gold sm:text-sm" />
                </div>
                <FormSelect label="Payment Method" name="paymentMethod" value={invoiceData.paymentMethod} onChange={handleInputChange} options={Object.values(PaymentMethod)} />
                <FormInput label="Received By" name="receivedBy" value={invoiceData.receivedBy} onChange={handleInputChange} required />
                <FormInput label="Designation" name="designation" value={invoiceData.designation} onChange={handleInputChange} required />
            </div>
        </div>
        {/* Submit Button */}
        <div className="border-t pt-6 flex flex-wrap justify-between items-center gap-4">
            <div className="text-left">
                <p className="text-sm text-gray-500 transition-opacity duration-300 h-5" aria-live="polite">
                    {saveStatus === 'saving' && 'Saving...'}
                    {saveStatus === 'saved' && <span className="text-green-600 font-medium">✓ All changes saved</span>}
                </p>
            </div>
             <div className="flex flex-wrap justify-end gap-4">
                <button 
                  type="button" 
                  onClick={handleNewInvoice}
                  className="inline-flex justify-center py-3 px-8 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold transition-colors"
                >
                    New Invoice
                </button>
                <button 
                  type="button" 
                  onClick={() => generateInvoiceCSV(invoiceData)}
                  className="inline-flex justify-center py-3 px-8 border border-transparent shadow-sm text-sm font-medium rounded-md text-tide-dark bg-tide-gold hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold transition-colors"
                >
                    Download Excel (CSV)
                </button>
                <button 
                  type="submit" 
                  disabled={!!emailError}
                  className="inline-flex justify-center py-3 px-8 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-tide-dark hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    Generate & Print Receipt
                </button>
            </div>
        </div>
      </form>
    </div>
  );
};

export default InvoiceForm;