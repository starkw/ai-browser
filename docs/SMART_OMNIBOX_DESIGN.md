# 智能地址栏技术设计文档

## 📋 项目概述
实现对标 Dia 浏览器的智能地址栏，支持自然语言理解、智能预测、实时建议和上下文感知。

**版本**: v0.3.0  
**预计工期**: 2-3周  
**优先级**: P0

---

## 🏗️ 技术架构

### 核心组件架构
```
Smart Omnibox
├── Input Parser (输入解析器)
├── Intent Classifier (意图分类器)
├── Context Analyzer (上下文分析器)
├── Prediction Engine (预测引擎)
├── Suggestion Provider (建议提供器)
└── Action Dispatcher (动作分发器)
```

### 数据流设计
```
用户输入 → 实时解析 → 意图分类 → 上下文分析 → 生成建议 → 展示结果
    ↓
历史记录 ← 行为分析 ← 用户选择 ← 反馈学习
```

---

## 📊 数据结构设计

### 核心类型定义
```typescript
// 智能查询接口
interface SmartQuery {
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
enum QueryType {
  URL = 'url',
  SEARCH = 'search', 
  COMMAND = 'command',
  QUESTION = 'question',
  NAVIGATION = 'navigation',
  HISTORY_SEARCH = 'history_search'
}

// 查询意图
interface QueryIntent {
  action: string; // 'open', 'search', 'find', 'summarize', etc.
  target: string; // 目标对象
  modifiers: string[]; // 修饰符如 'yesterday', 'about AI', etc.
  confidence: number;
}

// 页面上下文
interface PageContext {
  url: string;
  title: string;
  content: string;
  headings: string[];
  links: string[];
  timestamp: Date;
}

// 建议项
interface Suggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  action: string;
  icon: string;
  confidence: number;
  metadata?: any;
}

enum SuggestionType {
  URL = 'url',
  SEARCH = 'search',
  HISTORY = 'history',
  COMMAND = 'command',
  AI_ANSWER = 'ai_answer',
  BOOKMARK = 'bookmark'
}
```

### 数据库扩展
```sql
-- 用户查询历史
CREATE TABLE query_history (
  id UUID PRIMARY KEY,
  user_id UUID,
  query_text TEXT NOT NULL,
  query_type VARCHAR(50),
  intent JSONB,
  context JSONB,
  selected_suggestion_id UUID,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 用户行为分析
CREATE TABLE user_behavior (
  id UUID PRIMARY KEY,
  user_id UUID,
  session_id UUID,
  action VARCHAR(100),
  target TEXT,
  context JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 页面访问历史增强
ALTER TABLE page_content_cache ADD COLUMN visit_count INTEGER DEFAULT 1;
ALTER TABLE page_content_cache ADD COLUMN last_visit TIMESTAMP;
ALTER TABLE page_content_cache ADD COLUMN keywords TEXT[];
ALTER TABLE page_content_cache ADD COLUMN category VARCHAR(100);
```

---

## 🧠 自然语言理解实现

### 意图识别规则
```typescript
const intentPatterns = {
  HISTORY_SEARCH: [
    /帮我找.*昨天.*的/,
    /找.*之前.*看过的/,
    /上次.*浏览的/,
    /搜索.*历史/
  ],
  SUMMARIZE: [
    /总结.*这个页面/,
    /这篇文章.*要点/,
    /概括.*内容/
  ],
  TRANSLATE: [
    /翻译.*这个/,
    /把.*翻译成/,
    /.*的中文是什么/
  ],
  NAVIGATE: [
    /打开.*/,
    /跳转到.*/,
    /访问.*/
  ]
};

// 意图分类器
class IntentClassifier {
  classify(input: string): QueryIntent {
    const normalizedInput = input.toLowerCase().trim();
    
    // 规则匹配
    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(normalizedInput)) {
          return {
            action: intent.toLowerCase(),
            target: this.extractTarget(input, pattern),
            modifiers: this.extractModifiers(input),
            confidence: 0.8
          };
        }
      }
    }
    
    // 默认搜索意图
    return {
      action: 'search',
      target: input,
      modifiers: [],
      confidence: 0.5
    };
  }
  
  private extractTarget(input: string, pattern: RegExp): string {
    // 提取目标对象逻辑
    const match = input.match(pattern);
    return match ? match[1] || input : input;
  }
  
  private extractModifiers(input: string): string[] {
    const timeModifiers = ['昨天', '今天', '上周', '最近'];
    const topicModifiers = ['关于', '有关', '涉及'];
    
    const modifiers: string[] = [];
    
    timeModifiers.forEach(mod => {
      if (input.includes(mod)) modifiers.push(mod);
    });
    
    topicModifiers.forEach(mod => {
      if (input.includes(mod)) modifiers.push(mod);
    });
    
    return modifiers;
  }
}
```

---

## 🔮 智能预测引擎

### 用户行为建模
```typescript
interface UserBehaviorModel {
  userId: string;
  frequentQueries: string[];
  commonPatterns: QueryPattern[];
  preferredSources: string[];
  timeBasedHabits: TimeBasedHabit[];
  lastUpdated: Date;
}

interface QueryPattern {
  pattern: string;
  frequency: number;
  successRate: number;
  timeOfDay: number[];
  dayOfWeek: number[];
}

interface TimeBasedHabit {
  timeRange: [number, number]; // 小时范围
  commonActions: string[];
  preferredSites: string[];
}

// 预测引擎
class PredictionEngine {
  constructor(private userModel: UserBehaviorModel) {}
  
  predictNext(currentInput: string, context: PageContext): Suggestion[] {
    const predictions: Suggestion[] = [];
    
    // 1. 基于输入前缀预测
    const prefixPredictions = this.predictByPrefix(currentInput);
    predictions.push(...prefixPredictions);
    
    // 2. 基于时间模式预测
    const timePredictions = this.predictByTime();
    predictions.push(...timePredictions);
    
    // 3. 基于上下文预测
    const contextPredictions = this.predictByContext(context);
    predictions.push(...contextPredictions);
    
    // 排序和去重
    return this.rankAndDedupe(predictions);
  }
  
  private predictByPrefix(input: string): Suggestion[] {
    return this.userModel.frequentQueries
      .filter(query => query.toLowerCase().startsWith(input.toLowerCase()))
      .slice(0, 3)
      .map(query => ({
        id: `prefix-${query}`,
        type: SuggestionType.SEARCH,
        title: query,
        description: '基于历史查询',
        action: `search:${query}`,
        icon: '🔍',
        confidence: 0.7
      }));
  }
  
  private predictByTime(): Suggestion[] {
    const currentHour = new Date().getHours();
    const habit = this.userModel.timeBasedHabits
      .find(h => currentHour >= h.timeRange[0] && currentHour <= h.timeRange[1]);
    
    if (!habit) return [];
    
    return habit.commonActions.slice(0, 2).map(action => ({
      id: `time-${action}`,
      type: SuggestionType.COMMAND,
      title: action,
      description: `${currentHour}点常用操作`,
      action: action,
      icon: '⏰',
      confidence: 0.6
    }));
  }
  
  private predictByContext(context: PageContext): Suggestion[] {
    // 基于当前页面内容推荐相关操作
    const suggestions: Suggestion[] = [];
    
    if (context.content.length > 1000) {
      suggestions.push({
        id: 'context-summarize',
        type: SuggestionType.AI_ANSWER,
        title: '总结这个页面',
        description: '使用 AI 生成页面摘要',
        action: 'summarize:current_page',
        icon: '📝',
        confidence: 0.8
      });
    }
    
    return suggestions;
  }
  
  private rankAndDedupe(suggestions: Suggestion[]): Suggestion[] {
    // 去重和排序逻辑
    const unique = suggestions.reduce((acc, curr) => {
      if (!acc.find(s => s.title === curr.title)) {
        acc.push(curr);
      }
      return acc;
    }, [] as Suggestion[]);
    
    return unique.sort((a, b) => b.confidence - a.confidence).slice(0, 6);
  }
}
```

---

## ⚡ 实时建议系统

### API 接口设计
```typescript
// API 路由：/api/smart-suggestions
export async function POST(request: Request) {
  const { input, context } = await request.json();
  
  try {
    const parser = new InputParser();
    const classifier = new IntentClassifier();
    const predictor = new PredictionEngine(await getUserModel());
    
    // 解析输入
    const query = parser.parse(input);
    
    // 分类意图
    query.intent = classifier.classify(input);
    
    // 生成建议
    const suggestions = await generateSuggestions(query, context, predictor);
    
    return NextResponse.json({
      query,
      suggestions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function generateSuggestions(
  query: SmartQuery, 
  context: PageContext,
  predictor: PredictionEngine
): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = [];
  
  // 1. 智能预测建议
  const predictions = predictor.predictNext(query.input, context);
  suggestions.push(...predictions);
  
  // 2. 历史搜索建议
  if (query.intent.action === 'history_search') {
    const historyResults = await searchHistory(query.intent.target, query.intent.modifiers);
    suggestions.push(...historyResults);
  }
  
  // 3. 实时搜索建议
  const searchSuggestions = await getSearchSuggestions(query.input);
  suggestions.push(...searchSuggestions);
  
  // 4. AI 回答建议
  if (query.type === QueryType.QUESTION) {
    suggestions.push({
      id: 'ai-answer',
      type: SuggestionType.AI_ANSWER,
      title: `AI 回答：${query.input}`,
      description: '使用 AI 直接回答你的问题',
      action: `ask:${query.input}`,
      icon: '🤖',
      confidence: 0.9
    });
  }
  
  return suggestions;
}
```

---

## 🎯 上下文感知实现

### 页面内容分析
```typescript
class ContextAnalyzer {
  analyzeCurrentPage(): PageContext {
    return {
      url: window.location.href,
      title: document.title,
      content: this.extractMainContent(),
      headings: this.extractHeadings(),
      links: this.extractLinks(),
      timestamp: new Date()
    };
  }
  
  private extractMainContent(): string {
    // 提取主要内容，排除导航、广告等
    const selectors = [
      'article',
      'main',
      '.content',
      '.post',
      '.article-body',
      '[role="main"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent?.slice(0, 5000) || '';
      }
    }
    
    // 兜底方案：获取 body 内容
    return document.body.textContent?.slice(0, 5000) || '';
  }
  
  private extractHeadings(): string[] {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    return Array.from(headings).map(h => h.textContent || '').filter(Boolean);
  }
  
  private extractLinks(): string[] {
    const links = document.querySelectorAll('a[href]');
    return Array.from(links)
      .map(link => (link as HTMLAnchorElement).href)
      .filter(href => href.startsWith('http'))
      .slice(0, 20);
  }
}

// 上下文感知建议生成
class ContextAwareSuggestionProvider {
  generateContextSuggestions(context: PageContext, input: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    // 基于页面内容的建议
    if (this.isArticlePage(context)) {
      suggestions.push(
        {
          id: 'summarize-article',
          type: SuggestionType.AI_ANSWER,
          title: '总结这篇文章',
          description: '生成文章要点摘要',
          action: 'summarize:current_page',
          icon: '📄',
          confidence: 0.8
        },
        {
          id: 'find-related',
          type: SuggestionType.SEARCH,
          title: '查找相关内容',
          description: `搜索与"${context.title}"相关的内容`,
          action: `search:${context.title}`,
          icon: '🔗',
          confidence: 0.7
        }
      );
    }
    
    // 基于输入和页面内容的关联建议
    if (input && this.hasRelatedContent(input, context)) {
      suggestions.push({
        id: 'explain-in-context',
        type: SuggestionType.AI_ANSWER,
        title: `在当前页面中解释"${input}"`,
        description: '基于页面内容解释概念',
        action: `explain:${input}:current_page`,
        icon: '💡',
        confidence: 0.75
      });
    }
    
    return suggestions;
  }
  
  private isArticlePage(context: PageContext): boolean {
    return context.content.length > 1000 && context.headings.length > 0;
  }
  
  private hasRelatedContent(input: string, context: PageContext): boolean {
    const inputLower = input.toLowerCase();
    return context.content.toLowerCase().includes(inputLower) ||
           context.headings.some(h => h.toLowerCase().includes(inputLower));
  }
}
```

---

## 🎨 前端组件实现

### 智能地址栏组件
```typescript
'use client';
import { useState, useEffect, useRef } from 'react';
import { SmartQuery, Suggestion } from '@/types/smart-omnibox';

interface SmartOmniboxProps {
  onSelect: (suggestion: Suggestion) => void;
}

export default function SmartOmnibox({ onSelect }: SmartOmniboxProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 实时建议获取
  useEffect(() => {
    if (input.length < 2) {
      setSuggestions([]);
      return;
    }
    
    const debounceTimer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const context = analyzeCurrentPage();
        const response = await fetch('/api/smart-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input, context })
        });
        
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } catch (error) {
        console.error('Failed to get suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    
    return () => clearTimeout(debounceTimer);
  }, [input]);
  
  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setSuggestions([]);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };
  
  const handleSelect = (suggestion: Suggestion) => {
    onSelect(suggestion);
    setInput('');
    setSuggestions([]);
    setSelectedIndex(-1);
  };
  
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* 输入框 */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="智能搜索：输入问题、网址或命令..."
          className="w-full px-4 py-3 pr-12 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>
      
      {/* 建议列表 */}
      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
          {suggestions.map((suggestion, index) => (
            <SuggestionItem
              key={suggestion.id}
              suggestion={suggestion}
              isSelected={index === selectedIndex}
              onClick={() => handleSelect(suggestion)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 建议项组件
interface SuggestionItemProps {
  suggestion: Suggestion;
  isSelected: boolean;
  onClick: () => void;
}

function SuggestionItem({ suggestion, isSelected, onClick }: SuggestionItemProps) {
  return (
    <div
      className={`px-4 py-3 cursor-pointer flex items-center space-x-3 hover:bg-gray-50 ${
        isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
      }`}
      onClick={onClick}
    >
      <span className="text-xl">{suggestion.icon}</span>
      <div className="flex-1">
        <div className="font-medium text-gray-900">{suggestion.title}</div>
        <div className="text-sm text-gray-500">{suggestion.description}</div>
      </div>
      <div className="text-xs text-gray-400">
        {Math.round(suggestion.confidence * 100)}%
      </div>
    </div>
  );
}

// 页面上下文分析工具函数
function analyzeCurrentPage() {
  return {
    url: window.location.href,
    title: document.title,
    content: document.body.textContent?.slice(0, 2000) || '',
    headings: Array.from(document.querySelectorAll('h1, h2, h3'))
      .map(h => h.textContent || '').filter(Boolean),
    links: Array.from(document.querySelectorAll('a[href]'))
      .map(a => (a as HTMLAnchorElement).href)
      .filter(href => href.startsWith('http'))
      .slice(0, 10),
    timestamp: new Date()
  };
}
```

---

## 📝 实施计划

### 第1周：基础架构
- [ ] 创建核心类型定义
- [ ] 实现输入解析器和意图分类器
- [ ] 搭建基础 API 接口
- [ ] 设计数据库结构

### 第2周：核心功能
- [ ] 实现智能预测引擎
- [ ] 开发实时建议系统
- [ ] 构建上下文分析器
- [ ] 集成历史搜索功能

### 第3周：UI 和优化
- [ ] 完成前端组件开发
- [ ] 实现键盘导航和交互
- [ ] 性能优化和缓存
- [ ] 用户测试和反馈收集

---

## 🧪 测试用例

### 功能测试
1. **自然语言查询**
   - 输入："帮我找昨天看过的关于 AI 的文章"
   - 预期：返回历史搜索建议，包含昨天访问的 AI 相关页面

2. **智能预测**
   - 输入："gith" 
   - 预期：预测 "github.com"，基于历史访问频率

3. **上下文感知**
   - 在技术文章页面输入："解释"
   - 预期：建议"解释这篇文章的核心概念"

4. **实时建议**
   - 输入："天气"
   - 预期：显示天气查询建议、相关网站、AI 回答选项

---

## 📊 性能指标

### 响应时间目标
- 输入解析：< 50ms
- 建议生成：< 300ms
- 历史搜索：< 200ms
- 上下文分析：< 100ms

### 准确性目标
- 意图识别准确率：> 85%
- 预测命中率：> 60%
- 用户满意度：> 4.5/5

---

**下一步**：开始实现基础架构和核心类型定义。