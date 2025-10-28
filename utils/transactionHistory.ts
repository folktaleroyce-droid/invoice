
import { RecordedTransaction, InvoiceData, WalkInTransaction } from '../types';

// This key represents our client-side mock of a centralized cloud database.
// In a real-world application, this would be replaced by API endpoints.
const CLOUD_STORAGE_KEY = 'masterTransactionHistory';

/**
 * MOCK: Fetches all transaction history from local storage.
 * In a real-world scenario, this function would make an API call to fetch data from a cloud database.
 * @returns {Promise<RecordedTransaction[]>} A promise that resolves to an array of all recorded transactions.
 */
const _fetchAllTransactionsFromCloud = async (): Promise<RecordedTransaction[]> => {
  // Simulate network delay to mimic a real API call
  await new Promise(resolve => setTimeout(resolve, 250));
  try {
    const savedHistory = localStorage.getItem(CLOUD_STORAGE_KEY);
    return savedHistory ? JSON.parse(savedHistory) : [];
  } catch (error) {
    console.error("Failed to load master transaction history:", error);
    // In a real app, you might want to handle this more gracefully (e.g., show an error to the user)
    localStorage.removeItem(CLOUD_STORAGE_KEY);
    return [];
  }
};

/**
 * MOCK: Saves the entire transaction history to local storage.
 * This simulates a PUT/POST to a collection endpoint. In a real application,
 * the `saveTransaction` function would likely post a single new record instead of syncing the whole list.
 * @param {RecordedTransaction[]} history - The full array of transactions to save.
 * @returns {Promise<void>}
 */
const _syncAllTransactionsToCloud = async (history: RecordedTransaction[]): Promise<void> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 250));
  try {
    localStorage.setItem(CLOUD_STORAGE_KEY, JSON.stringify(history));
    // FIX: Added curly braces to the catch block to correctly handle errors.
  } catch (error) {
    console.error("Failed to save master transaction history:", error);
  }
};

/**
 * Fetches the transaction history specifically for the logged-in user from the cloud data source.
 * This simulates a database query that filters transactions by user.
 * @param {string} username - The user whose history should be loaded.
 * @returns {Promise<RecordedTransaction[]>} A promise that resolves to an array of the user's recorded transactions.
 */
export const fetchUserTransactionHistory = async (username: string): Promise<RecordedTransaction[]> => {
  if (!username) return [];

  const allTransactions = await _fetchAllTransactionsFromCloud();
  
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
 * Saves a new transaction to the centralized cloud data source.
 * This simulates making an API call to save a new record to the database.
 * @param {RecordedTransaction} newRecord - The new transaction to add.
 * @returns {Promise<void>}
 */
export const saveTransaction = async (newRecord: RecordedTransaction) => {
  const allTransactions = await _fetchAllTransactionsFromCloud();
  // Filter out any potential duplicates by ID and then add the new record
  const updatedHistory = [newRecord, ...allTransactions.filter(r => r.id !== newRecord.id)];
  await _syncAllTransactionsToCloud(updatedHistory);
};
