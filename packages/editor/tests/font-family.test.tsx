import { fireEvent, render, screen, within } from '@testing-library/react';
import { Editor, type JSONContent } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';
import { defaultLabels, resolveLabels } from '../src/core/labels.js';
import { SCHEMA_VERSION } from '../src/core/schema.js';
import { FONT_FAMILIES, withTextStyle } from '../src/text-style.js';
import { BubbleMenu } from '../src/ui/bubble-menu/bubble-menu.js';
import { FontPanel } from '../src/ui/bubble-menu/font-panel.js';
import { validateDocument } from '../src/validate.js';

let editor: Editor | null = null;

const open = (
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

/** Selects the word "two" in "one two three". */
const selectTwo = (instance: Editor) =>
	instance.commands.setTextSelection({ from: 5, to: 8 });

describe('font family (PA-10)', () => {
	describe('stored shape (F18, F26)', () => {
		it('stores a token, on a mark of its own', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			instance.commands.setFontFamily('serif');

			expect(runs(instance)[1]).toEqual({
				type: 'text',
				text: 'two',
				marks: [{ type: 'fontFamily', attrs: { family: 'serif' } }]
			});
		});

		it('writes the token and the custom property it resolves through, and reads it back', () => {
			const first = open('<p>one two three</p>');
			selectTwo(first);
			first.commands.setFontFamily('mono');
			const html = first.getHTML();
			first.destroy();

			expect(html).toContain(
				'<span data-font-family="mono" style="font-family: var(--bl-font-mono, inherit);">two</span>'
			);
			const instance = open(html);
			expect(runs(instance)[1]?.marks).toEqual([
				{ type: 'fontFamily', attrs: { family: 'mono' } }
			]);
		});

		it('takes a token a host defines, and refuses a font name', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);

			expect(instance.commands.setFontFamily('brand')).toBe(true);
			expect(instance.commands.setFontFamily('Comic Sans MS')).toBe(
				false
			);
			expect(instance.commands.setFontFamily('serif); x: y')).toBe(false);
		});

		it('leaves a pasted font name as plain text', () => {
			const instance = open(
				'<p><span style="font-family: Arial">a</span> <span data-font-family="Times New Roman">b</span></p>'
			);

			expect(runs(instance)).toEqual([{ type: 'text', text: 'a b' }]);
		});

		it('sits beside a colour on the same text', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			instance.commands.setFontFamily('serif');
			instance.commands.setTextColor('blue');

			expect(runs(instance)[1]?.marks).toEqual([
				{ type: 'textColor', attrs: { color: 'blue' } },
				{ type: 'fontFamily', attrs: { family: 'serif' } }
			]);
		});

		it('validates a token, and refuses a font name', () => {
			const doc = (family: string) => ({
				type: 'doc',
				attrs: { schemaVersion: SCHEMA_VERSION },
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'x',
								marks: [
									{ type: 'fontFamily', attrs: { family } }
								]
							}
						]
					}
				]
			});

			for (const family of FONT_FAMILIES) {
				expect(() => validateDocument(doc(family))).not.toThrow();
			}
			expect(() => validateDocument(doc('Georgia'))).toThrow();
			expect(() => validateDocument(doc('serif, sans'))).toThrow();
		});
	});

	describe('bubble menu', () => {
		it('offers the font panel only where the subpath is loaded', () => {
			const loaded = open('<p>one two three</p>');
			selectTwo(loaded);
			const view = render(
				<BubbleMenu
					editor={loaded}
					actions={[]}
					link={false}
				/>
			);
			expect(screen.getByRole('button', { name: 'Font' })).toBeTruthy();
			view.unmount();
			loaded.destroy();

			const plain = open(
				'<p>one two three</p>',
				createExtensions('standard')
			);
			selectTwo(plain);
			render(
				<BubbleMenu
					editor={plain}
					actions={[]}
					link={false}
				/>
			);
			expect(screen.queryByRole('button', { name: 'Font' })).toBeNull();
		});
	});

	describe('font panel', () => {
		it('lists Default and the three families, the current one checked and focused', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			instance.commands.setFontFamily('serif');
			render(
				<FontPanel
					editor={instance}
					labels={defaultLabels}
					onClose={vi.fn()}
				/>
			);

			const group = screen.getByRole('radiogroup', { name: 'Typeface' });
			// The size group (PA-11) follows; only the family takes focus.
			expect(
				[...group.querySelectorAll('[role="radio"]')].map((radio) =>
					radio.getAttribute('aria-label')
				)
			).toEqual(['Default', 'Sans serif', 'Serif', 'Monospace']);
			const serif = screen.getByRole('radio', { name: 'Serif' });
			expect(serif.getAttribute('aria-checked')).toBe('true');
			expect(document.activeElement).toBe(serif);
		});

		it('applies a family and closes, and Default takes it off', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			const onClose = vi.fn();
			const view = render(
				<FontPanel
					editor={instance}
					labels={defaultLabels}
					onClose={onClose}
				/>
			);

			fireEvent.click(screen.getByRole('radio', { name: 'Monospace' }));
			expect(runs(instance)[1]?.marks).toEqual([
				{ type: 'fontFamily', attrs: { family: 'mono' } }
			]);
			expect(onClose).toHaveBeenCalled();
			view.unmount();

			render(
				<FontPanel
					editor={instance}
					labels={defaultLabels}
					onClose={vi.fn()}
				/>
			);
			fireEvent.click(
				within(
					screen.getByRole('radiogroup', { name: 'Typeface' })
				).getByRole('radio', { name: 'Default' })
			);
			expect(runs(instance)).toEqual([
				{ type: 'text', text: 'one two three' }
			]);
		});

		it('takes its names from the label set', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			render(
				<FontPanel
					editor={instance}
					labels={resolveLabels({
						font: {
							family: 'Police',
							families: { serif: 'Avec empattements' }
						}
					})}
					onClose={vi.fn()}
				/>
			);

			expect(
				screen.getByRole('radiogroup', { name: 'Police' })
			).toBeTruthy();
			expect(
				screen.getByRole('radio', { name: 'Avec empattements' })
			).toBeTruthy();
		});
	});
});
