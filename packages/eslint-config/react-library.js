import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

import { base } from './base.js';

/**
 * React library config. The `core` / `react` / `ui` import boundary is enforced
 * here rather than by convention: extracting `@blockleaf/core` later must stay a
 * `mv`, not a refactor. See PROJECT_PLAN §2.
 */
export const reactLibrary = [
	...base,
	{
		languageOptions: {
			globals: { ...globals.browser }
		}
	},
	reactHooks.configs.flat['recommended-latest'],
	{
		files: ['src/core/**/*.{ts,tsx}'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: [
								'**/react/**',
								'**/ui/**',
								'react',
								'react-dom',
								'@tiptap/react'
							],
							message:
								'src/core must stay framework-agnostic — it is the future @blockleaf/core package.'
						}
					]
				}
			]
		}
	},
	{
		files: ['src/react/**/*.{ts,tsx}'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['**/ui/**'],
							message:
								'src/react must not depend on the default chrome — the chrome is replaceable, the bindings are not.'
						}
					]
				}
			]
		}
	}
];
