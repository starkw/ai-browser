import { NextResponse } from 'next/server';
import { IntentClassifier } from '@/lib/smart-omnibox/intent-classifier';
import { PredictionEngine } from '@/lib/smart-omnibox/prediction-engine';
import { ContextAwareSuggestionProvider } from '@/lib/smart-omnibox/context-analyzer';
import { SmartQuery, Suggestion, QueryType, UserBehaviorModel, SmartSuggestionsRequest } from '@/types/smart-omnibox';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { input, context, userId }: SmartSuggestionsRequest = await request.json();
    
    if (!input || input.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Input is required' 
      }, { status: 400 });
    }
    
    // 1. 创建智能查询对象
    const classifier = new IntentClassifier();
    const intent = classifier.classify(input);
    const queryType = classifier.determineQueryType(intent);
    
    const query: SmartQuery = {
      id: `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      input: input.trim(),
      type: queryType,
      intent,
      context,
      suggestions: [],
      confidence: intent.confidence,
      timestamp: new Date()
    };
    
    // 2. 生成建议
    const suggestions = await generateSuggestions(query, userId);
    query.suggestions = suggestions;
    
    // 3. 记录查询历史（异步）
    if (userId) {
      recordQueryHistory(query, userId).catch(console.error);
    }
    
    return NextResponse.json({
      query,
      suggestions,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Smart suggestions error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

/**
 * 生成智能建议
 */
async function generateSuggestions(query: SmartQuery, userId?: string): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = [];
  
  try {
    // 1. 获取用户行为模型
    const userModel = userId ? await getUserBehaviorModel(userId) : getDefaultUserModel();
    
    // 2. 智能预测建议
    const predictor = new PredictionEngine(userModel);
    const predictions = predictor.predictNext(query.input, query.context);
    suggestions.push(...predictions);
    
    // 3. 上下文感知建议
    const contextProvider = new ContextAwareSuggestionProvider();
    const contextSuggestions = contextProvider.generateContextSuggestions(query.context, query.input);
    suggestions.push(...contextSuggestions);
    
    // 4. 历史搜索建议
    if (query.intent.action === 'history_search') {
      const historyResults = await searchHistory(query.intent.target, query.intent.modifiers, userId);
      suggestions.push(...historyResults);
    }
    
    // 5. 实时搜索建议
    const searchSuggestions = await getSearchSuggestions(query.input);
    suggestions.push(...searchSuggestions);
    
    // 6. AI 回答建议
    if (query.type === QueryType.QUESTION || query.intent.action === 'question') {
      suggestions.push({
        id: 'ai-answer',
        type: 'ai_answer' as const,
        title: `AI 回答：${query.input}`,
        description: '使用 DeepSeek 直接回答你的问题',
        action: `ask:${encodeURIComponent(query.input)}`,
        icon: '🤖',
        confidence: 0.9
      });
    }
    
    // 排序、去重和限制数量
    return rankAndLimitSuggestions(suggestions);
    
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return getDefaultSuggestions(query.input);
  }
}

/**
 * 获取用户行为模型
 */
async function getUserBehaviorModel(userId: string): Promise<UserBehaviorModel> {
  try {
    // 从数据库获取用户历史查询
    const queryHistory = await prisma.queryHistory.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 100
    }).catch(() => []);
    
    // 分析用户行为模式
    const frequentQueries = queryHistory
      .map(q => q.query_text)
      .reduce((acc, query) => {
        acc[query] = (acc[query] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    const sortedQueries = Object.entries(frequentQueries)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([query]) => query);
    
    return {
      userId,
      frequentQueries: sortedQueries,
      commonPatterns: [], // TODO: 实现模式分析
      preferredSources: [], // TODO: 实现来源分析
      timeBasedHabits: [], // TODO: 实现时间习惯分析
      lastUpdated: new Date()
    };
    
  } catch (error) {
    console.error('Error getting user behavior model:', error);
    return getDefaultUserModel();
  }
}

/**
 * 获取默认用户模型
 */
function getDefaultUserModel(): UserBehaviorModel {
  return {
    userId: 'anonymous',
    frequentQueries: [
      'GitHub',
      '天气',
      'AI 新闻',
      'JavaScript 教程',
      'React 文档'
    ],
    commonPatterns: [
      {
        pattern: 'search:github',
        frequency: 10,
        successRate: 0.9,
        timeOfDay: [9, 18],
        dayOfWeek: [1, 2, 3, 4, 5]
      }
    ],
    preferredSources: ['github.com', 'stackoverflow.com', 'developer.mozilla.org'],
    timeBasedHabits: [
      {
        timeRange: [9, 12],
        commonActions: ['search:github', 'open:email'],
        preferredSites: ['github.com', 'gmail.com']
      },
      {
        timeRange: [14, 18],
        commonActions: ['search:news', 'search:weather'],
        preferredSites: ['news.ycombinator.com', 'weather.com']
      }
    ],
    lastUpdated: new Date()
  };
}

/**
 * 搜索历史记录
 */
async function searchHistory(target: string, modifiers: string[], userId?: string): Promise<Suggestion[]> {
  if (!userId) return [];
  
  try {
    // 解析时间修饰符
    const timeFilter = getTimeFilter(modifiers);
    
    // 搜索页面访问历史
    const whereClause: any = {};
    if (timeFilter) {
      whereClause.last_visit = { gte: timeFilter };
    }
    
    // 基于内容搜索
    if (target) {
      whereClause.OR = [
        { title: { contains: target, mode: 'insensitive' } },
        { content: { contains: target, mode: 'insensitive' } }
      ];
    }
    
    const historyResults = await prisma.pageContentCache.findMany({
      where: whereClause,
      orderBy: { last_visit: 'desc' },
      take: 5
    }).catch(() => []);
    
    return historyResults.map((result, index) => ({
      id: `history-${result.id}`,
      type: 'history' as const,
      title: result.title || result.url,
      description: `${formatDate(result.last_visit)} 访问`,
      action: `open:${result.url}`,
      icon: '📚',
      confidence: 0.8 - (index * 0.1)
    }));
    
  } catch (error) {
    console.error('Error searching history:', error);
    return [];
  }
}

/**
 * 获取搜索建议
 */
async function getSearchSuggestions(input: string): Promise<Suggestion[]> {
  // 基本搜索引擎建议
  const searchEngines = [
    { name: 'Google', icon: '🔍', url: `https://www.google.com/search?q=${encodeURIComponent(input)}` },
    { name: 'Bing', icon: '🔍', url: `https://www.bing.com/search?q=${encodeURIComponent(input)}` },
    { name: '百度', icon: '🔍', url: `https://www.baidu.com/s?wd=${encodeURIComponent(input)}` }
  ];
  
  return searchEngines.map((engine, index) => ({
    id: `search-${engine.name.toLowerCase()}`,
    type: 'search' as const,
    title: `在 ${engine.name} 搜索`,
    description: `"${input}"`,
    action: `open:${engine.url}`,
    icon: engine.icon,
    confidence: 0.6 - (index * 0.05)
  }));
}

/**
 * 排序和限制建议数量
 */
function rankAndLimitSuggestions(suggestions: Suggestion[]): Suggestion[] {
  // 去重
  const unique = suggestions.reduce((acc, curr) => {
    if (!acc.find(s => s.title === curr.title && s.action === curr.action)) {
      acc.push(curr);
    }
    return acc;
  }, [] as Suggestion[]);
  
  // 按类型分组
  const byType: Record<string, Suggestion[]> = {};
  unique.forEach(suggestion => {
    if (!byType[suggestion.type]) {
      byType[suggestion.type] = [];
    }
    byType[suggestion.type].push(suggestion);
  });
  
  // 对每个类型内部按置信度排序
  Object.keys(byType).forEach(type => {
    byType[type].sort((a, b) => b.confidence - a.confidence);
  });
  
  // 按优先级组装结果，确保搜索引擎的多样性
  const result: Suggestion[] = [];
  
  // 1. 优先添加 AI 回答（最多1个）
  if (byType.ai_answer) {
    result.push(...byType.ai_answer.slice(0, 1));
  }
  
  // 2. 确保 Google 和 Bing 都显示（搜索引擎多样性）
  if (byType.search) {
    const googleSuggestion = byType.search.find(s => s.title.includes('Google'));
    const bingSuggestion = byType.search.find(s => s.title.includes('Bing'));
    const baiduSuggestion = byType.search.find(s => s.title.includes('百度'));
    
    if (googleSuggestion) result.push(googleSuggestion);
    if (bingSuggestion) result.push(bingSuggestion);
    if (baiduSuggestion && result.length < 6) result.push(baiduSuggestion);
  }
  
  // 3. 添加其他类型的建议
  ['history', 'command', 'url', 'bookmark'].forEach(type => {
    if (byType[type] && result.length < 8) {
      result.push(...byType[type].slice(0, Math.min(2, 8 - result.length)));
    }
  });
  
  // 4. 如果还有空间，添加更多AI回答
  if (byType.ai_answer && result.length < 8) {
    const remainingAI = byType.ai_answer.slice(1);
    result.push(...remainingAI.slice(0, 8 - result.length));
  }
  
  return result.slice(0, 8); // 最多8个建议
}

/**
 * 获取默认建议
 */
function getDefaultSuggestions(input: string): Suggestion[] {
  return [
    {
      id: 'default-search',
      type: 'search' as const,
      title: `搜索 "${input}"`,
      description: '在 Google 中搜索',
      action: `open:https://www.google.com/search?q=${encodeURIComponent(input)}`,
      icon: '🔍',
      confidence: 0.7
    },
    {
      id: 'default-ai',
      type: 'ai_answer' as const,
      title: `AI 回答：${input}`,
      description: '使用 AI 回答问题',
      action: `ask:${encodeURIComponent(input)}`,
      icon: '🤖',
      confidence: 0.8
    }
  ];
}

/**
 * 记录查询历史
 */
async function recordQueryHistory(query: SmartQuery, userId: string): Promise<void> {
  try {
    await prisma.queryHistory.create({
      data: {
        user_id: userId,
        query_text: query.input,
        query_type: query.type,
        intent: query.intent as any,
        context: query.context as any,
        created_at: new Date()
      }
    }).catch(console.error);
  } catch (error) {
    console.error('Error recording query history:', error);
  }
}

/**
 * 解析时间修饰符
 */
function getTimeFilter(modifiers: string[]): Date | null {
  const timeModifier = modifiers.find(m => m.startsWith('time:'));
  if (!timeModifier) return null;
  
  const timeValue = timeModifier.split(':')[1];
  const now = new Date();
  
  switch (timeValue) {
    case '今天':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case '昨天':
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    case '上周':
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      return lastWeek;
    case '最近':
      const recent = new Date(now);
      recent.setDate(recent.getDate() - 3);
      return recent;
    default:
      return null;
  }
}

/**
 * 格式化日期
 */
function formatDate(date: Date | null): string {
  if (!date) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  
  return date.toLocaleDateString('zh-CN');
}