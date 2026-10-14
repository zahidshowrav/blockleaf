export default {
	// Type-check the whole project (tsc doesn't accept individual files)
	'**/*.{ts,tsx}': () => 'pnpm typecheck',

	// Lint staged files
	'**/*.{ts,tsx,js,jsx,mjs,cjs}': 'pnpm exec eslint',

	// Format staged files
	'**/*.{ts,tsx,js,jsx,mjs,cjs,css,json,md,mdx,yml}':
		'pnpm exec prettier --write'
};
