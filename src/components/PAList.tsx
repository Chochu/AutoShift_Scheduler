
"use client";

import { useState } from "react";
import { User, Calendar, Moon, Clock } from "lucide-react";
import { PA } from "@/model/PA";
import { Shift } from "@/model/Shift";
import { getPaycheckPeriod } from "@/utils/weekNumber";

interface PAListProps {
  pas: PA[];
  shifts: Shift[];
}

export function PAList({ pas, shifts }: PAListProps) {
  const [filter, setFilter] = useState<'all' | 'available' | 'overworked'>('all');

  const getPAStats = (pa: PA) => {
    const paShifts = shifts.filter(shift => shift.paId === pa.id);
    const overnightShifts = paShifts.filter(shift => shift.type === '7PM').length;
    const weekendShifts = paShifts.filter(shift => {
      // Parse date more reliably by splitting the string
      const [year, month, day] = shift.date.split('-').map(Number);
      const date = new Date(year, month - 1, day); // month is 0-indexed
      const dayOfWeek = date.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    }).length;

    // Rule 5: Check if PA has more than 6 shifts in any paycheck period
    const paycheckPeriods = new Map<number, number>();
    paShifts.forEach(shift => {
      const period = getPaycheckPeriod(shift.date);
      paycheckPeriods.set(period, (paycheckPeriods.get(period) || 0) + 1);
    });
    
    const isOverworked = Array.from(paycheckPeriods.values()).some(count => count > 6);

    // Rule 1: Check overnight shifts per paycheck (should be 2 per paycheck)
    const paycheckOvernightCounts = new Map<number, number>();
    paShifts.filter(shift => shift.type === '7PM').forEach(shift => {
      const period = getPaycheckPeriod(shift.date);
      paycheckOvernightCounts.set(period, (paycheckOvernightCounts.get(period) || 0) + 1);
    });
    
    // Check if any paycheck period has more than 2 overnight shifts
    const hasTooManyOvernightPerPaycheck = Array.from(paycheckOvernightCounts.values()).some(count => count > 2);

    // Rule 4: Check weekend shifts per month
    const monthWeekendCounts = new Map<string, number>();
    paShifts.filter(shift => {
      // Parse date more reliably by splitting the string (same method as line 22-28)
      const [year, month, day] = shift.date.split('-').map(Number);
      const date = new Date(year, month - 1, day); // month is 0-indexed
      const dayOfWeek = date.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    }).forEach(shift => {
      // Parse date more reliably by splitting the string
      const [year, month, day] = shift.date.split('-').map(Number);
      const date = new Date(year, month - 1, day); // month is 0-indexed
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      monthWeekendCounts.set(monthKey, (monthWeekendCounts.get(monthKey) || 0) + 1);
    });
    
    // Check if any month has more than 2 weekend shifts
    const hasTooManyWeekendPerMonth = Array.from(monthWeekendCounts.values()).some(count => count > 2);

    return {
      totalShifts: paShifts.length,
      overnightShifts,
      weekendShifts,
      isOverworked,
      hasTooManyOvernightPerPaycheck,
      hasTooManyWeekendPerMonth,
      paycheckPeriods: Array.from(paycheckPeriods.entries()).map(([period, count]) => ({
        period,
        count,
        isOverLimit: count > 6
      })),
      paycheckOvernightPeriods: Array.from(paycheckOvernightCounts.entries()).map(([period, count]) => ({
        period,
        count,
        isOverLimit: count > 2
      }))
    };
  };

  const filteredPAs = pas.filter(pa => {
    const stats = getPAStats(pa);
    if (filter === 'available') return !stats.isOverworked;
    if (filter === 'overworked') return stats.isOverworked;
    return true;
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            PA List ({filteredPAs.length})
          </h2>
          <div className="flex space-x-2">
            {(['all', 'available', 'overworked'] as const).map(filterType => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  filter === filterType
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredPAs.map(pa => {
            const stats = getPAStats(pa);
            
            return (
              <div
                key={pa.id}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  stats.isOverworked || stats.hasTooManyOvernightPerPaycheck || stats.hasTooManyWeekendPerMonth
                    ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {pa.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ID: {pa.id}
                      </p>
                    </div>
                  </div>
                  
                  {(stats.isOverworked || stats.hasTooManyOvernightPerPaycheck || stats.hasTooManyWeekendPerMonth) && (
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs rounded-full">
                      Rule Violation
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {stats.totalShifts}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        Total Shifts
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Moon className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className={`font-medium ${
                        stats.hasTooManyOvernightPerPaycheck ? 'text-red-600' : 'text-gray-900 dark:text-white'
                      }`}>
                        {stats.overnightShifts}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        Overnight
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className={`font-medium ${
                        stats.hasTooManyWeekendPerMonth ? 'text-red-600' : 'text-gray-900 dark:text-white'
                      }`}>
                        {stats.weekendShifts}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        Weekend
                      </div>
                    </div>
                  </div>
                </div>

                {/* Paycheck Period Breakdown */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Paycheck Periods:</div>
                  <div className="flex flex-wrap gap-2">
                    {stats.paycheckPeriods.map(({ period, count, isOverLimit }) => (
                      <span
                        key={period}
                        className={`px-2 py-1 text-xs rounded-full ${
                          isOverLimit
                            ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                            : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        }`}
                      >
                        Period {period}: {count}/6 shifts
                      </span>
                    ))}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 mt-2">Overnight Shifts per Paycheck:</div>
                  <div className="flex flex-wrap gap-2">
                    {stats.paycheckOvernightPeriods.map(({ period, count, isOverLimit }) => (
                      <span
                        key={period}
                        className={`px-2 py-1 text-xs rounded-full ${
                          isOverLimit
                            ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                            : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        }`}
                      >
                        Period {period}: {count}/2 overnight
                      </span>
                    ))}
                  </div>
                </div>

                {/* Rule Violations */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap gap-2">
                    {stats.isOverworked && (
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs rounded-full">
                        Over 6 Shifts/2 Weeks
                      </span>
                    )}
                    {stats.hasTooManyOvernightPerPaycheck && (
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs rounded-full">
                        Too Many Overnight/Paycheck
                      </span>
                    )}
                    {stats.hasTooManyWeekendPerMonth && (
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs rounded-full">
                        Too Many Weekend/Month
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
