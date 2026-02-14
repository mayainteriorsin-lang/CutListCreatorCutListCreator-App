/**
 * Type declarations for typo-js
 * A JavaScript spell checker using Hunspell dictionaries
 */

declare module 'typo-js' {
  class Typo {
    /**
     * Create a new Typo instance
     * @param dictionary The locale code (e.g., 'en_US')
     * @param affData The contents of the .aff file (optional if using pre-loaded dictionary)
     * @param dicData The contents of the .dic file (optional if using pre-loaded dictionary)
     * @param settings Optional settings
     */
    constructor(
      dictionary: string,
      affData?: string | null,
      dicData?: string | null,
      settings?: {
        dictionaryPath?: string;
        asyncLoad?: boolean;
        loadedCallback?: (error: Error | null, typo: Typo) => void;
      }
    );

    /**
     * Check if a word is spelled correctly
     * @param word The word to check
     * @returns true if the word is spelled correctly
     */
    check(word: string): boolean;

    /**
     * Get spelling suggestions for a word
     * @param word The misspelled word
     * @param limit Maximum number of suggestions (default 5)
     * @returns Array of suggested corrections
     */
    suggest(word: string, limit?: number): string[];

    /**
     * The dictionary locale code
     */
    dictionary: string;

    /**
     * Check if the dictionary has been loaded
     */
    loaded: boolean;
  }

  export = Typo;
}
