import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
	reactStrictMode: true,
	// The editor and the renderer are workspace packages built to `dist`, so
	// Next resolves them as ordinary ESM. Nothing to transpile.
	typedRoutes: true
};

export default withMDX(config);
