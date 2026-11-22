import { fireEvent, render, screen } from '@testing-library/react';
import { Editor, type JSONContent } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';
import { defaultLabels, resolveLabels } from '../src/core/labels.js';
import { SCHEMA_VERSION } from '../src/core/schema.js';
import { TEXT_COLORS, withTextStyle } from '../src/text-style.js';
import { BubbleMenu } from '../src/ui/bubble-menu/bubble-menu.js';
import { ColorPanel } from '../src/ui/bubble-menu/color-panel.js';
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

describe('text color (PA-05)', () => {
	describe('stored shape (F18, F26)', () => {
		it('stores a token, on a mark of its own', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			instance.commands.setTextColor('red');

			expect(runs(instance)[1]).toEqual({
				type: 'text',
				text: 'two',
				marks: [{ type: 'textColor', attrs: { color: 'red' } }]
			});
		});

		it('writes the token and the custom property it resolves through', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			instance.commands.setTextColor('blue');

			expect(instance.getHTML()).toContain(
				'<span data-color="blue" style="color: var(--bl-text-blue, currentColor);">two</span>'
			);
		});

		it('reads its own HTML back as the same mark', () => {
			const first = open('<p>one two three</p>');
			selectTwo(first);
			first.commands.setTextColor('green');
			const html = first.getHTML();
			first.destroy();
			const instance = open(html);

			expect(runs(instance)[1]?.marks).toEqual([
				{ type: 'textColor', attrs: { color: 'green' } }
			]);
		});

		it('takes a token a host defines, and refuses anything that is not one', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);

			expect(instance.commands.setTextColor('brand')).toBe(true);
			expect(instance.commands.setTextColor('#ff0000')).toBe(false);
			expect(
				instance.commands.setTextColor('red); background: url(x')
			).toBe(false);
			expect(runs(instance)[1]?.marks).toEqual([
				{ type: 'textColor', attrs: { color: 'brand' } }
			]);
		});

		it('leaves pasted colour that is not a token as plain text', () => {
			const instance = open(
				'<p><span data-color="red;x">bad</span> <span style="color: #f00">hex</span></p>'
			);

			expect(runs(instance)).toEqual([{ type: 'text', text: 'bad hex' }]);
		});

		it('holds one colour at a time, and comes off with unsetTextColor', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			instance.commands.setTextColor('red');
			instance.commands.setTextColor('purple');

			expect(runs(instance)[1]?.marks).toEqual([
				{ type: 'textColor', attrs: { color: 'purple' } }
			]);

			instance.commands.unsetTextColor();
			expect(runs(instance)).toEqual([
				{ type: 'text', text: 'one two three' }
			]);
		});

		it('validates a token, and refuses a CSS value', () => {
			const doc = (color: string) => ({
				type: 'doc',
				attrs: { schemaVersion: SCHEMA_VERSION },
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'x',
								marks: [{ type: 'textColor', attrs: { color } }]
							}
						]
					}
				]
			});

			for (const color of [...TEXT_COLORS, 'brand-2']) {
				expect(() => validateDocument(doc(color))).not.toThrow();
			}
			expect(() => validateDocument(doc('#ff0000'))).toThrow();
			expect(() => validateDocument(doc('Red'))).toThrow();
			expect(() => validateDocument(doc('red; color: blue'))).toThrow();
		});
	});

	describe('bubble menu', () => {
		it('offers the palette where the subpath is loaded', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			render(
				<BubbleMenu
					editor={instance}
					actions={[]}
					link={false}
				/>
			);

			expect(
				screen.getByRole('button', { name: 'Text color' })
			).toBeTruthy();
		});

		it('does not offer it where it is not', () => {
			const instance = open(
				'<p>one two three</p>',
				createExtensions('standard')
			);
			selectTwo(instance);
			render(
				<BubbleMenu
					editor={instance}
					actions={[]}
					link={false}
				/>
			);

			expect(
				screen.queryByRole('button', { name: 'Text color' })
			).toBeNull();
		});
	});

	describe('palette', () => {
		const renderPanel = (instance: Editor, labels = defaultLabels) => {
			const onClose = vi.fn();
			render(
				<ColorPanel
					editor={instance}
					labels={labels}
					onClose={onClose}
				/>
			);
			return onClose;
		};

		it('is a radio group of "Default" and the nine colours, the current one checked', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			instance.commands.setTextColor('orange');
			renderPanel(instance);

			const radios = screen.getAllByRole('radio');
			expect(
				radios.map((radio) => radio.getAttribute('aria-label'))
			).toEqual([
				'Default',
				...Object.values(defaultLabels.textColor.colors)
			]);
			expect(
				screen
					.getByRole('radio', { name: 'Orange' })
					.getAttribute('aria-checked')
			).toBe('true');
			expect(document.activeElement).toBe(
				screen.getByRole('radio', { name: 'Orange' })
			);
		});

		it('applies a colour and closes', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			const onClose = renderPanel(instance);

			fireEvent.click(screen.getByRole('radio', { name: 'Pink' }));

			expect(runs(instance)[1]?.marks).toEqual([
				{ type: 'textColor', attrs: { color: 'pink' } }
			]);
			expect(onClose).toHaveBeenCalled();
		});

		it('takes the colour off with "Default"', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			instance.commands.setTextColor('red');
			renderPanel(instance);

			fireEvent.click(screen.getByRole('radio', { name: 'Default' }));

			expect(runs(instance)).toEqual([
				{ type: 'text', text: 'one two three' }
			]);
		});

		it('moves with the arrow keys and closes on Escape', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			const onClose = renderPanel(instance);
			const group = screen.getByRole('radiogroup');

			fireEvent.keyDown(group, { key: 'ArrowRight' });
			expect(document.activeElement).toBe(
				screen.getByRole('radio', { name: 'Gray' })
			);
			fireEvent.keyDown(group, { key: 'ArrowLeft' });
			fireEvent.keyDown(group, { key: 'ArrowLeft' });
			expect(document.activeElement).toBe(
				screen.getByRole('radio', { name: 'Red' })
			);

			fireEvent.keyDown(group, { key: 'Escape' });
			expect(onClose).toHaveBeenCalled();
		});

		it('takes its names from the label set', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			renderPanel(
				instance,
				resolveLabels({
					textColor: { button: 'Couleur', colors: { red: 'Rouge' } }
				})
			);

			expect(
				screen.getByRole('radiogroup').getAttribute('aria-label')
			).toBe('Couleur');
			expect(screen.getByRole('radio', { name: 'Rouge' })).toBeTruthy();
			expect(screen.getByRole('radio', { name: 'Blue' })).toBeTruthy();
		});
	});
});
