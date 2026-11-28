import { Editor, getSchema, type JSONContent } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { afterEach, describe, expect, it } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';
import {
	createEmptyDocument,
	withBlockIds,
	type BlockNode
} from '../src/core/schema.js';
import {
	unwrapUnknownContent,
	wrapUnknownContent
} from '../src/core/unknown-content.js';
import { withLayout } from '../src/layout.js';
import { defaultSlashCommands } from '../src/ui/slash-menu/registry.js';
import { safeValidateDocument, validateDocument } from '../src/validate.js';

/**
 * Columns from `@blockleaf/editor/layout`: what a row stores, the commands,
 * and how a row that stopped making sense is put right. Dragging and the
 * divider are pointer behaviour, tested in the browser.
 */

const paragraph = (text?: string): JSONContent => ({
	type: 'paragraph',
	...(text ? { content: [{ type: 'text', text }] } : {})
});

const column = (
	blocks: JSONContent[],
	width: number | null = null
): JSONContent => ({ type: 'column', attrs: { width }, content: blocks });

const row = (...columns: JSONContent[]): JSONContent => ({
	type: 'columns',
	content: columns
});

let editor: Editor | null = null;

const openEditor = (content: JSONContent[], layout = true) => {
	const base = createExtensions('standard');
	editor = new Editor({
		extensions: layout ? withLayout(base) : base,
		content: withBlockIds({
			...createEmptyDocument(),
			content: content as BlockNode[]
		})
	});
	return editor;
};

afterEach(() => {
	editor?.destroy();
	editor = null;
});

const press = (instance: Editor, key: string) =>
	instance.view.someProp('handleKeyDown', (handle) =>
		handle(instance.view, new KeyboardEvent('keydown', { key }))
	);

/** Puts the caret at the start of the textblock whose text is `text`. */
const caretIn = (instance: Editor, text: string) => {
	let target = -1;
	instance.state.doc.descendants((node, pos) => {
		if (target === -1 && node.isTextblock && node.textContent === text) {
			target = pos + 1;
		}
		return target === -1;
	});
	instance.view.dispatch(
		instance.state.tr.setSelection(
			TextSelection.create(instance.state.doc, target)
		)
	);
};

/** The top-level block types, without the empty paragraph the editor keeps last. */
const top = (instance: Editor) => {
	const blocks = instance.getJSON().content ?? [];
	const last = blocks.at(-1);
	const trailing = last?.type === 'paragraph' && !last.content;
	return (trailing ? blocks.slice(0, -1) : blocks).map((node) => node.type);
};

describe('what a row stores', () => {
	it('keeps its columns, their widths and ids, and validates', () => {
		const instance = openEditor([
			row(column([paragraph('a')], 30), column([paragraph('b')], 70))
		]);
		const doc = { ...instance.getJSON(), attrs: { schemaVersion: 2 } };
		const stored = doc.content?.[0];
		expect(stored?.type).toBe('columns');
		expect(typeof stored?.attrs?.id).toBe('string');
		expect(
			stored?.content?.map((each: JSONContent) => each.attrs?.width)
		).toEqual([30, 70]);
		const first: JSONContent | undefined = stored?.content?.[0];
		expect(typeof first?.attrs?.id).toBe('string');
		expect(() => validateDocument(doc)).not.toThrow();
	});

	it('writes a width as the column’s flex-grow in its HTML', () => {
		const instance = openEditor([
			row(column([paragraph('a')], 25), column([paragraph('b')]))
		]);
		const html = instance.getHTML();
		expect(html).toContain('data-type="columns" class="blockleaf-columns"');
		expect(html).toMatch(/data-width="25" style="flex-grow: 25;?"/);
	});

	it('reads its own HTML back', () => {
		const instance = openEditor([
			row(column([paragraph('a')], 40), column([paragraph('b')], 60))
		]);
		const html = instance.getHTML();
		instance.commands.setContent(html);
		const stored = instance.getJSON().content?.[0];
		expect(stored?.type).toBe('columns');
		expect(
			stored?.content?.map((each: JSONContent) => each.attrs?.width)
		).toEqual([40, 60]);
	});

	it('is kept unchanged by an editor without the layout subpath', () => {
		const base = createExtensions('standard');
		const doc = withBlockIds({
			...createEmptyDocument(),
			content: [
				row(column([paragraph('a')]), column([paragraph('b')]))
			] as BlockNode[]
		});
		editor = new Editor({
			extensions: base,
			content: wrapUnknownContent(doc, getSchema(base))
		});
		const saved = unwrapUnknownContent(editor.getJSON()).content?.[0];
		expect(saved?.type).toBe('columns');
		expect(saved?.content?.length).toBe(2);
	});
});

describe('the validator', () => {
	const doc = (content: JSONContent[]) =>
		withBlockIds({
			...createEmptyDocument(),
			content: content as BlockNode[]
		});

	it('holds a row to two to four columns', () => {
		const one = row(column([paragraph('a')]));
		const five = row(
			...Array.from({ length: 5 }, () => column([paragraph('a')]))
		);
		expect(safeValidateDocument(doc([one])).success).toBe(false);
		expect(safeValidateDocument(doc([five])).success).toBe(false);
	});

	it('refuses a row inside a column, and a width over 100', () => {
		const nested = row(
			column([row(column([paragraph('a')]), column([paragraph('b')]))]),
			column([paragraph('c')])
		);
		expect(safeValidateDocument(doc([nested])).success).toBe(false);
		const wide = row(
			column([paragraph('a')], 120),
			column([paragraph('b')])
		);
		expect(safeValidateDocument(doc([wide])).success).toBe(false);
	});
});

describe('insertColumns', () => {
	it('replaces an empty paragraph with a row, caret in the first column', () => {
		const instance = openEditor([paragraph('above'), paragraph()]);
		caretIn(instance, '');
		expect(instance.commands.insertColumns(3)).toBe(true);
		expect(top(instance)).toEqual(['paragraph', 'columns']);
		const stored = instance.getJSON().content?.[1];
		expect(stored?.content).toHaveLength(3);
		const { $from } = instance.state.selection;
		expect($from.node(-1).type.name).toBe('column');
		expect($from.index(-2)).toBe(0);
	});

	it('goes after a paragraph with text, and keeps between two and four', () => {
		const instance = openEditor([paragraph('text')]);
		caretIn(instance, 'text');
		instance.commands.insertColumns(9);
		expect(top(instance)).toEqual(['paragraph', 'columns']);
		expect(instance.getJSON().content?.[1]?.content).toHaveLength(4);
	});

	it('does nothing inside a column', () => {
		const instance = openEditor([
			row(column([paragraph('a')]), column([paragraph('b')]))
		]);
		caretIn(instance, 'a');
		expect(instance.commands.insertColumns()).toBe(false);
	});
});

describe('keeping a row valid', () => {
	it('turns a row left with one column back into its blocks', () => {
		const instance = openEditor([
			row(
				column([paragraph('a'), paragraph('a2')]),
				column([paragraph('b')])
			)
		]);
		caretIn(instance, 'b');
		instance.commands.removeColumn();
		expect(top(instance)).toEqual(['paragraph', 'paragraph']);
		expect(instance.getText()).toContain('a2');
	});

	it('lifts a row pasted inside a column out into its blocks', () => {
		const instance = openEditor([
			row(column([paragraph('a')]), column([paragraph('b')]))
		]);
		caretIn(instance, 'a');
		const { $from } = instance.state.selection;
		instance.commands.insertContentAt($from.after(), {
			type: 'columns',
			content: [column([paragraph('x')]), column([paragraph('y')])]
		});
		const json = JSON.stringify(instance.getJSON());
		expect(json.match(/"type":"columns"/g)).toHaveLength(1);
		expect(json).toContain('"x"');
		expect(json).toContain('"y"');
	});

	it('sets a row back to equal widths when only some columns have one', () => {
		const instance = openEditor([
			row(column([paragraph('a')], 30), column([paragraph('b')], 70))
		]);
		caretIn(instance, 'b');
		const { $from } = instance.state.selection;
		instance.commands.insertContentAt(
			$from.after(-1),
			column([paragraph('c')])
		);
		const widths = instance
			.getJSON()
			.content?.[0]?.content?.map(
				(each: JSONContent) => each.attrs?.width
			);
		expect(widths).toEqual([null, null, null]);
	});
});

describe('removing a column', () => {
	it('Backspace at the start of an empty column removes it', () => {
		const instance = openEditor([
			row(
				column([paragraph('a')]),
				column([paragraph()]),
				column([paragraph('c')])
			)
		]);
		caretIn(instance, '');
		expect(press(instance, 'Backspace')).toBe(true);
		const stored = instance.getJSON().content?.[0];
		expect(stored?.content).toHaveLength(2);
		expect(instance.state.selection.$from.parent.textContent).toBe('a');
	});

	it('Backspace at the start of a column with text does not join columns', () => {
		const instance = openEditor([
			row(column([paragraph('a')]), column([paragraph('b')]))
		]);
		caretIn(instance, 'b');
		press(instance, 'Backspace');
		expect(instance.getJSON().content?.[0]?.content).toHaveLength(2);
		expect(instance.getText()).toContain('a');
		expect(instance.getText()).toContain('b');
	});
});

describe('resetColumnWidths', () => {
	it('sets every column back to null', () => {
		const instance = openEditor([
			row(column([paragraph('a')], 30), column([paragraph('b')], 70))
		]);
		caretIn(instance, 'a');
		instance.commands.resetColumnWidths();
		expect(
			instance
				.getJSON()
				.content?.[0]?.content?.map(
					(each: JSONContent) => each.attrs?.width
				)
		).toEqual([null, null]);
	});
});

describe('the slash menu items', () => {
	const item = (id: string) => {
		const found = defaultSlashCommands.find((command) => command.id === id);
		if (!found) throw new Error(`no ${id} item`);
		return found;
	};

	it('are hidden in an editor without the layout subpath', () => {
		const instance = openEditor([paragraph()], false);
		expect(item('columns-2').isAvailable?.(instance)).toBe(false);
	});

	it('insert two and three columns', () => {
		const instance = openEditor([paragraph()]);
		caretIn(instance, '');
		expect(item('columns-3').isAvailable?.(instance)).toBe(true);
		item('columns-3').run(instance);
		expect(instance.getJSON().content?.[0]?.content).toHaveLength(3);
	});
});
