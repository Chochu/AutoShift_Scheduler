export interface ShiftColorConfig {
  backgroundColor: string;
  textColor: 'white' | 'black';
}

export const getShiftColor = (type: string): ShiftColorConfig => {
  switch (type) {
    case '7AM': return { backgroundColor: '#395756', textColor: 'white' }; // Dark green
    case '7PM': return { backgroundColor: '#1B3022', textColor: 'white' }; // Dark slate gray
    case '8AM': return { backgroundColor: '#4F5D75', textColor: 'white' }; // Payne's gray
    case '10AM': return { backgroundColor: '#7261A3', textColor: 'white' }; // Ultra Violet
    default: return { backgroundColor: '#A67DB8', textColor: 'white' }; // African Violet
  }
};

export const SHIFT_COLORS = {
  '7AM': { backgroundColor: '#395756', textColor: 'white' as const }, // Dark green
  '7PM': { backgroundColor: '#1B3022', textColor: 'white' as const }, // Dark slate gray
  '8AM': { backgroundColor: '#4F5D75', textColor: 'white' as const }, // Payne's gray
  '10AM': { backgroundColor: '#7261A3', textColor: 'white' as const }, // Ultra Violet
} as const;

export type ShiftType = keyof typeof SHIFT_COLORS; 