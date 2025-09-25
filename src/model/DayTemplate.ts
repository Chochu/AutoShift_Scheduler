export interface DayTemplate {
  id: string;
  name: string;
  shifts: { type: "7AM" | "7PM" | "8AM" | "10AM"; count: number }[];
} 