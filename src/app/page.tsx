'use client';
import SmartOmnibox from "@/components/SmartOmnibox";
import SearchBox from "@/components/SearchBox";
import { Suggestion } from "@/types/smart-omnibox";
import { useState } from "react";

export default function Home() {
  const [showLegacySearch, setShowLegacySearch] = useState(false);
  
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
        <div className="space-y-4">
          <SmartOmnibox 
            onSelect={handleSuggestionSelect}
            placeholder="🤖 试试问我：帮我找昨天看过的 AI 文章，或者直接问问题..."
            className="max-w-3xl mx-auto"
          />
          
          {/* 切换到传统搜索 */}
          <div className="text-center">
            <button
              onClick={() => setShowLegacySearch(!showLegacySearch)}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              {showLegacySearch ? '使用智能搜索 ✨' : '使用传统搜索'}
            </button>
          </div>
          
          {/* 传统搜索框 */}
          {showLegacySearch && (
            <div className="max-w-3xl mx-auto">
              <SearchBox />
            </div>
          )}
        </div>
        
        {/* 功能介绍 */}
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="text-center p-6 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors">
              <div className="text-3xl mb-3">🧠</div>
              <h3 className="font-semibold mb-2">自然语言理解</h3>
              <p className="text-sm text-gray-600">支持复杂查询，如"帮我找昨天看过的关于AI的文章"</p>
            </div>
            <div className="text-center p-6 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors">
              <div className="text-3xl mb-3">🔮</div>
              <h3 className="font-semibold mb-2">智能预测</h3>
              <p className="text-sm text-gray-600">基于历史行为预测你的下一步操作</p>
            </div>
            <div className="text-center p-6 rounded-xl bg-green-50 hover:bg-green-100 transition-colors">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-semibold mb-2">上下文感知</h3>
              <p className="text-sm text-gray-600">理解当前页面内容，提供相关建议</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
