import { PA } from "@/model/PA";
import { PerDiem } from "@/model/PerDiem";
import { Shift } from "@/model/Shift";
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
    // Parse date more reliably by splitting the string
    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(year, month - 1, day); // month is 0-indexed in JavaScript
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday (0) or Saturday (6)
    
    // Debug logging
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    console.log(`Date ${date} parsed as ${year}-${month}-${day} is ${dayNames[dayOfWeek]} (${dayOfWeek}) - Weekend: ${isWeekend}`);
    
    return isWeekend;
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

  // No randomization - keep original order
  private keepOriginalOrder<T>(array: T[]): T[] {
    return [...array];
  }


  // ULTRA-RELAXED PA assignment rules for weekend shifts (FORCES everyone to get weekend work)
  private canAssignPAWeekend(pa: PA, shift: Shift, existingShifts: Shift[]): { canAssign: boolean; reason?: string } {
    // ONLY check absolute minimum requirements for weekend assignments
    
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

    // ULTRA-RELAXED: Skip ALL other rules for weekend assignments
    // - Skip max shifts limit (12 per month)
    // - Skip overnight rest rule
    // - Skip 11-hour rest rule  
    // - Skip consecutive shift rule
    // - Skip weekly limit (3 shifts per week)
    // - Skip paycheck limit (6 shifts per paycheck)
    // - Skip overnight shift rules
    // - Skip weekend shift limit (2 per month) - FORCE assignment

    return { canAssign: true };
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

    // Rule 1: PA overnight shift rules (2 overnight shifts per paycheck)
    if (this.isOvernight(shift.type)) {
      const currentPaycheckPeriod = getPaycheckPeriod(shift.date);
      const paOvernightShiftsThisPaycheck = existingShifts.filter(s => 
        s.paId === pa.id && 
        s.type === '7PM' && 
        isSamePaycheckPeriod(s.date, shift.date)
      ).length;

      if (paOvernightShiftsThisPaycheck >= 2) {
        return { canAssign: false, reason: 'Max 2 overnight shifts per paycheck period' };
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

  // Check if any PAs are still available for assignment
  private hasAvailablePAs(processedPAs: PA[], existingShifts: Shift[]): boolean {
    return processedPAs.some(pa => {
      // Check if PA has reached max shifts
      if (pa.assignedShifts >= pa.maxShifts) {
        return false;
      }
      
      // Check if PA has reached 3 shifts per week for any week
      const paShiftsByWeek = new Map<string, number>();
      existingShifts.forEach(shift => {
        if (shift.paId === pa.id) {
          const weekKey = `${new Date(shift.date).getFullYear()}-W${getWeekNumber(shift.date)}`;
          paShiftsByWeek.set(weekKey, (paShiftsByWeek.get(weekKey) || 0) + 1);
        }
      });
      
      // If any week has 3 shifts, PA is not available
      for (const [weekKey, count] of paShiftsByWeek) {
        if (count >= 3) {
          return false;
        }
      }
      
      return true;
    });
  }

  public generateSchedule(
    shifts: Shift[], 
    data: SchedulingData
  ): SchedulingResult {
    const { paList = [], perDiemList = [], requestedWorkDays = [], requestedDaysOff = [] } = data;

    console.log('=== SCHEDULING ALGORITHM (NO RANDOMIZATION) ===');
    console.log(`Processing ${paList.length} PAs and ${perDiemList.length} Per Diem staff`);

    // Log all weekend dates for debugging
    console.log('=== WEEKEND DATES IDENTIFICATION ===');
    const allDates = [...new Set(shifts.map(shift => shift.date))].sort();
    const weekendDates = allDates.filter(date => this.isWeekend(date));
    console.log(`All dates in schedule: ${allDates.join(', ')}`);
    console.log(`Weekend dates: ${weekendDates.join(', ')}`);
    console.log(`Total weekend dates: ${weekendDates.length}`);

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

    // NEW 3-LOOP APPROACH: Self-assigned → Weekend → Weekday
    const updatedShifts: Shift[] = [];
    const updatedPAs: PA[] = [...processedPAs];

    // LOOP 1: Assign all self-assigned shifts first
    console.log('=== LOOP 1: ASSIGNING ALL SELF-ASSIGNED SHIFTS ===');
    const selfAssignedShifts: Shift[] = [];
    const remainingShifts: Shift[] = [];
    
    for (const shift of shifts) {
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
          const alreadyAssignedToday = selfAssignedShifts.filter(s => 
            s.date === shift.date && s.paId === matchingPA.id
          );
          
          if (alreadyAssignedToday.length === 0) {
            const assignedShift = {
              ...shift,
              assignedPA: matchingPA.name,
              paId: matchingPA.id
            };
            selfAssignedShifts.push(assignedShift);
            
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
            console.log(`✓ Self-assigned ${matchingPA.name} to ${shift.date} ${shift.type}`);
          } else {
            remainingShifts.push(shift);
          }
        } else {
          remainingShifts.push(shift);
        }
      } else {
        remainingShifts.push(shift);
      }
    }
    
    updatedShifts.push(...selfAssignedShifts);
    console.log(`Self-assigned shifts: ${selfAssignedShifts.length}`);
    console.log(`Remaining shifts: ${remainingShifts.length}`);

    // LOOP 2: Extract weekend shifts and assign with priority
    console.log('=== LOOP 2: ASSIGNING WEEKEND SHIFTS WITH PRIORITY ===');
    console.log('=== CLASSIFYING REMAINING SHIFTS ===');
    
    const weekendShifts = remainingShifts.filter(shift => {
      const isWeekend = this.isWeekend(shift.date);
      console.log(`Shift ${shift.date} ${shift.type}: ${isWeekend ? 'WEEKEND' : 'WEEKDAY'}`);
      return isWeekend;
    });
    const weekdayShifts = remainingShifts.filter(shift => !this.isWeekend(shift.date));
    
    console.log(`Weekend shifts to assign: ${weekendShifts.length}`);
    console.log(`Weekday shifts to assign: ${weekdayShifts.length}`);
    
    // Log specific weekend shifts available for assignment
    console.log('=== WEEKEND SHIFTS AVAILABLE FOR ASSIGNMENT ===');
    weekendShifts.forEach((shift, index) => {
      console.log(`${index + 1}. ${shift.date} ${shift.type} (${this.isWeekend(shift.date) ? 'WEEKEND' : 'WEEKDAY'})`);
    });
    
    // Track weekend assignments per PA
    const weekendAssignments = new Map<string, number>();
    processedPAs.forEach(pa => {
      weekendAssignments.set(pa.id, 0);
    });
    
    // Count existing weekend shifts from self-assigned
    selfAssignedShifts.forEach(shift => {
      if (shift.paId && this.isWeekend(shift.date)) {
        weekendAssignments.set(shift.paId, (weekendAssignments.get(shift.paId) || 0) + 1);
      }
    });
    
    // Log initial weekend counts after Loop 1
    console.log('=== WEEKEND COUNTS AFTER LOOP 1 (SELF-ASSIGNED) ===');
    processedPAs.forEach(pa => {
      const weekendCount = weekendAssignments.get(pa.id)!;
      console.log(`${pa.name}: ${weekendCount} weekend shifts`);
    });
    
    // Assign weekend shifts with priority
    for (const shift of weekendShifts) {
      let assigned = false;
      
      // PRIORITY 1: Find PAs with 0 weekend shifts
      const pasWithZeroWeekends = processedPAs.filter(pa => 
        weekendAssignments.get(pa.id)! === 0
      );
      
      console.log(`Weekend shift ${shift.date} ${shift.type}: Found ${pasWithZeroWeekends.length} PAs with 0 weekend shifts`);
      
      if (pasWithZeroWeekends.length > 0) {
        for (const pa of pasWithZeroWeekends) {
          const canAssign = this.canAssignPAWeekend(pa, shift, updatedShifts);
          console.log(`  Trying ${pa.name}: ${canAssign.canAssign ? 'SUCCESS' : 'FAILED - ' + canAssign.reason}`);
          if (canAssign.canAssign) {
            const assignedShift = {
              ...shift,
              assignedPA: pa.name,
              paId: pa.id
            };
            updatedShifts.push(assignedShift);
            weekendAssignments.set(pa.id, 1);
            
            // Update PA stats
            const staff = updatedPAs.find(p => p.id === pa.id);
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
            console.log(`✓ FORCED ${pa.name} to weekend shift ${shift.date} ${shift.type} (first weekend)`);
            assigned = true;
            break;
          }
        }
      }
      
      // PRIORITY 2: Find PAs with 1 weekend shift
      if (!assigned) {
        const pasWithOneWeekend = processedPAs.filter(pa => 
          weekendAssignments.get(pa.id)! === 1
        );
        
        if (pasWithOneWeekend.length > 0) {
          for (const pa of pasWithOneWeekend) {
            const canAssign = this.canAssignPAWeekend(pa, shift, updatedShifts);
            if (canAssign.canAssign) {
              const assignedShift = {
                ...shift,
                assignedPA: pa.name,
                paId: pa.id
              };
              updatedShifts.push(assignedShift);
              weekendAssignments.set(pa.id, 2);
              
              // Update PA stats
              const staff = updatedPAs.find(p => p.id === pa.id);
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
              console.log(`✓ Assigned ${pa.name} to weekend shift ${shift.date} ${shift.type} (second weekend)`);
              assigned = true;
              break;
            }
          }
        }
      }
      
      if (!assigned) {
        // All PAs have 2 weekend shifts, keep unassigned
        updatedShifts.push({
          ...shift,
          assignedPA: null,
          paId: null
        });
        console.log(`✗ No PA available for weekend shift ${shift.date} ${shift.type}`);
      }
    }
    
    // Log weekend distribution after Loop 2
    console.log('=== WEEKEND DISTRIBUTION AFTER LOOP 2 ===');
    processedPAs.forEach(pa => {
      const weekendCount = weekendAssignments.get(pa.id)!;
      console.log(`${pa.name}: ${weekendCount} weekend shifts`);
    });

    // LOOP 3: Schedule remaining weekday shifts
    console.log('=== LOOP 3: SCHEDULING REMAINING WEEKDAY SHIFTS ===');
    let unassignedWeekdayShifts = 0;
    const totalWeekdayShifts = weekdayShifts.length;
    
    for (const shift of weekdayShifts) {
      // Check if any PAs are still available before processing this shift
      const hasAvailable = this.hasAvailablePAs(updatedPAs, updatedShifts);
      if (!hasAvailable) {
        console.log(`⚠️  No PAs available for remaining weekday shifts (${totalWeekdayShifts - unassignedWeekdayShifts} remaining)`);
        // Add remaining shifts as unassigned
        for (let i = weekdayShifts.indexOf(shift); i < weekdayShifts.length; i++) {
          updatedShifts.push({
            ...weekdayShifts[i],
            assignedPA: null,
            paId: null
          });
        }
        break;
      }
      
      // Automatic assignment for weekday shift
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
        console.log(`✓ Assigned ${assignment.staffName} to weekday shift ${shift.date} ${shift.type}`);
      } else {
        updatedShifts.push({
          ...shift,
          assignedPA: null,
          paId: null
        });
        unassignedWeekdayShifts++;
        console.log(`✗ No staff available for weekday shift ${shift.date} ${shift.type}`);
      }
    }

    console.log(`Weekday shifts processed: ${totalWeekdayShifts - unassignedWeekdayShifts} assigned, ${unassignedWeekdayShifts} unassigned`);

    // Final weekend distribution summary
    console.log('=== FINAL SCHEDULE WEEKEND DISTRIBUTION ===');
    updatedPAs.forEach(pa => {
      const weekendShifts = updatedShifts.filter(s => 
        s.paId === pa.id && this.isWeekend(s.date)
      ).length;
      console.log(`${pa.name}: ${weekendShifts} weekend shifts`);
      if (weekendShifts > 2) {
        console.log(`⚠️  WARNING: ${pa.name} has ${weekendShifts} weekend shifts (exceeds limit of 2)`);
      }
    });

    return {
      updatedShifts,
      updatedPAs
    };
  }
}
