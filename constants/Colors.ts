/**
 * Colors for the Split app, focused on a modern financial app aesthetic.
 * The palette uses vibrant primary colors with clean neutrals.
 * Updated to better complement the Outfit font.
 */

// Primary accent colors - Shifted to a more energetic blue-purple
const primaryLight = '#5B5FFF'; // Vibrant indigo-blue for light mode
const primaryDark = '#7678FF';  // Lighter shade for dark mode

export const Colors = {
  light: {
    text: '#111827',         // Near black
    secondaryText: '#4B5563', // Medium gray for secondary text
    background: '#FFFFFF',    // Pure white
    tint: primaryLight,       // Primary accent
    icon: '#6B7280',          // Slate gray
    tabIconDefault: '#9CA3AF', // Light gray
    tabIconSelected: primaryLight,
    cardBackground: '#F9FAFB', // Very light gray
    separator: '#E5E7EB',      // Light gray separator
    success: '#10B981',        // Green for success states
    warning: '#F59E0B',        // Amber for warnings
    error: '#EF4444',          // Red for errors
  },
  dark: {
    text: '#F9FAFB',         // Near white
    secondaryText: '#D1D5DB', // Light gray for secondary text
    background: '#111827',    // Dark blue-gray
    tint: primaryDark,        // Primary accent
    icon: '#9CA3AF',          // Medium gray
    tabIconDefault: '#6B7280', // Darker gray
    tabIconSelected: primaryDark,
    cardBackground: '#1F2937', // Slightly lighter than background
    separator: '#374151',      // Medium dark separator
    success: '#34D399',        // Lighter green for dark mode
    warning: '#FBBF24',        // Lighter amber for dark mode
    error: '#F87171',          // Lighter red for dark mode
  },
};
