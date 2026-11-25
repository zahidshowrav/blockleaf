import { Editor, type JSONContent } from '@tiptap/core';
import { Slice } from '@tiptap/pm/model';
import { afterEach, describe, expect, it } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';
import { resolveLabels } from '../src/core/labels.js';
import {
	EMBED_NODE,
	MEDIA_MENU_EXTENSION_NAME,
	MEDIA_RESIZE_EXTENSION_NAME,
	createEmbeds,
	embedProviderOf,
	sanitizeEmbedSrc,
	toEmbedSrc,
	withEmbeds
} from '../src/embeds.js';
import {
	defaultMediaActions,
	mediaMenuShouldShow,
	withMedia
} from '../src/media.js';
import { defaultSlashCommands } from '../src/ui/slash-menu/registry.js';
import { safeValidateDocument } from '../src/validate.js';

const editors: Editor[] = [];

afterEach(() => {
	while (editors.length) editors.pop()?.destroy();
});

/** The block without its toolbars, which need layout jsdom does not have. */
const blocks = () => createEmbeds({ mediaMenu: false, captionMenu: false });

const open = (content: JSONContent[] | string, extra = blocks()) => {
	const editor = new Editor({
		extensions: [...createExtensions('standard'), ...extra],
		content:
			typeof content === 'string' ? content : { type: 'doc', content }
	});
	editors.push(editor);
	return editor;
};

const YOUTUBE = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';

const embed: JSONContent = {
	type: EMBED_NODE,
	attrs: { src: YOUTUBE, width: 560, align: 'center' }
};

const top = (editor: Editor) =>
	((editor.getJSON() as JSONContent).content ?? []).map((node) => node.type);

const first = (editor: Editor) =>
	(editor.getJSON() as JSONContent).content?.[0];

const selectFirst = (editor: Editor, type: string) => {
	let target = -1;
	editor.state.doc.descendants((node, pos) => {
		if (target === -1 && node.type.name === type) target = pos;
	});
	editor.commands.setNodeSelection(target);
};

/** Pastes plain text the way a browser hands it over. */
const pasteText = (editor: Editor, text: string): boolean => {
	const { view } = editor;
	const event = new Event('paste') as unknown as ClipboardEvent;
	Object.defineProperty(event, 'clipboardData', {
		value: {
			getData: (format: string) => (format === 'text/plain' ? text : '')
		}
	});
	return Boolean(
		view.someProp('handlePaste', (handle) =>
			handle(view, event, Slice.empty)
		)
	);
};

describe('the provider list', () => {
	it.each([
		['https://www.youtube.com/watch?v=dQw4w9WgXcQ', YOUTUBE],
		['https://youtu.be/dQw4w9WgXcQ', YOUTUBE],
		['https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=x', YOUTUBE],
		['https://www.youtube.com/shorts/dQw4w9WgXcQ', YOUTUBE],
		['https://www.youtube.com/embed/dQw4w9WgXcQ', YOUTUBE],
		['https://youtu.be/dQw4w9WgXcQ?t=90', `${YOUTUBE}?start=90`],
		[
			'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s',
			`${YOUTUBE}?start=90`
		],
		[
			'https://vimeo.com/76979871',
			'https://player.vimeo.com/video/76979871'
		],
		[
			'https://vimeo.com/76979871/af1d2c3b4e',
			'https://player.vimeo.com/video/76979871?h=af1d2c3b4e'
		],
		[
			'https://player.vimeo.com/video/76979871?h=af1d2c3b4e&autoplay=1',
			'https://player.vimeo.com/video/76979871?h=af1d2c3b4e'
		],
		[
			'https://www.loom.com/share/0123456789abcdef0123456789abcdef',
			'https://www.loom.com/embed/0123456789abcdef0123456789abcdef'
		],
		[
			'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=abc',
			'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC'
		],
		[
			'https://open.spotify.com/intl-de/album/4uLU6hMCjMI75M1A2tKUQC',
			'https://open.spotify.com/embed/album/4uLU6hMCjMI75M1A2tKUQC'
		],
		[
			'https://codepen.io/someone/pen/abcDEF1',
			'https://codepen.io/someone/embed/abcDEF1'
		]
	])('turns %s into its player address', (page, player) => {
		expect(toEmbedSrc(page)).toBe(player);
		expect(sanitizeEmbedSrc(player)).toBe(player);
	});

	it.each([
		'https://example.com/watch?v=dQw4w9WgXcQ',
		'https://www.youtube.com/watch?v=short',
		'https://www.youtube.com/@channel',
		'https://evil.test/www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
		'https://www.youtube-nocookie.com.evil.test/embed/dQw4w9WgXcQ',
		'javascript:alert(1)',
		'data:text/html,<script>alert(1)</script>',
		'https://vimeo.com/channels/staffpicks',
		'https://open.spotify.com/user/someone',
		'not a url',
		''
	])('refuses %s', (input) => {
		expect(toEmbedSrc(input)).toBeNull();
	});

	it('only accepts a player address as stored', () => {
		expect(sanitizeEmbedSrc('https://youtu.be/dQw4w9WgXcQ')).toBeNull();
		expect(
			sanitizeEmbedSrc(
				'http://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
			)
		).toBeNull();
		expect(sanitizeEmbedSrc(`${YOUTUBE}?autoplay=1`)).toBeNull();
		// A page is rebuilt from its id, so extra parameters never get through.
		expect(toEmbedSrc(`${YOUTUBE}?autoplay=1`)).toBe(YOUTUBE);
		expect(embedProviderOf(YOUTUBE)).toBe('youtube');
		expect(embedProviderOf('https://example.com')).toBeNull();
	});
});

describe('the embed block', () => {
	it('round-trips through its own HTML', () => {
		const html = open([embed]).getHTML();
		expect(html).toContain('<iframe');
		expect(html).toContain(`src="${YOUTUBE}"`);
		expect(html).toContain('data-provider="youtube"');
		expect(html).toContain('title="YouTube video"');
		expect(html).toContain('sandbox="allow-scripts');
		const again = open(html);
		expect(first(again)?.attrs).toMatchObject({
			src: YOUTUBE,
			width: 560,
			align: 'center'
		});
	});

	it('reads a provider embed code and stores the player address', () => {
		const editor = open(
			'<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'
		);
		expect(first(editor)?.type).toBe(EMBED_NODE);
		expect(first(editor)?.attrs?.src).toBe(YOUTUBE);
	});

	it('drops a frame from any other site', () => {
		const editor = open(
			'<iframe src="https://evil.test/page"></iframe><p>after</p>'
		);
		expect(top(editor)).not.toContain(EMBED_NODE);
	});

	it('never writes a stored address that is not on the list', () => {
		const editor = open([
			{ type: EMBED_NODE, attrs: { src: 'https://evil.test/page' } }
		]);
		expect(editor.getHTML()).not.toContain('evil.test');
	});

	it('embeds a page by its address, and refuses one it cannot', () => {
		const editor = open([{ type: 'paragraph' }]);
		expect(
			editor.commands.setEmbed({ src: 'https://example.com/video' })
		).toBe(false);
		expect(
			editor.commands.setEmbed({
				src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
			})
		).toBe(true);
		expect(top(editor)[0]).toBe(EMBED_NODE);
		expect(first(editor)?.attrs?.src).toBe(YOUTUBE);
		expect(typeof first(editor)?.attrs?.id).toBe('string');
	});

	it('updates the selected embed, holding a new address to the list', () => {
		const editor = open([embed, { type: 'paragraph' }]);
		selectFirst(editor, EMBED_NODE);
		expect(editor.commands.updateEmbed({ align: 'right' })).toBe(true);
		expect(editor.commands.updateEmbed({ src: 'https://evil.test' })).toBe(
			false
		);
		expect(first(editor)?.attrs).toMatchObject({
			src: YOUTUBE,
			align: 'right'
		});
	});

	it('takes a caption', () => {
		const editor = open([embed, { type: 'paragraph' }]);
		selectFirst(editor, EMBED_NODE);
		expect(editor.commands.toggleCaption()).toBe(true);
		expect(top(editor)[0]).toBe('figure');
	});

	it('is a valid stored block only with a player address on the list', () => {
		const doc = (src: string) => ({
			type: 'doc',
			attrs: { schemaVersion: 2 },
			content: [
				{ type: EMBED_NODE, attrs: { id: 'e', src, width: 'full' } }
			]
		});
		expect(safeValidateDocument(doc(YOUTUBE)).success).toBe(true);
		expect(
			safeValidateDocument(
				doc('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
			).success
		).toBe(false);
		expect(safeValidateDocument(doc('https://evil.test')).success).toBe(
			false
		);
	});
});

describe('pasting a link', () => {
	it('embeds a supported address pasted alone on an empty line', () => {
		const editor = open([{ type: 'paragraph' }]);
		editor.commands.setTextSelection(1);
		expect(pasteText(editor, ' https://youtu.be/dQw4w9WgXcQ ')).toBe(true);
		expect(top(editor)[0]).toBe(EMBED_NODE);
	});

	it('leaves an address pasted into a sentence alone', () => {
		const editor = open([
			{ type: 'paragraph', content: [{ type: 'text', text: 'See ' }] }
		]);
		editor.commands.setTextSelection(5);
		expect(pasteText(editor, 'https://youtu.be/dQw4w9WgXcQ')).toBe(false);
	});

	it('leaves an address no provider serves alone', () => {
		const editor = open([{ type: 'paragraph' }]);
		editor.commands.setTextSelection(1);
		expect(pasteText(editor, 'https://example.com/page')).toBe(false);
	});

	it('leaves an address pasted into an empty code block alone', () => {
		const editor = open([{ type: 'codeBlock' }]);
		editor.commands.setTextSelection(1);
		expect(pasteText(editor, 'https://youtu.be/dQw4w9WgXcQ')).toBe(false);
	});

	it('does nothing when the host turns it off', () => {
		const editor = open(
			[{ type: 'paragraph' }],
			createEmbeds({
				pasteToEmbed: false,
				mediaMenu: false,
				captionMenu: false
			})
		);
		editor.commands.setTextSelection(1);
		expect(pasteText(editor, 'https://youtu.be/dQw4w9WgXcQ')).toBe(false);
	});
});

describe('the toolbar and resizing', () => {
	it('shows the media toolbar for a selected embed, with alignment and full width', () => {
		const editor = open([embed, { type: 'paragraph' }]);
		selectFirst(editor, EMBED_NODE);
		expect(
			mediaMenuShouldShow({ editor } as Parameters<
				typeof mediaMenuShouldShow
			>[0])
		).toBe(true);
		const byId = (id: string) =>
			defaultMediaActions.find((action) => action.id === id);
		expect(byId('align-center')?.isAvailable?.(editor)).toBe(true);
		expect(byId('align-center')?.isActive(editor)).toBe(true);
		byId('align-right')?.run(editor);
		expect(first(editor)?.attrs?.align).toBe('right');
		expect(byId('full-width')?.isAvailable?.(editor)).toBe(true);
	});

	it('resizes like a video', () => {
		const editor = open([embed, { type: 'paragraph' }]);
		selectFirst(editor, EMBED_NODE);
		expect(editor.commands.setMediaWidth('full')).toBe(true);
		expect(first(editor)?.attrs?.width).toBe('full');
	});
});

describe('withEmbeds', () => {
	const count = (extensions: ReturnType<typeof withEmbeds>, name: string) =>
		extensions.filter((extension) => extension.name === name).length;

	it('shares the media toolbar and resizing with withMedia', () => {
		const both = withMedia(withEmbeds(createExtensions('standard')));
		expect(count(both, EMBED_NODE)).toBe(1);
		expect(count(both, MEDIA_MENU_EXTENSION_NAME)).toBe(1);
		expect(count(both, MEDIA_RESIZE_EXTENSION_NAME)).toBe(1);
		const other = withEmbeds(withMedia(createExtensions('standard')));
		expect(count(other, MEDIA_MENU_EXTENSION_NAME)).toBe(1);
		expect(count(other, 'video')).toBe(1);
	});
});

describe('the slash menu', () => {
	const item = () =>
		defaultSlashCommands.find((entry) => entry.id === 'embed');

	it('offers Embed only where the block is loaded, with an address picker', () => {
		expect(item()?.isAvailable?.(open([{ type: 'paragraph' }]))).toBe(true);
		expect(item()?.isAvailable?.(open([{ type: 'paragraph' }], []))).toBe(
			false
		);
		expect(item()?.picker).toBeDefined();
	});

	it('names each provider in every language a host gives', () => {
		const labels = resolveLabels({
			embeds: { frame: { youtube: 'Vidéo YouTube' } }
		});
		expect(labels.embeds.frame.youtube).toBe('Vidéo YouTube');
		expect(labels.embeds.frame.vimeo).toBe('Vimeo video');
	});
});
