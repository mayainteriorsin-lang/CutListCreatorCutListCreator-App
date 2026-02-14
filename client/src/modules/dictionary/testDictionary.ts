/**
 * Dictionary Test Utility
 *
 * Run in browser console: import('/src/modules/dictionary/testDictionary.ts').then(m => m.testDictionary())
 */

import { getDictionary } from './dictionaryService';

export async function testDictionary() {
  const dict = getDictionary();

  console.log('=== Dictionary Test ===');
  console.log('Is Ready:', dict.isReady());

  if (!dict.isReady()) {
    console.log('Initializing dictionary...');
    await dict.initialize();
    console.log('Dictionary initialized!');
  }

  // Test cases
  const testWords = [
    // Correct English words
    { word: 'kitchen', expected: true },
    { word: 'wardrobe', expected: true },
    { word: 'cabinet', expected: true },

    // Misspelled words
    { word: 'kichen', expected: false },
    { word: 'wardobe', expected: false },
    { word: 'cabnet', expected: false },

    // Custom Indian terms (should be valid)
    { word: 'mandir', expected: true },
    { word: 'pooja', expected: true },
    { word: 'hafele', expected: true },
    { word: 'hettich', expected: true },
  ];

  console.log('\n--- Spell Check Tests ---');
  testWords.forEach(({ word, expected }) => {
    const result = dict.check(word);
    const status = result === expected ? '✓' : '✗';
    console.log(`${status} "${word}": ${result} (expected: ${expected})`);
  });

  // Test suggestions
  console.log('\n--- Suggestion Tests ---');
  const misspelledWords = ['kichen', 'wardobe', 'cabnet', 'shuttr', 'kitchn'];
  misspelledWords.forEach(word => {
    const suggestions = dict.suggest(word, 5);
    console.log(`"${word}" → [${suggestions.join(', ')}]`);
  });

  console.log('\n=== Test Complete ===');

  return {
    check: dict.check.bind(dict),
    suggest: dict.suggest.bind(dict),
  };
}

// Auto-run if imported directly
if (typeof window !== 'undefined') {
  (window as any).testDictionary = testDictionary;
  console.log('[Dictionary] Test utility loaded. Run testDictionary() to test.');
}
