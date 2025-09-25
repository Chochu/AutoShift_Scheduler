export const getWeekNumber = (date: string): number => {
  const d = new Date(date);
  const dayOfMonth = d.getDate();
  
  // Calculate which week of the month (1-4)
  const weekNumber = Math.ceil(dayOfMonth / 7);
  
  return weekNumber;
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
