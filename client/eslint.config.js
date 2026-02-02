import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // Block direct setState calls in visual-quotation module (use slice actions instead)
  {
    files: ['src/modules/visual-quotation/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.property.name="setState"][callee.object.name="useVisualQuotationStore"]',
          message: 'Direct setState() is forbidden in visual-quotation. Use slice actions instead.',
        },
        {
          selector: 'MemberExpression[property.name="setState"][object.name="useVisualQuotationStore"]',
          message: 'Direct setState() is forbidden in visual-quotation. Use slice actions instead.',
        },
      ],
    },
  },
])
