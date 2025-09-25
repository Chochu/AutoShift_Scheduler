import { Shift } from "@/model/Shift";
import { PA } from "@/model/PA";
import { PerDiem } from "@/model/PerDiem";
import { getWeekNumber, getPaycheckPeriod, isSameWeek, isSamePaycheckPeriod } from "@/utils/weekNumber";

interface PAEntry {
  'Name(ID)': string;
}

interface PerDiemEntry {
  'Name(ID)': string;
  'Dates Available to Work Start': string;
  'Dates Available to Work End': string;
}

interface WorkDayEntry {
  'Name(ID)': string;
  Date: string;
  Shift: string;
}

interface DayOffEntry {
  'Name(ID)': string;
  Date: string;
}

export interface SchedulingData {
  paList?: PAEntry[];
  perDiemList?: PerDiemEntry[];
  requestedWorkDays?: WorkDayEntry[];
  requestedDaysOff?: DayOffEntry[];
}

export interface SchedulingResult {
  updatedShifts: Shift[];
  updatedPAs: PA[];
}

export class SchedulingService {
  private isWeekend(date: string): boolean {
    const d = new Date(date);
    return d.getDay() === 0 || d.getDay() === 6; // Sunday or Saturday
  }

  private isOvernight(shiftType: string): boolean {
    return shiftType === '7PM';
  }

  private getDaysBetween(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private canAssignPA(pa: PA, shift: Shift, existingShifts: Shift[]): { canAssign: boolean; reason?: string } {
    // Check if PA has reached max shifts (12 per month)
    if (pa.assignedShifts >= pa.maxShifts) {
      return { canAssign: false, reason: 'Max shifts reached (12 per month)' };
    }

    // Rule 7: Each slot is a position a PA can work in. So on the same day, it's impossible for a PA to fill two slots
    const alreadyAssignedToday = existingShifts.filter(s => 
      s.date === shift.date && s.paId === pa.id
    );
    if (alreadyAssignedToday.length > 0) {
      return { canAssign: false, reason: 'Already assigned to another shift today - each slot is a separate position' };
    }

    // Check day off request
    const paDayOff = pa.requestedDaysOff.includes(shift.date);
    if (paDayOff) {
      return { canAssign: false, reason: 'Requested day off' };
    }

    // Rule 2: If they work overnight shift, they get next 2 days off
    if (pa.lastOvernightDate) {
      const daysSinceOvernight = this.getDaysBetween(pa.lastOvernightDate, shift.date);
      if (daysSinceOvernight < 2) {
        return { canAssign: false, reason: 'Must have 2 days off after overnight shift' };
      }
    }

    // Rule 3: PA must rest for 11 hours before returning to work
    const previousShift = existingShifts
      .filter(s => s.paId === pa.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    
    if (previousShift) {
      const daysBetween = this.getDaysBetween(previousShift.date, shift.date);
      if (daysBetween < 1) {
        return { canAssign: false, reason: '11-hour rest required between shifts' };
      }
    }

    // Rule 8: No more than 3 consecutive shifts in a row
    const paShifts = existingShifts
      .filter(s => s.paId === pa.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (paShifts.length >= 3) {
      // Check the last 3 shifts to see if they're consecutive
      const lastThreeShifts = paShifts.slice(-3);
      let consecutiveCount = 1;
      
      for (let i = lastThreeShifts.length - 1; i > 0; i--) {
        const currentDate = new Date(lastThreeShifts[i].date);
        const previousDate = new Date(lastThreeShifts[i - 1].date);
        const daysDiff = this.getDaysBetween(previousDate.toISOString().split('T')[0], currentDate.toISOString().split('T')[0]);
        
        if (daysDiff === 1) {
          consecutiveCount++;
        } else {
          break;
        }
      }
      
      if (consecutiveCount >= 3) {
        return { canAssign: false, reason: 'Max 3 consecutive shifts in a row' };
      }
    }

    // Rule 5: PA work total of 6 shifts max every paycheck (Week 1+2 | Week 3+4)
    const currentPaycheckPeriod = getPaycheckPeriod(shift.date);
    const paShiftsThisPaycheck = existingShifts.filter(s => 
      s.paId === pa.id && 
      isSamePaycheckPeriod(s.date, shift.date)
    ).length;

    // Debug logging for paycheck period violations
    if (paShiftsThisPaycheck >= 6) {
      console.log(`PA ${pa.name} has ${paShiftsThisPaycheck} shifts in Period ${currentPaycheckPeriod} - blocking assignment to ${shift.date}`);
      return { canAssign: false, reason: `Max 6 shifts per paycheck period (has ${paShiftsThisPaycheck})` };
    }

    // Rule 1: PA overnight shift rules (2 overnight shifts every other week)
    if (this.isOvernight(shift.type)) {
      const currentWeek = getWeekNumber(shift.date);
      const paOvernightShiftsThisWeek = existingShifts.filter(s => 
        s.paId === pa.id && 
        s.type === '7PM' && 
        isSameWeek(s.date, shift.date)
      ).length;

      // Check if PA worked overnight shifts in the previous week
      const previousWeek = currentWeek - 1;
      const paOvernightShiftsPreviousWeek = existingShifts.filter(s => 
        s.paId === pa.id && 
        s.type === '7PM' && 
        getWeekNumber(s.date) === previousWeek
      ).length;

      // If PA worked overnight shifts in previous week, they can't work overnight this week
      if (paOvernightShiftsPreviousWeek > 0) {
        return { canAssign: false, reason: 'No consecutive overnight weeks - must alternate' };
      }

      // Check if PA has reached max overnight shifts for this week (2 max)
      if (paOvernightShiftsThisWeek >= 2) {
        return { canAssign: false, reason: 'Max 2 overnight shifts per week' };
      }
    }

    // Rule 4: PA must work 2 weekend shifts per month (prioritize PAs with fewer weekend shifts)
    if (this.isWeekend(shift.date)) {
      const paWeekendShiftsThisMonth = existingShifts.filter(s => 
        s.paId === pa.id && 
        this.isWeekend(s.date) &&
        new Date(s.date).getMonth() === new Date(shift.date).getMonth() &&
        new Date(s.date).getFullYear() === new Date(shift.date).getFullYear()
      ).length;

      // Allow up to 2 weekend shifts per month, but prioritize PAs with fewer weekend shifts
      if (paWeekendShiftsThisMonth >= 2) {
        return { canAssign: false, reason: 'Max 2 weekend shifts per month' };
      }
    }

    return { canAssign: true };
  }

  private canAssignPerDiem(perDiem: PerDiem, shift: Shift, existingShifts: Shift[]): { canAssign: boolean; reason?: string } {
    // Check if Per Diem is available during this date range
    const shiftDate = new Date(shift.date);
    const availableStart = new Date(perDiem.availableStart);
    const availableEnd = new Date(perDiem.availableEnd);

    if (shiftDate < availableStart || shiftDate > availableEnd) {
      return { canAssign: false, reason: 'Not available during this date range' };
    }

    // Check if Per Diem is already assigned to this date
    const alreadyAssignedToday = existingShifts.filter(s => 
      s.date === shift.date && s.paId === perDiem.id
    );
    if (alreadyAssignedToday.length > 0) {
      return { canAssign: false, reason: 'Already assigned today' };
    }

    return { canAssign: true };
  }

  private assignStaffToShift(
    shift: Shift, 
    processedPAs: PA[], 
    processedPerDiem: PerDiem[], 
    existingShifts: Shift[]
  ): { assigned: boolean; staffId?: string; staffName?: string; reason?: string } {
    // Sort PAs by weekend shift count (prioritize those with fewer weekend shifts)
    const sortedPAs = [...processedPAs].sort((a, b) => {
      const aWeekendShifts = existingShifts.filter(s => 
        s.paId === a.id && this.isWeekend(s.date)
      ).length;
      const bWeekendShifts = existingShifts.filter(s => 
        s.paId === b.id && this.isWeekend(s.date)
      ).length;
      return aWeekendShifts - bWeekendShifts;
    });

    // Try PAs first
    for (const pa of sortedPAs) {
      const canAssign = this.canAssignPA(pa, shift, existingShifts);
      if (canAssign.canAssign) {
        return { 
          assigned: true, 
          staffId: pa.id, 
          staffName: pa.name,
          reason: 'PA assigned'
        };
      }
    }

    // Try Per Diem if no PA available
    for (const perDiem of processedPerDiem) {
      const canAssign = this.canAssignPerDiem(perDiem, shift, existingShifts);
      if (canAssign.canAssign) {
        return { 
          assigned: true, 
          staffId: perDiem.id, 
          staffName: perDiem.name,
          reason: 'Per Diem assigned'
        };
      }
    }

    return { assigned: false, reason: 'No available staff' };
  }

  public generateSchedule(
    shifts: Shift[], 
    data: SchedulingData
  ): SchedulingResult {
    const { paList = [], perDiemList = [], requestedWorkDays = [], requestedDaysOff = [] } = data;

    // Add debugging
    console.log('PA List:', paList);
    console.log('Requested Work Days:', requestedWorkDays);
    console.log('Requested Days Off:', requestedDaysOff);

    // Process PAs with self-assigned shifts
    const processedPAs: PA[] = paList.map((pa: PAEntry) => {
      // Extract PA ID from the "Name(ID)" format
      const paId = pa['Name(ID)'] ? pa['Name(ID)'].split('(')[1]?.replace(')', '') : '';
      
      const paWorkDays = requestedWorkDays.filter((workDay: WorkDayEntry) => {
        // Extract work day PA ID
        const workDayPAId = workDay['Name(ID)'] ? 
          workDay['Name(ID)'].split('(')[1]?.replace(')', '') : null;
        return workDayPAId === paId;
      });
      
      const paDaysOff = requestedDaysOff.filter((dayOff: DayOffEntry) => {
        // Extract day off PA ID
        const dayOffPAId = dayOff['Name(ID)'] ? 
          dayOff['Name(ID)'].split('(')[1]?.replace(')', '') : null;
        return dayOffPAId === paId;
      });

      console.log(`PA ${paId}: Work Days: ${paWorkDays.length}, Days Off: ${paDaysOff.length}`);

      return {
        id: paId,
        name: pa['Name(ID)'] ? pa['Name(ID)'].split('(')[0].trim() : '',
        shiftsWorked: 0,
        maxShifts: 12, // 12 shifts per month
        assignedShifts: paWorkDays.length, // Self-assigned shifts
        overnightShifts: 0,
        weekendShifts: 0,
        lastOvernightDate: null,
        requestedWorkDays: paWorkDays.map((wd: WorkDayEntry) => wd.Date),
        requestedDaysOff: paDaysOff.map((dayOff: DayOffEntry) => dayOff.Date),
        available: true
      };
    });

    // Process Per Diem
    const processedPerDiem: PerDiem[] = perDiemList.map((pd: PerDiemEntry) => ({
      id: pd['Name(ID)'] ? pd['Name(ID)'].split('(')[1]?.replace(')', '') : '',
      name: pd['Name(ID)'] ? pd['Name(ID)'].split('(')[0].trim() : '',
      shiftsWorked: 0,
      availableStart: pd['Dates Available to Work Start'],  // Using the correct property name
      availableEnd: pd['Dates Available to Work End']      // Using the correct property name
    }));

    // Sort shifts by date to process chronologically
    const sortedShifts = [...shifts].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const updatedShifts: Shift[] = [];
    const updatedPAs: PA[] = [...processedPAs];

    // Step 1: Fill in self-assigned shifts first
    for (const shift of sortedShifts) {
      // Check if this shift matches a PA's requested work day
      const matchingWorkDay = requestedWorkDays.find((workDay: WorkDayEntry) => {
        // Extract PA ID from the work day entry
        const workDayPAId = workDay['Name(ID)'] ? 
          workDay['Name(ID)'].split('(')[1]?.replace(')', '') : null;
        
        return workDayPAId && 
               workDay.Date === shift.date && 
               workDay.Shift === shift.type;
      });

      if (matchingWorkDay) {
        // Extract PA ID
        const workDayPAId = matchingWorkDay['Name(ID)'].split('(')[1]?.replace(')', '');
        
        // Find the corresponding PA
        const matchingPA = processedPAs.find(pa => pa.id === workDayPAId);
        
        if (matchingPA) {
          // Check if PA is already assigned to another shift on the same day
          const alreadyAssignedToday = updatedShifts.filter(s => 
            s.date === shift.date && s.paId === matchingPA.id
          );
          
          if (alreadyAssignedToday.length > 0) {
            // PA is already assigned to another shift today, skip this self-assignment
            console.log(`Skipping self-assignment for ${matchingPA.name} on ${shift.date} - already assigned to another shift today`);
            updatedShifts.push({
              ...shift,
              assignedPA: null,
              paId: null
            });
          } else {
            // Check paycheck period limit for self-assigned shifts too
            const currentPaycheckPeriod = getPaycheckPeriod(shift.date);
            const paShiftsThisPaycheck = updatedShifts.filter(s => 
              s.paId === matchingPA.id && 
              isSamePaycheckPeriod(s.date, shift.date)
            ).length;

            if (paShiftsThisPaycheck >= 6) {
              console.log(`Skipping self-assignment for ${matchingPA.name} on ${shift.date} - already has ${paShiftsThisPaycheck} shifts in Period ${currentPaycheckPeriod}`);
              updatedShifts.push({
                ...shift,
                assignedPA: null,
                paId: null
              });
            } else {
              // Check Rule 8: No more than 3 consecutive shifts for self-assigned shifts
              const paShifts = updatedShifts
                .filter(s => s.paId === matchingPA.id)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              
              if (paShifts.length >= 3) {
                const lastThreeShifts = paShifts.slice(-3);
                let consecutiveCount = 1;
                
                for (let i = lastThreeShifts.length - 1; i > 0; i--) {
                  const currentDate = new Date(lastThreeShifts[i].date);
                  const previousDate = new Date(lastThreeShifts[i - 1].date);
                  const daysDiff = this.getDaysBetween(previousDate.toISOString().split('T')[0], currentDate.toISOString().split('T')[0]);
                  
                  if (daysDiff === 1) {
                    consecutiveCount++;
                  } else {
                    break;
                  }
                }
                
                if (consecutiveCount >= 3) {
                  console.log(`Skipping self-assignment for ${matchingPA.name} on ${shift.date} - would exceed 3 consecutive shifts`);
                  updatedShifts.push({
                    ...shift,
                    assignedPA: null,
                    paId: null
                  });
                } else {
                  // Assign the PA to their requested shift
                  updatedShifts.push({
                    ...shift,
                    assignedPA: matchingPA.name,
                    paId: matchingPA.id
                  });

                  // Update PA stats
                  const staff = updatedPAs.find(p => p.id === matchingPA.id);
                  if (staff) {
                    staff.assignedShifts++;
                    if (this.isOvernight(shift.type)) {
                      staff.overnightShifts++;
                      staff.lastOvernightDate = shift.date;
                    }
                    if (this.isWeekend(shift.date)) {
                      staff.weekendShifts++;
                    }
                  }
                }
              } else {
                // Assign the PA to their requested shift
                updatedShifts.push({
                  ...shift,
                  assignedPA: matchingPA.name,
                  paId: matchingPA.id
                });

                // Update PA stats
                const staff = updatedPAs.find(p => p.id === matchingPA.id);
                if (staff) {
                  staff.assignedShifts++;
                  if (this.isOvernight(shift.type)) {
                    staff.overnightShifts++;
                    staff.lastOvernightDate = shift.date;
                  }
                  if (this.isWeekend(shift.date)) {
                    staff.weekendShifts++;
                  }
                }
              }
            }
          }
        } else {
          // Keep shift unassigned if PA not found
          updatedShifts.push({
            ...shift,
            assignedPA: null,
            paId: null
          });
        }
      } else {
        // Step 2: Try to assign remaining shifts using the algorithm
        const assignment = this.assignStaffToShift(shift, updatedPAs, processedPerDiem, updatedShifts);
        
        if (assignment.assigned && assignment.staffId && assignment.staffName) {
          // Update shift with assignment
          updatedShifts.push({
            ...shift,
            assignedPA: assignment.staffName,
            paId: assignment.staffId
          });

          // Update PA/Per Diem stats
          const staff = updatedPAs.find(p => p.id === assignment.staffId);
          if (staff) {
            staff.assignedShifts++;
            if (this.isOvernight(shift.type)) {
              staff.overnightShifts++;
              staff.lastOvernightDate = shift.date;
            }
            if (this.isWeekend(shift.date)) {
              staff.weekendShifts++;
            }
          }
        } else {
          // Keep shift unassigned
          updatedShifts.push({
            ...shift,
            assignedPA: null,
            paId: null
          });
        }
      }
    }

    return {
      updatedShifts,
      updatedPAs
    };
  }
}
