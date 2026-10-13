import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: [
		'src/index.ts',
		'src/extensions.ts',
		'src/validate.ts',
		'src/code-block.ts'
	],
	format: ['esm'],
	dts: true,
	// Not in watch mode: `clean` wipes `dist/` when the watcher starts, and
	// the sandbox's dev server resolves `@blockleaf/editor` from `dist`. The
	// window between the wipe and the first rebuild is long enough for Vite
	// to fail the import and cache the failure.
	clean: !process.argv.includes('--watch'),
	sourcemap: true,
	treeshake: true,
	// The stylesheet is copied by the bundler rather than by the `build`
	// script, so that `dev` (`tsdown --watch`) produces it too. It did not:
	// `clean` wiped `dist/` on every watch start and nothing put the CSS
	// back, so `pnpm dev` left the sandbox unable to resolve
	// `@blockleaf/editor/styles.css`.
	// `to` is a directory, so the file keeps its name in `dist` and the
	// public `./styles.css` subpath maps to it. The subpath is the API; the
	// filename inside `dist` is not.
	copy: [{ from: 'src/styles/blockleaf.css', to: 'dist' }],
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
