"use client";

import { Upload, Calendar, Users, Layout, Zap, Plus } from "lucide-react";
import { FileUpload } from "./FileUpload";

interface HeaderProps {
  onAddShift: () => void;
  onFileUpload: (file: File) => void;
  activeTab: 'calendar' | 'pas' | 'templates';
  onTabChange: (tab: 'calendar' | 'pas' | 'templates') => void;
  onGenerateSchedule: () => void;
  isGenerateEnabled: boolean;
  onClearAllAssignments: () => void;
}

export function Header({ 
  onAddShift, 
  onFileUpload, 
  activeTab, 
  onTabChange,
  onGenerateSchedule,
  isGenerateEnabled,
  onClearAllAssignments
}: HeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            PA Scheduler
          </h1>
          
          <div className="flex items-center space-x-4">
            {/* Generate Schedule Button */}
            <button
              onClick={onGenerateSchedule}
              disabled={!isGenerateEnabled}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isGenerateEnabled
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              Generate Schedule
            </button>
            
            {/* Clear All Assignments Button */}
            <button
              onClick={onClearAllAssignments}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Clear All Assigned
            </button>
            
            {/* File Upload */}
            <FileUpload onFileUpload={onFileUpload}>
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                <Upload className="h-4 w-4" />
                <span>Upload File</span>
              </button>
            </FileUpload>
            
            {/* Add Shift Button */}
            <button
              onClick={onAddShift}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Shift</span>
            </button>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <nav className="mt-4">
          <div className="flex space-x-1">
            {[
              { id: 'calendar', label: 'Calendar', icon: Calendar },
              { id: 'pas', label: 'PA List', icon: Users },
              { id: 'templates', label: 'Templates', icon: Layout }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
} 