export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateToBenin(isoString: string | Date, options?: Intl.DateTimeFormatOptions): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Lagos' // Benin time (UTC+1)
  };

  return date.toLocaleString('fr-FR', { ...defaultOptions, ...options });
}
