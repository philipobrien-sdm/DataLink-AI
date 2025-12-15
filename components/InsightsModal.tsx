import React, { useState, useRef, useEffect } from 'react';
import { ParsedFile, ChatMessage } from '../types';
import { chatWithDataset } from '../services/geminiService';
import { X, Brain, Send, MessageSquare, Save, Eraser, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface InsightsModalProps {
  file: ParsedFile | null;
  onClose: () => void;
  onUpdateFile: (updatedFile: ParsedFile) => void;
}

export const InsightsModal: React.FC<InsightsModalProps> = ({ file, onClose, onUpdateFile }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'context'>('chat');
  
  // Local state for editing context
  const [description, setDescription] = useState('');
  const [columnNotes, setColumnNotes] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (file && file.aiContext) {
      setDescription(file.aiContext.userDescription || '');
      setColumnNotes(JSON.stringify(file.aiContext.columnMeanings || {}, null, 2));
    } else {
      setDescription('');
      setColumnNotes('{}');
    }
  }, [file]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [file?.aiContext?.chatHistory, isTyping]);

  if (!file) return null;

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg: ChatMessage = {
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    // Optimistic update
    const updatedHistory = [...(file.aiContext?.chatHistory || []), userMsg];
    const updatedFile = {
      ...file,
      aiContext: {
        ...file.aiContext,
        userDescription: description, // Ensure current description is synced
        chatHistory: updatedHistory
      }
    };
    onUpdateFile(updatedFile);
    setInput('');
    setIsTyping(true);

    try {
      const responseText = await chatWithDataset(updatedFile, userMsg.text);
      
      const botMsg: ChatMessage = {
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };

      const finalFile = {
        ...updatedFile,
        aiContext: {
          ...updatedFile.aiContext!,
          chatHistory: [...updatedHistory, botMsg]
        }
      };
      onUpdateFile(finalFile);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSaveContext = () => {
    try {
      const parsedNotes = JSON.parse(columnNotes);
      const updatedFile = {
        ...file,
        aiContext: {
          ...file.aiContext,
          userDescription: description,
          columnMeanings: parsedNotes,
          chatHistory: file.aiContext?.chatHistory || []
        }
      };
      onUpdateFile(updatedFile);
      setActiveTab('chat');
    } catch (e) {
      alert("Column notes must be valid JSON format (e.g., {\"col_name\": \"description\"})");
    }
  };

  const handleClearHistory = () => {
    if (confirm("Clear chat history?")) {
      const updatedFile = {
        ...file,
        aiContext: {
          ...file.aiContext!,
          chatHistory: []
        }
      };
      onUpdateFile(updatedFile);
    }
  };

  const suggestInsight = () => {
    setInput("What are 3 interesting insights you can see in this data?");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-fade-in-up">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 text-white flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">AI Insights: {file.name}</h3>
              <p className="text-violet-100 text-xs">Analyze, ask questions, and build context</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Sidebar (Context) - Visible on desktop or via tab on mobile */}
          <div className={`
            w-full md:w-80 border-r border-slate-200 bg-slate-50 flex flex-col
            ${activeTab === 'context' ? 'block' : 'hidden md:flex'}
          `}>
            <div className="p-4 border-b border-slate-200 bg-white">
              <h4 className="font-semibold text-slate-800 flex items-center">
                <Lightbulb className="w-4 h-4 mr-2 text-amber-500" />
                Data Context
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Help the AI understand your data better by providing details.
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">General Description</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. This is sales data for Q3 2024..."
                  className="w-full text-sm p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none h-32 resize-none"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Column Notes (JSON)</label>
                <textarea 
                  value={columnNotes} 
                  onChange={(e) => setColumnNotes(e.target.value)}
                  placeholder='{ "price": "USD", "status": "1=active" }'
                  className="w-full text-sm font-mono p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none h-48 resize-none"
                />
              </div>

              <button 
                onClick={handleSaveContext}
                className="w-full py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Context</span>
              </button>
            </div>
          </div>

          {/* Chat Area */}
          <div className={`
            flex-1 flex flex-col bg-white
            ${activeTab === 'chat' ? 'block' : 'hidden md:flex'}
          `}>
            {/* Mobile Tabs */}
            <div className="md:hidden flex border-b border-slate-200">
              <button 
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'chat' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-slate-500'}`}
              >
                Chat
              </button>
              <button 
                onClick={() => setActiveTab('context')}
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'context' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-slate-500'}`}
              >
                Context
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar" ref={scrollRef}>
              {(file.aiContext?.chatHistory || []).length === 0 ? (
                <div className="text-center py-10 opacity-60">
                  <div className="bg-violet-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-violet-400" />
                  </div>
                  <h3 className="text-slate-800 font-semibold">Start a conversation</h3>
                  <p className="text-slate-500 text-sm max-w-sm mx-auto mt-2">
                    Ask questions about trends, specific records, or summaries. The AI uses the data sample and your context to answer.
                  </p>
                  <button 
                    onClick={suggestInsight}
                    className="mt-6 px-4 py-2 bg-violet-100 text-violet-700 text-sm rounded-full hover:bg-violet-200 transition-colors"
                  >
                    ✨ Suggest some insights
                  </button>
                </div>
              ) : (
                (file.aiContext?.chatHistory || []).map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`
                      max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm
                      ${msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200 prose prose-sm'
                      }
                    `}>
                      {msg.role === 'user' ? (
                        msg.text
                      ) : (
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-2xl rounded-bl-none p-4 flex space-x-2 items-center">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-200 bg-white">
              <div className="relative flex items-center space-x-2">
                <button 
                  onClick={handleClearHistory}
                  className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  title="Clear History"
                >
                  <Eraser className="w-5 h-5" />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask a question about this file..."
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-700"
                    disabled={isTyping}
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isTyping}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};