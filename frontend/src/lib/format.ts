const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const formatPrice = (value: number): string => usd.format(value);
export const PLACEHOLDER_IMAGE = '/placeholder-car.svg';
