import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
	reactStrictMode: true,
	experimental: {
		// Fail the build when the installed Next.js carries a published
		// security advisory, so a vulnerable version cannot ship quietly.
		// This is already the default; it is written out because it can stop
		// CI on somebody else's disclosure schedule rather than on a change
		// of ours. Set it to `false` to silence the check.
		agentUpgrade: 'security'
	},
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
