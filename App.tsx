import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import InvoiceForm from './components/InvoiceForm';
import WelcomeScreen from './components/WelcomeScreen';
import TransactionHistory from './components/TransactionHistory';
import { RecordedTransaction } from './types';
import { loadTransactionHistory, saveTransactionHistory } from './utils/transactionHistory';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<RecordedTransaction[]>([]);

  useEffect(() => {
    // Set a timer to hide the welcome screen after a short duration
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000); // Welcome screen will be visible for 3 seconds

    setHistory(loadTransactionHistory());

    return () => clearTimeout(timer);
  }, []);

  const addTransactionToHistory = (record: RecordedTransaction) => {
    setHistory(prevHistory => {
      const newHistory = [record, ...prevHistory.filter(r => r.id !== record.id)];
      // Sort by date descending to ensure the newest is always on top
      newHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      saveTransactionHistory(newHistory);
      return newHistory;
    });
  };

  // Conditionally render the WelcomeScreen or the main application
  if (isLoading) {
    return <WelcomeScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-tide-dark font-sans">
      <Header />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <InvoiceForm onInvoiceGenerated={addTransactionToHistory} />
        <TransactionHistory history={history} />
      </main>
      <footer className="text-center py-4 text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Tidè Hotels and Resorts. All rights reserved.</p>
      </footer>
    </div>
  );
};

// FIX: An export assignment cannot have modifiers. Removed duplicate `export`.
export default App;