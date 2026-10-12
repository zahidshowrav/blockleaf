import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: ['src/index.ts', 'src/extensions.ts', 'src/validate.ts'],
	format: ['esm'],
	dts: true,
	clean: true,
	sourcemap: true,
	treeshake: true,
	// The package is `"type": "module"` and ESM-only, so `.mjs` buys nothing and
	// only makes the exports map harder to read.
	outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
	// react and zod are peers; @tiptap/* stay runtime dependencies rather than inlined,
	// except @tiptap/suggestion which is bundled so package.json sideEffects: false
	// enables full tree-shaking for server-side schema consumers.
	deps: {
		neverBundle: [
			/^react($|\/)/,
			/^react-dom($|\/)/,
			/^@tiptap\/(?!suggestion($|\/))/,
			/^zod($|\/)/
		],
		alwaysBundle: ['@tiptap/suggestion']
	},
	plugins: [
		{
			name: 'mark-suggestion-pure',
			transform(code, id) {
				if (id.includes('@tiptap/suggestion')) {
					return {
						code: code.replaceAll(
							'new PluginKey("suggestion")',
							'/* @__PURE__ */ new PluginKey("suggestion")'
						),
						map: null
					};
				}
			}
		}
	]
});
