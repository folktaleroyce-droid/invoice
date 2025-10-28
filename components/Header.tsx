import React from 'react';

interface HeaderProps {
  currentUser?: string | null;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout }) => {
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="text-center sm:text-left flex-grow">
            <h1 className="text-3xl sm:text-4xl font-bold text-tide-gold tracking-wider">
              Tidè Hotels and Resorts
            </h1>
            <p className="text-sm text-tide-dark mt-1">
              Hospitality with Excellence
            </p>
          </div>
          {currentUser && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, <strong className="font-medium">{currentUser}</strong></span>
              <button
                onClick={onLogout}
                className="py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-tide-dark hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;