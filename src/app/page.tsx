"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/Calendar";
import { ShiftManager } from "@/components/ShiftManager";
import { Header } from "@/components/Header";
import { ShiftForm } from "@/components/ShiftForm";
import { PAList } from "@/components/PAList";
import { TemplateManager } from "@/components/TemplateManager";
import { Dialog, DialogPortal, DialogOverlay, DialogContent, DialogTitle } from "@radix-ui/react-dialog";
import * as XLSX from "xlsx";
import { Shift } from "@/model/Shift";
import { PA } from "@/model/PA";
import { DayTemplate } from "@/model/DayTemplate";
import { getShiftColor } from "@/utils/shiftColors";
import { SchedulingService } from "@/services/schedulingService";

interface UploadedData {
  requestedWorkDays?: Array<{
    'Name(ID)': string;
    Date: string;
    Shift: string;
  }>;
  requestedDaysOff?: Array<{
    'Name(ID)': string;
    Date: string;
  }>;
  paList?: Array<{
    'Name(ID)': string;
  }>;
  perDiemList?: Array<{
    'Name(ID)': string;
    'Dates Available to Work Start': string;
    'Dates Available to Work End': string;
  }>;
}

export default function Home() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [pas, setPAs] = useState<PA[]>([]);
  const [templates, setTemplates] = useState<DayTemplate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isShiftFormOpen, setIsShiftFormOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [activeTab, setActiveTab] = useState<'calendar' | 'pas' | 'templates'>('calendar');
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [uploadedData, setUploadedData] = useState<UploadedData | null>(null);

  // Initialize with sample data (removed John Smith and Sarah Johnson)
  useEffect(() => {
    const sampleTemplates: DayTemplate[] = [
      {
        id: "1",
        name: "Standard Day",
        shifts: [
          { type: "7AM", count: 2 },
          { type: "7PM", count: 2 },
          { type: "8AM", count: 1 },
          { type: "10AM", count: 1 }
        ]
      },
      {
        id: "2",
        name: "Busy Day",
        shifts: [
          { type: "7AM", count: 3 },
          { type: "7PM", count: 3 },
          { type: "8AM", count: 2 },
          { type: "10AM", count: 2 }
        ]
      }
    ];

    setTemplates(sampleTemplates);
  }, []);

  const addShift = (shift: Omit<Shift, 'id'>) => {
    const newShift: Shift = {
      ...shift,
      id: Date.now().toString(),
    };
    setShifts(prev => [...prev, newShift]);
  };

  const updateShift = (updatedShift: Shift) => {
    setShifts(prev => prev.map(shift => 
      shift.id === updatedShift.id ? updatedShift : shift
    ));
  };

  const deleteShift = (shiftId: string) => {
    setShifts(prev => prev.filter(shift => shift.id !== shiftId));
  };

  const assignPAToShift = (shiftId: string, paId: string, paName: string) => {
    setShifts(prev => prev.map(shift => 
      shift.id === shiftId ? { ...shift, assignedPA: paName, paId } : shift
    ));
    
    // Update PA's shift count
    setPAs(prev => prev.map(pa => 
      pa.id === paId ? { ...pa, shiftsWorked: pa.shiftsWorked + 1 } : pa
    ));
  };

  const removePAFromShift = (shiftId: string) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (shift && shift.paId) {
      setPAs(prev => prev.map(pa => 
        pa.id === shift.paId ? { ...pa, shiftsWorked: pa.shiftsWorked - 1 } : pa
      ));
    }
    
    setShifts(prev => prev.map(s => 
      s.id === shiftId ? { ...s, assignedPA: null, paId: null } : s
    ));
  };

  const handleFileUpload = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      const uploadedData: UploadedData = {};
      
      // Parse RequestedWorkDay sheet
      if (workbook.SheetNames.includes('RequestedWorkDay')) {
        const workDaySheet = workbook.Sheets['RequestedWorkDay'];
        const workDayData = XLSX.utils.sheet_to_json(workDaySheet);
        // Convert Excel dates to date strings
        uploadedData.requestedWorkDays = workDayData.map((item: unknown) => {
          const typedItem = item as Record<string, unknown>;
          return {
            'Name(ID)': String(typedItem['Name(ID)'] || ''),
            Date: typeof typedItem.Date === 'number' ? 
              XLSX.SSF.format('yyyy-mm-dd', typedItem.Date) : 
              String(typedItem.Date || ''),
            Shift: String(typedItem.Shift || '')
          };
        });
        console.log('Requested Work Days:', uploadedData.requestedWorkDays);
      }
      
      // Parse RequestedDayOff sheet
      if (workbook.SheetNames.includes('RequestedDayOff')) {
        const dayOffSheet = workbook.Sheets['RequestedDayOff'];
        const dayOffData = XLSX.utils.sheet_to_json(dayOffSheet);
        // Convert Excel dates to date strings
        uploadedData.requestedDaysOff = dayOffData.map((item: unknown) => {
          const typedItem = item as Record<string, unknown>;
          return {
            'Name(ID)': String(typedItem['Name(ID)'] || ''),
            Date: typeof typedItem.Date === 'number' ? 
              XLSX.SSF.format('yyyy-mm-dd', typedItem.Date) : 
              String(typedItem.Date || '')
          };
        });
        console.log('Requested Days Off:', uploadedData.requestedDaysOff);
      }
      
      // Parse ListOfPA sheet
      if (workbook.SheetNames.includes('ListOfPA')) {
        const paSheet = workbook.Sheets['ListOfPA'];
        const paData = XLSX.utils.sheet_to_json(paSheet);
        uploadedData.paList = paData.map((item: unknown) => {
          const typedItem = item as Record<string, unknown>;
          return {
            'Name(ID)': String(typedItem['Name(ID)'] || '')
          };
        });
        console.log('PA List:', paData);
      }

      // Parse ListOfPerDiem sheet
      if (workbook.SheetNames.includes('ListOfPerDiem')) {
        const perDiemSheet = workbook.Sheets['ListOfPerDiem'];
        const perDiemData = XLSX.utils.sheet_to_json(perDiemSheet);
        // Convert Excel dates to date strings (consistent with other sheets)
        uploadedData.perDiemList = perDiemData.map((item: unknown) => {
          const typedItem = item as Record<string, unknown>;
          return {
            'Name(ID)': String(typedItem['Name(ID)'] || ''),
            'Dates Available to Work Start': typeof typedItem['Dates Available to Work Start'] === 'number' ? 
              XLSX.SSF.format('yyyy-mm-dd', typedItem['Dates Available to Work Start']) : 
              String(typedItem['Dates Available to Work Start'] || ''),
            'Dates Available to Work End': typeof typedItem['Dates Available to Work End'] === 'number' ? 
              XLSX.SSF.format('yyyy-mm-dd', typedItem['Dates Available to Work End']) : 
              String(typedItem['Dates Available to Work End'] || '')
          };
        });
        console.log('Per Diem List:', uploadedData.perDiemList);
      }
      
      setUploadedData(uploadedData);
      setIsFileUploaded(true);
      // alert(`File "${file.name}" processed successfully! Generate Schedule button is now enabled.`);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please check the format.');
    }
  };

  const generateSchedule = () => {
    if (!uploadedData) {
      alert('Please upload a file first.');
      return;
    }

    try {
      const schedulingService = new SchedulingService();
      const result = schedulingService.generateSchedule(shifts, uploadedData);
      
      console.log('Updated Shifts:', result.updatedShifts);
      console.log('Updated PAs:', result.updatedPAs);
      setShifts(result.updatedShifts);
      setPAs(result.updatedPAs);
      
      alert('Schedule generated successfully!');
    } catch (error) {
      console.error('Error generating schedule:', error);
      alert('Error generating schedule. Please check the data format.');
    }
  };

  const handleDateSelect = (date: string, altKey: boolean) => {
    if (altKey) {
      // Multi-select mode
      setSelectedDates(prev => {
        if (prev.includes(date)) {
          // Remove if already selected
          return prev.filter(d => d !== date);
        } else {
          // Add to selection
          return [...prev, date];
        }
      });
    } else {
      // Single select mode
      setSelectedDate(date);
      setSelectedDates([date]);
    }
  };

  const applyTemplate = (template: DayTemplate, date: string) => {
    // Remove existing shifts for this date first (overwrite behavior)
    setShifts(prev => prev.filter(shift => shift.date !== date));
    
    const newShifts: Shift[] = [];
    
    template.shifts.forEach(shiftType => {
      for (let i = 0; i < shiftType.count; i++) {
        newShifts.push({
          id: `${Date.now()}-${Math.random()}`,
          date,
          type: shiftType.type,
          assignedPA: null,
          paId: null
        });
      }
    });
    
    setShifts(prev => [...prev, ...newShifts]);
  };


  const handleTemplateDrop = (templateId: string, date: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      // If there are multiple selected dates, apply to all
      const datesToApply = selectedDates.length > 1 ? selectedDates : [date];
      
      datesToApply.forEach(targetDate => {
        applyTemplate(template, targetDate);
      });
      
      // Clear multi-select after applying
      if (selectedDates.length > 1) {
        setSelectedDates([]);
      }
    }
  };

  const applyTemplateToSelectedDates = (template: DayTemplate) => {
    if (selectedDates.length === 0) {
      alert('Please select dates first (hold Alt and click on calendar dates)');
      return;
    }
    
    selectedDates.forEach(date => {
      applyTemplate(template, date);
    });
    
    // Clear selection after applying
    setSelectedDates([]);
  };

  const clearAllAssignments = () => {
    if (confirm('Are you sure you want to clear all PA/Per Diem assignments? This will remove all staff from shifts but keep the shift slots.')) {
      setShifts(prev => prev.map(shift => ({
        ...shift,
        assignedPA: null,
        paId: null
      })));
      
      // Reset PA shift counts
      setPAs(prev => prev.map(pa => ({
        ...pa,
        shiftsWorked: 0,
        overnightShifts: 0,
        weekendShifts: 0
      })));
      
      alert('All assignments cleared successfully!');
    }
  };

  const assignStandardTemplateToAllDays = () => {
    if (confirm('This will assign the Standard Day template to all days in the current month. This will overwrite existing shifts. Continue?')) {
      // Get the standard day template
      const standardTemplate = templates.find(t => t.name === 'Standard Day');
      if (!standardTemplate) {
        alert('Standard Day template not found. Please create it first.');
        return;
      }

      // Generate all dates for the current month (28 days starting from Monday)
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      
      // Get the Monday of the week containing the first day of the month
      const firstMonday = new Date(firstDay);
      const dayOfWeek = firstDay.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      firstMonday.setDate(firstDay.getDate() - daysToMonday);
      
      // Generate 28 days starting from the Monday
      const allDates: string[] = [];
      const current = new Date(firstMonday);
      
      for (let i = 0; i < 28; i++) {
        allDates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }

      // Clear existing shifts
      setShifts([]);

      // Apply standard template to all dates
      allDates.forEach(date => {
        applyTemplate(standardTemplate, date);
      });

      alert(`Standard Day template applied to all ${allDates.length} days in the current month!`);
    }
  };

  const shiftsForSelectedDate = shifts.filter(shift => shift.date === selectedDate);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header 
        onAddShift={() => setIsShiftFormOpen(true)}
        onFileUpload={handleFileUpload}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onGenerateSchedule={generateSchedule}
        isGenerateEnabled={isFileUploaded}
        onClearAllAssignments={clearAllAssignments}
      />
      
      <main className="max-w-[1800px] mx-auto px-4 py-8">
        {activeTab === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left Sidebar - Templates */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sticky top-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Templates
                  </h3>
                  {selectedDates.length > 1 && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                      {selectedDates.length} selected
                    </span>
                  )}
                </div>
                
                {/* Multi-select instructions */}
                {selectedDates.length === 0 && (
                  <div className="mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
                    💡 Hold <kbd className="px-1 bg-gray-200 dark:bg-gray-600 rounded">Alt</kbd> + click to select multiple dates
                  </div>
                )}

                {/* Test Button - Assign Standard Template to All Days */}
                <div className="mb-4">
                  <button
                    onClick={assignStandardTemplateToAllDays}
                    className="w-full px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
                    title="Assign Standard Day template to all days in current month for testing"
                  >
                    🧪 Test: Fill All Days
                  </button>
                </div>
                
                <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', template.id);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-move hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                          {template.name}
                        </h4>
                        <div className="flex space-x-1">
                          {selectedDates.length > 1 ? (
                            <button
                              onClick={() => applyTemplateToSelectedDates(template)}
                              className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                              title={`Apply to ${selectedDates.length} selected dates`}
                            >
                              Apply All
                            </button>
                          ) : (
                            <button
                              onClick={() => applyTemplate(template, selectedDate)}
                              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                            >
                              Apply
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        {template.shifts.map((shift, idx) => (
                          <div
                            key={idx}
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getShiftColor(shift.type).backgroundColor }}
                            title={`${shift.type} (${shift.count})`}
                          ></div>
                        ))}
                      </div>
                    </div>
                  ))}
        </div>
                
                {/* Clear selection button */}
                {selectedDates.length > 1 && (
                  <button
                    onClick={() => setSelectedDates([])}
                    className="w-full mt-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Clear Selection ({selectedDates.length})
                  </button>
                )}
              </div>
            </div>
            
            {/* Calendar Section - Center */}
            <div className="lg:col-span-3">
              <Calendar 
                selectedDate={selectedDate}
                selectedDates={selectedDates}
                onDateSelect={handleDateSelect}
                shifts={shifts}
                onTemplateDrop={handleTemplateDrop}
              />
            </div>
            
            {/* Right Sidebar - Shifts */}
            <div className="lg:col-span-1 space-y-6">
              <div className="sticky top-4">
                <ShiftManager 
                  shifts={shiftsForSelectedDate}
                  pas={pas}
                  onAssignPA={assignPAToShift}
                  onRemovePA={removePAFromShift}
                  onEditShift={setEditingShift}
                  onDeleteShift={deleteShift}
                  onAddShift={() => setIsShiftFormOpen(true)}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pas' && (
          <PAList 
            pas={pas}
            shifts={shifts}
            onUpdatePA={setPAs}
          />
        )}

        {activeTab === 'templates' && (
          <TemplateManager 
            templates={templates}
            onUpdateTemplates={setTemplates}
            onApplyTemplate={applyTemplate}
            selectedDate={selectedDate}
          />
        )}
      </main>

      {/* Shift Form Dialog */}
      <Dialog open={isShiftFormOpen} onOpenChange={setIsShiftFormOpen}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 bg-black/50 z-50" />
          <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <DialogTitle className="sr-only">
              {editingShift ? 'Edit Shift' : 'Add New Shift'}
            </DialogTitle>
            <ShiftForm 
              shift={editingShift}
              selectedDate={selectedDate}
              onSubmit={(shift: Omit<Shift, 'id'>) => {
                if (editingShift) {
                  updateShift({ ...shift, id: editingShift.id });
                } else {
                  addShift(shift);
                }
                setIsShiftFormOpen(false);
                setEditingShift(null);
              }}
              onCancel={() => {
                setIsShiftFormOpen(false);
                setEditingShift(null);
              }}
          />
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
