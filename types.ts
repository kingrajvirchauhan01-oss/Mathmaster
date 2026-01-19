
export interface MathSolution {
  problem: string;
  steps: string[];
  finalAnswer: string;
  category: string;
}

export interface HistoryItem {
  id: string;
  problem: string;
  timestamp: number;
  isFavorite: boolean;
  solution: MathSolution;
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark'
}

export enum Language {
  EN = 'English',
  HI = 'Hindi'
}

export type ErrorType = 'NETWORK' | 'API_LIMIT' | 'INVALID_INPUT' | 'OCR_FAILED' | 'UNKNOWN';

export interface AppError {
  type: ErrorType;
  message: string;
}
