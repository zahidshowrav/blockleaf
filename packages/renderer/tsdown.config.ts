import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: ['src/index.ts', 'src/react.ts'],
	format: ['esm'],
	dts: true,
	clean: !process.argv.includes('--watch'),
	sourcemap: true,
	treeshake: true,
	outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
	// react is a peer and the only external this package has. Nothing else is
	// bundled because nothing else is installed — see F15.
	deps: {
		neverBundle: [/^react($|\/)/]
	}
});
