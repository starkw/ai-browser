'use client';
import { useState, useEffect, useRef } from 'react';
import { SmartQuery, Suggestion, PageContext } from '@/types/smart-omnibox';
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
          // 直接搜索
          handleSelect({
            id: 'direct-search',
            type: 'search',
            title: `搜索 "${input}"`,
            description: '直接搜索',
            action: `search:${input}`,
            icon: '🔍',
            confidence: 1.0
          });
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
          setInput(suggestions[selectedIndex].title);
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
          className="w-full px-6 py-4 pr-16 text-lg bg-white border-2 border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
          autoComplete="off"
          spellCheck="false"
        />
        
        {/* 加载指示器 */}
        {isLoading && (
          <div className="absolute right-6 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        )}
        
        {/* 搜索图标 */}
        {!isLoading && (
          <div className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}
      </div>
      
      {/* 建议列表 */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-96 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <SuggestionItem
              key={suggestion.id}
              suggestion={suggestion}
              isSelected={index === selectedIndex}
              onClick={() => handleSelect(suggestion)}
            />
          ))}
          
          {/* 底部提示 */}
          <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100 bg-gray-50">
            <span className="flex items-center justify-between">
              <span>↑↓ 选择 • Enter 确认 • Tab 补全 • Esc 关闭</span>
              <span className="text-blue-500">智能建议 ✨</span>
            </span>
          </div>
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
  const getTypeColor = (type: string) => {
    const colors = {
      ai_answer: 'text-purple-600 bg-purple-50',
      history: 'text-green-600 bg-green-50',
      search: 'text-blue-600 bg-blue-50',
      command: 'text-orange-600 bg-orange-50',
      url: 'text-gray-600 bg-gray-50',
      bookmark: 'text-yellow-600 bg-yellow-50'
    };
    return colors[type as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };
  
  const getTypeLabel = (type: string) => {
    const labels = {
      ai_answer: 'AI',
      history: '历史',
      search: '搜索',
      command: '命令',
      url: '网址',
      bookmark: '收藏'
    };
    return labels[type as keyof typeof labels] || type;
  };
  
  return (
    <div
      className={`px-6 py-4 cursor-pointer flex items-center space-x-4 transition-all duration-150 ${
        isSelected 
          ? 'bg-blue-50 border-r-4 border-blue-500' 
          : 'hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      {/* 图标 */}
      <div className="flex-shrink-0">
        <span className="text-2xl">{suggestion.icon}</span>
      </div>
      
      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate">
          {suggestion.title}
        </div>
        <div className="text-sm text-gray-500 truncate">
          {suggestion.description}
        </div>
      </div>
      
      {/* 类型标签和置信度 */}
      <div className="flex-shrink-0 flex items-center space-x-2">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(suggestion.type)}`}>
          {getTypeLabel(suggestion.type)}
        </span>
        <div className="text-xs text-gray-400 font-mono">
          {Math.round(suggestion.confidence * 100)}%
        </div>
      </div>
    </div>
  );
}