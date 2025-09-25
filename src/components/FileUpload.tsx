"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface FileUploadProps {
  children: React.ReactNode;
  onFileUpload: (file: File) => void;
}

export function FileUpload({ children, onFileUpload }: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles[0]);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: false
  });

  return (
    <div {...getRootProps()} className="relative">
      <input {...getInputProps()} />
      {children}
      
      {isDragActive && (
        <div className="fixed inset-0 z-50 bg-blue-500 bg-opacity-20 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              Drop your file here
            </p>
          </div>
        </div>
      )}
    </div>
  );
}