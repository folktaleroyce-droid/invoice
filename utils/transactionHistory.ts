import { RecordedTransaction } from '../types';

const HISTORY_KEY = 'transactionHistory';

export const loadTransactionHistory = (): RecordedTransaction[] => {
  try {
    const savedHistory = localStorage.getItem(HISTORY_KEY);
    return savedHistory ? JSON.parse(savedHistory) : [];
  } catch (error) {
    console.error("Failed to load transaction history:", error);
    localStorage.removeItem(HISTORY_KEY);
    return [];
  }
};

export const saveTransactionHistory = (history: RecordedTransaction[]) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to save transaction history:", error);
  }
};
