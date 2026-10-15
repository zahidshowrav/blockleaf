import { reactLibrary } from '@blockleaf/eslint-config/react-library';

/**
 * The docs site is a Next.js app, not a library: it has generated types in
 * `.next`, and `next build` is what actually type-checks the routes.
 */
export default [
	...reactLibrary,
	{
		ignores: ['.next/**', 'next-env.d.ts', '.source/**']
	}
];
