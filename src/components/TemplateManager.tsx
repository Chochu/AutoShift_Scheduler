"use client";

import { useState } from "react";
import { Plus, Edit, Trash2, Calendar, GripVertical } from "lucide-react";
import { DayTemplate } from "@/model/DayTemplate";

interface TemplateManagerProps {
  templates: DayTemplate[];
  onUpdateTemplates: (templates: DayTemplate[]) => void;
  onApplyTemplate: (template: DayTemplate, date: string) => void;
  selectedDate: string;
}

export function TemplateManager({ 
  templates, 
  onUpdateTemplates, 
  onApplyTemplate, 
  selectedDate 
}: TemplateManagerProps) {
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DayTemplate | null>(null);
  const [draggedTemplate, setDraggedTemplate] = useState<DayTemplate | null>(null);

  const deleteTemplate = (templateId: string) => {
    onUpdateTemplates(templates.filter(t => t.id !== templateId));
  };

  const getShiftColor = (type: string) => {
    switch (type) {
      case '7AM': return '#27D3F5';
      case '7PM': return '#B027F5';
      case '8AM': return '#F54927';
      case '10AM': return '#4927F5';
      default: return '#gray';
    }
  };

  const handleDragStart = (e: React.DragEvent, template: DayTemplate) => {
    setDraggedTemplate(template);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', template.id);
  };

  const handleDragEnd = () => {
    setDraggedTemplate(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Day Templates
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Drag and drop templates to calendar dates or click to apply to selected date
            </p>
          </div>
          <button
            onClick={() => setIsCreatingTemplate(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <div
            key={template.id}
            draggable
            onDragStart={(e) => handleDragStart(e, template)}
            onDragEnd={handleDragEnd}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 cursor-move transition-all hover:shadow-md ${
              draggedTemplate?.id === template.id ? 'opacity-50 scale-95' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <GripVertical className="h-4 w-4 text-gray-400" />
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {template.name}
                </h3>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingTemplate(template)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteTemplate(template.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Template Shifts */}
            <div className="space-y-2 mb-4">
              {template.shifts.map((shift, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: getShiftColor(shift.type) }}
                    ></div>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {shift.type}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {shift.count}
                  </span>
                </div>
              ))}
            </div>

            {/* Apply Button */}
            <div className="space-y-2">
              <button
                onClick={() => onApplyTemplate(template, selectedDate)}
                className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Calendar className="h-4 w-4" />
                <span>Apply to Selected Date</span>
              </button>
              
              <div className="text-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Or switch to Calendar tab to drag & drop
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {templates.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No templates yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Create your first day template to get started
          </p>
          <button
            onClick={() => setIsCreatingTemplate(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Create Template
          </button>
        </div>
      )}
    </div>
  );
} 