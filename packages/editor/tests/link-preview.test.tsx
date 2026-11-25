import { Editor, type JSONContent } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';
import {
	LINK_PREVIEW_NODE,
	createEmbeds,
	sanitizeLinkPreviewUrl,
	type FetchLinkPreview
} from '../src/embeds.js';
import { mediaMenuShouldShow } from '../src/media.js';
import { defaultSlashCommands } from '../src/ui/slash-menu/registry.js';
import { safeValidateDocument } from '../src/validate.js';

const editors: Editor[] = [];

afterEach(() => {
	while (editors.length) editors.pop()?.destroy();
});

const open = (
	content: JSONContent[] | string,
	fetchLinkPreview?: FetchLinkPreview
) => {
	const editor = new Editor({
		extensions: [
			...createExtensions('standard'),
			...createEmbeds({
				mediaMenu: false,
				captionMenu: false,
				fetchLinkPreview
			})
		],
		content:
			typeof content === 'string' ? content : { type: 'doc', content }
	});
	editors.push(editor);
	return editor;
};

const URL_ = 'https://example.com/article';

const card: JSONContent = {
	type: LINK_PREVIEW_NODE,
	attrs: {
		url: URL_,
		title: 'An article',
		description: 'What it is about.',
		image: 'https://example.com/cover.png',
		siteName: 'Example'
	}
};

const first = (editor: Editor) =>
	(editor.getJSON() as JSONContent).content?.[0];

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('the link preview card', () => {
	it('round-trips through its own HTML, with everything it shows', () => {
		const html = open([card]).getHTML();
		expect(html).toContain(`href="${URL_}"`);
		expect(html).toContain('An article');
		expect(html).toContain('<img');
		expect(first(open(html))?.attrs).toMatchObject(card.attrs ?? {});
	});

	it('shows the host name where nothing is stored, and does not store it', () => {
		const bare = open([{ type: LINK_PREVIEW_NODE, attrs: { url: URL_ } }]);
		const html = bare.getHTML();
		expect(html).toContain('data-fallback');
		expect(html).toContain('example.com');
		expect(first(open(html))?.attrs).toMatchObject({
			url: URL_,
			title: null,
			siteName: null
		});
	});

	it('only links to an https: address', () => {
		expect(sanitizeLinkPreviewUrl(URL_)).toBe(URL_);
		expect(sanitizeLinkPreviewUrl('http://example.com')).toBeNull();
		expect(sanitizeLinkPreviewUrl('javascript:alert(1)')).toBeNull();
		expect(sanitizeLinkPreviewUrl('/relative')).toBeNull();

		const editor = open([{ type: 'paragraph' }]);
		expect(
			editor.commands.setLinkPreview({ url: 'javascript:alert(1)' })
		).toBe(false);
		expect(editor.commands.setLinkPreview({ url: URL_ })).toBe(true);
		expect(first(editor)?.type).toBe(LINK_PREVIEW_NODE);
	});

	it('cleans what it stores: an unsafe picture goes, long text is cut', () => {
		const editor = open([{ type: 'paragraph' }]);
		editor.commands.setLinkPreview({
			url: URL_,
			title: `  A   title ${'x'.repeat(400)}`,
			image: 'javascript:alert(1)'
		});
		const attrs = first(editor)?.attrs;
		expect(attrs?.image).toBeNull();
		expect(String(attrs?.title)).toMatch(/^A title x/);
		expect(String(attrs?.title)).toHaveLength(300);
	});

	it('never renders a stored address that is not https:', () => {
		const editor = open([
			{ type: LINK_PREVIEW_NODE, attrs: { url: 'javascript:alert(1)' } }
		]);
		expect(editor.getHTML()).not.toContain('javascript');
	});

	it('is its title, or its address, in plain text', () => {
		expect(open([card]).getText()).toBe('An article');
		expect(
			open([{ type: LINK_PREVIEW_NODE, attrs: { url: URL_ } }]).getText()
		).toBe(URL_);
	});

	it('takes a caption and gets the media toolbar', () => {
		const editor = open([card, { type: 'paragraph' }]);
		editor.commands.setNodeSelection(0);
		expect(
			mediaMenuShouldShow({ editor } as Parameters<
				typeof mediaMenuShouldShow
			>[0])
		).toBe(true);
		expect(editor.commands.toggleCaption()).toBe(true);
		expect(first(editor)?.type).toBe('figure');
	});

	it('is a valid stored block only with an https: address', () => {
		const doc = (url: string) => ({
			type: 'doc',
			attrs: { schemaVersion: 2 },
			content: [{ type: LINK_PREVIEW_NODE, attrs: { id: 'c', url } }]
		});
		expect(safeValidateDocument(doc(URL_)).success).toBe(true);
		expect(safeValidateDocument(doc('javascript:alert(1)')).success).toBe(
			false
		);
	});
});

describe('fetching what a card shows', () => {
	it('asks the host once for a card added without a title, and fills it in', async () => {
		const fetch = vi.fn<FetchLinkPreview>(() =>
			Promise.resolve({
				title: 'Fetched',
				siteName: 'Example',
				image: 'https://example.com/a.png'
			})
		);
		const editor = open([{ type: 'paragraph' }], fetch);
		editor.commands.setLinkPreview({ url: URL_ });
		editor.commands.insertContentAt(editor.state.doc.content.size, {
			type: 'paragraph',
			content: [{ type: 'text', text: 'more' }]
		});
		await flush();

		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch.mock.calls[0]?.[0]).toBe(URL_);
		expect(first(editor)?.attrs).toMatchObject({
			title: 'Fetched',
			siteName: 'Example'
		});
	});

	it('does not make filling it in an undo step', async () => {
		const editor = open([{ type: 'paragraph' }], () =>
			Promise.resolve({ title: 'Fetched' })
		);
		editor.commands.setLinkPreview({ url: URL_ });
		await flush();
		expect(first(editor)?.attrs?.title).toBe('Fetched');
		editor.commands.undo();
		expect(first(editor)?.type).not.toBe(LINK_PREVIEW_NODE);
	});

	it('leaves a card that already has a title alone', async () => {
		const fetch = vi.fn<FetchLinkPreview>(() => Promise.resolve(null));
		const editor = open([{ type: 'paragraph' }], fetch);
		editor.commands.setLinkPreview({ url: URL_, title: 'Given' });
		await flush();
		expect(fetch).not.toHaveBeenCalled();
	});

	it('keeps the card when the fetch fails, and cancels it when the editor goes', async () => {
		let signal: AbortSignal | undefined;
		const editor = open([{ type: 'paragraph' }], (_url, options) => {
			signal = options.signal;
			return Promise.reject(new Error('offline'));
		});
		editor.commands.setLinkPreview({ url: URL_ });
		await flush();
		expect(first(editor)?.attrs?.url).toBe(URL_);
		editors.pop();
		editor.destroy();
		expect(signal?.aborted).toBe(true);
	});
});

describe('the slash menu', () => {
	it('offers Link preview only where the block is loaded', () => {
		const item = defaultSlashCommands.find(
			(entry) => entry.id === 'link-preview'
		);
		expect(item?.isAvailable?.(open([{ type: 'paragraph' }]))).toBe(true);
		const plain = new Editor({ extensions: createExtensions('standard') });
		editors.push(plain);
		expect(item?.isAvailable?.(plain)).toBe(false);
		expect(item?.picker).toBeDefined();
	});
});
