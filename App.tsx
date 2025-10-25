import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import InvoiceForm from './components/InvoiceForm';
import WelcomeScreen from './components/WelcomeScreen';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set a timer to hide the welcome screen after a short duration
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000); // Welcome screen will be visible for 3 seconds

    return () => clearTimeout(timer);
  }, []);

  // Conditionally render the WelcomeScreen or the main application
  if (isLoading) {
    return <WelcomeScreen />;
  }

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
