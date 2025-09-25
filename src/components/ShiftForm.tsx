"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Shift } from "@/model/Shift";

interface ShiftFormProps {
  shift?: Shift | null;
  selectedDate: string;
  onSubmit: (shift: Omit<Shift, 'id'>) => void;
  onCancel: () => void;
}

export function ShiftForm({ shift, selectedDate, onSubmit, onCancel }: ShiftFormProps) {
  const [formData, setFormData] = useState({
    date: selectedDate,
    type: '7AM' as '7AM' | '7PM' | '8AM' | '10AM',
    assignedPA: null as string | null,
    paId: null as string | null
  });

  useEffect(() => {
    if (shift) {
      setFormData({
        date: shift.date,
        type: shift.type,
        assignedPA: shift.assignedPA,
        paId: shift.paId
      });
    } else {
      setFormData(prev => ({ ...prev, date: selectedDate }));
    }
  }, [shift, selectedDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
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
    <div className="relative">
      <button
        onClick={onCancel}
        className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <X className="h-5 w-5" />
      </button>
      
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        {shift ? 'Edit Shift' : 'Add New Shift'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Shift Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['7AM', '7PM', '8AM', '10AM'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type }))}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  formData.type === type
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {getShiftTime(type)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {type} Shift
                </div>
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {shift ? 'Update Shift' : 'Add Shift'}
          </button>
        </div>
      </form>
    </div>
  );
}
