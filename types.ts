export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface AIContext {
  userDescription?: string; // "This file contains Q3 sales data"
  columnMeanings?: Record<string, string>; // { "col_a": "The profit margin" }
  chatHistory: ChatMessage[];
}

export interface ParsedFile {
  id: string;
  name: string;
  size: number;
  headers: string[];
  previewData: any[]; // Array of objects representing the first few rows
  data: any[]; // Full dataset
  rowCount: number;
  isJoined?: boolean; // Flag to identify files created by the app
  aiContext?: AIContext; // Store reasoning, insights, and chat history
}

export interface JoinCandidate {
  keyName: string;
  confidenceScore: number; // 0 to 100
  reasoning: string;
  columnMappings: {
    fileName: string;
    columnName: string;
  }[];
  potentialIssues?: string[];
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export enum JoinType {
  INNER = 'INNER',
  OUTER = 'OUTER',
  LEFT = 'LEFT',
  ADDITIVE = 'ADDITIVE',
  AI_SEMANTIC = 'AI_SEMANTIC'
}

export interface JoinStats {
  [JoinType.INNER]: number;
  [JoinType.OUTER]: number;
  [JoinType.LEFT]: number;
  [JoinType.ADDITIVE]: number;
  [JoinType.AI_SEMANTIC]?: number;
}