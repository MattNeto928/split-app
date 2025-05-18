import AsyncStorage from '@react-native-async-storage/async-storage';
import { SplitResult, Person } from '@/types/index';

const RECEIPT_HISTORY_KEY = 'receipt_history';

export interface ReceiptHistoryItem {
  id: string;
  date: string;
  receiptImage: string;
  result: SplitResult;
  // We store the people to ensure assignments can be properly restored
  people?: Person[];
}

/**
 * Save a receipt to history
 */
export const saveReceiptToHistory = async (
  receiptImage: string, 
  result: SplitResult, 
  people?: Person[],
  existingId?: string // Add optional existing ID parameter
): Promise<string> => {
  try {
    // Get existing history
    const existingHistory = await getReceiptHistory();
    
    // If an existing ID is provided, update that item
    if (existingId) {
      let itemUpdated = false;
      const updatedHistory = existingHistory.map(item => {
        if (item.id === existingId) {
          console.log(`Updating existing history item: ${existingId}`);
          itemUpdated = true;
          return {
            ...item, // Keep original date and ID
            receiptImage,
            result,
            people, 
          };
        }
        return item;
      });

      if (itemUpdated) {
        await AsyncStorage.setItem(RECEIPT_HISTORY_KEY, JSON.stringify(updatedHistory));
        return existingId; // Return the ID that was updated
      } else {
        // ID provided but not found, treat as a new entry (fall through)
        console.warn(`Attempted to update non-existent history item: ${existingId}. Creating new entry instead.`);
      }
    }

    // If no existing ID provided (or update failed), check for duplicates before adding new
    const isDuplicate = existingHistory.some(item => {
      const existingTotal = parseFloat(item.result.total.replace(/[^0-9.]/g, ''));
      const newTotal = parseFloat(result.total.replace(/[^0-9.]/g, ''));
      
      // Consider it a duplicate if the total is the same and it was saved within the last 5 minutes
      const itemDate = new Date(item.date);
      const now = new Date();
      const timeDiff = now.getTime() - itemDate.getTime();
      const isRecent = timeDiff < 5 * 60 * 1000; // 5 minutes
      
      return Math.abs(existingTotal - newTotal) < 0.01 && isRecent;
    });
    
    if (isDuplicate && !existingId) { // Only block duplicates if not explicitly updating
      console.log('Duplicate receipt detected (time/amount), not saving to history');
      // Find the ID of the potential duplicate to return it, if possible
      const duplicateItem = existingHistory.find(item => {
        const existingTotal = parseFloat(item.result.total.replace(/[^0-9.]/g, ''));
        const newTotal = parseFloat(result.total.replace(/[^0-9.]/g, ''));
        const itemDate = new Date(item.date);
        const now = new Date();
        const timeDiff = now.getTime() - itemDate.getTime();
        const isRecent = timeDiff < 5 * 60 * 1000; // 5 minutes
        return Math.abs(existingTotal - newTotal) < 0.01 && isRecent;
      });
      return duplicateItem ? duplicateItem.id : ''; // Return existing ID or empty
    }
    
    // Generate a unique ID for this receipt (only if it's truly new)
    const id = Date.now().toString();
    
    // Create history item
    const historyItem: ReceiptHistoryItem = {
      id,
      date: new Date().toISOString(),
      receiptImage,
      result,
      people, // Include people if provided
    };
    
    // Add new item to history
    const updatedHistory = [historyItem, ...existingHistory];
    
    // Save updated history
    await AsyncStorage.setItem(RECEIPT_HISTORY_KEY, JSON.stringify(updatedHistory));
    
    return id;
  } catch (error) {
    console.error('Error saving receipt to history:', error);
    throw error;
  }
};

/**
 * Get all receipt history
 */
export const getReceiptHistory = async (): Promise<ReceiptHistoryItem[]> => {
  try {
    const historyJson = await AsyncStorage.getItem(RECEIPT_HISTORY_KEY);
    
    if (!historyJson) {
      return [];
    }
    
    return JSON.parse(historyJson) as ReceiptHistoryItem[];
  } catch (error) {
    console.error('Error getting receipt history:', error);
    return [];
  }
};

/**
 * Get a specific receipt by ID
 */
export const getReceiptById = async (id: string): Promise<ReceiptHistoryItem | null> => {
  try {
    const history = await getReceiptHistory();
    return history.find(item => item.id === id) || null;
  } catch (error) {
    console.error('Error getting receipt by ID:', error);
    return null;
  }
};

/**
 * Delete a receipt from history
 */
export const deleteReceiptFromHistory = async (id: string): Promise<boolean> => {
  try {
    const history = await getReceiptHistory();
    const updatedHistory = history.filter(item => item.id !== id);
    
    await AsyncStorage.setItem(RECEIPT_HISTORY_KEY, JSON.stringify(updatedHistory));
    return true;
  } catch (error) {
    console.error('Error deleting receipt from history:', error);
    return false;
  }
};

/**
 * Clear all receipt history
 */
export const clearReceiptHistory = async (): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(RECEIPT_HISTORY_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing receipt history:', error);
    return false;
  }
};
