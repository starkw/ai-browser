'use client';
import { useState, useEffect, useRef } from 'react';
import { SmartQuery, Suggestion, PageContext, SuggestionType } from '@/types/smart-omnibox';
import { ContextAnalyzer } from '@/lib/smart-omnibox/context-analyzer';

interface SmartOmniboxProps {
  onSelect: (suggestion: Suggestion) => void;
  placeholder?: string;
  className?: string;
}

export default function SmartOmnibox({ 
  onSelect, 
  placeholder = "智能搜索：输入问题、网址或命令...",
  className = ""
}: SmartOmniboxProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const contextAnalyzer = useRef(new ContextAnalyzer());
  
  // 实时建议获取
  useEffect(() => {
    if (input.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    
    const debounceTimer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const context = contextAnalyzer.current.analyzeCurrentPage();
        const response = await fetch('/api/smart-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            input, 
            context,
            userId: 'anonymous' // TODO: 获取真实用户ID
          })
        });
        
        const data = await response.json();
        if (data.suggestions) {
          setSuggestions(data.suggestions);
          setIsOpen(true);
          setSelectedIndex(-1);
        }
      } catch (error) {
        console.error('Failed to get suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    
    return () => clearTimeout(debounceTimer);
  }, [input]);
  
  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    
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
        } else if (input.trim()) {
          // 检查是否为URL
          const trimmedInput = input.trim();
          const isUrl = /^https?:\/\//i.test(trimmedInput) || 
                       /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/|$)/.test(trimmedInput);
          
          if (isUrl) {
            // 直接打开URL
            const url = /^https?:\/\//i.test(trimmedInput) ? trimmedInput : `https://${trimmedInput}`;
            window.open(url, '_blank');
            setInput('');
            setSuggestions([]);
            setIsOpen(false);
            setSelectedIndex(-1);
            inputRef.current?.blur();
          } else {
            // 直接搜索
            handleSelect({
              id: 'direct-search',
              type: SuggestionType.SEARCH,
              title: `搜索 "${input}"`,
              description: '直接搜索',
              action: `search:${input}`,
              icon: '🔍',
              confidence: 1.0
            });
          }
        }
        break;
      case 'Escape':
        setSuggestions([]);
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
      case 'Tab':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          const suggestion = suggestions[selectedIndex];
          // 使用建议的标题作为补全内容
          let completionText = suggestion.title;
          
          // 对于 AI 回答类型，去掉 "AI 回答：" 前缀
          if (suggestion.type === 'ai_answer' && completionText.startsWith('AI 回答：')) {
            completionText = completionText.replace('AI 回答：', '').trim();
          }
          
          setInput(completionText);
          // 补全后保持建议列表打开，但重置选中状态
          setSelectedIndex(-1);
          // 确保输入框保持焦点
          setTimeout(() => {
            inputRef.current?.focus();
          }, 0);
        } else if (suggestions.length > 0) {
          // 如果没有选中项，默认补全第一个建议
          const firstSuggestion = suggestions[0];
          let completionText = firstSuggestion.title;
          
          if (firstSuggestion.type === 'ai_answer' && completionText.startsWith('AI 回答：')) {
            completionText = completionText.replace('AI 回答：', '').trim();
          }
          
          setInput(completionText);
          setSelectedIndex(-1);
          // 确保输入框保持焦点
          setTimeout(() => {
            inputRef.current?.focus();
          }, 0);
        }
        break;
    }
  };
  
  const handleSelect = (suggestion: Suggestion) => {
    onSelect(suggestion);
    setInput('');
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };
  
  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  };
  
  const handleInputBlur = () => {
    // 延迟关闭，允许点击建议项
    setTimeout(() => {
      setIsOpen(false);
      setSelectedIndex(-1);
    }, 200);
  };
  
  return (
    <div className={`relative w-full ${className}`}>
      {/* 输入框 */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className="w-full border rounded-xl px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
          autoComplete="off"
          spellCheck="false"
        />
        
        {/* 加载指示器 */}
        {isLoading && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
          </div>
        )}
      </div>
      
      {/* 建议列表 */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 rounded-2xl border bg-background/95 backdrop-blur shadow-xl overflow-hidden">
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
  const getIconForType = (type: string) => {
    switch (type) {
      case 'ai_answer': return '💬';
      case 'history': return '📚';
      case 'search': return '🔍';
      case 'command': return '⚡';
      case 'url': return '🔗';
      case 'bookmark': return '⭐';
      default: return '🔍';
    }
  };
  
  const getProviderName = (type: string) => {
    switch (type) {
      case 'ai_answer': return 'Chat';
      case 'history': return '历史';
      case 'search': return 'Google';
      case 'command': return '命令';
      case 'url': return '网址';
      case 'bookmark': return '收藏';
      default: return '';
    }
  };
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between gap-4 ${
        isSelected ? "bg-black/5 dark:bg-white/10" : ""
      }`}
    >
      <span className="flex items-center gap-3 min-w-0">
        <span className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs">
          {getIconForType(suggestion.type)}
        </span>
        <span className="truncate">
          {suggestion.title}
        </span>
      </span>
      <span className="text-xs opacity-60 shrink-0">— {getProviderName(suggestion.type)}</span>
    </button>
  );
}