// Hooks và utility functions cho production chains
export const normalizeDayKey = (dateIso: string): string => {
  return dateIso.split('T')[0]; // YYYY-MM-DD format
};

export const isWeekendDay = (dateIso: string): boolean => {
  const date = new Date(dateIso);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
};

export const getWeekendLabel = (dateIso: string): string => {
  const date = new Date(dateIso);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 ? 'Chủ nhật' : 'Thứ 7';
};

export const composeKpiCompletionKey = (chainId: number, year: number, month: number): string => {
  return `${chainId}-${year}-${month}`;
};