import { PageContext, Suggestion, SuggestionType } from '@/types/smart-omnibox';

export class ContextAnalyzer {
  /**
   * 分析当前页面上下文（客户端使用）
   */
  analyzeCurrentPage(): PageContext {
    if (typeof window === 'undefined') {
      // 服务端环境，返回空上下文
      return {
        url: '',
        title: '',
        content: '',
        headings: [],
        links: [],
        timestamp: new Date()
      };
    }
    
    return {
      url: window.location.href,
      title: document.title,
      content: this.extractMainContent(),
      headings: this.extractHeadings(),
      links: this.extractLinks(),
      timestamp: new Date()
    };
  }
  
  /**
   * 提取页面主要内容
   */
  private extractMainContent(): string {
    if (typeof document === 'undefined') return '';
    
    // 优先选择器：尝试找到主要内容区域
    const selectors = [
      'article',
      'main',
      '[role="main"]',
      '.content',
      '.post',
      '.article-body',
      '.entry-content',
      '#content',
      '.main-content'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        return element.textContent.slice(0, 5000).trim();
      }
    }
    
    // 兜底方案：获取 body 内容，排除导航和侧边栏
    const excludeSelectors = [
      'nav', 'header', 'footer', 'aside',
      '.nav', '.header', '.footer', '.sidebar',
      '.navigation', '.menu', '.ads', '.advertisement'
    ];
    
    const body = document.body.cloneNode(true) as HTMLElement;
    
    // 移除不需要的元素
    excludeSelectors.forEach(selector => {
      const elements = body.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
    
    return (body.textContent || '').slice(0, 5000).trim();
  }
  
  /**
   * 提取页面标题结构
   */
  private extractHeadings(): string[] {
    if (typeof document === 'undefined') return [];
    
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    return Array.from(headings)
      .map(h => h.textContent?.trim() || '')
      .filter(Boolean)
      .slice(0, 20); // 最多 20 个标题
  }
  
  /**
   * 提取页面链接
   */
  private extractLinks(): string[] {
    if (typeof document === 'undefined') return [];
    
    const links = document.querySelectorAll('a[href]');
    return Array.from(links)
      .map(link => (link as HTMLAnchorElement).href)
      .filter(href => href.startsWith('http'))
      .slice(0, 50); // 最多 50 个链接
  }
}

/**
 * 上下文感知建议提供器
 */
export class ContextAwareSuggestionProvider {
  generateContextSuggestions(context: PageContext, input: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    // 只有在输入内容很短或为空时，才提供页面相关的通用建议
    if (input.trim().length < 3) {
      // 基于页面类型的建议
      if (this.isArticlePage(context)) {
        suggestions.push(...this.getArticleSuggestions(context));
      }
      
      if (this.isVideoPage(context)) {
        suggestions.push(...this.getVideoSuggestions(context));
      }
      
      if (this.isShoppingPage(context)) {
        suggestions.push(...this.getShoppingSuggestions(context));
      }
    } else {
      // 对于具体的输入，提供相关的智能建议
      suggestions.push(...this.getInputRelatedSuggestions(input, context));
    }
    
    if (this.isGitHubPage(context)) {
      suggestions.push(...this.getGitHubSuggestions(context));
    }
    
    // 基于输入和页面内容的关联建议
    if (input && this.hasRelatedContent(input, context)) {
      suggestions.push(...this.getRelatedContentSuggestions(input, context));
    }
    
    return suggestions;
  }
  
  /**
   * 判断是否为文章页面
   */
  private isArticlePage(context: PageContext): boolean {
    return context.content.length > 1000 && 
           context.headings.length > 0 &&
           !this.isVideoPage(context);
  }
  
  /**
   * 判断是否为视频页面
   */
  private isVideoPage(context: PageContext): boolean {
    return context.url.includes('youtube.com') ||
           context.url.includes('bilibili.com') ||
           context.url.includes('youku.com') ||
           context.title.includes('视频') ||
           context.content.includes('播放') ||
           context.content.includes('video');
  }
  
  /**
   * 判断是否为购物页面
   */
  private isShoppingPage(context: PageContext): boolean {
    const shoppingKeywords = ['购买', '价格', '商品', '添加到购物车', '立即购买', '¥', '$'];
    const shoppingSites = ['taobao.com', 'jd.com', 'tmall.com', 'amazon.com'];
    
    return shoppingSites.some(site => context.url.includes(site)) ||
           shoppingKeywords.some(keyword => 
             context.content.includes(keyword) || context.title.includes(keyword)
           );
  }
  
  /**
   * 判断是否为 GitHub 页面
   */
  private isGitHubPage(context: PageContext): boolean {
    return context.url.includes('github.com');
  }
  
  /**
   * 检查输入是否与页面内容相关
   */
  private hasRelatedContent(input: string, context: PageContext): boolean {
    const inputLower = input.toLowerCase();
    const contentLower = context.content.toLowerCase();
    const titleLower = context.title.toLowerCase();
    
    return contentLower.includes(inputLower) ||
           titleLower.includes(inputLower) ||
           context.headings.some(h => h.toLowerCase().includes(inputLower));
  }
  
  /**
   * 获取文章页面建议
   */
  private getArticleSuggestions(context: PageContext): Suggestion[] {
    return [
      {
        id: 'article-summarize',
        type: SuggestionType.AI_ANSWER,
        title: '总结这篇文章',
        description: '生成文章要点摘要',
        action: 'summarize:current_page',
        icon: '📄',
        confidence: 0.85
      },
      {
        id: 'article-keypoints',
        type: SuggestionType.AI_ANSWER,
        title: '提取关键观点',
        description: '识别文章中的核心观点',
        action: 'extract_keypoints:current_page',
        icon: '🎯',
        confidence: 0.8
      },
      {
        id: 'article-related',
        type: SuggestionType.SEARCH,
        title: `搜索相关内容：${context.title.slice(0, 20)}`,
        description: '查找相关文章和资源',
        action: `search:${context.title}`,
        icon: '🔗',
        confidence: 0.75
      }
    ];
  }
  
  /**
   * 获取视频页面建议
   */
  private getVideoSuggestions(context: PageContext): Suggestion[] {
    return [
      {
        id: 'video-summarize',
        type: SuggestionType.AI_ANSWER,
        title: '总结视频内容',
        description: '基于视频标题和描述生成摘要',
        action: 'summarize:current_video',
        icon: '🎬',
        confidence: 0.8
      },
      {
        id: 'video-transcript',
        type: SuggestionType.COMMAND,
        title: '获取视频字幕',
        description: '尝试提取视频字幕内容',
        action: 'get_transcript:current_video',
        icon: '📝',
        confidence: 0.7
      }
    ];
  }
  
  /**
   * 获取购物页面建议
   */
  private getShoppingSuggestions(context: PageContext): Suggestion[] {
    return [
      {
        id: 'price-compare',
        type: SuggestionType.SEARCH,
        title: '比较商品价格',
        description: '在其他平台查找相同商品',
        action: `price_compare:${context.title}`,
        icon: '💰',
        confidence: 0.8
      },
      {
        id: 'product-reviews',
        type: SuggestionType.SEARCH,
        title: '查看商品评价',
        description: '搜索用户评价和使用体验',
        action: `search:${context.title} 评价 评测`,
        icon: '⭐',
        confidence: 0.75
      }
    ];
  }
  
  /**
   * 基于用户输入生成相关建议
   */
  private getInputRelatedSuggestions(input: string, context: PageContext): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const inputLower = input.toLowerCase();
    
    // 检查是否是问题类型的输入
    const questionWords = ['什么', '为什么', '怎么', '如何', '哪里', '哪个', '谁', '何时', '多少'];
    const isQuestion = questionWords.some(word => inputLower.includes(word)) || 
                      inputLower.includes('?') || inputLower.includes('？');
    
    if (isQuestion) {
      // 为问题类型输入提供相关建议
      suggestions.push({
        id: 'explain-topic',
        type: SuggestionType.AI_ANSWER,
        title: `详细解释：${input}`,
        description: '获得深入的解答和分析',
        action: `explain:${input}`,
        icon: '🧠',
        confidence: 0.9
      });
      
      // 如果页面内容相关，提供结合页面内容的建议
      if (this.hasRelatedContent(input, context)) {
        suggestions.push({
          id: 'relate-to-page',
          type: SuggestionType.AI_ANSWER,
          title: `结合当前页面回答：${input}`,
          description: '基于页面内容提供相关答案',
          action: `ask_with_context:${input}`,
          icon: '📖',
          confidence: 0.8
        });
      }
    } else {
      // 对于非问题类型的输入，提供搜索和学习建议
      suggestions.push({
        id: 'learn-about',
        type: SuggestionType.AI_ANSWER,
        title: `了解更多：${input}`,
        description: '获取相关知识和信息',
        action: `learn:${input}`,
        icon: '📚',
        confidence: 0.8
      });
    }
    
    return suggestions;
  }

  /**
   * 获取 GitHub 页面建议
   */
  private getGitHubSuggestions(context: PageContext): Suggestion[] {
    const suggestions: Suggestion[] = [
      {
        id: 'github-readme',
        type: SuggestionType.AI_ANSWER,
        title: '总结项目说明',
        description: '解释项目用途和特点',
        action: 'explain:github_project',
        icon: '📚',
        confidence: 0.8
      }
    ];
    
    // 如果是代码文件页面
    if (context.url.includes('/blob/') || context.content.includes('function') || context.content.includes('class')) {
      suggestions.push({
        id: 'code-explain',
        type: SuggestionType.AI_ANSWER,
        title: '解释代码功能',
        description: '分析代码逻辑和功能',
        action: 'explain:code',
        icon: '💻',
        confidence: 0.85
      });
    }
    
    return suggestions;
  }
  
  /**
   * 获取相关内容建议
   */
  private getRelatedContentSuggestions(input: string, context: PageContext): Suggestion[] {
    return [
      {
        id: 'explain-in-context',
        type: SuggestionType.AI_ANSWER,
        title: `在当前页面中解释"${input}"`,
        description: '基于页面内容解释概念',
        action: `explain:${input}:current_page`,
        icon: '💡',
        confidence: 0.8
      },
      {
        id: 'find-in-page',
        type: SuggestionType.COMMAND,
        title: `在页面中查找"${input}"`,
        description: '高亮显示相关内容',
        action: `find_in_page:${input}`,
        icon: '🔍',
        confidence: 0.75
      }
    ];
  }
}