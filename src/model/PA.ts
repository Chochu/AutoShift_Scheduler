export interface PA {
  id: string;
  name: string;
  shiftsWorked: number;
  maxShifts: number;
  assignedShifts: number;
  overnightShifts: number;
  weekendShifts: number;
  lastOvernightDate: string | null;
  requestedWorkDays: string[];
  requestedDaysOff: string[];
  available?: boolean;
} 