import { Editor, type JSONContent } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';
import { normalizePastedHTML } from '../src/core/paste.js';
import { SCHEMA_VERSION } from '../src/core/schema.js';
import {
	SUBSCRIPT_MARK,
	SUPERSCRIPT_MARK,
	createTextStyle,
	withTextStyle
} from '../src/text-style.js';
import { createBubbleActions } from '../src/ui/bubble-menu/actions.js';
import { validateDocument } from '../src/validate.js';

let editor: Editor | null = null;

const openEditor = (
	content: string,
	extensions = withTextStyle(createExtensions('standard'))
) => {
	editor = new Editor({ extensions, content });
	return editor;
};

afterEach(() => {
	editor?.destroy();
	editor = null;
});

const runs = (instance: Editor): JSONContent[] =>
	(instance.getJSON().content?.[0]?.content ?? []) as JSONContent[];

const press = (instance: Editor, key: string) =>
	instance.view.someProp('handleKeyDown', (handle) =>
		handle(
			instance.view,
			new KeyboardEvent('keydown', { key, ctrlKey: true })
		)
	);

describe('subscript and superscript (PA-07)', () => {
	it('stores each as a mark with no attributes', () => {
		const instance = openEditor('<p>H<sub>2</sub>O, x<sup>2</sup></p>');

		expect(runs(instance)).toEqual([
			{ type: 'text', text: 'H' },
			{ type: 'text', text: '2', marks: [{ type: 'subscript' }] },
			{ type: 'text', text: 'O, x' },
			{ type: 'text', text: '2', marks: [{ type: 'superscript' }] }
		]);
	});

	it('validates each, stripping attributes it does not define', () => {
		const doc = (mark: Record<string, unknown>) => ({
			type: 'doc',
			attrs: { schemaVersion: SCHEMA_VERSION },
			content: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: '2', marks: [mark] }]
				}
			]
		});

		expect(() =>
			validateDocument(doc({ type: 'subscript' }))
		).not.toThrow();
		expect(() =>
			validateDocument(doc({ type: 'superscript' }))
		).not.toThrow();
		expect(
			validateDocument(doc({ type: 'subscript', attrs: { level: 1 } }))
				.content?.[0]
		).toEqual({
			type: 'paragraph',
			content: [
				{ type: 'text', text: '2', marks: [{ type: 'subscript' }] }
			]
		});
	});

	it('keeps pasted <sub> and <sup> through the paste normaliser', () => {
		const instance = openEditor(
			normalizePastedHTML('<p>H<sub>2</sub>O, x<sup>2</sup></p>')
		);

		expect(instance.isActive(SUBSCRIPT_MARK)).toBe(false);
		expect(runs(instance).map((run) => run.marks?.[0]?.type)).toEqual([
			undefined,
			SUBSCRIPT_MARK,
			undefined,
			SUPERSCRIPT_MARK
		]);
	});

	it('writes <sub> and <sup>', () => {
		const instance = openEditor('<p>H<sub>2</sub>O, x<sup>2</sup></p>');

		expect(instance.getHTML()).toContain('<sub>2</sub>');
		expect(instance.getHTML()).toContain('<sup>2</sup>');
	});

	it('never stores both on one run', () => {
		const instance = openEditor('<p>x2</p>');
		instance.commands.setTextSelection({ from: 2, to: 3 });
		instance.commands.toggleSubscript();
		instance.commands.toggleSuperscript();

		expect(runs(instance)[1]).toEqual({
			type: 'text',
			text: '2',
			marks: [{ type: 'superscript' }]
		});
	});

	it('toggles with Mod-, and Mod-.', () => {
		const instance = openEditor('<p>x2</p>');
		instance.commands.setTextSelection({ from: 2, to: 3 });

		press(instance, ',');
		expect(instance.isActive(SUBSCRIPT_MARK)).toBe(true);
		press(instance, '.');
		expect(instance.isActive(SUPERSCRIPT_MARK)).toBe(true);
		expect(instance.isActive(SUBSCRIPT_MARK)).toBe(false);
	});

	it('adds each mark once, replacing any already in the list', () => {
		const twice = withTextStyle(
			withTextStyle(createExtensions('standard'))
		);
		const names = twice.map((extension) => extension.name);

		expect(names.filter((name) => name === SUBSCRIPT_MARK)).toHaveLength(1);
		expect(names.filter((name) => name === SUPERSCRIPT_MARK)).toHaveLength(
			1
		);
		expect(createTextStyle().map((extension) => extension.name)).toEqual([
			SUBSCRIPT_MARK,
			SUPERSCRIPT_MARK,
			'textAlign',
			'textColor',
			'fontFamily',
			'fontSize'
		]);
	});

	describe('bubble menu', () => {
		const action = (id: string) =>
			createBubbleActions().find((candidate) => candidate.id === id);

		it('offers both where the subpath is loaded', () => {
			const instance = openEditor('<p>x2</p>');
			instance.commands.setTextSelection({ from: 2, to: 3 });

			expect(action('subscript')?.isAvailable?.(instance)).toBe(true);
			expect(action('superscript')?.isAvailable?.(instance)).toBe(true);
		});

		it('offers neither where it is not', () => {
			const instance = openEditor(
				'<p>x2</p>',
				createExtensions('standard')
			);
			instance.commands.setTextSelection({ from: 2, to: 3 });

			expect(action('subscript')?.isAvailable?.(instance)).toBe(false);
			expect(action('superscript')?.isAvailable?.(instance)).toBe(false);
		});
	});
});
