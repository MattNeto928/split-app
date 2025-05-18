import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { saveReceiptToHistory } from '@/services/storageService';
import { Person, MenuItem, SplitResult } from '@/types/index';

type SplitContextType = {
  people: Person[];
  receiptImage?: string;
  result?: SplitResult;
  addPerson: (name: string) => void;
  removePerson: (id: string) => void;
  setReceiptImage: (uri: string) => void;
  setSplitResult: (result: SplitResult) => void;
  updateMenuItem: (item: MenuItem) => void;
  assignItemToPerson: (itemId: string, personId: string, assigned: boolean) => void;
  recalculateSplitAmounts: (currentTip?: string | number) => void;
  resetReceiptData: () => void;  // Only reset receipt data, not people
  reset: () => void;  // Reset everything
  setPeople: (people: Person[]) => void;
  currentHistoryId: string | null;
  setCurrentHistoryId: (id: string | null) => void;
  updateTipAndRecalculate: (newTipAmount: number) => void;
  isResetting: boolean;
  clearResettingFlag: () => void;
};

const SplitContext = createContext<SplitContextType | undefined>(undefined);

export function SplitProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([{ id: 'me', name: 'Me' }]);
  const [receiptImage, setReceiptImage] = useState<string | undefined>();
  const [result, setResult] = useState<SplitResult | undefined>(undefined);
  const [lastSetResultTime, setLastSetResultTime] = useState<number>(0);
  const [hasDirectNavigated, setHasDirectNavigated] = useState(false);
  const [hasEmergencyNavigated, setHasEmergencyNavigated] = useState(false);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addPerson = useCallback((name: string) => {
    const id = Date.now().toString();
    setPeople((prev) => [...prev, { id, name }]);
  }, []);

  const removePerson = useCallback((id: string) => {
    if (id === 'me') return; // Cannot remove "Me"
    setPeople((prev) => prev.filter((person) => person.id !== id));

    // If we have menu items, remove this person from all assignments
    if (result?.menuItems) {
      const updatedMenuItems = result.menuItems.map(item => ({
        ...item,
        assignedTo: item.assignedTo.filter(personId => personId !== id)
      }));

      setResult(prev => prev ? {
        ...prev,
        menuItems: updatedMenuItems
      } : undefined);

      // Recalculate split amounts - after state update is applied
      // We'll handle this in a useEffect instead to avoid circular dependency
    }
  }, [result]);

  const updateMenuItem = useCallback((updatedItem: MenuItem) => {
    if (!result?.menuItems) return;

    const updatedMenuItems = result.menuItems.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    );

    setResult(prev => prev ? {
      ...prev,
      menuItems: updatedMenuItems
    } : undefined);

    // Recalculate split amounts - after state update is applied
    // We'll handle this in a useEffect instead to avoid circular dependency
  }, [result]);

  const assignItemToPerson = useCallback((itemId: string, personId: string, assigned: boolean) => {
    if (!result?.menuItems) return;

    // Log what's happening
    console.log(`Assigning item ${itemId} to person ${personId}, assigned=${assigned}`);

    const updatedMenuItems = result.menuItems.map(item => {
      if (item.id === itemId) {
        // For this item, modify its assignments
        const newAssignedTo = assigned
          ? [...item.assignedTo, personId]
          : item.assignedTo.filter(id => id !== personId);

        console.log(`Item ${item.name}, old assignments: [${item.assignedTo}], new: [${newAssignedTo}]`);

        // Create a new item object to ensure React detects the change
        return {
          ...item,
          assignedTo: newAssignedTo
        };
      }
      // Return unchanged item
      return item;
    });

    // Calculate split amounts directly in the same state update to avoid multiple rerenders
    setResult(prev => {
      if (!prev) return undefined;

      // Get updated result with new menu items
      const updatedResult = {
        ...prev,
        menuItems: updatedMenuItems
      };

      // Create a new split calculation
      const personTotals: Record<string, number> = {};

      // Initialize all people with 0
      people.forEach(person => {
        personTotals[person.id] = 0;
      });

      // Calculate total price of all assigned items
      let assignedItemsTotal = 0;

      // Loop through all menu items
      updatedMenuItems.forEach(item => {
        if (item.assignedTo.length > 0) {
          // Split this item's price equally among all assigned people
          const pricePerPerson = item.price / item.assignedTo.length;

          // Add price to each assigned person
          item.assignedTo.forEach(pid => {
            personTotals[pid] += pricePerPerson;
          });

          // Add to total assigned
          assignedItemsTotal += item.price;
        }
      });

      // Parse numeric values carefully
      let totalAmount = 0;
      let tipAmount = 0;
      let taxAmount = 0;

      try {
        // Normalize numeric values
        totalAmount = parseFloat(prev.total.toString().replace(/[^0-9.]/g, '')) || 0;
        tipAmount = parseFloat(prev.tip.toString().replace(/[^0-9.]/g, '')) || 0;
        taxAmount = parseFloat(prev.tax.toString().replace(/[^0-9.]/g, '')) || 0;

        // Validate the numbers
        if (isNaN(totalAmount)) totalAmount = 0;
        if (isNaN(tipAmount)) tipAmount = 0;
        if (isNaN(taxAmount)) taxAmount = 0;
      } catch (error) {
        console.error('Error parsing numeric values:', error);
        totalAmount = 0;
        tipAmount = 0;
        taxAmount = 0;
      }

      // First, assign all subtotal amounts (items and unassigned)

      // Calculate unassigned amount (to be split equally)
      const unassignedAmount = totalAmount - assignedItemsTotal;

      // If there are unassigned items, split them equally
      if (unassignedAmount > 0) {
        const unassignedPerPerson = unassignedAmount / people.length;

        people.forEach(person => {
          personTotals[person.id] += unassignedPerPerson;
        });
      }

      // Make a deep copy of the subtotal contributions before calculating tax and tip
      const subtotalContributions: Record<string, number> = {};
      let totalSubtotalContribution = 0;

      // Copy subtotal values for each person
      for (const personId in personTotals) {
        subtotalContributions[personId] = personTotals[personId];
        totalSubtotalContribution += personTotals[personId];
      }

      // Now calculate and add tax and tip proportionally
      if (totalSubtotalContribution > 0) {
        console.log('--------- Split Calculation ---------');
        console.log(`Subtotal: $${totalAmount - taxAmount}`);
        console.log(`Tax: $${taxAmount}`);
        console.log(`Tip: $${tipAmount}`);
        console.log(`Total bill amount: $${totalAmount + tipAmount}`);

        // Reset person totals - we'll recalculate everything based on proportions
        for (const personId in personTotals) {
          personTotals[personId] = 0;
        }

        // Calculate components for each person
        let totalCalculated = 0;
        let lastPersonId = '';

        // Log individual contributions for debugging
        console.log('Individual contributions:');

        for (const personId in subtotalContributions) {
          lastPersonId = personId;

          // Calculate what percentage of the subtotal this person contributed
          // Use safe division to avoid NaN values
          const proportion = totalSubtotalContribution > 0 ? subtotalContributions[personId] / totalSubtotalContribution : 0;

          // Calculate components of their share
          const personSubtotal = subtotalContributions[personId];
          const personTax = taxAmount * proportion;
          const personTip = tipAmount * proportion;

          // Add all components to get their total
          const personTotal = personSubtotal + personTax + personTip;
          personTotals[personId] = personTotal;

          // Keep track of running total
          totalCalculated += personTotal;

          // Log person's breakdown for debugging
          const personName = people.find(p => p.id === personId)?.name || personId;
          console.log(`${personName}: subtotal=$${personSubtotal.toFixed(2)}, tax=$${personTax.toFixed(2)}, tip=$${personTip.toFixed(2)}, total=$${personTotal.toFixed(2)}`);
        }

        // Check for rounding errors - ensure the sum equals the total bill
        const expectedTotal = totalAmount + tipAmount;
        const roundingError = expectedTotal - totalCalculated;

        console.log(`Sum of all shares: $${totalCalculated.toFixed(2)}`);
        console.log(`Expected total: $${expectedTotal.toFixed(2)}`);
        console.log(`Rounding error: $${roundingError.toFixed(2)}`);

        // If there's a rounding error, apply it to the last person
        if (Math.abs(roundingError) > 0.001 && lastPersonId) {
          const personName = people.find(p => p.id === lastPersonId)?.name || lastPersonId;

          // Apply the correction
          personTotals[lastPersonId] += roundingError;
          console.log(`Applied rounding correction of $${roundingError.toFixed(2)} to ${personName}`);
          console.log(`${personName}'s new total: $${personTotals[lastPersonId].toFixed(2)}`);
        }

        console.log('-----------------------------------');
      }

      // Format the final split amounts
      const splitAmounts = people.map(person => ({
        personId: person.id,
        amount: personTotals[person.id].toFixed(2)
      }));

      // Log the new amounts
      console.log('New split amounts calculated', splitAmounts);

      // Return the complete updated result
      return {
        ...updatedResult,
        splitAmounts
      };
    });
  }, [result, people]);

  const recalculateSplitAmounts = useCallback((currentTip?: string | number) => {
    // Single log at start of function - reduce frequency of logging
    console.log('Recalculating split amounts');

    if (!result) {
      console.log('[MATH] Recalc aborted: result is not available.');
      return;
    }

    const tipToUse = typeof currentTip !== 'undefined' ? currentTip : result.tip;
    
    // Parse numeric values carefully
    let totalAmount = 0, tipAmount = 0, taxAmount = 0;
    try {
      totalAmount = parseFloat(result.total.toString().replace(/[^0-9.]/g, '')) || 0;
      tipAmount = parseFloat(tipToUse.toString().replace(/[^0-9.]/g, '')) || 0;
      taxAmount = parseFloat(result.tax.toString().replace(/[^0-9.]/g, '')) || 0;
      if (isNaN(totalAmount) || isNaN(tipAmount) || isNaN(taxAmount)) {
        throw new Error('Parsed value is NaN');
      }
    } catch (error) {
      console.error('[MATH] Error parsing numeric values:', error);
      setResult(prev => prev ? { ...prev, splitAmounts: [] } : undefined); // Clear amounts on error
      return;
    }

    const subtotal = totalAmount - taxAmount;
    
    // Step 1: Calculate each person's share of items + unassigned (subtotal only)
    const personItemTotals: Record<string, number> = {};
    let assignedItemsTotal = 0;
    people.forEach(person => { personItemTotals[person.id] = 0; });

    if (result.menuItems) {
      result.menuItems.forEach(item => {
        if (item.assignedTo.length > 0) {
          const pricePerPerson = item.price / item.assignedTo.length;
          item.assignedTo.forEach(personId => {
            if (personItemTotals[personId] !== undefined) {
              personItemTotals[personId] += pricePerPerson;
            }
          });
          assignedItemsTotal += item.price;
        }
      });
    }

    const unassignedAmount = subtotal - assignedItemsTotal;

    if (unassignedAmount > 0.001 && people.length > 0) { // Allow small tolerance for float issues
      const unassignedPerPerson = unassignedAmount / people.length;
      people.forEach(person => {
        personItemTotals[person.id] += unassignedPerPerson;
      });
    } else if (unassignedAmount < -0.001) {
       console.warn(`[MATH] Warning: Unassigned amount is negative ($${unassignedAmount.toFixed(2)}). Check item prices vs subtotal.`);
    }

    // Step 2: Calculate total subtotal contribution
    let totalSubtotalContribution = 0;
    for (const personId in personItemTotals) {
      totalSubtotalContribution += personItemTotals[personId];
    }
    
    // Sanity check against calculated subtotal
    if (Math.abs(totalSubtotalContribution - subtotal) > 0.01) {
       console.warn(`[MATH] Mismatch between Subtotal ($${subtotal.toFixed(2)}) and Sum of Shares ($${totalSubtotalContribution.toFixed(2)})`);
    }

    // Step 3: Calculate final totals including tax and tip proportionally
    const personTotals: Record<string, number> = {};
    let totalCalculated = 0;
    let lastPersonId = people[people.length - 1]?.id || ''; // Assign last person for rounding

    for (const person of people) {
        const personId = person.id;
        const personSubtotalShare = personItemTotals[personId] || 0;

        // Calculate proportion based on this person's share of the *total calculated subtotal contribution*
        const proportion = totalSubtotalContribution > 0 ? personSubtotalShare / totalSubtotalContribution : (1 / people.length); // Equal split if subtotal is 0

        const personTax = taxAmount * proportion;
        const personTip = tipAmount * proportion;
        const personTotal = personSubtotalShare + personTax + personTip;
        personTotals[personId] = personTotal;
        totalCalculated += personTotal;
    }

    // Step 4: Apply Rounding Correction
    const expectedTotal = subtotal + taxAmount + tipAmount;
    const roundingError = expectedTotal - totalCalculated;

    if (Math.abs(roundingError) > 0.001 && lastPersonId && personTotals[lastPersonId] !== undefined) {
      personTotals[lastPersonId] += roundingError;
    }

    // Step 5: Format final amounts
    const splitAmounts = people.map(person => ({
      personId: person.id,
      amount: personTotals[person.id]?.toFixed(2) || '0.00' // Add fallback for safety
    }));
    
    // Final log with result
    console.log('[MATH] Recalculation complete');

    // Step 6: Update state
    setResult(prev => {
      if (!prev) return undefined;
      // Ensure we only update splitAmounts, preserving the rest (including the correct tip value)
      return { ...prev, splitAmounts };
    });

  }, [result, people, setResult]);

  const updateTipAndRecalculate = useCallback((newTipAmount: number) => {
    if (!result) {
      console.error("Cannot update tip: result is not set.");
      return;
    }
    /* --- TEMPORARILY COMMENT OUT FOR DEBUGGING --- 
    if (currentHistoryId) {
      console.log("Skipping direct tip update/recalculate: Editing from history.");
      // When editing history, we don't want immediate recalc on load, 
      // rely on the useEffect if needed later, or manual recalc on results screen if user edits tip there.
      return; 
    }
    */

    const formattedTip = newTipAmount.toFixed(2);
    console.log(`Context: Updating tip to $${formattedTip} AND recalculating immediately.`);

    // 1. Update the state
    setResult(prevResult => ({
      ...(prevResult || { menuItems: [], total: '0', tax: '0', tip: '0', splitAmounts: [], restaurantName: '' }), // Ensure prevResult is not null
      tip: formattedTip
    }));

    // 2. Immediately call recalculate, passing the *numerical* value
    // Use requestAnimationFrame or setTimeout(0) to ensure state update has likely propagated
    // before recalculation reads other parts of the result state.
    requestAnimationFrame(() => {
        recalculateSplitAmounts(newTipAmount);
    });

  }, [result, currentHistoryId, setResult, recalculateSplitAmounts]);

  const setSplitResult = useCallback((newResult: SplitResult) => {
    // Initialize menu items with empty assignments if they don't exist
    const menuItems = newResult.menuItems || [];

    // Log the relevant values
    console.log('📊 Setting split result with tip:', newResult.tip);

    // Record the timestamp of this state update for the navigation watcher
    const now = Date.now();
    setLastSetResultTime(now);

    // Log info but don't do any navigation
    if (menuItems && menuItems.length > 0) {
      console.log('📊 Valid result set with menu items - ready for display');

      // Enhanced logging for item quantities
      console.log('Menu Items Details:');
      menuItems.forEach((item, index) => {
        console.log(`  ${index+1}. ${item.name} - $${item.price.toFixed(2)}`);
        // If the item name contains any indication of quantity, log it
        const hasQuantityIndicator =
          item.name.match(/\((\d+)\/(\d+)\)/) || // Matches "(1/2)"
          item.name.includes('x') || // Matches "2x" or "x2"
          item.name.includes('qty');

        if (hasQuantityIndicator) {
          console.log(`     ↳ Item appears to be part of a quantity set: ${item.name}`);
        }
      });

      // Set flag for logging only, no navigation side effects
      // Navigation is completely handled by the process screen
      if (newResult.total) {
        console.log(`Total amount processed: ${newResult.total}, with ${menuItems.length} items`);
      }
    }

    // Set result state without any side effects or dependencies on navigation
    setResult(prev => {
      // Use functional update to ensure we're working with the latest state
      return {
        ...newResult,
        menuItems: menuItems.map(item => {
          // Ensure all items have proper structure to prevent rerenders due to missing fields
          return {
            id: item.id || String(Date.now() + Math.random()),
            name: item.name || 'Unnamed item',
            price: item.price || 0,
            assignedTo: item.assignedTo || []
          };
        })
      };
    });
  }, []);

  // Split the reset function to provide more control
  const resetReceiptData = useCallback(() => {
    console.log('🔄 Resetting Receipt Data...');
    setReceiptImage(undefined);
    setResult(undefined);
    setCurrentHistoryId(null);
    console.log('🔄 currentHistoryId set to null');
    setHasDirectNavigated(false);   // Reset navigation flags
    setHasEmergencyNavigated(false);
  }, [setHasDirectNavigated, setHasEmergencyNavigated]);

  const reset = useCallback(() => {
    console.log('🔄 Calling Full Reset...');
    setIsResetting(true); // Set flag immediately

    // Clear any previous reset timeout (good practice, though shouldn't be needed now)
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
    
    // Reset state first
    setPeople([{ id: 'me', name: 'Me' }]);
    resetReceiptData();
    
    // Navigate home immediately
    console.log('🔄 Reset state complete, navigating to home (/tabs)...');
    router.replace('/(tabs)');

    // --- REMOVED setTimeout to clear isResetting --- 

  }, [resetReceiptData, router]);

  // Function to manually clear the flag (called from HomeScreen)
  const clearResettingFlag = useCallback(() => {
    if (isResetting) {
      console.log('🔄 Manually clearing isResetting flag.');
      setIsResetting(false);
    }
  }, [isResetting]);

  // Cleanup timeout ref just in case (shouldn't be necessary)
  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  // Effect to recalculate split amounts when result or people change
  useEffect(() => {
    // ---> ADD CHECK: Only run if NOT loading/editing from history <---
    if (currentHistoryId) {
      console.log('Skipping recalculation effect: Editing from history.');
      return;
    }

    // Check if we have a result and items/tip to potentially trigger recalculation
    if (result && (result.menuItems || typeof result.tip !== 'undefined')) {
      // ---> Add more detailed logging <---
      const changedField = result.menuItems ? 'menuItems/people' : 'tip';
      console.log(`Recalculation useEffect triggered by change in: ${changedField}`);
      
      // Get the current tip value to pass
      const currentTipValue = result.tip;
      console.log(`>> useEffect: Current tip value before setTimeout: ${currentTipValue}`);

      // Call recalculateSplitAmounts, maybe with a small delay to ensure state settles
      const timer = setTimeout(() => {
        // Check result and history ID again inside timeout
        if (result && !currentHistoryId) { 
           console.log(`>> useEffect->setTimeout: Calling recalculateSplitAmounts with tip: ${currentTipValue}`);
           recalculateSplitAmounts(currentTipValue); // Pass the current tip value
        }
      }, 50); // Small delay

      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.menuItems, result?.tip, people, currentHistoryId]); // REMOVED recalculateSplitAmounts

  // Disable emergency navigation - it was causing issues
  useEffect(() => {
    // Only log that emergency navigation is disabled
    if (result && result.menuItems && result.menuItems.length > 0 && lastSetResultTime > 0) {
      console.log('⚠️ EMERGENCY NAVIGATION: Disabled to prevent navigation conflicts');
    }
  }, [result, lastSetResultTime]);

  // Also disable the direct navigation in setSplitResult by moving it to a separate effect
  useEffect(() => {
    // Navigation is now handled by the process screen only
    console.log('SplitContext initialized, navigation handled by process screen');

    // Get user device info for debugging
    const deviceInfo = Platform.OS + ' ' + Platform.Version;
    console.log('Running on device:', deviceInfo);

    // Warn about multiple updates that could cause navigation issues
    if (result && result.menuItems && result.menuItems.length > 0) {
      console.log('SplitContext has valid result data on init');
    }
  }, [result]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    people,
    receiptImage,
    result,
    addPerson,
    removePerson,
    setReceiptImage,
    setSplitResult,
    updateMenuItem,
    assignItemToPerson,
    recalculateSplitAmounts,
    resetReceiptData,
    reset,
    setPeople,
    currentHistoryId,
    setCurrentHistoryId,
    updateTipAndRecalculate,
    isResetting,
    clearResettingFlag,
  }), [
    people,
    receiptImage,
    result,
    addPerson,
    removePerson,
    setReceiptImage,
    setSplitResult,
    updateMenuItem,
    assignItemToPerson,
    recalculateSplitAmounts,
    resetReceiptData,
    reset,
    setPeople,
    currentHistoryId,
    setCurrentHistoryId,
    updateTipAndRecalculate,
    isResetting,
    clearResettingFlag,
  ]);

  return (
    <SplitContext.Provider value={contextValue}>
      {children}
    </SplitContext.Provider>
  );
}

export function useSplitContext() {
  const context = useContext(SplitContext);
  if (!context) {
    throw new Error('useSplitContext must be used within a SplitProvider');
  }
  return context;
}