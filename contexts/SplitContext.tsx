import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';

type Person = {
  id: string;
  name: string;
};

type MenuItem = {
  id: string;
  name: string;
  price: number;
  assignedTo: string[];
};

type SplitResult = {
  total: string;
  tax: string;
  tip: string;
  menuItems?: MenuItem[];
  splitAmounts: {
    personId: string;
    amount: string;
  }[];
};

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
  recalculateSplitAmounts: () => void;
  resetReceiptData: () => void;  // Only reset receipt data, not people
  reset: () => void;  // Reset everything
};

const SplitContext = createContext<SplitContextType | undefined>(undefined);

export function SplitProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([{ id: 'me', name: 'Me' }]);
  const [receiptImage, setReceiptImage] = useState<string | undefined>();
  const [result, setResult] = useState<SplitResult | undefined>();
  const [lastSetResultTime, setLastSetResultTime] = useState<number>(0);
  const [hasDirectNavigated, setHasDirectNavigated] = useState(false);
  const [hasEmergencyNavigated, setHasEmergencyNavigated] = useState(false);

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
          const proportion = subtotalContributions[personId] / totalSubtotalContribution;
          
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

  const recalculateSplitAmounts = useCallback(() => {
    console.log('Recalculating split amounts');
    
    if (!result) {
      console.log('No result available for split amount calculation');
      return;
    }
    
    // Make sure we have the latest tip value
    console.log('Starting recalculation with tip value:', result.tip);
    
    // Calculate how much each person owes based on item assignments
    const personTotals: Record<string, number> = {};
    
    // Initialize all people with 0
    people.forEach(person => {
      personTotals[person.id] = 0;
    });
    
    // Calculate total price of all assigned items
    let assignedItemsTotal = 0;
    
    if (result.menuItems) {
      result.menuItems.forEach(item => {
        if (item.assignedTo.length > 0) {
          // Split this item's price equally among all assigned people
          const pricePerPerson = item.price / item.assignedTo.length;
          
          item.assignedTo.forEach(personId => {
            personTotals[personId] += pricePerPerson;
          });
          
          assignedItemsTotal += item.price;
        }
      });
    }
    
    // Parse numeric values carefully, with fallbacks for invalid values
    let totalAmount = 0;
    let tipAmount = 0;
    let taxAmount = 0;
    
    try {
      // Normalize numeric values by removing any non-numeric characters except decimal point
      totalAmount = parseFloat(result.total.toString().replace(/[^0-9.]/g, '')) || 0;
      tipAmount = parseFloat(result.tip.toString().replace(/[^0-9.]/g, '')) || 0;
      taxAmount = parseFloat(result.tax.toString().replace(/[^0-9.]/g, '')) || 0;
      
      // Validate the numbers
      if (isNaN(totalAmount)) totalAmount = 0;
      if (isNaN(tipAmount)) tipAmount = 0;
      if (isNaN(taxAmount)) taxAmount = 0;
      
      console.log('Split calculation values:', { totalAmount, tipAmount, taxAmount, assignedItemsTotal });
    } catch (error) {
      console.error('Error parsing numeric values:', error);
      // Use sensible defaults if parsing fails
      totalAmount = 0;
      tipAmount = 0;
      taxAmount = 0;
    }
    
    // First, assign all subtotal amounts (items and unassigned)
    
    // Calculate unassigned amount (to be split equally) - using only the base total without tip
    // This ensures we're only working with the pre-tip amount at this stage
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
    
    // Calculate the actual subtotal (total minus tax)
    const actualSubtotal = totalAmount - taxAmount;
    
    // Now calculate and add tax and tip proportionally
    if (totalSubtotalContribution > 0) {
      console.log('--------- Split Calculation ---------');
      console.log(`Subtotal: $${actualSubtotal}`);
      console.log(`Tax: $${taxAmount}`);
      console.log(`Tip: $${tipAmount}`);
      console.log(`Total bill amount: $${totalAmount + tipAmount}`);
      
      // Reset person totals - we'll recalculate everything based on proportions
      // This ensures we're starting fresh for the final calculation
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
        const proportion = subtotalContributions[personId] / totalSubtotalContribution;
        
        // Calculate components of their share
        const personSubtotal = subtotalContributions[personId];
        const personTax = taxAmount * proportion;
        const personTip = tipAmount * proportion; // Explicitly calculate tip proportionally
        
        // Add all components to get their total - making sure tip is included
        const personTotal = personSubtotal + personTax + personTip;
        personTotals[personId] = personTotal;
        
        // Keep track of running total
        totalCalculated += personTotal;
        
        // Log person's breakdown for debugging
        const personName = people.find(p => p.id === personId)?.name || personId;
        console.log(`${personName}: subtotal=$${personSubtotal.toFixed(2)}, tax=$${personTax.toFixed(2)}, tip=$${personTip.toFixed(2)}, total=$${personTotal.toFixed(2)}`);
      }
      
      // Check for rounding errors - ensure the sum equals the total bill WITH TIP
      const expectedTotal = totalAmount + tipAmount;
      const roundingError = expectedTotal - totalCalculated;
      
      console.log(`Sum of all shares: $${totalCalculated.toFixed(2)}`);
      console.log(`Expected total with tip: $${expectedTotal.toFixed(2)}`);
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
    
    console.log('New split amounts calculated:', splitAmounts);
    
    // Update the state with the new split amounts
    setResult(prev => {
      if (!prev) return undefined;
      
      // Create updated result with splitAmounts but preserve the original tip value
      const updatedResult = {
        ...prev,
        splitAmounts
      };
      
      return updatedResult;
    });
    
    console.log('Split amounts updated in state');
  }, [result, people]);

  // Navigation state is defined at the top of the component
  
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
    setReceiptImage(undefined);
    setResult(undefined);
    setHasDirectNavigated(false);   // Reset navigation flags
    setHasEmergencyNavigated(false);
  }, [setHasDirectNavigated, setHasEmergencyNavigated]);
  
  const reset = useCallback(() => {
    setPeople([{ id: 'me', name: 'Me' }]);
    resetReceiptData();
  }, [resetReceiptData]);

  // Both navigation state variables are defined at the top of the component
  
  // Effect to recalculate split amounts when result or people change
  useEffect(() => {
    // This will fix circular dependency issues
    if (result?.menuItems && result.menuItems.length > 0) {
      // Only recalculate if we have menu items to work with
      console.log('Result or people changed, recalculating split amounts');
      
      // Call recalculateSplitAmounts here now that it's properly defined
      // Using a small timeout to ensure state updates are applied first
      const timer = setTimeout(() => {
        if (result) {
          recalculateSplitAmounts();
        }
      }, 50);
      
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.menuItems, result?.tip, people.length]); // more specific dependencies to avoid circular issues
  
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
    reset
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