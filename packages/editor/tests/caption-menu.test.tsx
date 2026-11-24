import { render, waitFor } from '@testing-library/react';
import { Editor, type JSONContent } from '@tiptap/core';
import { useCurrentEditor } from '@tiptap/react';
import { afterEach, describe, expect, it } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';
import { BlockleafEditor } from '../src/index.js';
import {
	CAPTION_MENU_EXTENSION_NAME,
	captionAlignment,
	captionMenuShouldShow,
	createCaptionActions,
	defaultCaptionActions,
	withMedia
} from '../src/media.js';

const image = (align?: string): JSONContent => ({
	type: 'image',
	attrs: { src: 'https://cdn.test/a.png', alt: 'A cat', align }
});

const captioned = (
	block: JSONContent,
	attrs?: Record<string, unknown>
): JSONContent => ({
	type: 'figure',
	content: [
		block,
		{
			type: 'caption',
			...(attrs ? { attrs } : {}),
			content: [{ type: 'text', text: 'Credit' }]
		}
	]
});

const editors: Editor[] = [];

/**
 * The actions only call core commands, so they are exercised without the
 * toolbar itself: a bubble menu needs layout jsdom does not have.
 */
const open = (content: JSONContent[]) => {
	const editor = new Editor({
		extensions: createExtensions('standard'),
		content: { type: 'doc', content }
	});
	editors.push(editor);
	return editor;
};

afterEach(() => {
	while (editors.length) editors.pop()?.destroy();
});

/** Puts the caret inside the caption's text, `offset` characters in. */
const intoCaption = (editor: Editor, offset = 1) => {
	let target = -1;
	editor.state.doc.descendants((node, pos) => {
		if (node.type.name === 'caption') target = pos + 1 + offset;
	});
	editor.commands.setTextSelection(target);
};

const shows = (editor: Editor) =>
	captionMenuShouldShow({
		editor,
		state: editor.state,
		view: editor.view,
		element: document.createElement('div'),
		from: editor.state.selection.from,
		to: editor.state.selection.to
	});

const action = (id: string) => {
	const found = defaultCaptionActions.find((entry) => entry.id === id);
	if (!found) throw new Error(`no ${id} action`);
	return found;
};

const captionAttrs = (editor: Editor): Record<string, unknown> =>
	(editor.getJSON() as JSONContent).content?.[0]?.content?.[1]?.attrs ?? {};

describe('caption toolbar (PA-21)', () => {
	it('offers three alignments and remove', () => {
		expect(defaultCaptionActions.map((entry) => entry.id)).toEqual([
			'align-left',
			'align-center',
			'align-right',
			'remove-caption'
		]);
	});

	it('shows for a caret in a caption, and not for a selection in it', () => {
		const editor = open([captioned(image()), { type: 'paragraph' }]);
		intoCaption(editor);
		expect(shows(editor)).toBe(true);

		const { from } = editor.state.selection;
		editor.commands.setTextSelection({ from, to: from + 2 });
		expect(shows(editor)).toBe(false);
	});

	it('does not show outside a caption', () => {
		const editor = open([
			{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }
		]);
		editor.commands.setTextSelection(1);
		expect(shows(editor)).toBe(false);
	});

	it('does not show in an editor that is read-only', () => {
		const editor = open([captioned(image())]);
		intoCaption(editor);
		editor.setEditable(false);
		expect(shows(editor)).toBe(false);
	});

	it('reports the image’s alignment while the caption has none of its own', () => {
		const editor = open([captioned(image('center'))]);
		intoCaption(editor);
		expect(captionAlignment(editor)).toBe('center');
		expect(action('align-center').isActive(editor)).toBe(true);
		expect(action('align-left').isActive(editor)).toBe(false);
	});

	it('reports left for a caption under an unaligned table or image', () => {
		const editor = open([captioned(image())]);
		intoCaption(editor);
		expect(action('align-left').isActive(editor)).toBe(true);
	});

	it('sets the caption’s own alignment, and pressing it again follows the image', () => {
		const editor = open([captioned(image('center'))]);
		intoCaption(editor);

		action('align-right').run(editor);
		expect(captionAttrs(editor).textAlign).toBe('right');
		expect(action('align-right').isActive(editor)).toBe(true);

		action('align-right').run(editor);
		expect(captionAttrs(editor).textAlign).toBeUndefined();
		expect(action('align-center').isActive(editor)).toBe(true);
	});

	it('removes the caption and leaves the image', () => {
		const editor = open([captioned(image()), { type: 'paragraph' }]);
		intoCaption(editor);
		action('remove-caption').run(editor);
		expect(editor.getJSON().content?.[0]?.type).toBe('image');
	});

	it('builds its titles from a label set', () => {
		const [left] = createCaptionActions({
			toolbar: 'Légende',
			actions: {
				'align-left': 'Aligner à gauche',
				'align-center': 'Centrer',
				'align-right': 'Aligner à droite',
				'remove-caption': 'Supprimer'
			}
		});
		expect(left?.title).toBe('Aligner à gauche');
	});
});

describe('withMedia (PA-21)', () => {
	it('adds the caption toolbar once, replacing one already there', () => {
		const twice = withMedia(withMedia(createExtensions('standard')));
		expect(
			twice.filter(
				(extension) => extension.name === CAPTION_MENU_EXTENSION_NAME
			)
		).toHaveLength(1);
	});

	it('leaves it out when asked to', () => {
		const without = withMedia(createExtensions('standard'), {
			captionMenu: false
		});
		expect(
			without.some(
				(extension) => extension.name === CAPTION_MENU_EXTENSION_NAME
			)
		).toBe(false);
	});

	it('gets the editor labels from BlockleafEditor', async () => {
		let toolbar: unknown;
		const Probe = () => {
			const { editor } = useCurrentEditor();
			toolbar = (
				editor?.extensionManager.extensions.find(
					(extension) =>
						extension.name === CAPTION_MENU_EXTENSION_NAME
				)?.options as { labels?: { caption?: { toolbar?: string } } }
			)?.labels?.caption?.toolbar;
			return null;
		};
		render(
			<BlockleafEditor
				extensions={withMedia(createExtensions('standard'))}
				labels={{ caption: { toolbar: 'Légende' } }}
			>
				<Probe />
			</BlockleafEditor>
		);

		await waitFor(() => expect(toolbar).toBe('Légende'));
	});
});
