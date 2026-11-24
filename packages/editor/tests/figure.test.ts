import { Editor, type JSONContent } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';
import { withBlockIds, type BlockNode } from '../src/core/schema.js';

const cell = (text: string): JSONContent => ({
	type: 'tableCell',
	content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
});

const table: JSONContent = {
	type: 'table',
	content: [
		{ type: 'tableRow', content: [cell('a'), cell('b')] },
		{ type: 'tableRow', content: [cell('c'), cell('d')] }
	]
};

const captioned = (text?: string): JSONContent => ({
	type: 'figure',
	content: [
		table,
		{
			type: 'caption',
			...(text ? { content: [{ type: 'text', text }] } : {})
		}
	]
});

let editor: Editor | null = null;

const open = (content: JSONContent[]) => {
	editor = new Editor({
		extensions: createExtensions('standard'),
		content: { type: 'doc', content }
	});
	return editor;
};

afterEach(() => {
	editor?.destroy();
	editor = null;
});

/** Puts the caret in the first cell's text. */
const intoFirstCell = (instance: Editor) => {
	let target = -1;
	instance.state.doc.descendants((node, pos) => {
		if (target === -1 && node.isText && node.text === 'a') target = pos;
	});
	instance.commands.setTextSelection(target);
};

/** Puts the caret at the start of the caption. */
const intoCaption = (instance: Editor) => {
	let target = -1;
	instance.state.doc.descendants((node, pos) => {
		if (node.type.name === 'caption') target = pos + 1;
	});
	instance.commands.setTextSelection(target);
};

/**
 * Presses a key through the editor's own key handling. Tiptap's
 * `keyboardShortcut` command keeps only the steps a handler dispatched and
 * drops its selection, so it cannot show where the caret went.
 */
const press = (instance: Editor, key: string) =>
	instance.view.someProp('handleKeyDown', (handle) =>
		handle(instance.view, new KeyboardEvent('keydown', { key }))
	);

const types = (instance: Editor) =>
	((instance.getJSON() as JSONContent).content ?? []).map(
		(node) => node.type
	);

describe('table caption (HD-10)', () => {
	it('stores a captioned table as a figure: the table, then the caption', () => {
		const instance = open([captioned('Sales by quarter')]);
		const [figure] = (instance.getJSON() as JSONContent).content ?? [];
		expect(figure?.type).toBe('figure');
		expect(figure?.content?.map((node) => node.type)).toEqual([
			'table',
			'caption'
		]);
		expect(figure?.content?.[1]?.content).toEqual([
			{ type: 'text', text: 'Sales by quarter' }
		]);
	});

	it('keeps marks in a caption, so a credit can carry its link', () => {
		const instance = open([
			{
				type: 'figure',
				content: [
					table,
					{
						type: 'caption',
						content: [
							{
								type: 'text',
								text: 'Source',
								marks: [
									{
										type: 'link',
										attrs: { href: 'https://example.com' }
									}
								]
							}
						]
					}
				]
			}
		]);
		const caption = (instance.getJSON() as JSONContent).content?.[0]
			?.content?.[1];
		expect(caption?.content?.[0]?.marks?.[0]).toMatchObject({
			type: 'link',
			attrs: { href: 'https://example.com' }
		});
	});

	it('adds a caption and puts the caret in it', () => {
		const instance = open([table]);
		intoFirstCell(instance);
		expect(instance.commands.toggleTableCaption()).toBe(true);
		expect(types(instance)[0]).toBe('figure');
		expect(instance.state.selection.$from.parent.type.name).toBe('caption');
		instance.commands.insertContent('Q3');
		expect(
			(instance.getJSON() as JSONContent).content?.[0]?.content?.[1]
				?.content
		).toEqual([{ type: 'text', text: 'Q3' }]);
	});

	it('removes a caption and leaves the table as it was', () => {
		const instance = open([captioned('gone')]);
		intoFirstCell(instance);
		instance.commands.toggleTableCaption();
		const [first] = (instance.getJSON() as JSONContent).content ?? [];
		expect(first?.type).toBe('table');
		expect(first?.content).toHaveLength(2);
		expect(instance.state.selection.$from.parent.type.name).toBe(
			'paragraph'
		);
	});

	it('removes a caption from inside the caption too', () => {
		const instance = open([captioned('gone')]);
		intoCaption(instance);
		expect(instance.commands.toggleTableCaption()).toBe(true);
		expect(types(instance)[0]).toBe('table');
	});

	it('cannot toggle a caption outside a table', () => {
		const instance = open([{ type: 'paragraph' }]);
		expect(instance.can().toggleTableCaption()).toBe(false);
	});

	it('deletes the caption with the table', () => {
		const instance = open([captioned('orphan?'), { type: 'paragraph' }]);
		intoFirstCell(instance);
		instance.commands.deleteTable();
		expect(types(instance)).not.toContain('figure');
		expect(types(instance)).not.toContain('caption');
		expect(JSON.stringify(instance.getJSON() as JSONContent)).not.toContain(
			'orphan?'
		);
	});

	it('leaves the caption for a paragraph below on Enter', () => {
		const instance = open([captioned('Caption')]);
		intoCaption(instance);
		press(instance, 'Enter');
		expect(types(instance)).toEqual(['figure', 'paragraph']);
		expect(instance.state.selection.$from.parent.type.name).toBe(
			'paragraph'
		);
		expect(
			(instance.getJSON() as JSONContent).content?.[0]?.content
		).toHaveLength(2);
	});

	it('removes an empty caption on Backspace', () => {
		const instance = open([captioned(), { type: 'paragraph' }]);
		intoCaption(instance);
		press(instance, 'Backspace');
		expect(types(instance)[0]).toBe('table');
	});

	it('keeps a written caption on Backspace at its start', () => {
		const instance = open([captioned('kept'), { type: 'paragraph' }]);
		intoCaption(instance);
		press(instance, 'Backspace');
		expect(types(instance)[0]).toBe('figure');
		expect(JSON.stringify(instance.getJSON() as JSONContent)).toContain(
			'kept'
		);
	});

	it('gives the figure a block id, like any other block', () => {
		const doc = withBlockIds({
			type: 'doc',
			attrs: { schemaVersion: 1 },
			content: [captioned('x') as BlockNode]
		});
		expect(
			(doc.content?.[0] as JSONContent | undefined)?.attrs
		).toMatchObject({
			id: expect.any(String)
		});
	});

	it('reads a pasted <figure> holding a table and a <figcaption>', () => {
		const instance = open([{ type: 'paragraph' }]);
		instance.commands.setContent(
			'<figure><table><tr><td>a</td></tr></table><figcaption>Pasted</figcaption></figure>'
		);
		const [figure] = (instance.getJSON() as JSONContent).content ?? [];
		expect(figure?.type).toBe('figure');
		expect(figure?.content?.[1]?.content?.[0]?.text).toBe('Pasted');
	});

	it('does not invent a caption for a pasted figure without one', () => {
		const instance = open([{ type: 'paragraph' }]);
		instance.commands.setContent(
			'<figure><img src="https://example.com/a.png"></figure>'
		);
		expect(types(instance)[0]).toBe('image');
		expect(types(instance)).not.toContain('figure');
	});
});

const image: JSONContent = {
	type: 'image',
	attrs: { src: 'https://example.com/a.png', alt: 'A cat' }
};

const captionedImage = (
	text?: string,
	attrs?: Record<string, unknown>
): JSONContent => ({
	type: 'figure',
	content: [
		image,
		{
			type: 'caption',
			...(attrs ? { attrs } : {}),
			...(text ? { content: [{ type: 'text', text }] } : {})
		}
	]
});

/** Selects the first image, as a click on it does. */
const selectImage = (instance: Editor) => {
	let target = -1;
	instance.state.doc.descendants((node, pos) => {
		if (target === -1 && node.type.name === 'image') target = pos;
	});
	instance.commands.setNodeSelection(target);
};

const first = (instance: Editor) =>
	((instance.getJSON() as JSONContent).content ?? [])[0];

describe('image caption (PA-20)', () => {
	it('stores a captioned image as a figure, the image exactly as it was', () => {
		const instance = open([captionedImage('Photo: Ada')]);
		const figure = first(instance);
		expect(figure?.type).toBe('figure');
		expect(figure?.content?.[0]).toMatchObject(image);
		expect(figure?.content?.[1]?.content?.[0]?.text).toBe('Photo: Ada');
	});

	it('adds a caption to a selected image and puts the caret in it', () => {
		const instance = open([image, { type: 'paragraph' }]);
		selectImage(instance);
		expect(instance.commands.toggleCaption()).toBe(true);
		expect(types(instance)).toEqual(['figure', 'paragraph']);
		expect(instance.state.selection.$from.parent.type.name).toBe('caption');
		instance.commands.insertContent('Credit');
		expect(first(instance)?.content?.[1]?.content).toEqual([
			{ type: 'text', text: 'Credit' }
		]);
	});

	it('removes the caption and selects the image again', () => {
		const instance = open([captionedImage('gone'), { type: 'paragraph' }]);
		selectImage(instance);
		expect(instance.commands.toggleCaption()).toBe(true);
		expect(types(instance)).toEqual(['image', 'paragraph']);
		expect(instance.state.selection.from).toBe(0);
		expect(
			instance.state.doc.nodeAt(instance.state.selection.from)?.type.name
		).toBe('image');
	});

	it('removes the caption from a selected figure too', () => {
		const instance = open([captionedImage('gone'), { type: 'paragraph' }]);
		instance.commands.setNodeSelection(0);
		expect(instance.commands.toggleCaption()).toBe(true);
		expect(types(instance)[0]).toBe('image');
	});

	it('removes an empty caption on Backspace and selects the image', () => {
		const instance = open([captionedImage(), { type: 'paragraph' }]);
		intoCaption(instance);
		press(instance, 'Backspace');
		expect(types(instance)[0]).toBe('image');
		expect(
			instance.state.doc.nodeAt(instance.state.selection.from)?.type.name
		).toBe('image');
	});

	it('deletes the caption with the image', () => {
		const instance = open([
			captionedImage('orphan?'),
			{ type: 'paragraph' }
		]);
		selectImage(instance);
		instance.commands.deleteSelection();
		expect(types(instance)).not.toContain('figure');
		expect(JSON.stringify(instance.getJSON() as JSONContent)).not.toContain(
			'orphan?'
		);
	});

	it('leaves the caption for a paragraph below on Enter', () => {
		const instance = open([captionedImage('Caption')]);
		intoCaption(instance);
		press(instance, 'Enter');
		expect(types(instance)).toEqual(['figure', 'paragraph']);
	});

	it('cannot caption a paragraph, and toggleTableCaption ignores images', () => {
		const instance = open([{ type: 'paragraph' }, image]);
		expect(instance.can().toggleCaption()).toBe(false);
		selectImage(instance);
		expect(instance.can().toggleTableCaption()).toBe(false);
		expect(instance.can().toggleCaption()).toBe(true);
	});

	it('aligns the caption on its own, and null goes back to following the image', () => {
		const instance = open([captionedImage('Credit')]);
		intoCaption(instance);
		expect(instance.commands.setCaptionAlign('center')).toBe(true);
		expect(first(instance)?.content?.[1]?.attrs).toMatchObject({
			textAlign: 'center'
		});
		expect(instance.getHTML()).toMatch(
			/<figcaption style="text-align: center;?" class="blockleaf-caption">/
		);
		instance.commands.setCaptionAlign(null);
		expect(first(instance)?.content?.[1]?.attrs?.textAlign).toBeUndefined();
	});

	it('aligns the caption from the selected image as well', () => {
		const instance = open([captionedImage('Credit')]);
		selectImage(instance);
		expect(instance.commands.setCaptionAlign('right')).toBe(true);
		expect(first(instance)?.content?.[1]?.attrs?.textAlign).toBe('right');
	});

	it('refuses to align a caption outside a figure', () => {
		const instance = open([{ type: 'paragraph' }]);
		expect(instance.can().setCaptionAlign('center')).toBe(false);
	});

	it('reads a pasted <figure> holding an image and a <figcaption>', () => {
		const instance = open([{ type: 'paragraph' }]);
		instance.commands.setContent(
			'<figure><img src="https://example.com/a.png" alt="A cat"><figcaption>Pasted</figcaption></figure>'
		);
		const figure = first(instance);
		expect(figure?.type).toBe('figure');
		expect(figure?.content?.[0]?.type).toBe('image');
		expect(figure?.content?.[1]?.content?.[0]?.text).toBe('Pasted');
	});

	it('drops a pasted figure whose image has an unsafe src', () => {
		const instance = open([{ type: 'paragraph' }]);
		instance.commands.setContent(
			'<figure><img src="javascript:alert(1)"><figcaption>Bad</figcaption></figure><p>after</p>'
		);
		expect(types(instance)).not.toContain('figure');
		expect(types(instance)).not.toContain('image');
	});
});
