/**
 * React Hook for Dictionary Service
 *
 * Provides spell checking functionality in React components
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getDictionary, type SpellCheckResult } from './dictionaryService';

interface UseDictionaryReturn {
  isReady: boolean;
  isLoading: boolean;
  check: (word: string) => boolean;
  suggest: (word: string, limit?: number) => string[];
  spellCheck: (word: string) => SpellCheckResult;
  addWord: (word: string) => void;
}

/**
 * Hook to use the dictionary service in React components
 */
export function useDictionary(): UseDictionaryReturn {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const dictionary = useMemo(() => getDictionary(), []);

  useEffect(() => {
    // Check if already loaded
    if (dictionary.isReady()) {
      setIsReady(true);
      return;
    }

    // Initialize dictionary
    setIsLoading(true);
    dictionary.initialize()
      .then(() => {
        setIsReady(true);
      })
      .catch(console.error)
      .finally(() => {
        setIsLoading(false);
      });
  }, [dictionary]);

  const check = useCallback((word: string): boolean => {
    return dictionary.check(word);
  }, [dictionary]);

  const suggest = useCallback((word: string, limit = 5): string[] => {
    return dictionary.suggest(word, limit);
  }, [dictionary]);

  const spellCheck = useCallback((word: string): SpellCheckResult => {
    return dictionary.spellCheck(word);
  }, [dictionary]);

  const addWord = useCallback((word: string): void => {
    dictionary.addWord(word);
  }, [dictionary]);

  return {
    isReady,
    isLoading,
    check,
    suggest,
    spellCheck,
    addWord,
  };
}

/**
 * Hook for spell checking a specific value with debouncing
 */
export function useSpellCheck(value: string, debounceMs = 300): SpellCheckResult | null {
  const [result, setResult] = useState<SpellCheckResult | null>(null);
  const dictionary = useMemo(() => getDictionary(), []);

  useEffect(() => {
    if (!value || value.length < 2) {
      setResult(null);
      return;
    }

    const timer = setTimeout(() => {
      // Get the last word being typed
      const words = value.trim().split(/\s+/);
      const lastWord = words[words.length - 1];

      if (lastWord && lastWord.length >= 2) {
        const checkResult = dictionary.spellCheck(lastWord);
        setResult(checkResult);
      } else {
        setResult(null);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, debounceMs, dictionary]);

  return result;
}

/**
 * Hook to get suggestions for a word as user types
 */
export function useSpellSuggestions(word: string, limit = 5): string[] {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const dictionary = useMemo(() => getDictionary(), []);

  useEffect(() => {
    if (!word || word.length < 2) {
      setSuggestions([]);
      return;
    }

    // Debounce the suggestion lookup
    const timer = setTimeout(() => {
      const result = dictionary.suggest(word, limit);
      setSuggestions(result);
    }, 150);

    return () => clearTimeout(timer);
  }, [word, limit, dictionary]);

  return suggestions;
}
