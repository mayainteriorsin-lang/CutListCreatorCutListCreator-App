/**
 * Dictionary Module
 *
 * Real English spell checking with Typo.js + Hunspell dictionaries
 */

export {
  DictionaryService,
  getDictionary,
  initializeDictionary,
  dictionary,
  type SpellCheckResult,
} from './dictionaryService';

export {
  useDictionary,
  useSpellCheck,
  useSpellSuggestions,
} from './useDictionary';
