"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, User, Users, Moon, Clock } from "lucide-react";
import { Shift } from "@/model/Shift";
import { getShiftColor } from "@/utils/shiftColors";

interface CalendarProps {
  selectedDate: string;
  selectedDates: string[];
  onDateSelect: (date: string, altKey: boolean) => void;
  shifts: Shift[];
  onTemplateDrop?: (templateId: string, date: string) => void;
}

export function Calendar({ selectedDate, selectedDates, onDateSelect, shifts, onTemplateDrop }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    
    // Get the Monday of the week containing the first day of the month
    const firstMonday = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, so 6 days back
    firstMonday.setDate(firstDay.getDate() - daysToMonday);
    
    // Always show exactly 4 weeks (28 days) starting from the Monday
    const days = [];
    const current = new Date(firstMonday);
    
    for (let i = 0; i < 28; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const handleDragOver = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    setDragOverDate(date);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    setDragOverDate(null);
    
    const templateId = e.dataTransfer.getData('text/plain');
    if (templateId && onTemplateDrop) {
      onTemplateDrop(templateId, date);
    }
  };

  const getShiftsForDate = (date: string) => {
    return shifts.filter(shift => shift.date === date);
  };

  const getCellHeight = (date: string) => {
    const dateShifts = getShiftsForDate(date);
    const baseHeight = 50; // Base height for date number and padding
    const shiftHeight = 50; // Height per shift (increased to accommodate 2 rows)
    const padding = 12; // Additional padding
    
    // Count total shifts for this date
    const totalShifts = dateShifts.length;
    
    // Calculate height based on number of shifts
    const calculatedHeight = baseHeight + (totalShifts * shiftHeight) + padding;
    
    // Set minimum height and maximum height
    const minHeight = 120;
    const maxHeight = 500;
    
    return Math.max(minHeight, Math.min(maxHeight, calculatedHeight));
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const isSelected = (date: Date) => {
    return formatDate(date) === selectedDate;
  };

  const isMultiSelected = (date: Date) => {
    return selectedDates.includes(formatDate(date));
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const dateString = formatDate(day);
          const dateShifts = getShiftsForDate(dateString);
          const cellHeight = getCellHeight(dateString);
          const isCurrentMonthDay = isCurrentMonth(day);
          const isSelectedDay = isSelected(day);
          const isMultiSelectedDay = isMultiSelected(day);
          const isTodayDay = isToday(day);

          return (
            <button
              key={dateString}
              onClick={(e) => onDateSelect(dateString, e.altKey)}
              onDragOver={(e) => handleDragOver(e, dateString)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, dateString)}
              style={{ height: `${cellHeight}px` }}
              className={`
                relative rounded-lg transition-colors text-sm border-2 p-2 text-left w-full
                overflow-hidden
                ${isSelectedDay 
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900' 
                  : isMultiSelectedDay
                  ? 'border-blue-400 bg-blue-25 dark:bg-blue-800'
                  : isTodayDay
                  ? 'border-green-500 bg-green-50 dark:bg-green-900'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }
                ${!isCurrentMonthDay ? 'opacity-50' : ''}
                ${dragOverDate === dateString ? 'border-dashed border-blue-400 bg-blue-50 dark:bg-blue-900' : ''}
              `}
            >
              {/* Date Number */}
              <div className="flex items-center justify-between mb-2">
                <span className={`font-medium ${isCurrentMonthDay ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                  {day.getDate()}
                </span>
                {isTodayDay && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </div>

              {/* Shifts */}
              <div className="space-y-1 overflow-hidden max-h-[calc(100%-40px)]">
                {dateShifts.map((shift, index) => {
                  const colorConfig = getShiftColor(shift.type);
                  return (
                    <div
                      key={shift.id}
                      className="flex flex-col items-center text-sm p-1 rounded"
                      style={{ 
                        backgroundColor: colorConfig.backgroundColor,
                        color: colorConfig.textColor
                      }}
                    >
                      {/* First row - Icon and Time */}
                      <div className="flex items-center space-x-1 mb-1">
                        {shift.type === '7PM' ? (
                          <Moon className={`h-3 w-3 ${colorConfig.textColor === 'white' ? 'text-white' : 'text-black'}`} />
                        ) : (
                          <Clock className={`h-3 w-3 ${colorConfig.textColor === 'white' ? 'text-white' : 'text-black'}`} />
                        )}
                        <span className={`font-medium text-xs ${colorConfig.textColor === 'white' ? 'text-white' : 'text-black'}`}>
                          {shift.type}
                        </span>
                      </div>
                      
                      {/* Second row - Assigned PA */}
                      {shift.assignedPA && (
                        <div className="flex items-center space-x-1">
                          <User className={`h-2 w-2 ${colorConfig.textColor === 'white' ? 'text-white' : 'text-black'}`} />
                          <span className={`text-xs truncate max-w-[60px] ${colorConfig.textColor === 'white' ? 'text-white' : 'text-black'}`}>
                            {shift.assignedPA}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Drag Overlay */}
              {dragOverDate === dateString && (
                <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900 bg-opacity-50 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-300 font-medium">Drop here</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
