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

	it('does not force a pasted image figure into a table', () => {
		const instance = open([{ type: 'paragraph' }]);
		instance.commands.setContent(
			'<figure><img src="https://example.com/a.png"><figcaption>Photo</figcaption></figure>'
		);
		expect(types(instance)).not.toContain('figure');
		expect(types(instance)).not.toContain('table');
	});
});
