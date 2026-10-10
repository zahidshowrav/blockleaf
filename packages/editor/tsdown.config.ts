import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: ['src/index.ts', 'src/extensions.ts'],
	format: ['esm'],
	dts: true,
	clean: true,
	sourcemap: true,
	treeshake: true,
	// The package is `"type": "module"` and ESM-only, so `.mjs` buys nothing and
	// only makes the exports map harder to read.
	outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
	// react is a peer; @tiptap/* stay runtime dependencies rather than inlined
	external: [/^react($|\/)/, /^react-dom($|\/)/, /^@tiptap\//]
});
