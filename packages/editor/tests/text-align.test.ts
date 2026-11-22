import { Editor, type JSONContent } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import { createExtensions, type PresetName } from '../src/core/extensions.js';
import {
	SCHEMA_VERSION,
	withBlockIds,
	createEmptyDocument,
	type BlockNode
} from '../src/core/schema.js';
import { unwrapUnknownContent } from '../src/core/unknown-content.js';
import { withTextStyle } from '../src/text-style.js';
import { createBlockActions } from '../src/ui/drag-handle/actions.js';
import { validateDocument } from '../src/validate.js';

let editor: Editor | null = null;

const open = (
	content: JSONContent[] | string,
	extensions = withTextStyle(createExtensions('standard'))
) => {
	editor = new Editor({
		extensions,
		content:
			typeof content === 'string'
				? content
				: withBlockIds({
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

/** What `onChange` hands a host: the stored form. */
const stored = (instance: Editor): JSONContent[] =>
	(unwrapUnknownContent(instance.getJSON()).content ?? []) as JSONContent[];

const paragraph = (text: string, textAlign?: string): JSONContent => ({
	type: 'paragraph',
	...(textAlign ? { attrs: { textAlign } } : {}),
	content: [{ type: 'text', text }]
});

const press = (instance: Editor, key: string) =>
	instance.view.someProp('handleKeyDown', (handle) =>
		handle(
			instance.view,
			new KeyboardEvent('keydown', { key, ctrlKey: true, shiftKey: true })
		)
	);

const alignOf = (instance: Editor, index = 0): unknown =>
	stored(instance)[index]?.attrs?.textAlign;

describe('text alignment (PA-06)', () => {
	describe('stored shape (F25)', () => {
		it('stores nothing for a block that is not aligned', () => {
			const instance = open([paragraph('Plain')]);

			expect(stored(instance)[0]?.attrs).toEqual({
				id: expect.any(String) as string
			});
			expect(JSON.stringify(instance.getJSON())).not.toContain(
				'textAlign'
			);
		});

		it.each<PresetName>(['standard', 'minimal'])(
			'keeps a stored alignment in the %s preset, without the subpath',
			(preset) => {
				const instance = open(
					[paragraph('Centred', 'center')],
					createExtensions(preset)
				);

				expect(alignOf(instance)).toBe('center');
				expect(instance.getHTML()).toContain('text-align: center');
			}
		);

		it('keeps it on a heading', () => {
			const instance = open([
				{
					type: 'heading',
					attrs: { level: 2, textAlign: 'right' },
					content: [{ type: 'text', text: 'Title' }]
				}
			]);

			expect(alignOf(instance)).toBe('right');
		});

		it('reads pasted alignment, and only the four tokens', () => {
			const instance = open(
				'<p style="text-align: justify">a</p><p style="text-align: start">b</p><p style="text-align: center">c</p>'
			);

			expect(
				stored(instance).map((node) => node.attrs?.textAlign)
			).toEqual(['justify', undefined, 'center']);
		});

		it('validates the four tokens, and refuses anything else', () => {
			const doc = (textAlign: unknown) => ({
				type: 'doc',
				attrs: { schemaVersion: SCHEMA_VERSION },
				content: [{ type: 'paragraph', attrs: { textAlign } }]
			});

			for (const value of ['left', 'center', 'right', 'justify', null]) {
				expect(() => validateDocument(doc(value))).not.toThrow();
			}
			expect(() => validateDocument(doc('middle'))).toThrow();
			expect(() => validateDocument(doc('text-align: center'))).toThrow();
		});
	});

	describe('commands and shortcuts', () => {
		it('aligns every paragraph and heading in the selection', () => {
			const instance = open([paragraph('One'), paragraph('Two')]);
			instance.commands.selectAll();
			instance.commands.setTextAlign('center');

			expect([alignOf(instance, 0), alignOf(instance, 1)]).toEqual([
				'center',
				'center'
			]);
		});

		it('takes the alignment off when the blocks already have it', () => {
			const instance = open([paragraph('One', 'right')]);
			instance.commands.setTextSelection(2);
			instance.commands.setTextAlign('right');

			expect(alignOf(instance)).toBeUndefined();
		});

		it('leaves blocks it does not apply to alone', () => {
			const instance = open([
				{
					type: 'codeBlock',
					content: [{ type: 'text', text: 'x' }]
				}
			]);
			instance.commands.setTextSelection(2);

			expect(instance.commands.setTextAlign('center')).toBe(false);
		});

		it('maps Mod-Shift-L, E, R and J', () => {
			const instance = open([paragraph('One')]);
			instance.commands.setTextSelection(2);

			for (const [key, value] of [
				['e', 'center'],
				['r', 'right'],
				['j', 'justify'],
				['l', 'left']
			] as const) {
				press(instance, key);
				expect(alignOf(instance)).toBe(value);
			}
		});

		it('unsets with unsetTextAlign', () => {
			const instance = open([paragraph('One', 'justify')]);
			instance.commands.setTextSelection(2);
			instance.commands.unsetTextAlign();

			expect(alignOf(instance)).toBeUndefined();
		});
	});

	describe('block menu', () => {
		const action = (id: string) =>
			createBlockActions().find((candidate) => candidate.id === id);

		it('offers alignment on a paragraph where the subpath is loaded', () => {
			const instance = open([paragraph('One')]);

			expect(action('align-center')?.isAvailable?.(instance, 0)).toBe(
				true
			);
			action('align-center')?.run(instance, 0);
			expect(alignOf(instance)).toBe('center');
			expect(action('align-center')?.isActive?.(instance, 0)).toBe(true);
		});

		it('does not offer it without the subpath, or on other blocks', () => {
			const plain = open(
				[paragraph('One')],
				createExtensions('standard')
			);
			expect(action('align-center')?.isAvailable?.(plain, 0)).toBe(false);
			plain.destroy();
			editor = null;

			const code = open([
				{ type: 'codeBlock', content: [{ type: 'text', text: 'x' }] }
			]);
			expect(action('align-center')?.isAvailable?.(code, 0)).toBe(false);
		});
	});
});
