import { Editor, type JSONContent } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';
import {
	MEDIA_RESIZE_EXTENSION_NAME,
	MIN_MEDIA_WIDTH,
	MediaResize,
	VIDEO_NODE,
	Video,
	defaultMediaActions,
	withMedia
} from '../src/media.js';
import { defaultImageActions } from '../src/ui/image/actions.js';
import { safeValidateDocument } from '../src/validate.js';

const editors: Editor[] = [];
const containers: HTMLElement[] = [];

afterEach(() => {
	while (editors.length) editors.pop()?.destroy();
	while (containers.length) containers.pop()?.remove();
});

const image = (width?: number | 'full'): JSONContent => ({
	type: 'image',
	attrs: { src: 'https://cdn.test/a.png', alt: 'A cat', width }
});

const video: JSONContent = {
	type: VIDEO_NODE,
	attrs: { src: 'https://cdn.test/a.mp4' }
};

/**
 * The resize extension and the video block, without the toolbars, which
 * need layout jsdom does not have. Mounted, so the handles have a page.
 */
const open = (content: JSONContent[], extra = [Video, MediaResize]) => {
	const element = document.createElement('div');
	element.className = 'blockleaf-editor';
	document.body.append(element);
	containers.push(element);
	const editor = new Editor({
		element,
		extensions: [...createExtensions('standard'), ...extra],
		content: { type: 'doc', content }
	});
	editors.push(editor);
	return editor;
};

const select = (editor: Editor, type: string) => {
	let target = -1;
	editor.state.doc.descendants((node, pos) => {
		if (target === -1 && node.type.name === type) target = pos;
	});
	editor.commands.setNodeSelection(target);
};

const width = (editor: Editor) =>
	(editor.getJSON() as JSONContent).content?.[0]?.attrs?.width as unknown;

const press = (editor: Editor, key: string) =>
	editor.view.someProp('handleKeyDown', (handle) =>
		handle(
			editor.view,
			new KeyboardEvent('keydown', { key, altKey: true, shiftKey: true })
		)
	);

describe('full width is stored as a name (PA-24, F21)', () => {
	it('writes data-width="full", and no pixel width', () => {
		const editor = open([image('full')]);
		const html = editor.getHTML();
		expect(html).toContain('data-width="full"');
		expect(html).not.toMatch(/ width="/);
	});

	it('reads it back from its own HTML', () => {
		const first = open([image('full'), video]);
		const again = open([]);
		again.commands.setContent(first.getHTML());
		const [img, vid] = (again.getJSON() as JSONContent).content ?? [];
		expect(img?.attrs?.width).toBe('full');
		expect(vid?.attrs?.width).toBeNull();
	});

	it('keeps a pixel width as a number', () => {
		const editor = open([image(320)]);
		expect(editor.getHTML()).toContain('width="320"');
		expect(width(editor)).toBe(320);
	});

	it('is a valid stored width; any other word is not', () => {
		const doc = (value: unknown) => ({
			type: 'doc',
			attrs: { schemaVersion: 2 },
			content: [
				{
					type: 'image',
					attrs: { id: 'i', src: '/a.png', width: value }
				}
			]
		});
		expect(safeValidateDocument(doc('full')).success).toBe(true);
		expect(safeValidateDocument(doc(480)).success).toBe(true);
		expect(safeValidateDocument(doc('wide')).success).toBe(false);
	});
});

describe('the resize commands', () => {
	it('sets a width on the selected image, and keeps it selected', () => {
		const editor = open([image(), { type: 'paragraph' }]);
		select(editor, 'image');
		expect(editor.commands.setMediaWidth(300)).toBe(true);
		expect(width(editor)).toBe(300);
		expect(editor.state.selection.from).toBe(0);
	});

	it(`never goes below ${MIN_MEDIA_WIDTH} pixels`, () => {
		const editor = open([image()]);
		select(editor, 'image');
		editor.commands.setMediaWidth(10);
		expect(width(editor)).toBe(MIN_MEDIA_WIDTH);
	});

	it('toggles full width on and off', () => {
		const editor = open([image(480)]);
		select(editor, 'image');
		editor.commands.toggleMediaFullWidth();
		expect(width(editor)).toBe('full');
		editor.commands.toggleMediaFullWidth();
		expect(width(editor)).toBeNull();
	});

	it('resizes a video the same way', () => {
		const editor = open([video]);
		select(editor, VIDEO_NODE);
		expect(editor.commands.setMediaWidth('full')).toBe(true);
		expect(width(editor)).toBe('full');
	});

	it('does nothing without a selected image or video', () => {
		const editor = open([{ type: 'paragraph' }, image()]);
		editor.commands.setTextSelection(1);
		expect(editor.can().setMediaWidth(300)).toBe(false);
		expect(editor.can().toggleMediaFullWidth()).toBe(false);
	});

	it('widens and narrows from the keyboard, never past the limits', () => {
		const editor = open([image(200)]);
		select(editor, 'image');
		expect(press(editor, 'ArrowRight')).toBe(true);
		const after = width(editor);
		expect(typeof after).toBe('number');
		expect(after as number).toBeGreaterThanOrEqual(MIN_MEDIA_WIDTH);
		press(editor, 'ArrowLeft');
		expect(width(editor) as number).toBeGreaterThanOrEqual(MIN_MEDIA_WIDTH);
	});

	it('leaves the keys alone when no image is selected', () => {
		const editor = open([{ type: 'paragraph' }]);
		editor.commands.setTextSelection(1);
		expect(press(editor, 'ArrowRight')).toBeFalsy();
	});
});

describe('the handles', () => {
	const handles = (editor: Editor) =>
		editor.view.dom
			.closest('.blockleaf-editor')
			?.querySelector<HTMLElement>('.blockleaf-resize');

	it('show for a selected image or video, and only then', () => {
		// A paragraph first: ProseMirror starts with a leading image selected.
		const editor = open([{ type: 'paragraph' }, image(), video]);
		editor.commands.setTextSelection(1);
		expect(handles(editor)?.hidden).toBe(true);

		select(editor, 'image');
		expect(handles(editor)?.hidden).toBe(false);
		expect(
			handles(editor)?.querySelectorAll('.blockleaf-resize__handle')
		).toHaveLength(2);

		select(editor, VIDEO_NODE);
		expect(handles(editor)?.hidden).toBe(false);

		editor.commands.setTextSelection(1);
		expect(handles(editor)?.hidden).toBe(true);
	});

	it('are hidden from assistive technology: the keyboard has its own way', () => {
		const editor = open([image()]);
		expect(handles(editor)?.getAttribute('aria-hidden')).toBe('true');
	});

	it('do not show in a read-only editor', () => {
		const editor = open([image()]);
		select(editor, 'image');
		editor.setEditable(false);
		expect(handles(editor)?.hidden).toBe(true);
	});

	it('go away with the editor', () => {
		const editor = open([image()]);
		const container = editor.view.dom.closest('.blockleaf-editor');
		editors.pop();
		editor.destroy();
		expect(container?.querySelector('.blockleaf-resize')).toBeNull();
	});
});

describe('the full width buttons', () => {
	const full = (actions: typeof defaultImageActions) => {
		const found = actions.find((entry) => entry.id === 'full-width');
		if (!found) throw new Error('no full-width action');
		return found;
	};

	it('are offered only with the resize commands', () => {
		const without = open([image()], []);
		select(without, 'image');
		expect(full(defaultImageActions).isAvailable?.(without)).toBe(false);

		const editor = open([image()]);
		select(editor, 'image');
		expect(full(defaultImageActions).isAvailable?.(editor)).toBe(true);
	});

	it('toggle an image, pressed while it is full width', () => {
		const editor = open([image()]);
		select(editor, 'image');
		const action = full(defaultImageActions);
		expect(action.isActive(editor)).toBe(false);
		action.run(editor);
		expect(width(editor)).toBe('full');
		expect(action.isActive(editor)).toBe(true);
	});

	it('show in the media toolbar for a video', () => {
		const editor = open([video]);
		select(editor, VIDEO_NODE);
		expect(full(defaultMediaActions).isAvailable?.(editor)).toBe(true);
	});
});

describe('withMedia', () => {
	it('adds the resize once, and leaves it out when asked', () => {
		const names = (extensions: ReturnType<typeof withMedia>) =>
			extensions.filter(
				(extension) => extension.name === MEDIA_RESIZE_EXTENSION_NAME
			);
		expect(
			names(withMedia(withMedia(createExtensions('standard'))))
		).toHaveLength(1);
		expect(
			names(withMedia(createExtensions('standard'), { resize: false }))
		).toHaveLength(0);
	});
});
