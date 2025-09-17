// 智能地址栏核心类型定义

// 智能查询接口
export interface SmartQuery {
  id: string;
  input: string;
  type: QueryType;
  intent: QueryIntent;
  context: PageContext;
  suggestions: Suggestion[];
  confidence: number;
  timestamp: Date;
}

// 查询类型枚举
export enum QueryType {
  URL = 'url',
  SEARCH = 'search', 
  COMMAND = 'command',
  QUESTION = 'question',
  NAVIGATION = 'navigation',
  HISTORY_SEARCH = 'history_search'
}

// 查询意图
export interface QueryIntent {
  action: string; // 'open', 'search', 'find', 'summarize', etc.
  target: string; // 目标对象
  modifiers: string[]; // 修饰符如 'yesterday', 'about AI', etc.
  confidence: number;
}

// 页面上下文
export interface PageContext {
  url: string;
  title: string;
  content: string;
  headings: string[];
  links: string[];
  timestamp: Date;
}

// 建议项
export interface Suggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  action: string;
  icon: string;
  confidence: number;
  metadata?: Record<string, any>;
}

export enum SuggestionType {
  URL = 'url',
  SEARCH = 'search',
  HISTORY = 'history',
  COMMAND = 'command',
  AI_ANSWER = 'ai_answer',
  BOOKMARK = 'bookmark'
}

// 用户行为模型
export interface UserBehaviorModel {
  userId: string;
  frequentQueries: string[];
  commonPatterns: QueryPattern[];
  preferredSources: string[];
  timeBasedHabits: TimeBasedHabit[];
  lastUpdated: Date;
}

export interface QueryPattern {
  pattern: string;
  frequency: number;
  successRate: number;
  timeOfDay: number[];
  dayOfWeek: number[];
}

export interface TimeBasedHabit {
  timeRange: [number, number]; // 小时范围
  commonActions: string[];
  preferredSites: string[];
}

// API 请求/响应接口
export interface SmartSuggestionsRequest {
  input: string;
  context: PageContext;
  userId?: string;
}

export interface SmartSuggestionsResponse {
  query: SmartQuery;
  suggestions: Suggestion[];
  timestamp: string;
  error?: string;
}