/**
 * @file format.ts
 * @description Central formatting helpers (currency, date, time).
 */

export const formatINR = (value: number | string | undefined | null) => {
  if (value === undefined || value === null) return '₹0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '₹0.00';

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(num);
  } catch (e) {
    return '₹' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
};
