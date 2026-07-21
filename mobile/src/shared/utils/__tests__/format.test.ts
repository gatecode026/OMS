import { formatINR } from '../format';

describe('formatINR utility', () => {
  it('should format numbers to INR currency structure', () => {
    expect(formatINR(1000)).toMatch(/₹\s*1,000\.00/);
    expect(formatINR(123456.78)).toMatch(/₹\s*1,23,456\.78/);
  });

  it('should parse strings and format correctly', () => {
    expect(formatINR('5000')).toMatch(/₹\s*5,000\.00/);
  });

  it('should return ₹0.00 for invalid inputs', () => {
    expect(formatINR(undefined)).toBe('₹0.00');
    expect(formatINR(null)).toBe('₹0.00');
    expect(formatINR('invalid-number')).toBe('₹0.00');
  });
});
