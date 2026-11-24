import { Editor, type JSONContent } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';
import { resolveLabels } from '../src/core/labels.js';
import {
	createUploadExtension,
	type UploadFailure
} from '../src/core/upload-extension.js';
import type { UploadAdapter } from '../src/core/upload.js';
import {
	AUDIO_NODE,
	MEDIA_MENU_EXTENSION_NAME,
	VIDEO_NODE,
	createMedia,
	defaultMediaActions,
	mediaMenuShouldShow,
	sanitizeMediaSrc,
	withMedia
} from '../src/media.js';
import { defaultSlashCommands } from '../src/ui/slash-menu/registry.js';
import { safeValidateDocument } from '../src/validate.js';

const editors: Editor[] = [];
const containers: HTMLElement[] = [];

afterEach(() => {
	while (editors.length) editors.pop()?.destroy();
	while (containers.length) containers.pop()?.remove();
});

/**
 * The media blocks without their toolbars: a bubble menu needs layout jsdom
 * does not have, and the blocks and commands do not.
 */
const blocks = () => createMedia({ mediaMenu: false, captionMenu: false });

const open = (content: JSONContent[] | string, extra = blocks()) => {
	const editor = new Editor({
		extensions: [...createExtensions('standard'), ...extra],
		content:
			typeof content === 'string' ? content : { type: 'doc', content }
	});
	editors.push(editor);
	return editor;
};

const video: JSONContent = {
	type: VIDEO_NODE,
	attrs: { src: 'https://cdn.test/a.mp4', width: 640, align: 'center' }
};

const audio: JSONContent = {
	type: AUDIO_NODE,
	attrs: { src: 'https://cdn.test/a.mp3', title: 'Interview, part one' }
};

const top = (editor: Editor) =>
	((editor.getJSON() as JSONContent).content ?? []).map((node) => node.type);

const selectFirst = (editor: Editor, type: string) => {
	let target = -1;
	editor.state.doc.descendants((node, pos) => {
		if (target === -1 && node.type.name === type) target = pos;
	});
	editor.commands.setNodeSelection(target);
};

describe('the media URL rule (F29)', () => {
	it.each([
		['https://cdn.test/a.mp4', 'https://cdn.test/a.mp4'],
		['/uploads/a.mp4', '/uploads/a.mp4'],
		['media/a.mp4', 'media/a.mp4'],
		['  https://cdn.test/a.mp4  ', 'https://cdn.test/a.mp4']
	])('allows %s', (input, expected) => {
		expect(sanitizeMediaSrc(input)).toBe(expected);
	});

	it.each([
		'data:video/mp4;base64,AAAA',
		'data:image/png;base64,iVBORw0KGgo=',
		'data:text/html,<script>alert(1)</script>',
		'javascript:alert(1)',
		'http://cdn.test/a.mp4',
		'blob:https://cdn.test/1234',
		'//cdn.test/a.mp4',
		''
	])('refuses %s', (input) => {
		expect(sanitizeMediaSrc(input)).toBeNull();
	});
});

describe('video (PA-12)', () => {
	it('stores a source, a width and an alignment, and plays with controls', () => {
		const editor = open([video]);
		expect(editor.getJSON().content?.[0]).toMatchObject(video);
		const html = editor.getHTML();
		expect(html).toContain('<video');
		expect(html).toContain('src="https://cdn.test/a.mp4"');
		expect(html).toContain('controls=""');
		expect(html).toContain('preload="metadata"');
		expect(html).toContain('aria-label="Video"');
		expect(html).toContain('data-align="center"');
	});

	it('inserts with setVideo and refuses an unsafe source', () => {
		const editor = open([{ type: 'paragraph' }]);
		expect(
			editor.commands.setVideo({ src: 'data:video/mp4;base64,AAAA' })
		).toBe(false);
		expect(editor.commands.setVideo({ src: '/media/a.mp4' })).toBe(true);
		expect(top(editor)).toContain(VIDEO_NODE);
	});

	it('reads a pasted <video>, and drops one with an unsafe source', () => {
		const editor = open(
			'<video src="https://cdn.test/a.mp4" poster="javascript:x"></video>'
		);
		const [first] = editor.getJSON().content ?? [];
		expect(first?.type).toBe(VIDEO_NODE);
		expect(first?.attrs?.poster).toBeNull();

		const unsafe = open(
			'<video src="javascript:alert(1)"></video><p>x</p>'
		);
		expect(top(unsafe)).not.toContain(VIDEO_NODE);
	});

	it('takes a caption, like an image', () => {
		const editor = open([video, { type: 'paragraph' }]);
		selectFirst(editor, VIDEO_NODE);
		expect(editor.commands.toggleCaption()).toBe(true);
		expect(top(editor)[0]).toBe('figure');
		expect(editor.getJSON().content?.[0]?.content?.[0]?.type).toBe(
			VIDEO_NODE
		);
	});
});

describe('audio (PA-13)', () => {
	it('names the player by its title', () => {
		const editor = open([audio]);
		expect(editor.getHTML()).toContain('aria-label="Interview, part one"');
		expect(editor.getHTML()).toContain('<audio');
	});

	it('falls back to a translatable name with no title', () => {
		const editor = open(
			[{ type: AUDIO_NODE, attrs: { src: '/a.mp3' } }],
			createMedia({ mediaMenu: false, captionMenu: false }).map(
				(extension) =>
					extension.name === AUDIO_NODE
						? extension.configure({
								labels: resolveLabels({
									media: { audio: 'Son' }
								})
							})
						: extension
			)
		);
		expect(editor.getHTML()).toContain('aria-label="Son"');
	});

	it('refuses an unsafe source', () => {
		const editor = open([{ type: 'paragraph' }]);
		expect(editor.commands.setAudio({ src: 'http://cdn.test/a.mp3' })).toBe(
			false
		);
	});
});

describe('uploads go to the block for their type', () => {
	const adapter: UploadAdapter = {
		upload: (file) =>
			Promise.resolve({ id: file.name, src: `/uploads/${file.name}` })
	};

	const upload = async (
		file: File,
		extra = blocks(),
		accept?: string[],
		onError?: (failure: UploadFailure) => void
	) => {
		const editor = new Editor({
			extensions: [
				...createExtensions('standard'),
				...extra,
				createUploadExtension({
					adapter,
					onError,
					...(accept ? { accept } : {})
				})
			],
			content: '<p></p>'
		});
		editors.push(editor);
		editor.commands.uploadFiles([file], 0);
		await new Promise((resolve) => setTimeout(resolve, 0));
		await new Promise((resolve) => setTimeout(resolve, 0));
		return editor;
	};

	it('a video becomes a video', async () => {
		const editor = await upload(
			new File(['x'], 'clip.mp4', { type: 'video/mp4' })
		);
		expect(top(editor)).toContain(VIDEO_NODE);
	});

	it('a sound becomes audio, titled from its file name', async () => {
		const editor = await upload(
			new File(['x'], 'voice_memo.m4a', { type: 'audio/mp4' })
		);
		const node = editor
			.getJSON()
			.content?.find((block) => block.type === AUDIO_NODE);
		expect(node?.attrs?.title).toBe('voice memo');
	});

	it('an image is still an image', async () => {
		const editor = await upload(
			new File(['x'], 'a.png', { type: 'image/png' })
		);
		expect(top(editor)).toContain('image');
	});

	it('without the media blocks, only images are accepted', async () => {
		const failures: UploadFailure[] = [];
		const editor = await upload(
			new File(['x'], 'clip.mp4', { type: 'video/mp4' }),
			[],
			undefined,
			(failure) => failures.push(failure)
		);
		expect(top(editor)).not.toContain(VIDEO_NODE);
		expect(failures[0]?.reason).toBe('type');
	});
});

describe('the media toolbar', () => {
	const action = (id: string) => {
		const found = defaultMediaActions.find((entry) => entry.id === id);
		if (!found) throw new Error(`no ${id}`);
		return found;
	};

	it('shows for a selected video or audio clip, and not an image', () => {
		const editor = open([
			video,
			audio,
			{ type: 'image', attrs: { src: 'https://cdn.test/a.png' } }
		]);
		const shows = () =>
			mediaMenuShouldShow({
				editor,
				state: editor.state,
				view: editor.view,
				element: document.createElement('div'),
				from: editor.state.selection.from,
				to: editor.state.selection.to
			});
		for (const type of [VIDEO_NODE, AUDIO_NODE]) {
			selectFirst(editor, type);
			expect(shows()).toBe(true);
		}
		selectFirst(editor, 'image');
		expect(shows()).toBe(false);
	});

	it('aligns a video, and offers no alignment for audio', () => {
		const editor = open([video, audio]);
		selectFirst(editor, VIDEO_NODE);
		expect(action('align-right').isAvailable?.(editor)).toBe(true);
		action('align-right').run(editor);
		expect(editor.getJSON().content?.[0]?.attrs?.align).toBe('right');

		selectFirst(editor, AUDIO_NODE);
		expect(action('align-right').isAvailable?.(editor)).toBe(false);
		expect(action('toggle-caption').isAvailable?.(editor)).toBe(true);
	});
});

describe('slash menu items', () => {
	const item = (id: string) => {
		const found = defaultSlashCommands.find((entry) => entry.id === id);
		if (!found) throw new Error(`no ${id}`);
		return found;
	};

	it('offers video and audio only with the blocks and an adapter', () => {
		const bare = open([{ type: 'paragraph' }], []);
		const noAdapter = open([{ type: 'paragraph' }]);
		const full = open(
			[{ type: 'paragraph' }],
			[...blocks(), createUploadExtension({ adapter: null })]
		);
		for (const id of ['video', 'audio']) {
			expect(item(id).isAvailable?.(bare)).toBe(false);
			expect(item(id).isAvailable?.(noAdapter)).toBe(false);
			expect(item(id).isAvailable?.(full)).toBe(true);
		}
	});
});

describe('withMedia', () => {
	it('adds each block and toolbar once', () => {
		const names = withMedia(withMedia(createExtensions('standard'))).map(
			(extension) => extension.name
		);
		for (const name of [
			VIDEO_NODE,
			AUDIO_NODE,
			MEDIA_MENU_EXTENSION_NAME
		]) {
			expect(names.filter((entry) => entry === name)).toHaveLength(1);
		}
	});
});

describe('validation (version 2)', () => {
	const doc = (...content: unknown[]) => ({
		type: 'doc',
		attrs: { schemaVersion: 2 },
		content
	});
	const withId = (node: JSONContent) => ({
		...node,
		attrs: { ...node.attrs, id: 'b1' }
	});

	it('accepts each block, alone and in a figure', () => {
		for (const node of [video, audio]) {
			expect(safeValidateDocument(doc(withId(node))).success).toBe(true);
			expect(
				safeValidateDocument(
					doc({
						type: 'figure',
						content: [withId(node), { type: 'caption' }]
					})
				).success
			).toBe(true);
		}
	});
});
