import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';
import tseslint from 'typescript-eslint';

/** Shared base config: plain TypeScript, no framework assumptions. */
export const base = tseslint.config(
	js.configs.recommended,
	...tseslint.configs.recommended,
	prettier,
	{
		plugins: {
			'import-x': importX
		},
		rules: {
			// The document schema is the product; `any` erodes it silently.
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{ prefer: 'type-imports', fixStyle: 'inline-type-imports' }
			],
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
			],

			// Import order is a documented convention; keep it enforced rather than
			// reviewed by eye. External, then `@`-aliased, then relative.
			'import-x/order': [
				'error',
				{
					groups: [
						['builtin', 'external'],
						'internal',
						['parent', 'sibling', 'index']
					],
					pathGroups: [
						{ pattern: '@blockleaf/**', group: 'internal' }
					],
					pathGroupsExcludedImportTypes: ['builtin'],
					'newlines-between': 'always',
					alphabetize: { order: 'asc', caseInsensitive: true }
				}
			],
			'import-x/newline-after-import': 'error',
			'import-x/no-duplicates': 'error'
		}
	},
	{
		ignores: ['dist/**', 'node_modules/**', '.turbo/**', 'coverage/**']
	}
);
