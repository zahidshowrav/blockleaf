import { Editor, getSchema, type Extensions } from '@tiptap/core';
import { renderToStaticMarkup } from 'react-dom/server';

import {
	createExtensions,
	unwrapUnknownContent,
	wrapUnknownContent
} from '@blockleaf/editor/extensions';
import {
	renderToHTML,
	type RenderToHTMLOptions
} from '@blockleaf/renderer/html';
import {
	RenderDocument,
	type RenderDocumentProps
} from '@blockleaf/renderer/react';

import { withMath } from '../src/index.js';

export type Doc = {
	type: 'doc';
	attrs: { schemaVersion: number };
	content: Record<string, unknown>[];
};

export const docOf = (...content: Record<string, unknown>[]): Doc => ({
	type: 'doc',
	attrs: { schemaVersion: 2 },
	content
});

export const paragraph = (...content: Record<string, unknown>[]) => ({
	type: 'paragraph',
	attrs: { id: 'p' },
	content
});

export const text = (value: string) => ({ type: 'text', text: value });

export const inline = (latex: string) => ({
	type: 'mathInline',
	attrs: { latex }
});

export const block = (latex: string, id = 'm') => ({
	type: 'mathBlock',
	attrs: { id, latex }
});

export const mathExtensions = (): Extensions =>
	withMath(createExtensions('standard'));

/** An editor on a document, loaded as `BlockleafEditor` loads one. */
export const editorWith = (doc: Doc, extensions = mathExtensions()): Editor =>
	new Editor({
		extensions,
		content: wrapUnknownContent(doc, getSchema(extensions))
	});

/**
 * What the editor stores for a document, placeholders unwrapped. Stamped
 * with the version as the editor's own change handler stamps it.
 */
export const roundTrip = (doc: Doc, extensions?: Extensions): unknown => {
	const editor = editorWith(doc, extensions);
	const json = unwrapUnknownContent(editor.getJSON());
	editor.destroy();
	return { ...json, attrs: doc.attrs };
};

export const editorHTML = (doc: Doc): string => {
	const editor = editorWith(doc);
	const html = editor.getHTML();
	editor.destroy();
	return html;
};

export const stringHTML = (doc: Doc, options?: RenderToHTMLOptions): string =>
	renderToHTML(doc, options);

export const reactHTML = (
	doc: Doc,
	options?: Omit<RenderDocumentProps, 'doc'>
): string =>
	renderToStaticMarkup(
		<RenderDocument
			doc={doc}
			{...options}
		/>
	);

/** Attribute order and quoting are not differences. */
export const canonical = (html: string): string => {
	const host = document.createElement('div');
	host.innerHTML = html;
	const serialise = (node: Node): string => {
		if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
		if (node.nodeType !== Node.ELEMENT_NODE) return '';
		const element = node as Element;
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
