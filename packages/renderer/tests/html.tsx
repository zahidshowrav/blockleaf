import { Editor } from '@tiptap/core';
import { renderToStaticMarkup } from 'react-dom/server';

import { createEmbeds } from '@blockleaf/editor/embeds';
import { createExtensions } from '@blockleaf/editor/extensions';
import { withLayout } from '@blockleaf/editor/layout';
import { createMedia } from '@blockleaf/editor/media';
import { withMentions } from '@blockleaf/editor/mentions';
import { withTextStyle } from '@blockleaf/editor/text-style';
import { withTableOfContents } from '@blockleaf/editor/toc';

import { renderToHTML, type RenderToHTMLOptions } from '../src/html.js';
import { RenderDocument, type RenderDocumentProps } from '../src/react.js';
import { type RenderableDocument } from '../src/types.js';

/**
 * What the editor itself writes for a document. The parity target.
 *
 * With every version 2 subpath loaded: their nodes and marks are in the
 * schema, and an editor without one shows a placeholder instead of writing
 * them.
 */
export const editorHTML = (doc: RenderableDocument): string => {
	const editor = new Editor({
		extensions: [
			...withLayout(
				withTableOfContents(
					withTextStyle(
						withMentions(createExtensions('standard'), {
							items: () => []
						})
					)
				)
			),
			// The blocks only: the toolbars need a mounted editor.
			...createMedia({ mediaMenu: false, captionMenu: false }),
			...createEmbeds({ mediaMenu: false, captionMenu: false })
		],
		content: doc
	});
	const html = editor.getHTML();
	editor.destroy();
	return html;
};

export const reactHTML = (
	doc: RenderableDocument,
	options?: Omit<RenderDocumentProps, 'doc'>
): string =>
	renderToStaticMarkup(
		<RenderDocument
			doc={doc}
			{...options}
		/>
	);

/**
 * A canonical form for comparing two HTML strings.
 *
 * Serialising through the DOM drops the differences that are not differences:
 * attribute order, whether a void element was written `<hr>` or `<hr/>`, and
 * whether a colour was spelled `#ffee00` or `rgb(255, 238, 0)` — the editor's
 * output has been through a real CSSOM and the string target's has not.
 * React's automatic `<link rel="preload">` for images goes too: it is React
 * DOM's doing for any `<img>` it renders, hoisted into `<head>` in a real
 * document, and it says nothing about this package.
 */
/** What the HTML-string target writes. */
export const stringHTML = (
	doc: RenderableDocument,
	options?: RenderToHTMLOptions
): string => renderToHTML(doc, options);

/** CSS text is compared after a CSSOM round-trip, never as it was written. */
const canonicalValue = (attr: Attr): string => {
	if (attr.name !== 'style') return attr.value;

	const probe = document.createElement('div');
	probe.style.cssText = attr.value;
	return probe.style.cssText;
};

export const canonical = (html: string): string => {
	const host = document.createElement('div');
	host.innerHTML = html;

	const serialise = (node: Node): string => {
		if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
		if (node.nodeType !== Node.ELEMENT_NODE) return '';

		const element = node as Element;
		if (
			element.tagName === 'LINK' &&
			element.getAttribute('rel') === 'preload'
		) {
			return '';
		}

		const attrs = [...element.attributes]
			.map((attr) => `${attr.name}="${canonicalValue(attr)}"`)
			.sort()
			.join(' ');
		const children = [...element.childNodes].map(serialise).join('');
		const tag = element.tagName.toLowerCase();

		return `<${tag}${attrs ? ` ${attrs}` : ''}>${children}</${tag}>`;
	};

	return [...host.childNodes].map(serialise).join('');
};
