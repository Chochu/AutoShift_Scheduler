export interface Shift {
  id: string;
  date: string;
  type: "7AM" | "7PM" | "8AM" | "10AM";
  assignedPA: string | null;
  paId: string | null;
}