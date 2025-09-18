import { QueryIntent, QueryType } from '@/types/smart-omnibox';

// 意图识别规则模式
const intentPatterns = {
  HISTORY_SEARCH: [
    /帮我找.*昨天.*的/,
    /找.*之前.*看过的/,
    /上次.*浏览的/,
    /搜索.*历史/,
    /昨天.*访问/,
    /前天.*打开/,
    /最近.*看过/
  ],
  SUMMARIZE: [
    /总结.*这个页面/,
    /这篇文章.*要点/,
    /概括.*内容/,
    /摘要/,
    /总结当前页面/,
    /页面摘要/
  ],
  TRANSLATE: [
    /翻译.*这个/,
    /把.*翻译成/,
    /.*的中文是什么/,
    /.*用英文怎么说/,
    /翻译成.*语/
  ],
  NAVIGATE: [
    /打开.*/,
    /跳转到.*/,
    /访问.*/,
    /去.*网站/,
    /进入.*/
  ],
  EXPLAIN: [
    /解释.*/,
    /什么是.*/,
    /.*是什么意思/,
    /.*怎么理解/,
    /说明.*/,
    /为什么.*/,
    /怎么.*/,
    /如何.*/,
    /哪里.*/,
    /哪个.*/,
    /.*？$/,
    /.*\?$/
  ],
  SEARCH: [
    /搜索.*/,
    /查找.*/,
    /找.*/,
    /.*在哪里/,
    /.*怎么.*/ 
  ]
};

// 时间修饰符识别
const timeModifiers = ['昨天', '今天', '前天', '上周', '最近', '刚才', '之前'];
const topicModifiers = ['关于', '有关', '涉及', '相关'];

export class IntentClassifier {
  /**
   * 分类用户输入的意图
   */
  classify(input: string): QueryIntent {
    const normalizedInput = input.toLowerCase().trim();
    
    // 1. URL 检测
    if (this.isURL(input)) {
      return {
        action: 'navigate',
        target: input,
        modifiers: [],
        confidence: 0.95
      };
    }
    
    // 2. 规则匹配
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
    
    // 3. 问号检测（问题类型）
    if (input.includes('？') || input.includes('?')) {
      return {
        action: 'question',
        target: input,
        modifiers: this.extractModifiers(input),
        confidence: 0.7
      };
    }
    
    // 4. 默认搜索意图
    return {
      action: 'search',
      target: input,
      modifiers: [],
      confidence: 0.5
    };
  }
  
  /**
   * 检测输入是否为 URL
   */
  private isURL(input: string): boolean {
    try {
      new URL(input);
      return true;
    } catch {
      // 检测简化的 URL 格式
      const urlPatterns = [
        /^https?:\/\//,
        /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/,
        /^www\./,
        /\.com$|\.org$|\.net$|\.cn$|\.io$/
      ];
      
      return urlPatterns.some(pattern => pattern.test(input));
    }
  }
  
  /**
   * 从输入中提取目标对象
   */
  private extractTarget(input: string, pattern: RegExp): string {
    // 移除匹配的模式前缀，提取核心目标
    const cleaned = input.replace(pattern, '').trim();
    return cleaned || input;
  }
  
  /**
   * 提取修饰符（时间、主题等）
   */
  private extractModifiers(input: string): string[] {
    const modifiers: string[] = [];
    
    // 时间修饰符
    timeModifiers.forEach(mod => {
      if (input.includes(mod)) {
        modifiers.push(`time:${mod}`);
      }
    });
    
    // 主题修饰符
    topicModifiers.forEach(mod => {
      if (input.includes(mod)) {
        modifiers.push(`topic:${mod}`);
      }
    });
    
    // 特殊关键词
    if (input.includes('AI') || input.includes('人工智能')) {
      modifiers.push('topic:AI');
    }
    
    return modifiers;
  }
  
  /**
   * 确定查询类型
   */
  determineQueryType(intent: QueryIntent): QueryType {
    switch (intent.action) {
      case 'navigate':
        return QueryType.URL;
      case 'history_search':
        return QueryType.HISTORY_SEARCH;
      case 'summarize':
      case 'translate':
        return QueryType.COMMAND;
      case 'explain':
      case 'question':
        return QueryType.QUESTION;
      default:
        return QueryType.SEARCH;
    }
  }
}