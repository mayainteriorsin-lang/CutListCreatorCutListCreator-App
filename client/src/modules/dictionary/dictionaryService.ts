/**
 * Dictionary Service - Real English Spell Checking
 *
 * Uses Typo.js with Hunspell dictionaries for:
 * - Spell checking any English word
 * - Suggesting corrections for misspelled words
 * - Custom interior design vocabulary
 */

import Typo from 'typo-js';

// Dictionary URLs (Hunspell en_US dictionary from CDN)
const DICT_BASE_URL = 'https://cdn.jsdelivr.net/npm/dictionary-en@3.2.0/index';

// Custom interior design terms to add to dictionary
const CUSTOM_TERMS = [
  // Indian specific terms
  'mandir', 'pooja', 'puja', 'oonjal', 'jhoola', 'jhula', 'thinnai', 'kolam',
  'bajot', 'chowki', 'chakla', 'belan', 'tawa', 'kadai', 'uruli', 'aruval',
  // Materials
  'laminate', 'sunmica', 'veneer', 'plywood', 'mdf', 'hdhmr', 'hdf', 'bwp', 'bwr',
  'corian', 'quartz', 'granite', 'vitrified', 'terrazzo', 'ply', 'laminates',
  // Brands
  'hettich', 'hafele', 'blum', 'ebco', 'grass', 'greenply', 'century', 'archid',
  'merino', 'greenlam', 'royale', 'virgo', 'decowood', 'kitply',
  // Hardware terms
  'tandem', 'legrabox', 'merivobox', 'metabox', 'innotech', 'servo',
  'pullout', 'carousel', 'larder', 'pantry', 'hinges', 'softclose',
  // Furniture terms
  'wardrobe', 'countertop', 'backsplash', 'splashback', 'pelmet', 'valance',
  'skirting', 'architrave', 'dado', 'wainscoting', 'coffered', 'cove',
  'shutter', 'shutters', 'loft', 'cabinets', 'drawers',
  // Finishes
  'duco', 'lacquer', 'melamine', 'polyurethane', 'acrylic', 'glossy', 'matte',
  // Room types
  'foyer', 'ensuite', 'mudroom', 'pantry', 'scullery', 'balcony',
  // Work types
  'carpentry', 'joinery', 'cabinetry', 'millwork', 'fabrication',
  // Common furniture
  'almirah', 'almirahs', 'diwan', 'sofa', 'settee',
  // Common misspellings to accept
  'sqft', 'qty', 'amt', 'nos',
];

// Singleton instance
let dictionaryInstance: DictionaryService | null = null;

export interface SpellCheckResult {
  word: string;
  isCorrect: boolean;
  suggestions: string[];
}

export class DictionaryService {
  private typo: Typo | null = null;
  private isLoading = false;
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;
  private customWords: Set<string> = new Set();

  constructor() {
    // Add custom terms
    CUSTOM_TERMS.forEach(term => this.customWords.add(term.toLowerCase()));
  }

  /**
   * Initialize the dictionary (loads dictionary files)
   */
  async initialize(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.isLoading = true;
    this.loadPromise = this.loadDictionary();

    try {
      await this.loadPromise;
      this.isLoaded = true;
    } finally {
      this.isLoading = false;
    }
  }

  private async loadDictionary(): Promise<void> {
    try {
      // Fetch dictionary files from CDN
      const [affResponse, dicResponse] = await Promise.all([
        fetch(`${DICT_BASE_URL}.aff`),
        fetch(`${DICT_BASE_URL}.dic`),
      ]);

      if (!affResponse.ok || !dicResponse.ok) {
        throw new Error('Failed to fetch dictionary files');
      }

      const [affData, dicData] = await Promise.all([
        affResponse.text(),
        dicResponse.text(),
      ]);

      // Create Typo instance with dictionary data
      this.typo = new Typo('en_US', affData, dicData);

      console.log('[Dictionary] Loaded successfully');
    } catch (error) {
      console.error('[Dictionary] Failed to load:', error);
      // Fallback: create empty typo that won't crash
      this.typo = null;
    }
  }

  /**
   * Check if dictionary is ready
   */
  isReady(): boolean {
    return this.isLoaded && this.typo !== null;
  }

  /**
   * Check if a word is spelled correctly
   */
  check(word: string): boolean {
    if (!word || word.length < 2) return true;

    const wordLower = word.toLowerCase().trim();

    // Check custom words first
    if (this.customWords.has(wordLower)) return true;

    // Check numbers
    if (/^\d+$/.test(word)) return true;

    // Check with Typo.js
    if (this.typo) {
      return this.typo.check(word);
    }

    // If dictionary not loaded, assume correct
    return true;
  }

  /**
   * Get spelling suggestions for a word
   */
  suggest(word: string, limit = 5): string[] {
    if (!word || word.length < 2) return [];

    const suggestions: string[] = [];
    const wordLower = word.toLowerCase().trim();

    // First check custom words for similar matches
    for (const customWord of this.customWords) {
      if (this.isSimilar(wordLower, customWord)) {
        suggestions.push(this.capitalizeFirst(customWord));
      }
      if (suggestions.length >= limit) break;
    }

    // Then get suggestions from Typo.js
    if (this.typo && suggestions.length < limit) {
      const typoSuggestions = this.typo.suggest(word, limit - suggestions.length);
      suggestions.push(...typoSuggestions);
    }

    // Remove duplicates and limit
    return [...new Set(suggestions)].slice(0, limit);
  }

  /**
   * Check spelling and get suggestions in one call
   */
  spellCheck(word: string): SpellCheckResult {
    const isCorrect = this.check(word);
    return {
      word,
      isCorrect,
      suggestions: isCorrect ? [] : this.suggest(word),
    };
  }

  /**
   * Check multiple words and return results
   */
  spellCheckText(text: string): SpellCheckResult[] {
    const words = text.split(/\s+/).filter(w => w.length > 1);
    return words.map(word => this.spellCheck(word));
  }

  /**
   * Add a custom word to the dictionary
   */
  addWord(word: string): void {
    this.customWords.add(word.toLowerCase());
  }

  /**
   * Add multiple custom words
   */
  addWords(words: string[]): void {
    words.forEach(word => this.addWord(word));
  }

  /**
   * Check if two words are similar (for fuzzy matching)
   */
  private isSimilar(word1: string, word2: string): boolean {
    if (word2.startsWith(word1) || word1.startsWith(word2)) return true;

    // Levenshtein distance check
    const distance = this.levenshteinDistance(word1, word2);
    const maxLen = Math.max(word1.length, word2.length);
    return distance <= Math.max(1, Math.floor(maxLen / 4));
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= a.length; i++) matrix[i] = [i];
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[a.length][b.length];
  }

  private capitalizeFirst(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
}

/**
 * Get the singleton dictionary instance
 */
export function getDictionary(): DictionaryService {
  if (!dictionaryInstance) {
    dictionaryInstance = new DictionaryService();
  }
  return dictionaryInstance;
}

/**
 * Initialize the dictionary (call this early in app startup)
 */
export async function initializeDictionary(): Promise<DictionaryService> {
  const dict = getDictionary();
  await dict.initialize();
  return dict;
}

// Export singleton for direct use
export const dictionary = getDictionary();
