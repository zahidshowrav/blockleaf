import { Editor } from '@tiptap/core';
import { renderToStaticMarkup } from 'react-dom/server';

import { createExtensions } from '@blockleaf/editor/extensions';

import { RenderDocument, type RenderDocumentProps } from '../src/react.js';
import { type RenderableDocument } from '../src/types.js';

/** What the editor itself writes for a document. The parity target. */
export const editorHTML = (doc: RenderableDocument): string => {
	const editor = new Editor({
		extensions: createExtensions('standard'),
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
 * attribute order, and whether a void element was written `<hr>` or `<hr/>`.
 * React's automatic `<link rel="preload">` for images goes too — it is React
 * DOM's doing for any `<img>` it renders, hoisted into `<head>` in a real
 * document, and it says nothing about this package.
 */
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
			.map((attr) => `${attr.name}="${attr.value}"`)
			.sort()
			.join(' ');
		const children = [...element.childNodes].map(serialise).join('');
		const tag = element.tagName.toLowerCase();

		return `<${tag}${attrs ? ` ${attrs}` : ''}>${children}</${tag}>`;
	};

	return [...host.childNodes].map(serialise).join('');
};
