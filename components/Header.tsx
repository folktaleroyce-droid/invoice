import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-tide-gold tracking-wider">
          Tidè Hotels and Resorts
        </h1>
        <p className="text-sm text-tide-dark mt-1">
          Hospitality with Excellence
        </p>
      </div>
    </header>
  );
};

export default Header;