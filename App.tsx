import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { FileCard } from './components/FileCard';
import { AnalysisResult } from './components/AnalysisResult';
import { AboutModal } from './components/AboutModal';
import { FilePreviewModal } from './components/FilePreviewModal';
import { InsightsModal } from './components/InsightsModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ParsedFile, JoinCandidate, AnalysisStatus } from './types';
import { analyzeFilesForJoin } from './services/geminiService';
import { Bot, Sparkles, RefreshCw, XCircle, Info, Upload, Download } from 'lucide-react';

const App: React.FC = () => {
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [candidates, setCandidates] = useState<JoinCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Modals
  const [showAbout, setShowAbout] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [previewFile, setPreviewFile] = useState<ParsedFile | null>(null);
  const [insightFile, setInsightFile] = useState<ParsedFile | null>(null);

  const handleFilesParsed = (newFiles: ParsedFile[]) => {
    // Avoid duplicates by name (simple check)
    const uniqueNewFiles = newFiles.filter(nf => !files.some(ef => ef.name === nf.name));
    setFiles(prev => [...prev, ...uniqueNewFiles]);
    // Reset analysis if files change (optional, depending on UX preference)
    if (analysisStatus === AnalysisStatus.COMPLETED) {
      setAnalysisStatus(AnalysisStatus.IDLE);
      setCandidates([]);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    // If we removed a file that invalidates the analysis
    if (files.length <= 2) { 
       setAnalysisStatus(AnalysisStatus.IDLE);
       setCandidates([]);
    }
  };

  const updateFileState = (updatedFile: ParsedFile) => {
    setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
    // If the modal is open with this file, keep it updated
    if (insightFile?.id === updatedFile.id) {
      setInsightFile(updatedFile);
    }
  };

  const handleAnalyze = async () => {
    // Only analyze uploaded files (skip joined files usually, or include them if user wants)
    // For now, let's analyze ALL files including joined ones, as that's powerful.
    if (files.length < 2) return;

    setAnalysisStatus(AnalysisStatus.ANALYZING);
    setError(null);
    setCandidates([]);
    
    try {
      const results = await analyzeFilesForJoin(files);
      setCandidates(results);
      setAnalysisStatus(AnalysisStatus.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setError("Failed to analyze files. Please check your API key and try again.");
      setAnalysisStatus(AnalysisStatus.ERROR);
    }
  };

  const handleSaveJoinedFile = (newFile: ParsedFile) => {
    setFiles(prev => [...prev, newFile]);
  };

  const exportState = () => {
    const dataStr = JSON.stringify(files);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `datalink_workspace_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importState = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (Array.isArray(json)) {
          setFiles(json);
          setAnalysisStatus(AnalysisStatus.IDLE);
          setCandidates([]);
          alert("Workspace imported successfully!");
        } else {
          alert("Invalid JSON format");
        }
      } catch (err) {
        alert("Failed to parse JSON");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const performReset = () => {
    setFiles([]);
    setCandidates([]);
    setAnalysisStatus(AnalysisStatus.IDLE);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      <InsightsModal 
        file={insightFile} 
        onClose={() => setInsightFile(null)} 
        onUpdateFile={updateFileState}
      />
      <ConfirmModal 
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={performReset}
        title="Clear Workspace"
        message="Are you sure you want to remove all files and analysis results? This action cannot be undone."
        confirmLabel="Clear All"
        isDangerous={true}
      />
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
              DataLink AI
            </h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
             {/* Import/Export Tools */}
             <div className="hidden sm:flex items-center space-x-1 mr-2">
                <label className="cursor-pointer text-slate-500 hover:text-blue-600 p-2 rounded-full hover:bg-slate-100 transition-colors" title="Import Workspace">
                   <Upload className="w-5 h-5" />
                   <input type="file" accept=".json" onChange={importState} className="hidden" />
                </label>
                {files.length > 0 && (
                   <button onClick={exportState} className="text-slate-500 hover:text-blue-600 p-2 rounded-full hover:bg-slate-100 transition-colors" title="Export Workspace">
                      <Download className="w-5 h-5" />
                   </button>
                )}
             </div>

             <button
               onClick={() => setShowAbout(true)}
               className="text-slate-500 hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-slate-100"
               aria-label="About"
             >
               <Info className="w-5 h-5" />
             </button>
            {files.length > 0 && (
               <button 
                onClick={() => setShowResetConfirm(true)}
                className="text-sm text-slate-500 hover:text-red-600 font-medium transition-colors"
               >
                 Clear All
               </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Intro / Empty State */}
        {files.length === 0 && (
          <div className="text-center py-12 mb-8 animate-fade-in">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Intelligent Data Joining</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Upload your spreadsheets, use AI to find common keys, and analyze the results instantly.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Upload & File List */}
          <div className={`lg:col-span-5 space-y-6 ${candidates.length > 0 ? 'lg:col-span-5' : 'lg:col-span-8 lg:col-start-3'}`}>
            <FileUpload onFilesParsed={handleFilesParsed} isAnalyzing={analysisStatus === AnalysisStatus.ANALYZING} />
            
            {files.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                     Workspace Files ({files.length})
                   </h3>
                </div>
                
                <div className="space-y-3">
                  {files.map((file, idx) => (
                    <FileCard 
                      key={file.id} 
                      file={file} 
                      onRemove={removeFile}
                      onPreview={(f) => setPreviewFile(f)}
                      onInsights={(f) => setInsightFile(f)}
                      colorIndex={idx}
                    />
                  ))}
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleAnalyze}
                    disabled={files.length < 2 || analysisStatus === AnalysisStatus.ANALYZING}
                    className={`
                      w-full py-4 rounded-xl flex items-center justify-center space-x-2 font-bold text-lg shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]
                      ${files.length < 2 
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                        : analysisStatus === AnalysisStatus.ANALYZING
                          ? 'bg-blue-600 text-white cursor-wait opacity-80'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-200/50'
                      }
                    `}
                  >
                    {analysisStatus === AnalysisStatus.ANALYZING ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Analyzing Structure...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Identify Join Keys</span>
                      </>
                    )}
                  </button>
                  {files.length === 1 && (
                    <p className="text-center text-xs text-slate-400 mt-2">
                      Upload at least one more file to enable analysis.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-7">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start space-x-3 mb-6">
                 <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                 <div>
                   <h3 className="text-red-800 font-semibold">Analysis Failed</h3>
                   <p className="text-red-600 mt-1">{error}</p>
                 </div>
              </div>
            )}

            {candidates.length > 0 ? (
               <AnalysisResult 
                 candidates={candidates} 
                 files={files} 
                 onSaveJoinedFile={handleSaveJoinedFile}
               />
            ) : (
              files.length > 0 && analysisStatus === AnalysisStatus.IDLE && (
                 <div className="hidden lg:flex h-full min-h-[400px] border-2 border-dashed border-slate-200 rounded-2xl items-center justify-center bg-slate-50/50">
                    <div className="text-center text-slate-400 p-8">
                       <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                          <Bot className="w-8 h-8 text-slate-300" />
                       </div>
                       <p className="font-medium">Ready to analyze</p>
                       <p className="text-sm mt-1">Upload files, click "Identify Join Keys", or click the Brain icon for insights.</p>
                    </div>
                 </div>
              )
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;