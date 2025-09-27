export const getWeekNumber = (date: string): number => {
  // Parse date without timezone issues
  const [year, month, day] = date.split('-').map(Number);
  const d = new Date(year, month - 1, day); // month is 0-indexed
  
  const dayOfMonth = d.getDate();
  const dayOfWeek = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Find the Monday of the current week
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayOfWeek = dayOfMonth - daysToMonday;
  
  // Calculate which week of the month based on the Monday
  const weekNumber = Math.ceil(mondayOfWeek / 7);
  
  // Ensure it's between 1-4
  return Math.max(1, Math.min(4, weekNumber));
};

export const getPaycheckPeriod = (date: string): number => {
  // Paycheck periods: Week 1+2 = Period 1, Week 3+4 = Period 2
  const weekNumber = getWeekNumber(date);
  return weekNumber <= 2 ? 1 : 2;
};

export const isSameWeek = (date1: string, date2: string): boolean => {
  return getWeekNumber(date1) === getWeekNumber(date2);
};

export const isSamePaycheckPeriod = (date1: string, date2: string): boolean => {
  return getPaycheckPeriod(date1) === getPaycheckPeriod(date2);
};
