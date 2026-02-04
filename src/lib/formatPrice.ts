// Format price with Vietnamese locale (commas as thousand separators)
export const formatPriceInput = (value: string): string => {
  // Remove all non-digit characters
  const numericValue = value.replace(/\D/g, '');
  
  // Format with commas
  if (numericValue === '') return '';
  
  return new Intl.NumberFormat('vi-VN').format(parseInt(numericValue, 10));
};

// Parse formatted price back to number
export const parsePriceInput = (formattedValue: string): number => {
  // Remove all non-digit characters and parse
  const numericValue = formattedValue.replace(/\D/g, '');
  return parseInt(numericValue, 10) || 0;
};

// Format price for display with currency
export const formatPriceDisplay = (price: number): string => {
  return new Intl.NumberFormat('vi-VN', { 
    style: 'currency', 
    currency: 'VND' 
  }).format(price);
};
