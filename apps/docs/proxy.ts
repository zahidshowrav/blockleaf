import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';
import { NextResponse, type NextRequest } from 'next/server';

import {
	blogContentRoute,
	blogRoute,
	docsContentRoute,
	docsRoute
} from '@/lib/shared';

/**
 * Serves the plain-markdown representation of a docs page to anything that
 * asks for it — `curl -H 'Accept: text/markdown'`, or a `.md` suffix on the
 * URL. The same page, one source, two representations.
 */
const negotiated = [
	rewritePath(
		`${docsRoute}{/*path}`,
		`${docsContentRoute}{/*path}/content.md`
	).rewrite,
	rewritePath(
		`${blogRoute}{/*path}`,
		`${blogContentRoute}{/*path}/content.md`
	).rewrite
];

const suffixed = [
	rewritePath(
		`${docsRoute}{/*path}.md`,
		`${docsContentRoute}{/*path}/content.md`
	).rewrite,
	rewritePath(
		`${blogRoute}{/*path}.md`,
		`${blogContentRoute}{/*path}/content.md`
	).rewrite
];

const firstMatch = (
	rewrites: ((path: string) => string | false)[],
	path: string
) => {
	for (const rewrite of rewrites) {
		const match = rewrite(path);
		if (match) return match;
	}
};

const proxy = (request: NextRequest) => {
	const path = request.nextUrl.pathname;

	const bySuffix = firstMatch(suffixed, path);
	if (bySuffix) {
		return NextResponse.rewrite(new URL(bySuffix, request.nextUrl));
	}

	if (isMarkdownPreferred(request)) {
		const byHeader = firstMatch(negotiated, path);

		if (byHeader) {
			return NextResponse.rewrite(new URL(byHeader, request.nextUrl), {
				// Two representations behind one URL, chosen by `Accept`.
				headers: { Vary: 'Accept' }
			});
		}
	}

	return NextResponse.next();
};

export default proxy;
