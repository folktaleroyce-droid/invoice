import { RecordedTransaction, InvoiceData, WalkInTransaction } from '../types';

// Using a single key simulates a master database table for all transactions.
// This approach is a client-side mock of a real backend database,
// allowing persistence on the same browser/device. True cross-device sync
// would require a real backend service.
const MASTER_HISTORY_KEY = 'masterTransactionHistory';

/**
 * Loads all transaction history from local storage.
 * In a real-world scenario, this function would make an API call to fetch data from a database.
 * @returns {RecordedTransaction[]} An array of all recorded transactions.
 */
const loadAllTransactions = (): RecordedTransaction[] => {
  try {
    const savedHistory = localStorage.getItem(MASTER_HISTORY_KEY);
    return savedHistory ? JSON.parse(savedHistory) : [];
  } catch (error) {
    console.error("Failed to load master transaction history:", error);
    localStorage.removeItem(MASTER_HISTORY_KEY);
    return [];
  }
};

/**
 * Saves the entire transaction history to local storage.
 * In a real-world application, this would not be used; instead, individual
 * transactions would be sent to a backend API for saving.
 * @param {RecordedTransaction[]} history - The full array of transactions to save.
 */
const saveAllTransactions = (history: RecordedTransaction[]) => {
  try {
    localStorage.setItem(MASTER_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to save master transaction history:", error);
  }
};

/**
 * Loads the transaction history specifically for the logged-in user.
 * This simulates a database query that filters transactions by user.
 * @param {string} username - The user whose history should be loaded.
 * @returns {RecordedTransaction[]} An array of the user's recorded transactions.
 */
export const loadUserTransactionHistory = (username: string): RecordedTransaction[] => {
  if (!username) return [];

  const allTransactions = loadAllTransactions();
  
  const userHistory = allTransactions.filter(record => {
    if (record.type === 'Hotel Stay') {
      return (record.data as InvoiceData).receivedBy === username;
    }
    if (record.type === 'Walk-In') {
      return (record.data as WalkInTransaction).cashier === username;
    }
    return false;
  });
  
  // Sort by date descending to ensure the newest is always on top
  userHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return userHistory;
};

/**
 * Adds a new transaction to the master history list.
 * This simulates making an API call to save a new record to the database.
 * @param {RecordedTransaction} newRecord - The new transaction to add.
 */
export const addTransaction = (newRecord: RecordedTransaction) => {
  const allTransactions = loadAllTransactions();
  // Filter out any potential duplicates by ID and then add the new record
  const updatedHistory = [newRecord, ...allTransactions.filter(r => r.id !== newRecord.id)];
  saveAllTransactions(updatedHistory);
};
