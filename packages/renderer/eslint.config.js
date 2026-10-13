import { reactLibrary } from '@blockleaf/eslint-config/react-library';

/**
 * The renderer's own boundary, enforced rather than trusted: only `src/react`
 * may import React. The HTML-string and text entries are the reason this
 * package exists — a stray `react` import in a shared module would put React
 * into a server bundle that asked for a string.
 */
export default [
	...reactLibrary,
	{
		files: ['src/**/*.{ts,tsx}'],
		ignores: ['src/react/**/*.{ts,tsx}', 'src/react.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['react', 'react-dom', 'react/*'],
							message:
								'Only src/react may import React — every other entry must render without it.'
						}
					]
				}
			]
		}
	}
];
