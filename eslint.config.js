import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  {
<<<<<<< HEAD
    ignores: [
      'dist/**',
      'supabase/.temp/**',
      'supabase/.branches/**',
    ],
=======
    ignores: ['dist/**', 'supabase/.temp/**', 'supabase/.branches/**'],
>>>>>>> 1298320 (feat: add deterministic supabase seed generation)
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  }
);
