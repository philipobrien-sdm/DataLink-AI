import React, { useState } from 'react';
import { ParsedFile } from '../types';
import { X, FileSpreadsheet, Search } from 'lucide-react';

interface FilePreviewModalProps {
  file: ParsedFile | null;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!file) return null;

  const filteredData = file.data.filter(row => {
    if (!searchTerm) return true;
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }).slice(0, 1000); // Limit to 1000 rows for DOM performance

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{file.name}</h3>
              <p className="text-sm text-slate-500">{file.rowCount.toLocaleString()} rows • {file.headers.length} columns</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
            />
          </div>
          <div className="text-xs text-slate-500">
            Showing {filteredData.length} rows
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto custom-scrollbar p-6">
          <div className="inline-block min-w-full align-middle border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 w-16">
                    #
                  </th>
                  {file.headers.map((header, idx) => (
                    <th key={idx} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredData.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-4 py-2 whitespace-nowrap text-xs font-mono text-slate-400 select-none">
                      {rowIdx + 1}
                    </td>
                    {file.headers.map((header, colIdx) => (
                      <td key={colIdx} className="px-4 py-2 whitespace-nowrap text-sm text-slate-700 max-w-[300px] truncate" title={String(row[header] ?? '')}>
                        {String(row[header] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={file.headers.length + 1} className="px-6 py-12 text-center text-slate-500">
                      No matching records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-center text-slate-500">
          Viewing file content • {file.name}
        </div>
      </div>
    </div>
  );
};