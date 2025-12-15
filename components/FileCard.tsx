import React from 'react';
import { ParsedFile } from '../types';
import { FileSpreadsheet, Table, X, Eye, Brain } from 'lucide-react';

interface FileCardProps {
  file: ParsedFile;
  onRemove: (id: string) => void;
  onPreview: (file: ParsedFile) => void;
  onInsights: (file: ParsedFile) => void;
  colorIndex: number; // For visual differentiation
}

const COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500'
];

export const FileCard: React.FC<FileCardProps> = ({ file, onRemove, onPreview, onInsights, colorIndex }) => {
  const themeColor = file.isJoined ? 'bg-indigo-600' : COLORS[colorIndex % COLORS.length];

  return (
    <div className={`
      bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md group
      ${file.isJoined ? 'border-indigo-200 ring-1 ring-indigo-50' : 'border-slate-200'}
    `}>
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4 overflow-hidden">
          <div className={`p-3 rounded-lg ${themeColor} text-white shrink-0 relative`}>
            <FileSpreadsheet className="w-6 h-6" />
            {file.isJoined && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-indigo-600 rounded-full" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-slate-900 font-semibold truncate text-sm sm:text-base flex items-center" title={file.name}>
              {file.name}
              {file.isJoined && <span className="ml-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] rounded uppercase font-bold tracking-wider">Joined</span>}
            </h3>
            <div className="flex items-center text-xs text-slate-500 space-x-3 mt-1">
              <span className="flex items-center">
                <Table className="w-3 h-3 mr-1" />
                {file.rowCount.toLocaleString()} rows
              </span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span>{file.headers.length} columns</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => onInsights(file)}
            className="p-2 text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors group-hover:scale-105"
            title="AI Insights"
          >
            <Brain className="w-5 h-5" />
          </button>
          <button 
            onClick={() => onPreview(file)}
            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            title="View Data"
          >
            <Eye className="w-5 h-5" />
          </button>
          <button 
            onClick={() => onRemove(file.id)}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Remove File"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Quick Preview of Headers (Horizontal scroll) */}
      <div className="px-4 pb-4 overflow-x-auto custom-scrollbar">
        <div className="flex space-x-2">
          {file.headers.slice(0, 6).map((h, i) => (
             <span key={i} className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-[10px] text-slate-500 font-mono whitespace-nowrap">
               {h}
             </span>
          ))}
          {file.headers.length > 6 && (
            <span className="px-2 py-0.5 text-[10px] text-slate-400">+{file.headers.length - 6} more</span>
          )}
        </div>
      </div>
    </div>
  );
};