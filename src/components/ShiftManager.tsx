"use client";

import { useState } from "react";
import { Plus, Edit, Trash2, User, UserX } from "lucide-react";
import { Shift } from "@/model/Shift";
import { PA } from "@/model/PA";

interface ShiftManagerProps {
  shifts: Shift[];
  pas: PA[];
  onAssignPA: (shiftId: string, paId: string, paName: string) => void;
  onRemovePA: (shiftId: string) => void;
  onEditShift: (shift: Shift) => void;
  onDeleteShift: (shiftId: string) => void;
  onAddShift: () => void;
}

export function ShiftManager({ 
  shifts, 
  pas, 
  onAssignPA, 
  onRemovePA, 
  onEditShift, 
  onDeleteShift, 
  onAddShift 
}: ShiftManagerProps) {
  const [filter, setFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');

  const filteredShifts = shifts.filter(shift => {
    if (filter === 'assigned') return shift.assignedPA;
    if (filter === 'unassigned') return !shift.assignedPA;
    return true;
  });

  const getShiftColor = (type: string) => {
    switch (type) {
      case '7AM': return '#27D3F5';
      case '7PM': return '#B027F5';
      case '8AM': return '#F54927';
      case '10AM': return '#4927F5';
      default: return '#gray';
    }
  };

  const getShiftTime = (type: string) => {
    switch (type) {
      case '7AM': return '7AM - 7PM';
      case '7PM': return '7PM - 7AM';
      case '8AM': return '8AM - 8PM';
      case '10AM': return '10AM - 10PM';
      default: return type;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Shifts ({filteredShifts.length})
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={onAddShift}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex space-x-2 mb-4">
          {(['all', 'assigned', 'unassigned'] as const).map(filterType => (
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

        <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
          {filteredShifts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No shifts for this date
            </div>
          ) : (
            filteredShifts.map(shift => (
              <div
                key={shift.id}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: getShiftColor(shift.type) }}
                    ></div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {getShiftTime(shift.type)}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {shift.type} Shift
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onEditShift(shift)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteShift(shift.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* PA Assignment */}
                <div className="flex items-center justify-between">
                  {shift.assignedPA ? (
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {shift.assignedPA}
                      </span>
                      <button
                        onClick={() => onRemovePA(shift.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            const pa = pas.find(p => p.id === e.target.value);
                            if (pa) {
                              onAssignPA(shift.id, pa.id, pa.name);
                            }
                          }
                        }}
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        defaultValue=""
                      >
                        <option value="">Assign PA</option>
                        {pas.map(pa => (
                          <option key={pa.id} value={pa.id}>
                            {pa.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}