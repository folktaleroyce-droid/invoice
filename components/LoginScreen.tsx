import React, { useState } from 'react';

// New, secure credentials for authorized staff
const authorizedCredentials = {
  'Faith': 'F@i7h#92X!',
  'Goodness': 'G00d*N3ss$4',
  'Benjamin': 'B3nJ&9m_84',
  'Sandra': 'S@ndR4!51%',
  'David': 'D@v1D#73Q',
  'Ifeanyi': '1F3@yN!88*',
  'Margret': 'M@rG7eT_42',
  'Miriam': 'M1r!@m#97W',
  'Francis': 'Fr@nC1$62!'
};

interface LoginScreenProps {
  onLogin: (name: string, rememberMe: boolean) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPassword = password.trim();

    if (!trimmedName || !trimmedPassword) {
      setError('Please enter both username and password.');
      return;
    }
    
    // Check if the provided name and password match the authorized credentials
    const expectedPassword = authorizedCredentials[trimmedName as keyof typeof authorizedCredentials];
    const isCredentialsCorrect = expectedPassword && trimmedPassword === expectedPassword;

    if (isCredentialsCorrect) {
      onLogin(trimmedName, rememberMe);
    } else {
      setError('You are not authorized. Please contact Admin for account approval/update.');
    }
  };

  return (
    <div className="fixed inset-0 bg-tide-dark z-50 flex justify-center items-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-tide-gold mb-2">Welcome to</h1>
        <h2 className="text-xl font-semibold text-tide-dark mb-6">Invoice Generator</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="sr-only">Username</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter your username"
              className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 sm:text-sm ${error ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-tide-gold focus:border-tide-gold'}`}
              aria-invalid={!!error}
              aria-describedby="login-error"
              autoFocus
            />
          </div>
           <div className="relative">
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter your password"
              className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 sm:text-sm ${error ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-tide-gold focus:border-tide-gold'}`}
              aria-invalid={!!error}
              aria-describedby="login-error"
            />
             <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-tide-dark"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
          <div className="flex items-center text-left">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-tide-gold focus:ring-tide-gold border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
              Remember me
            </label>
          </div>
          {error && <p id="login-error" className="mt-2 text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full inline-flex justify-center py-3 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-tide-dark hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tide-gold"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;