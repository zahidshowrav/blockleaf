import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: ['src/index.ts', 'src/react.tsx', 'src/html.ts'],
	format: ['esm'],
	dts: true,
	clean: !process.argv.includes('--watch'),
	sourcemap: true,
	treeshake: true,
	outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
	// Every import is a peer: KaTeX, the editor and Tiptap it extends, the
	// renderer it plugs into, and React. Bundling any of them would ship a
	// second copy beside the host's own.
	deps: {
		neverBundle: [
			/^katex($|\/)/,
			/^@blockleaf\//,
			/^@tiptap\//,
			/^react($|\/)/
		]
	}
});
