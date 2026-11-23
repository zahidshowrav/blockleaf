import { fireEvent, render, screen } from '@testing-library/react';
import { Editor, type JSONContent } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';
import { defaultLabels } from '../src/core/labels.js';
import { SCHEMA_VERSION } from '../src/core/schema.js';
import { FONT_SIZES, FontSize, withTextStyle } from '../src/text-style.js';
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

const selectTwo = (instance: Editor) =>
	instance.commands.setTextSelection({ from: 5, to: 8 });

describe('font size (PA-11)', () => {
	describe('stored shape (F18, F26)', () => {
		it('stores a token, on a mark of its own', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			instance.commands.setFontSize('lg');

			expect(runs(instance)[1]).toEqual({
				type: 'text',
				text: 'two',
				marks: [{ type: 'fontSize', attrs: { size: 'lg' } }]
			});
		});

		it('writes the token and an em-based custom property, and reads it back', () => {
			const first = open('<p>one two three</p>');
			selectTwo(first);
			first.commands.setFontSize('xl');
			const html = first.getHTML();
			first.destroy();

			expect(html).toContain(
				'<span data-font-size="xl" style="font-size: var(--bl-font-size-xl, 1em);">two</span>'
			);
			expect(runs(open(html))[1]?.marks).toEqual([
				{ type: 'fontSize', attrs: { size: 'xl' } }
			]);
		});

		it('refuses a length, and leaves a pasted one as plain text', () => {
			const instance = open(
				'<p><span style="font-size: 18px">a</span> <span data-font-size="18px">b</span></p>'
			);

			expect(runs(instance)).toEqual([{ type: 'text', text: 'a b' }]);
			instance.commands.selectAll();
			expect(instance.commands.setFontSize('18px')).toBe(false);
			expect(instance.commands.setFontSize('2rem')).toBe(false);
		});

		it('validates the three tokens, and refuses a length', () => {
			const doc = (size: string) => ({
				type: 'doc',
				attrs: { schemaVersion: SCHEMA_VERSION },
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'x',
								marks: [{ type: 'fontSize', attrs: { size } }]
							}
						]
					}
				]
			});

			for (const size of FONT_SIZES) {
				expect(() => validateDocument(doc(size))).not.toThrow();
			}
			expect(() => validateDocument(doc('14px'))).toThrow();
			expect(() => validateDocument(doc('1.5em'))).toThrow();
		});
	});

	describe('font panel', () => {
		it('adds a size group after the family, each a tab stop of its own', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			instance.commands.setFontSize('sm');
			render(
				<FontPanel
					editor={instance}
					labels={defaultLabels}
					onClose={vi.fn()}
				/>
			);

			const groups = screen.getAllByRole('radiogroup');
			expect(
				groups.map((group) => group.getAttribute('aria-label'))
			).toEqual(['Typeface', 'Size']);
			const size = screen.getByRole('radiogroup', { name: 'Size' });
			expect(
				[...size.querySelectorAll('[role="radio"]')].map((radio) =>
					radio.getAttribute('aria-label')
				)
			).toEqual(['Default', 'Small', 'Large', 'Extra large']);
			expect(
				screen
					.getByRole('radio', { name: 'Small' })
					.getAttribute('tabindex')
			).toBe('0');
			// Focus starts in the family group, not here.
			expect(
				screen.getByRole('radio', { name: 'Default', checked: true })
			).toBe(document.activeElement);
		});

		it('applies a size and closes', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			const onClose = vi.fn();
			render(
				<FontPanel
					editor={instance}
					labels={defaultLabels}
					onClose={onClose}
				/>
			);

			fireEvent.click(screen.getByRole('radio', { name: 'Large' }));
			expect(runs(instance)[1]?.marks).toEqual([
				{ type: 'fontSize', attrs: { size: 'lg' } }
			]);
			expect(onClose).toHaveBeenCalled();
		});

		it('shows only the size group, focused, when only the size mark is loaded', () => {
			const instance = open('<p>one two three</p>', [
				...createExtensions('standard'),
				FontSize
			]);
			selectTwo(instance);
			render(
				<FontPanel
					editor={instance}
					labels={defaultLabels}
					onClose={vi.fn()}
				/>
			);

			expect(screen.getAllByRole('radiogroup')).toHaveLength(1);
			expect(document.activeElement).toBe(
				screen.getByRole('radio', { name: 'Default' })
			);
		});
	});
});
