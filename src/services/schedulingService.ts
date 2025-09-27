import { PA } from "@/model/PA";
import { PerDiem } from "@/model/PerDiem";
import { getWeekNumber, getPaycheckPeriod, isSameWeek, isSamePaycheckPeriod } from "@/utils/weekNumber";

interface PAEntry {
  'Name(ID)': string;
  'Number of Shift': number;
}

interface PerDiemEntry {
  'Name(ID)': string;
  'Number of Shift': number;
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

  // Enhanced randomization with Fisher-Yates shuffle
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Enhanced weekend balancing with strict 2-shift-per-person rule
  private balanceWeekendShifts(
    weekendShifts: Shift[], 
    processedPAs: PA[], 
    requestedWorkDays: WorkDayEntry[]
  ): Shift[] {
    console.log('=== ENHANCED WEEKEND BALANCING ALGORITHM ===');
    
    // Track weekend assignments per PA
    const weekendAssignments = new Map<string, Shift[]>();
    processedPAs.forEach(pa => {
      weekendAssignments.set(pa.id, []);
    });
    
    // Process self-assigned weekend shifts first
    const selfAssignedWeekendShifts: Shift[] = [];
    const remainingWeekendShifts: Shift[] = [];
    
    for (const shift of weekendShifts) {
      const matchingWorkDay = requestedWorkDays.find((workDay: WorkDayEntry) => {
        const workDayPAId = workDay['Name(ID)'] ? 
          workDay['Name(ID)'].split('(')[1]?.replace(')', '') : null;
        
        return workDayPAId && 
               workDay.Date === shift.date && 
               workDay.Shift === shift.type;
      });
      
      if (matchingWorkDay) {
        const workDayPAId = matchingWorkDay['Name(ID)'].split('(')[1]?.replace(')', '');
        const matchingPA = processedPAs.find(pa => pa.id === workDayPAId);
        
        if (matchingPA) {
          const assignedShift = {
            ...shift,
            assignedPA: matchingPA.name,
            paId: matchingPA.id
          };
          selfAssignedWeekendShifts.push(assignedShift);
          weekendAssignments.get(matchingPA.id)!.push(assignedShift);
        } else {
          remainingWeekendShifts.push(shift);
        }
      } else {
        remainingWeekendShifts.push(shift);
      }
    }
    
    console.log(`Self-assigned weekend shifts: ${selfAssignedWeekendShifts.length}`);
    console.log(`Remaining weekend shifts to balance: ${remainingWeekendShifts.length}`);
    
    // Balance remaining weekend shifts with strict 2-shift-per-person rule
    const balancedShifts: Shift[] = [...selfAssignedWeekendShifts];
    
    // Shuffle remaining weekend shifts for randomization
    const shuffledWeekendShifts = this.shuffleArray(remainingWeekendShifts);
    
    // Process each weekend shift
    for (const shift of shuffledWeekendShifts) {
      let assigned = false;
      
      // Find PAs with fewer than 2 weekend shifts
      const pasWithLessThan2 = processedPAs.filter(pa => 
        weekendAssignments.get(pa.id)!.length < 2
      );
      
      if (pasWithLessThan2.length > 0) {
        // Shuffle PAs for randomization, then sort by weekend count
        const shuffledPAs = this.shuffleArray(pasWithLessThan2);
        const sortedByWeekendCount = shuffledPAs.sort((a, b) => {
          const aWeekendCount = weekendAssignments.get(a.id)!.length;
          const bWeekendCount = weekendAssignments.get(b.id)!.length;
          return aWeekendCount - bWeekendCount;
        });
        
        // Try to assign to PA with fewest weekend shifts
        for (const pa of sortedByWeekendCount) {
          const canAssign = this.canAssignPA(pa, shift, balancedShifts);
          if (canAssign.canAssign) {
            const assignedShift = {
              ...shift,
              assignedPA: pa.name,
              paId: pa.id
            };
            balancedShifts.push(assignedShift);
            weekendAssignments.get(pa.id)!.push(assignedShift);
            assigned = true;
            console.log(`✓ Assigned ${pa.name} to weekend shift ${shift.date} ${shift.type}`);
            break;
          }
        }
      }
      
      if (!assigned) {
        // All PAs have 2 weekend shifts, keep unassigned
        balancedShifts.push({
          ...shift,
          assignedPA: null,
          paId: null
        });
        console.log(`✗ No PA available for weekend shift ${shift.date} ${shift.type}`);
      }
    }
    
    // Log final weekend distribution
    console.log('=== FINAL WEEKEND DISTRIBUTION ===');
    processedPAs.forEach(pa => {
      const weekendCount = weekendAssignments.get(pa.id)!.length;
      console.log(`${pa.name}: ${weekendCount} weekend shifts`);
    });
    
    return balancedShifts;
  }

  // Enhanced PA assignment with load balancing
  private canAssignPA(pa: PA, shift: Shift, existingShifts: Shift[]): { canAssign: boolean; reason?: string } {
    // Check if PA has reached max shifts (12 per month)
    if (pa.assignedShifts >= pa.maxShifts) {
      return { canAssign: false, reason: 'Max shifts reached (12 per month)' };
    }

    // Rule 7: Each slot is a position a PA can work in
    const alreadyAssignedToday = existingShifts.filter(s => 
      s.date === shift.date && s.paId === pa.id
    );
    if (alreadyAssignedToday.length > 0) {
      return { canAssign: false, reason: 'Already assigned to another shift today' };
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
        const lastShiftDate = new Date(lastThreeShifts[lastThreeShifts.length - 1].date);
        const daysSinceLastShift = this.getDaysBetween(lastShiftDate.toISOString().split('T')[0], shift.date);
        
        if (daysSinceLastShift === 1) {
          return { canAssign: false, reason: 'Max 3 consecutive shifts in a row' };
        }
      }
    }

    // Rule 9: Maximum 3 shifts per week (to space out assignments)
    const paShiftsThisWeek = existingShifts.filter(s => 
      s.paId === pa.id && 
      isSameWeek(s.date, shift.date)
    ).length;

    if (paShiftsThisWeek >= 3) {
      return { canAssign: false, reason: `Max 3 shifts per week (has ${paShiftsThisWeek})` };
    }

    // Rule 5: PA work total of 6 shifts max every paycheck (Week 1+2 | Week 3+4)
    const currentPaycheckPeriod = getPaycheckPeriod(shift.date);
    const paShiftsThisPaycheck = existingShifts.filter(s => 
      s.paId === pa.id && 
      isSamePaycheckPeriod(s.date, shift.date)
    ).length;

    if (paShiftsThisPaycheck >= 6) {
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

      const previousWeek = currentWeek - 1;
      const paOvernightShiftsPreviousWeek = existingShifts.filter(s => 
        s.paId === pa.id && 
        s.type === '7PM' && 
        getWeekNumber(s.date) === previousWeek
      ).length;

      if (paOvernightShiftsPreviousWeek > 0) {
        return { canAssign: false, reason: 'No consecutive overnight weeks - must alternate' };
      }

      if (paOvernightShiftsThisWeek >= 2) {
        return { canAssign: false, reason: 'Max 2 overnight shifts per week' };
      }
    }

    // Rule 4: PA must work 2 weekend shifts per month
    if (this.isWeekend(shift.date)) {
      const paWeekendShiftsThisMonth = existingShifts.filter(s => 
        s.paId === pa.id && 
        this.isWeekend(s.date) &&
        new Date(s.date).getMonth() === new Date(shift.date).getMonth() &&
        new Date(s.date).getFullYear() === new Date(shift.date).getFullYear()
      ).length;

      if (paWeekendShiftsThisMonth >= 2) {
        return { canAssign: false, reason: 'Max 2 weekend shifts per month' };
      }
    }

    return { canAssign: true };
  }

  private canAssignPerDiem(perDiem: PerDiem, shift: Shift, existingShifts: Shift[]): { canAssign: boolean; reason?: string } {
    const shiftDate = new Date(shift.date);
    const availableStart = new Date(perDiem.availableStart);
    const availableEnd = new Date(perDiem.availableEnd);

    if (shiftDate < availableStart || shiftDate > availableEnd) {
      return { canAssign: false, reason: 'Not available during this date range' };
    }

    const alreadyAssignedToday = existingShifts.filter(s => 
      s.date === shift.date && s.paId === perDiem.id
    );
    if (alreadyAssignedToday.length > 0) {
      return { canAssign: false, reason: 'Already assigned today' };
    }

    return { canAssign: true };
  }

  // Assignment without randomization - keep original PA order
  private assignStaffToShift(
    shift: Shift, 
    processedPAs: PA[], 
    processedPerDiem: PerDiem[], 
    existingShifts: Shift[]
  ): { assigned: boolean; staffId?: string; staffName?: string; reason?: string } {
    
    // Use PAs in original order (no shuffling or randomization)
    for (const pa of processedPAs) {
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

    // Try Per Diem in original order if no PA available
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

    console.log('=== SCHEDULING ALGORITHM (NO RANDOMIZATION) ===');
    console.log(`Processing ${paList.length} PAs and ${perDiemList.length} Per Diem staff`);

    // Process PAs in original order (no shuffling)
    const processedPAs: PA[] = paList.map((pa: PAEntry) => {
      const paId = pa['Name(ID)'] ? pa['Name(ID)'].split('(')[1]?.replace(')', '') : '';
      
      const paWorkDays = requestedWorkDays.filter((workDay: WorkDayEntry) => {
        const workDayPAId = workDay['Name(ID)'] ? 
          workDay['Name(ID)'].split('(')[1]?.replace(')', '') : null;
        return workDayPAId === paId;
      });
      
      const paDaysOff = requestedDaysOff.filter((dayOff: DayOffEntry) => {
        const dayOffPAId = dayOff['Name(ID)'] ? 
          dayOff['Name(ID)'].split('(')[1]?.replace(')', '') : null;
        return dayOffPAId === paId;
      });

      return {
        id: paId,
        name: pa['Name(ID)'] ? pa['Name(ID)'].split('(')[0].trim() : '',
        shiftsWorked: 0,
        maxShifts: pa['Number of Shift'] || 12,
        assignedShifts: paWorkDays.length,
        overnightShifts: 0,
        weekendShifts: 0,
        lastOvernightDate: null,
        requestedWorkDays: paWorkDays.map((wd: WorkDayEntry) => wd.Date),
        requestedDaysOff: paDaysOff.map((dayOff: DayOffEntry) => dayOff.Date),
        available: true
      };
    });

    // Process Per Diem in original order (no shuffling)
    const processedPerDiem: PerDiem[] = perDiemList.map((pd: PerDiemEntry) => ({
      id: pd['Name(ID)'] ? pd['Name(ID)'].split('(')[1]?.replace(')', '') : '',
      name: pd['Name(ID)'] ? pd['Name(ID)'].split('(')[0].trim() : '',
      shiftsWorked: 0,
      maxShifts: pd['Number of Shift'] || 8,
      availableStart: pd['Dates Available to Work Start'],
      availableEnd: pd['Dates Available to Work End']
    }));

    // Keep shifts in their original order - no sorting or shuffling
    const weekendShifts = shifts.filter(shift => this.isWeekend(shift.date));
    const weekdayShifts = shifts.filter(shift => !this.isWeekend(shift.date));

    const updatedShifts: Shift[] = [];
    const updatedPAs: PA[] = [...processedPAs];

    // Step 1: Process weekend shifts in original order
    console.log('=== STEP 1: PROCESSING WEEKEND SHIFTS ===');
    const balancedWeekendShifts = this.balanceWeekendShifts(
      weekendShifts,  // Use original weekend shifts order
      processedPAs, 
      requestedWorkDays
    );
    
    updatedShifts.push(...balancedWeekendShifts);
    
    // Update PA stats for weekend shifts
    balancedWeekendShifts.forEach(shift => {
      if (shift.assignedPA && shift.paId) {
        const staff = updatedPAs.find(p => p.id === shift.paId);
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
    });

    // Step 2: Process weekday shifts in original order
    console.log('=== STEP 2: PROCESSING WEEKDAY SHIFTS ===');
    for (const shift of weekdayShifts) {  // Use original weekday shifts order
      // Check if this shift matches a PA's requested work day
      const matchingWorkDay = requestedWorkDays.find((workDay: WorkDayEntry) => {
        const workDayPAId = workDay['Name(ID)'] ? 
          workDay['Name(ID)'].split('(')[1]?.replace(')', '') : null;
        
        return workDayPAId && 
               workDay.Date === shift.date && 
               workDay.Shift === shift.type;
      });

      if (matchingWorkDay) {
        // Self-assigned weekday shift
        const workDayPAId = matchingWorkDay['Name(ID)'].split('(')[1]?.replace(')', '');
        const matchingPA = processedPAs.find(pa => pa.id === workDayPAId);
        
        if (matchingPA) {
          const alreadyAssignedToday = updatedShifts.filter(s => 
            s.date === shift.date && s.paId === matchingPA.id
          );
          
          if (alreadyAssignedToday.length > 0) {
            updatedShifts.push({
              ...shift,
              assignedPA: null,
              paId: null
            });
          } else {
            updatedShifts.push({
              ...shift,
              assignedPA: matchingPA.name,
              paId: matchingPA.id
            });

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
          updatedShifts.push({
            ...shift,
            assignedPA: null,
            paId: null
          });
        }
      } else {
        // Automatic assignment for weekday shift (no randomization)
        const assignment = this.assignStaffToShift(shift, updatedPAs, processedPerDiem, updatedShifts);
        
        if (assignment.assigned && assignment.staffId && assignment.staffName) {
          updatedShifts.push({
            ...shift,
            assignedPA: assignment.staffName,
            paId: assignment.staffId
          });

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
