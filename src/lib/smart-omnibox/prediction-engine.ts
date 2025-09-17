import { UserBehaviorModel, Suggestion, SuggestionType, PageContext } from '@/types/smart-omnibox';

export class PredictionEngine {
  constructor(private userModel: UserBehaviorModel) {}
  
  /**
   * 预测用户下一步操作
   */
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
    
    // 4. 基于频率预测
    const frequencyPredictions = this.predictByFrequency(currentInput);
    predictions.push(...frequencyPredictions);
    
    // 排序和去重
    return this.rankAndDedupe(predictions);
  }
  
  /**
   * 基于输入前缀预测
   */
  private predictByPrefix(input: string): Suggestion[] {
    if (input.length < 2) return [];
    
    return this.userModel.frequentQueries
      .filter(query => query.toLowerCase().startsWith(input.toLowerCase()))
      .slice(0, 3)
      .map((query, index) => ({
        id: `prefix-${query}-${index}`,
        type: SuggestionType.SEARCH,
        title: query,
        description: '基于历史查询',
        action: `search:${query}`,
        icon: '🔍',
        confidence: 0.7 - (index * 0.1)
      }));
  }
  
  /**
   * 基于时间模式预测
   */
  private predictByTime(): Suggestion[] {
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    
    const habit = this.userModel.timeBasedHabits
      .find(h => currentHour >= h.timeRange[0] && currentHour <= h.timeRange[1]);
    
    if (!habit) return [];
    
    return habit.commonActions.slice(0, 2).map((action, index) => ({
      id: `time-${action}-${index}`,
      type: SuggestionType.COMMAND,
      title: this.formatActionTitle(action),
      description: `${currentHour}点常用操作`,
      action: action,
      icon: this.getActionIcon(action),
      confidence: 0.6 - (index * 0.1)
    }));
  }
  
  /**
   * 基于当前页面上下文预测
   */
  private predictByContext(context: PageContext): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    // 长文章页面 - 建议总结
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
    
    // 技术文档 - 建议解释
    if (this.isTechnicalContent(context)) {
      suggestions.push({
        id: 'context-explain',
        type: SuggestionType.AI_ANSWER,
        title: '解释技术概念',
        description: '用简单语言解释页面中的技术内容',
        action: 'explain:current_page',
        icon: '💡',
        confidence: 0.75
      });
    }
    
    // 外语页面 - 建议翻译
    if (this.isForeignLanguage(context)) {
      suggestions.push({
        id: 'context-translate',
        type: SuggestionType.AI_ANSWER,
        title: '翻译页面内容',
        description: '将页面翻译成中文',
        action: 'translate:current_page:zh',
        icon: '🌐',
        confidence: 0.7
      });
    }
    
    return suggestions;
  }
  
  /**
   * 基于查询频率预测
   */
  private predictByFrequency(input: string): Suggestion[] {
    if (input.length < 1) return [];
    
    // 找到相似的历史查询
    const similarQueries = this.userModel.commonPatterns
      .filter(pattern => 
        pattern.pattern.toLowerCase().includes(input.toLowerCase()) ||
        input.toLowerCase().includes(pattern.pattern.toLowerCase())
      )
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 2);
    
    return similarQueries.map((pattern, index) => ({
      id: `frequency-${pattern.pattern}-${index}`,
      type: SuggestionType.SEARCH,
      title: pattern.pattern,
      description: `使用频率 ${pattern.frequency} 次`,
      action: `search:${pattern.pattern}`,
      icon: '📊',
      confidence: Math.min(0.9, pattern.successRate + 0.1)
    }));
  }
  
  /**
   * 排序和去重
   */
  private rankAndDedupe(suggestions: Suggestion[]): Suggestion[] {
    // 去重：基于 title 去重
    const unique = suggestions.reduce((acc, curr) => {
      if (!acc.find(s => s.title === curr.title)) {
        acc.push(curr);
      }
      return acc;
    }, [] as Suggestion[]);
    
    // 排序：按置信度降序
    return unique
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 6); // 最多返回 6 个建议
  }
  
  /**
   * 判断是否为技术内容
   */
  private isTechnicalContent(context: PageContext): boolean {
    const techKeywords = [
      'API', 'JavaScript', 'Python', 'React', 'Vue', 'Node.js',
      'Docker', 'Kubernetes', 'AWS', '算法', '数据结构', '机器学习',
      'AI', '人工智能', '深度学习', '神经网络'
    ];
    
    const content = context.content.toLowerCase();
    const title = context.title.toLowerCase();
    
    return techKeywords.some(keyword => 
      content.includes(keyword.toLowerCase()) || 
      title.includes(keyword.toLowerCase())
    );
  }
  
  /**
   * 判断是否为外语内容
   */
  private isForeignLanguage(context: PageContext): boolean {
    // 简单的外语检测：如果中文字符比例低于 30%，认为是外语
    const chineseChars = (context.content.match(/[\u4e00-\u9fa5]/g) || []).length;
    const totalChars = context.content.length;
    
    if (totalChars < 100) return false; // 内容太少，不判断
    
    const chineseRatio = chineseChars / totalChars;
    return chineseRatio < 0.3;
  }
  
  /**
   * 格式化操作标题
   */
  private formatActionTitle(action: string): string {
    const actionTitles: Record<string, string> = {
      'search:github': '搜索 GitHub',
      'open:email': '打开邮箱',
      'search:news': '查看新闻',
      'open:calendar': '打开日历',
      'search:weather': '查看天气'
    };
    
    return actionTitles[action] || action;
  }
  
  /**
   * 获取操作图标
   */
  private getActionIcon(action: string): string {
    const actionIcons: Record<string, string> = {
      'search:github': '📂',
      'open:email': '📧',
      'search:news': '📰',
      'open:calendar': '📅',
      'search:weather': '🌤️'
    };
    
    return actionIcons[action] || '⚡';
  }
}