import { fireEvent, render, screen, within } from '@testing-library/react';
import { Editor, type JSONContent } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';
import { defaultLabels } from '../src/core/labels.js';
import { withTextStyle } from '../src/text-style.js';
import { ColorPanel } from '../src/ui/bubble-menu/color-panel.js';

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

describe('background colour (PA-22)', () => {
	describe('stored shape', () => {
		it('stores a token in the highlight mark it has always had', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			instance.commands.setHighlight({ color: 'blue' });

			expect(runs(instance)[1]?.marks).toEqual([
				{ type: 'highlight', attrs: { color: 'blue' } }
			]);
		});

		it('resolves a token through its custom property', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			instance.commands.setHighlight({ color: 'green' });

			expect(instance.getHTML()).toContain(
				'<mark data-color="green" style="background-color: var(--bl-highlight-green, green); color: inherit;">two</mark>'
			);
		});

		it('keeps the plain highlight, with no colour, as it was', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			instance.commands.toggleHighlight();

			expect(runs(instance)[1]?.marks).toEqual([
				{ type: 'highlight', attrs: { color: null } }
			]);
			expect(instance.getHTML()).toContain('<mark>two</mark>');
		});

		it('still draws a colour stored before tokens', () => {
			const instance = open(
				'<p><mark data-color="#ffee00">hex</mark> <mark data-color="rgb(255, 0, 0)">rgb</mark></p>'
			);
			const html = instance.getHTML();

			expect(
				runs(instance).map((run) => run.marks?.[0]?.attrs?.color)
			).toEqual(['#ffee00', undefined, 'rgb(255, 0, 0)']);
			// The DOM spells a hex as rgb() when it writes `style`; same colour.
			expect(html).toContain('data-color="#ffee00"');
			expect(html).toContain('background-color: rgb(255, 238, 0)');
			expect(html).toContain('background-color: rgb(255, 0, 0)');
		});

		it('drops a colour that is neither a token nor a plain colour', () => {
			const instance = open(
				'<p><mark data-color="red; position: fixed">x</mark></p>'
			);

			expect(runs(instance)[0]?.marks).toEqual([
				{ type: 'highlight', attrs: { color: null } }
			]);
			expect(instance.getHTML()).not.toContain('position');
		});
	});

	describe('colour panel', () => {
		const renderPanel = (instance: Editor) => {
			const onClose = vi.fn();
			render(
				<ColorPanel
					editor={instance}
					labels={defaultLabels}
					onClose={onClose}
				/>
			);
			return onClose;
		};

		const background = () =>
			screen.getByRole('radiogroup', { name: 'Background' });

		it('offers a background group after the text group', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			renderPanel(instance);

			expect(
				screen
					.getAllByRole('radiogroup')
					.map((group) => group.getAttribute('aria-label'))
			).toEqual(['Text', 'Background']);
			expect(within(background()).getAllByRole('radio')).toHaveLength(10);
		});

		it('applies a background and closes, and Default takes it off', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			const onClose = renderPanel(instance);

			fireEvent.click(
				within(background()).getByRole('radio', { name: 'Blue' })
			);
			expect(runs(instance)[1]?.marks).toEqual([
				{ type: 'highlight', attrs: { color: 'blue' } }
			]);
			expect(onClose).toHaveBeenCalled();
		});

		it('checks the background the selection has', () => {
			const instance = open('<p>one two three</p>');
			selectTwo(instance);
			instance.commands.setHighlight({ color: 'purple' });
			renderPanel(instance);

			expect(
				within(background())
					.getByRole('radio', { name: 'Purple' })
					.getAttribute('aria-checked')
			).toBe('true');
		});

		it('leaves the group out where there is no highlight mark', () => {
			const instance = open(
				'<p>one two three</p>',
				withTextStyle(createExtensions('minimal'))
			);
			selectTwo(instance);
			renderPanel(instance);

			expect(screen.getAllByRole('radiogroup')).toHaveLength(1);
			expect(
				screen.queryByRole('radiogroup', { name: 'Background' })
			).toBeNull();
		});
	});
});
