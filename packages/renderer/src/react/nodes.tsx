import { Fragment } from 'react';

import { type NodeRenderer } from './types.js';
import {
	blockId,
	calloutEmoji,
	calloutTone,
	codeLanguage,
	headingLevel,
	imageAttributes,
	isChecked,
	listStart
} from '../attrs.js';

/**
 * The default node components.
 *
 * Every element here matches what the editor writes for the same node, so a
 * page rendered on the server and the same document open in the editor share
 * one stylesheet. Where they deliberately differ, the component says why.
 */

const Doc: NodeRenderer = ({ children }) => <>{children}</>;

const Paragraph: NodeRenderer = ({ node, children }) => (
	<p data-id={blockId(node)}>{children}</p>
);

const Heading: NodeRenderer = ({ node, children }) => {
	const Tag = `h${headingLevel(node)}` as 'h1' | 'h2' | 'h3';
	return <Tag data-id={blockId(node)}>{children}</Tag>;
};

const Blockquote: NodeRenderer = ({ node, children }) => (
	<blockquote data-id={blockId(node)}>{children}</blockquote>
);

const CodeBlock: NodeRenderer = ({ node, children }) => {
	const language = codeLanguage(node);
	return (
		<pre data-id={blockId(node)}>
			<code className={language ? `language-${language}` : undefined}>
				{children}
			</code>
		</pre>
	);
};

const HorizontalRule: NodeRenderer = ({ node }) => (
	<hr data-id={blockId(node)} />
);

const BulletList: NodeRenderer = ({ node, children }) => (
	<ul data-id={blockId(node)}>{children}</ul>
);

const OrderedList: NodeRenderer = ({ node, children }) => (
	<ol
		data-id={blockId(node)}
		start={listStart(node)}
	>
		{children}
	</ol>
);

const ListItem: NodeRenderer = ({ node, children }) => (
	<li data-id={blockId(node)}>{children}</li>
);

const TaskList: NodeRenderer = ({ node, children }) => (
	<ul
		data-id={blockId(node)}
		data-type="taskList"
	>
		{children}
	</ul>
);

/**
 * The checkbox is `disabled`, which the editor's is not.
 *
 * Rendered output is a record of what the document says, and nothing here can
 * write a change back. A checkbox that invites a click and then silently
 * discards it is worse than one that plainly cannot be clicked.
 */
const TaskItem: NodeRenderer = ({ node, children }) => (
	<li
		data-id={blockId(node)}
		data-checked={isChecked(node) ? 'true' : 'false'}
		data-type="taskItem"
	>
		<label>
			<input
				type="checkbox"
				checked={isChecked(node)}
				disabled
			/>
			<span />
		</label>
		<div>{children}</div>
	</li>
);

const Callout: NodeRenderer = ({ node, children }) => (
	<div
		data-id={blockId(node)}
		data-emoji={calloutEmoji(node)}
		data-tone={calloutTone(node)}
		data-type="callout"
		className="blockleaf-callout"
	>
		{children}
	</div>
);

/**
 * `details` is in the schema and the validator but has no editor extension
 * yet, so only a host building documents by hand produces one. It renders
 * because the schema admits it — a node the document is allowed to contain
 * must not depend on which version of the editor happens to be installed.
 */
const Details: NodeRenderer = ({ node, children }) => (
	<details
		data-id={blockId(node)}
		open={node.attrs?.open === true}
	>
		{children}
	</details>
);

const Image: NodeRenderer = ({ node }) => {
	const attrs = imageAttributes(node);
	// A source that did not survive sanitisation renders nothing at all. An
	// `<img>` with no `src` is a broken-image icon and a layout hole.
	if (!attrs) return null;

	return (
		<img
			data-id={blockId(node)}
			src={attrs.src}
			alt={attrs.alt}
			width={attrs.width}
			data-align={attrs.align}
			className="blockleaf-image"
		/>
	);
};

const Text: NodeRenderer = ({ node }) => <>{node.text ?? ''}</>;

const HardBreak: NodeRenderer = () => <br />;

/**
 * An unknown node renders its children and nothing else.
 *
 * Documents outlive the code that reads them: a server on an older renderer
 * will meet a node type a newer editor wrote. Throwing there takes down the
 * page for everything else on it, so the text survives and the wrapper does
 * not.
 */
export const unhandledNode: NodeRenderer = ({ children }) => (
	<Fragment>{children}</Fragment>
);

export const defaultNodes: Record<string, NodeRenderer> = {
	doc: Doc,
	paragraph: Paragraph,
	heading: Heading,
	blockquote: Blockquote,
	codeBlock: CodeBlock,
	horizontalRule: HorizontalRule,
	bulletList: BulletList,
	orderedList: OrderedList,
	listItem: ListItem,
	taskList: TaskList,
	taskItem: TaskItem,
	callout: Callout,
	details: Details,
	image: Image,
	text: Text,
	hardBreak: HardBreak
};
