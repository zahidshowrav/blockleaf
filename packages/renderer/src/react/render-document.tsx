import { Fragment, type ReactElement, type ReactNode } from 'react';

import { defaultMarks, unhandledMark } from './marks.js';
import { defaultNodes, unhandledNode } from './nodes.js';
import { type RenderableDocument } from '../types.js';
import { createRenderer } from '../walk.js';

const render = createRenderer<ReactNode>({
	nodes: defaultNodes,
	marks: defaultMarks,
	unknownNode: unhandledNode,
	unknownMark: unhandledMark,
	combine: (parts) => parts,
	// The document has no concept of a list key, so one is derived from each
	// node's path and attached here rather than asked of every component.
	identify: (output, key) => <Fragment key={key}>{output}</Fragment>
});

export interface RenderDocumentProps {
	/**
	 * The stored document. `BlockleafDocument` from `@blockleaf/editor`
	 * satisfies this structurally — no import and no conversion needed.
	 */
	doc: RenderableDocument;
}

/**
 * Renders a stored document to React elements.
 *
 * Safe in a server component: it loads neither ProseMirror nor the editor, and
 * ships no client JavaScript of its own.
 */
export const RenderDocument = ({ doc }: RenderDocumentProps): ReactElement => (
	<>{render(doc)}</>
);
