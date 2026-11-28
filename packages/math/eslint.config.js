import { reactLibrary } from '@blockleaf/eslint-config/react-library';

/**
 * Only the `./react` entry may import React. The editor nodes are plain DOM
 * and the `./html` entry renders a string, so a stray `react` import in
 * either would put React into a bundle that never asked for it.
 */
export default [
	...reactLibrary,
	{
		files: ['src/**/*.{ts,tsx}'],
		ignores: ['src/react.tsx'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['react', 'react-dom', 'react/*'],
							message:
								'Only src/react.tsx may import React — the editor nodes and the HTML renderer must work without it.'
						}
					]
				}
			]
		}
	}
];
