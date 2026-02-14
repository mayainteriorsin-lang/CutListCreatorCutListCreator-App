/**
 * SpellCheckInput - Input with real-time spell checking
 *
 * Shows spelling suggestions as you type with red underline for misspelled words
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useDictionary } from '@/modules/dictionary';

interface SpellCheckInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: string) => void;
  showSuggestions?: boolean;
}

export function SpellCheckInput({
  value,
  onChange,
  onValueChange,
  showSuggestions = true,
  className,
  ...props
}: SpellCheckInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const { isReady, suggest, check } = useDictionary();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentValue = typeof value === 'string' ? value : '';

  // Get the last word being typed
  const lastWord = useMemo(() => {
    const words = currentValue.trim().split(/\s+/);
    return words[words.length - 1] || '';
  }, [currentValue]);

  // Check if last word is misspelled
  const isMisspelled = useMemo(() => {
    if (!isReady || !lastWord || lastWord.length < 2) return false;
    return !check(lastWord);
  }, [isReady, lastWord, check]);

  // Get suggestions for misspelled word
  const suggestions = useMemo(() => {
    if (!showSuggestions || !isReady || !isMisspelled || lastWord.length < 2) {
      return [];
    }
    return suggest(lastWord, 5);
  }, [showSuggestions, isReady, isMisspelled, lastWord, suggest]);

  // Reset highlight when suggestions change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [suggestions]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        if (suggestions[highlightedIndex]) {
          e.preventDefault();
          selectSuggestion(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  }, [isOpen, suggestions, highlightedIndex]);

  const selectSuggestion = useCallback((suggestion: string) => {
    // Replace the last word with the suggestion
    const words = currentValue.trim().split(/\s+/);
    words[words.length - 1] = suggestion;
    const newValue = words.join(' ');

    // Trigger change
    if (onValueChange) {
      onValueChange(newValue);
    }
    if (onChange && inputRef.current) {
      const nativeEvent = new Event('input', { bubbles: true });
      Object.defineProperty(nativeEvent, 'target', { value: { value: newValue } });
      onChange(nativeEvent as unknown as React.ChangeEvent<HTMLInputElement>);
    }

    setIsOpen(false);
  }, [currentValue, onChange, onValueChange]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange?.(e);
    onValueChange?.(newValue);
    setIsOpen(true);
  }, [onChange, onValueChange]);

  // Handle focus
  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    if (isMisspelled && suggestions.length > 0) {
      setIsOpen(true);
    }
    props.onFocus?.(e);
  }, [isMisspelled, suggestions.length, props.onFocus]);

  // Handle blur with delay
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => setIsOpen(false), 150);
    props.onBlur?.(e);
  }, [props.onBlur]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        spellCheck="true"
        className={cn(
          className,
          isMisspelled && "border-red-300 focus:border-red-400"
        )}
        {...props}
      />

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="px-2 py-1 text-[10px] text-slate-500 bg-slate-50 border-b flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
            Spelling suggestions
          </div>
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion}-${index}`}
              className={cn(
                "px-3 py-2 cursor-pointer text-sm transition-colors",
                index === highlightedIndex
                  ? "bg-blue-50 text-blue-900"
                  : "hover:bg-slate-50"
              )}
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(suggestion);
              }}
            >
              {suggestion}
            </div>
          ))}
          <div className="px-3 py-1.5 text-[10px] text-slate-400 bg-slate-50 border-t">
            Press Enter to accept
          </div>
        </div>
      )}
    </div>
  );
}
