import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';
import { NextResponse, type NextRequest } from 'next/server';

import { docsContentRoute, docsRoute } from '@/lib/shared';

/**
 * Serves the plain-markdown representation of a docs page to anything that
 * asks for it — `curl -H 'Accept: text/markdown'`, or a `.md` suffix on the
 * URL. The same page, one source, two representations.
 */
const { rewrite: rewriteDocs } = rewritePath(
	`${docsRoute}{/*path}`,
	`${docsContentRoute}{/*path}/content.md`
);

const { rewrite: rewriteSuffix } = rewritePath(
	`${docsRoute}{/*path}.md`,
	`${docsContentRoute}{/*path}/content.md`
);

const proxy = (request: NextRequest) => {
	const suffixed = rewriteSuffix(request.nextUrl.pathname);
	if (suffixed) {
		return NextResponse.rewrite(new URL(suffixed, request.nextUrl));
	}

	if (isMarkdownPreferred(request)) {
		const negotiated = rewriteDocs(request.nextUrl.pathname);

		if (negotiated) {
			return NextResponse.rewrite(new URL(negotiated, request.nextUrl), {
				// Two representations behind one URL, chosen by `Accept`.
				headers: { Vary: 'Accept' }
			});
		}
	}

	return NextResponse.next();
};

export default proxy;
