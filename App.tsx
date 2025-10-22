import React from 'react';
import Header from './components/Header';
import InvoiceForm from './components/InvoiceForm';

const App: React.FC = () => {
  // The key management and reset handler have been moved into InvoiceForm
  // for a more self-contained component.
  return (
    <div className="min-h-screen bg-gray-50 text-tide-dark font-sans">
      <Header />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <InvoiceForm />
      </main>
      <footer className="text-center py-4 text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Tidè Hotels and Resorts. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
