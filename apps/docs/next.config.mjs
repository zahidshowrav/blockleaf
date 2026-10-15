import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
	reactStrictMode: true,
	// The editor and the renderer are workspace packages built to `dist`, so
	// Next resolves them as ordinary ESM. Nothing to transpile.
	typedRoutes: true,
	images: {
		// Author avatars on blog posts. Nothing else is loaded from a host we
		// do not control.
		remotePatterns: [
			{ protocol: 'https', hostname: 'avatars.githubusercontent.com' }
		]
	}
};

export default withMDX(config);
