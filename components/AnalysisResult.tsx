import React, { useState, useEffect, useMemo } from 'react';
import { JoinCandidate, ParsedFile, JoinType, JoinStats } from '../types';
import { Link2, AlertTriangle, Lightbulb, ArrowRight, Download, Loader2, Layers, GitMerge, Combine, Database, Flag, Save, Sparkles, PencilLine } from 'lucide-react';
import { joinDatasets, downloadCSV, calculateJoinStats, createJoinedFile } from '../services/dataService';
import { generateSemanticMerge, generateMergePlan } from '../services/geminiService';

interface AnalysisResultProps {
  candidates: JoinCandidate[];
  files: ParsedFile[];
  onSaveJoinedFile: (newFile: ParsedFile) => void;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ candidates, files, onSaveJoinedFile }) => {
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedJoinType, setSelectedJoinType] = useState<JoinType>(JoinType.ADDITIVE); 
  const [stats, setStats] = useState<JoinStats | null>(null);

  // AI Plan State
  const [aiPlan, setAiPlan] = useState<string>('');
  const [isPlanning, setIsPlanning] = useState(false);

  const activeCandidate = candidates[selectedCandidateIndex];

  // Recalculate stats when candidate/files change
  useEffect(() => {
    if (activeCandidate && files.length > 0) {
      const calculatedStats = calculateJoinStats(files, activeCandidate);
      setStats(calculatedStats);
      // Reset plan when candidate changes
      setAiPlan('');
    }
  }, [activeCandidate, files]);

  // Generate Plan when AI_SEMANTIC is selected
  useEffect(() => {
    if (selectedJoinType === JoinType.AI_SEMANTIC && !aiPlan && !isPlanning && files.length > 0) {
      setIsPlanning(true);
      generateMergePlan(files, activeCandidate).then(plan => {
        setAiPlan(plan);
        setIsPlanning(false);
      }).catch(() => setIsPlanning(false));
    }
  }, [selectedJoinType, activeCandidate, files, aiPlan, isPlanning]);

  if (!candidates || candidates.length === 0) return null;

  const handleAction = async (action: 'download' | 'save') => {
    setIsProcessing(true);

    // Use setTimeout to allow UI to update with spinner
    setTimeout(async () => {
      try {
        let joinedData: any[] = [];
        let fileNamePrefix = '';

        if (selectedJoinType === JoinType.AI_SEMANTIC) {
          // Pass the edited plan to the merge function
          joinedData = await generateSemanticMerge(files, activeCandidate, aiPlan);
          fileNamePrefix = 'ai_semantic_merge';
        } else {
          joinedData = joinDatasets(files, activeCandidate, selectedJoinType);
          
          let joinTypeName = 'full';
          if (selectedJoinType === JoinType.INNER) joinTypeName = 'inner';
          if (selectedJoinType === JoinType.LEFT) joinTypeName = 'left';
          if (selectedJoinType === JoinType.ADDITIVE) joinTypeName = 'additive';
          fileNamePrefix = `merged_${joinTypeName}`;
        }

        const fileName = `${fileNamePrefix}_${activeCandidate.keyName.replace(/\s+/g, '_')}`;

        if (action === 'download') {
          downloadCSV(joinedData, `${fileName}.csv`);
        } else {
          const newFile = createJoinedFile(joinedData, `${fileName} (Joined)`);
          onSaveJoinedFile(newFile);
          alert("File saved to workspace! You can now analyze it with AI insights.");
        }
      } catch (e) {
        console.error("Join failed", e);
        alert("Failed to join datasets. Check console for details.");
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  const joinOptions = [
    {
      type: JoinType.ADDITIVE,
      title: 'Additive Join (Recommended)',
      icon: Flag,
      description: 'Retains ALL data. Adds a status column to flag if rows are matched, unique, or partial.',
      count: stats?.[JoinType.ADDITIVE],
      color: 'border-indigo-200 bg-indigo-50 text-indigo-700',
      activeBorder: 'border-indigo-500 ring-1 ring-indigo-500'
    },
    {
      type: JoinType.AI_SEMANTIC,
      title: 'AI Semantic Merge',
      icon: Sparkles,
      description: 'Uses AI reasoning to merge entities. Resolves fuzzy matches and combines schemas intelligently. (Processes top 50 rows)',
      count: 'AI Generated',
      color: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
      activeBorder: 'border-fuchsia-500 ring-1 ring-fuchsia-500'
    },
    {
      type: JoinType.OUTER,
      title: 'Full Outer Join',
      icon: Combine,
      description: 'Simple union. Keep all records from all files. Empty cells where matches are missing.',
      count: stats?.[JoinType.OUTER],
      color: 'border-blue-200 bg-blue-50 text-blue-700',
      activeBorder: 'border-blue-500 ring-1 ring-blue-500'
    },
    {
      type: JoinType.INNER,
      title: 'Inner Join',
      icon: GitMerge,
      description: 'Only keep records that match perfectly across ALL files.',
      count: stats?.[JoinType.INNER],
      color: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      activeBorder: 'border-emerald-500 ring-1 ring-emerald-500'
    },
    {
      type: JoinType.LEFT,
      title: 'Left Join',
      icon: Layers,
      description: `Keep all records from "${files[0]?.name}", matching others where possible.`,
      count: stats?.[JoinType.LEFT],
      color: 'border-violet-200 bg-violet-50 text-violet-700',
      activeBorder: 'border-violet-500 ring-1 ring-violet-500'
    }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden animate-fade-in-up flex flex-col">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-2">
          <div className="flex items-center space-x-3 mb-4 sm:mb-0">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Link2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Analysis Results</h2>
              <p className="text-blue-100 text-sm">Found {candidates.length} potential join keys</p>
            </div>
          </div>
        </div>

        {/* Candidate Selector Tabs */}
        <div className="flex space-x-2 overflow-x-auto pb-2 custom-scrollbar mt-4">
          {candidates.map((cand, idx) => {
            const isActive = idx === selectedCandidateIndex;
            return (
              <button
                key={idx}
                onClick={() => setSelectedCandidateIndex(idx)}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap border
                  ${isActive 
                    ? 'bg-white text-blue-700 border-white shadow-lg' 
                    : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'
                  }
                `}
              >
                <span>{cand.keyName}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-black/20 text-white'}`}>
                  {cand.confidenceScore}%
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-8 flex-1">
        {/* Active Candidate Details */}
        <div className="animate-fade-in">
          <div className="text-center mb-8">
            <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold mb-2">Selected Common Column</p>
            <div className="inline-flex items-center justify-center space-x-2 bg-blue-50 px-6 py-3 rounded-xl border border-blue-200">
               <span className="text-2xl sm:text-3xl font-bold text-blue-900 break-all">{activeCandidate.keyName}</span>
            </div>
          </div>

          {/* Reasoning */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 relative mb-8">
            <Lightbulb className="w-5 h-5 text-amber-500 absolute top-5 left-5" />
            <div className="pl-8">
              <h4 className="text-sm font-semibold text-slate-800 mb-2">AI Reasoning</h4>
              <p className="text-slate-600 leading-relaxed text-sm">
                {activeCandidate.reasoning}
              </p>
            </div>
          </div>
          
          <hr className="border-slate-100 mb-8" />

          {/* Join Strategy Selection */}
          <div className="mb-6">
             <h4 className="text-sm font-semibold text-slate-900 mb-4">Select Join Method</h4>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                {joinOptions.map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => setSelectedJoinType(opt.type)}
                    className={`
                      relative flex flex-col items-start p-4 rounded-xl border-2 transition-all duration-200 text-left h-full
                      ${selectedJoinType === opt.type ? opt.activeBorder + ' bg-white shadow-md' : 'border-slate-100 hover:border-slate-300 bg-white hover:bg-slate-50'}
                    `}
                  >
                    <div className={`p-2 rounded-lg mb-3 ${opt.color}`}>
                      <opt.icon className="w-5 h-5" />
                    </div>
                    <div className="mb-1 w-full flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-sm">{opt.title}</span>
                      {opt.count !== undefined && (
                        <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                          {typeof opt.count === 'number' ? `${opt.count} rows` : opt.count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {opt.description}
                    </p>
                    
                    {selectedJoinType === opt.type && (
                      <div className="absolute top-3 right-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      </div>
                    )}
                  </button>
                ))}
             </div>
          </div>

          {/* AI Plan Editor (Only visible if AI_SEMANTIC is selected) */}
          {selectedJoinType === JoinType.AI_SEMANTIC && (
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                 <h4 className="text-sm font-semibold text-fuchsia-900 flex items-center">
                   <PencilLine className="w-4 h-4 mr-2" />
                   Review AI Execution Plan
                 </h4>
                 {isPlanning && <span className="text-xs text-slate-400 animate-pulse">Generating plan...</span>}
              </div>
              <div className="relative">
                <textarea
                  value={aiPlan}
                  onChange={(e) => setAiPlan(e.target.value)}
                  disabled={isPlanning}
                  className={`
                    w-full h-48 p-4 rounded-xl border-2 text-sm font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-fuchsia-500
                    ${isPlanning ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-fuchsia-50/30 border-fuchsia-100 text-slate-700'}
                  `}
                  placeholder="The AI will describe its merge strategy here. You can edit it to provide specific instructions."
                />
                {!isPlanning && !aiPlan && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                     Plan generation failed. Please type your instructions manually.
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                <strong>Tip:</strong> You can edit the text above to force the AI to behave differently (e.g., "Do not merge column X", "Use strict matching for Emails").
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => handleAction('download')}
              disabled={isProcessing || (selectedJoinType === JoinType.AI_SEMANTIC && isPlanning)}
              className={`
                flex-1 flex items-center justify-center space-x-2 py-4 rounded-xl font-bold text-lg shadow-md hover:shadow-lg transition-all transform active:scale-[0.99] text-white
                bg-slate-800 hover:bg-slate-900 disabled:opacity-70 disabled:cursor-not-allowed
              `}
            >
              {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
              <span>Download CSV</span>
            </button>
            <button 
              onClick={() => handleAction('save')}
              disabled={isProcessing || (selectedJoinType === JoinType.AI_SEMANTIC && isPlanning)}
              className={`
                flex-1 flex items-center justify-center space-x-2 py-4 rounded-xl font-bold text-lg shadow-md hover:shadow-lg transition-all transform active:scale-[0.99] text-white disabled:opacity-70 disabled:cursor-not-allowed
                ${selectedJoinType === JoinType.INNER ? 'bg-emerald-600 hover:bg-emerald-700' : 
                  selectedJoinType === JoinType.LEFT ? 'bg-violet-600 hover:bg-violet-700' : 
                  selectedJoinType === JoinType.ADDITIVE ? 'bg-indigo-600 hover:bg-indigo-700' :
                  selectedJoinType === JoinType.AI_SEMANTIC ? 'bg-fuchsia-600 hover:bg-fuchsia-700' :
                  'bg-blue-600 hover:bg-blue-700'}
              `}
            >
              {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              <span>Save to Workspace</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};