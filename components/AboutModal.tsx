import React from 'react';
import { X, Bot, FileSpreadsheet, GitMerge, Download, CheckCircle2 } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-blue-600 p-3 rounded-xl">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">About DataLink AI</h2>
              <p className="text-blue-600 font-medium">Intelligent Excel Integration</p>
            </div>
          </div>

          <div className="space-y-6 text-slate-600">
            <p className="leading-relaxed">
              DataLink AI simplifies the complex task of merging multiple datasets. Instead of manually writing VLOOKUPs or SQL queries, let our AI analyze your files and suggest the best way to combine them.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center mb-2">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-3">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-slate-800">1. Upload Files</h3>
                </div>
                <p className="text-sm">Support for .xlsx, .xls, and .csv files. We analyze headers and data samples securely in your browser context.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center mb-2">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg mr-3">
                    <Bot className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-slate-800">2. AI Analysis</h3>
                </div>
                <p className="text-sm">Gemini AI detects common keys (e.g., "Email", "ID") across files, even if column names are slightly different.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center mb-2">
                  <div className="p-2 bg-violet-100 text-violet-600 rounded-lg mr-3">
                    <GitMerge className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-slate-800">3. Smart Join</h3>
                </div>
                <p className="text-sm">Choose from Inner, Left, Outer, or our special <span className="font-bold text-violet-700">Additive Join</span> which flags matched vs. unmatched rows.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center mb-2">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg mr-3">
                    <Download className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-slate-800">4. Export</h3>
                </div>
                <p className="text-sm">Download your clean, merged dataset as a CSV file, ready for further analysis in Excel or BI tools.</p>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start space-x-3">
               <CheckCircle2 className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
               <div>
                 <h4 className="font-semibold text-amber-800 text-sm">Privacy Focused</h4>
                 <p className="text-xs text-amber-700 mt-1">
                   Only a small sample of your data (first few rows) is sent to the AI for structure analysis. The full dataset join happens locally in your browser.
                 </p>
               </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-6 flex justify-end rounded-b-2xl border-t border-slate-100">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};