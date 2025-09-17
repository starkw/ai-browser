'use client';
import SmartOmnibox from "@/components/SmartOmnibox";
import { Suggestion } from "@/types/smart-omnibox";

export default function Home() {
  
  const handleSuggestionSelect = (suggestion: Suggestion) => {
    console.log('Selected suggestion:', suggestion);
    
    // 根据建议类型执行相应操作
    switch (suggestion.type) {
      case 'ai_answer':
        // 跳转到 AI 回答页面
        if (suggestion.action.startsWith('ask:')) {
          const query = suggestion.action.replace('ask:', '');
          window.location.href = `/ask?q=${encodeURIComponent(query)}`;
        }
        break;
      case 'search':
        // 执行搜索操作
        if (suggestion.action.startsWith('open:')) {
          const url = suggestion.action.replace('open:', '');
          window.open(url, '_blank');
        } else if (suggestion.action.startsWith('search:')) {
          const query = suggestion.action.replace('search:', '');
          window.location.href = `/ask?q=${encodeURIComponent(query)}`;
        }
        break;
      case 'history':
      case 'url':
        // 打开链接
        if (suggestion.action.startsWith('open:')) {
          const url = suggestion.action.replace('open:', '');
          window.open(url, '_blank');
        }
        break;
      case 'command':
        // 执行命令
        executeCommand(suggestion.action);
        break;
      default:
        console.log('Unknown suggestion type:', suggestion.type);
    }
  };
  
  const executeCommand = (action: string) => {
    if (action === 'summarize:current_page') {
      // 总结当前页面
      alert('总结功能开发中...');
    } else if (action === 'translate:current_page:zh') {
      // 翻译当前页面
      alert('翻译功能开发中...');
    } else if (action.startsWith('explain:')) {
      // 解释功能
      const content = action.replace('explain:', '');
      window.location.href = `/ask?q=${encodeURIComponent(`请解释：${content}`)}`;
    }
  };
  
  return (
    <div className="min-h-screen px-6 py-20 sm:px-10">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* 标题 */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AIseach
          </h1>
          <p className="text-gray-600">智能搜索，理解你的需求</p>
        </div>
        
        {/* 智能地址栏 */}
        <SmartOmnibox 
          onSelect={handleSuggestionSelect}
          placeholder="🤖 试试问我：帮我找昨天看过的 AI 文章，或者直接问问题..."
          className="max-w-3xl mx-auto"
        />
        
      </div>
    </div>
  );
}
