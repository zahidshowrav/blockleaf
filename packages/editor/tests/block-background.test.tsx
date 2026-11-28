import { Editor, type JSONContent } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import { BLOCK_BACKGROUND_TYPES } from '../src/core/constants.js';
import { createExtensions } from '../src/core/extensions.js';
import { resolveLabels } from '../src/core/labels.js';
import { createBlockActions } from '../src/ui/drag-handle/actions.js';
import { safeValidateDocument } from '../src/validate.js';

const editors: Editor[] = [];

afterEach(() => {
	while (editors.length) editors.pop()?.destroy();
});

const open = (
	content: JSONContent[] | string,
	preset: 'minimal' | 'standard' = 'standard'
) => {
	const editor = new Editor({
		extensions: createExtensions(preset),
		content:
			typeof content === 'string' ? content : { type: 'doc', content }
	});
	editors.push(editor);
	return editor;
};

const paragraph = (text: string, attrs?: Record<string, unknown>) => ({
	type: 'paragraph',
	...(attrs ? { attrs } : {}),
	content: [{ type: 'text', text }]
});

/** The blocks as they would be stored: as JSON text, where `undefined` goes. */
const blocks = (editor: Editor) =>
	(JSON.parse(JSON.stringify(editor.getJSON())) as JSONContent).content ?? [];

describe('the backgroundColor attribute', () => {
	it('is in every preset', () => {
		for (const preset of ['minimal', 'standard'] as const) {
			const editor = open(
				[paragraph('Note', { backgroundColor: 'yellow' })],
				preset
			);
			expect(blocks(editor)[0]?.attrs?.backgroundColor).toBe('yellow');
		}
	});

	it('stores nothing for a block with no colour', () => {
		const editor = open([paragraph('Plain')]);
		expect(blocks(editor)[0]?.attrs).not.toHaveProperty('backgroundColor');
		expect(JSON.stringify(editor.getJSON())).not.toContain(
			'backgroundColor'
		);
	});

	it('round-trips through its own HTML as a token and a palette colour', () => {
		const html = open([
			{
				type: 'heading',
				attrs: {
					level: 2,
					backgroundColor: 'blue',
					textAlign: 'center'
				},
				content: [{ type: 'text', text: 'Title' }]
			}
		]).getHTML();
		expect(html).toContain('data-background="blue"');
		expect(html).toContain('background-color: var(--bl-highlight-blue)');
		expect(html).toContain('text-align: center');
		expect(blocks(open(html))[0]?.attrs).toMatchObject({
			backgroundColor: 'blue',
			textAlign: 'center'
		});
	});

	it('never writes a value that is not a token into style', () => {
		const editor = open([
			paragraph('x', { backgroundColor: 'red); color: red' }),
			paragraph('y', { backgroundColor: '#ff0000' })
		]);
		const html = editor.getHTML();
		expect(html).not.toContain('background-color');
		expect(html).not.toContain('#ff0000');
		const pasted = open(
			'<p data-background="red;x:url(evil)">a</p><p data-background="green">b</p>'
		);
		expect(
			blocks(pasted).map((block) => block.attrs?.backgroundColor)
		).toEqual([undefined, 'green']);
	});

	it('is kept on every text block type', () => {
		const editor = open([
			{
				type: 'blockquote',
				attrs: { backgroundColor: 'gray' },
				content: [paragraph('q')]
			},
			{
				type: 'bulletList',
				attrs: { backgroundColor: 'green' },
				content: [{ type: 'listItem', content: [paragraph('a')] }]
			},
			{
				type: 'details',
				attrs: { open: true, backgroundColor: 'pink' },
				content: [paragraph('t'), paragraph('b')]
			}
		]);
		expect(
			blocks(editor).map((block) => block.attrs?.backgroundColor)
		).toEqual(['gray', 'green', 'pink']);
		expect(BLOCK_BACKGROUND_TYPES).not.toContain('callout');
	});
});

describe('setBlockBackground', () => {
	it('colours the block at a position, and takes the colour off', () => {
		const editor = open([paragraph('one'), paragraph('two')]);
		const second = editor.state.doc.child(0).nodeSize;
		expect(editor.commands.setBlockBackground('yellow', second)).toBe(true);
		expect(blocks(editor)[1]?.attrs?.backgroundColor).toBe('yellow');
		expect(blocks(editor)[0]?.attrs?.backgroundColor).toBeUndefined();
		editor.commands.setBlockBackground(null, second);
		expect(blocks(editor)[1]?.attrs).not.toHaveProperty('backgroundColor');
	});

	it('colours every top-level block the selection touches, a list whole', () => {
		const editor = open([
			paragraph('one'),
			{
				type: 'bulletList',
				content: [{ type: 'listItem', content: [paragraph('a')] }]
			}
		]);
		editor.commands.setTextSelection({
			from: 1,
			to: editor.state.doc.content.size - 1
		});
		expect(editor.commands.setBlockBackground('purple')).toBe(true);
		const [first, list] = blocks(editor);
		expect(first?.attrs?.backgroundColor).toBe('purple');
		expect(list?.attrs?.backgroundColor).toBe('purple');
		expect(
			list?.content?.[0]?.content?.[0]?.attrs?.backgroundColor
		).toBeUndefined();
	});

	it('refuses a value that is not a token, and a block that takes none', () => {
		const editor = open([
			paragraph('x'),
			{
				type: 'callout',
				attrs: { emoji: '💡', tone: 'info' },
				content: [paragraph('c')]
			}
		]);
		expect(editor.commands.setBlockBackground('Not A Token', 0)).toBe(
			false
		);
		const callout = editor.state.doc.child(0).nodeSize;
		expect(editor.commands.setBlockBackground('red', callout)).toBe(false);
	});

	it('is one undo step', () => {
		const editor = open([paragraph('x')]);
		editor.commands.setBlockBackground('red', 0);
		editor.commands.undo();
		expect(blocks(editor)[0]?.attrs).not.toHaveProperty('backgroundColor');
	});
});

describe('the block menu', () => {
	const actions = createBlockActions(
		undefined,
		undefined,
		resolveLabels({ textColor: { colors: { yellow: 'Jaune' } } }).textColor
	);
	const byId = (id: string) => actions.find((action) => action.id === id);

	it('offers Default and the nine colours under Background', () => {
		const ids = actions
			.filter((action) => action.group === 'Background')
			.map((action) => action.id);
		expect(ids).toEqual([
			'background-none',
			'background-gray',
			'background-brown',
			'background-orange',
			'background-yellow',
			'background-green',
			'background-blue',
			'background-purple',
			'background-pink',
			'background-red'
		]);
		expect(byId('background-yellow')?.title).toBe('Jaune');
		expect(byId('background-none')?.title).toBe('Default');
	});

	it('shows them for a text block only, and marks the current one', () => {
		const editor = open([
			paragraph('x', { backgroundColor: 'yellow' }),
			{ type: 'codeBlock', content: [{ type: 'text', text: 'code' }] }
		]);
		const code = editor.state.doc.child(0).nodeSize;
		expect(byId('background-yellow')?.isAvailable?.(editor, 0)).toBe(true);
		expect(byId('background-yellow')?.isActive?.(editor, 0)).toBe(true);
		expect(byId('background-none')?.isActive?.(editor, 0)).toBe(false);
		expect(byId('background-yellow')?.isAvailable?.(editor, code)).toBe(
			false
		);

		byId('background-none')?.run(editor, 0);
		expect(blocks(editor)[0]?.attrs).not.toHaveProperty('backgroundColor');
		expect(byId('background-none')?.isActive?.(editor, 0)).toBe(true);
	});
});

describe('stored documents', () => {
	const doc = (attrs: Record<string, unknown>) => ({
		type: 'doc',
		attrs: { schemaVersion: 2 },
		content: [{ type: 'paragraph', attrs }]
	});

	it('accept a token and refuse anything else', () => {
		expect(
			safeValidateDocument(doc({ backgroundColor: 'yellow' })).success
		).toBe(true);
		expect(safeValidateDocument(doc({})).success).toBe(true);
		expect(
			safeValidateDocument(doc({ backgroundColor: 'red; color: red' }))
				.success
		).toBe(false);
	});
});
