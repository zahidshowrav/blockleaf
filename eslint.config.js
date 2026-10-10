import { base } from '@blockleaf/eslint-config/base';

/**
 * Root config, for the repo-root config files only — each workspace carries its
 * own `eslint.config.js` and ESLint resolves config from the linted file's
 * directory upward. This exists so `eslint` can be run from the root over staged
 * files (see `lint-staged.config.mjs`) without the root files falling through
 * unlinted.
 */
export default [
	...base,
	{
		ignores: ['apps/**', 'packages/**', '.husky/**', 'dist/**']
	}
];
