import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';
import {
	DEFAULT_MAX_UPLOAD_BYTES,
	UPLOAD_PLUGIN_KEY,
	createUploadExtension,
	isAcceptedType,
	matchesAccept,
	screenFiles,
	type UploadFailure
} from '../src/core/upload-extension.js';
import type { UploadAdapter, UploadResult } from '../src/core/upload.js';

const editors: Editor[] = [];

afterEach(() => {
	while (editors.length) editors.pop()?.destroy();
});

const png = (name = 'photo.png', size = 1024) => {
	const file = new File(['x'], name, { type: 'image/png' });
	Object.defineProperty(file, 'size', { value: size });
	return file;
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const createEditor = (
	adapter: UploadAdapter | null,
	onError?: (failure: UploadFailure) => void,
	content = '<p>Hello</p>'
) => {
	const editor = new Editor({
		extensions: [
			...createExtensions('standard'),
			createUploadExtension({ adapter, onError })
		],
		content
	});
	editors.push(editor);
	return editor;
};

const images = (editor: Editor) => {
	const found: Record<string, unknown>[] = [];
	editor.state.doc.descendants((node) => {
		if (node.type.name === 'image') found.push(node.attrs);
		return true;
	});
	return found;
};

const pendingCount = (editor: Editor) =>
	UPLOAD_PLUGIN_KEY.getState(editor.state)?.pending.length ?? 0;

describe('accept matching (MC-02)', () => {
	it('matches a wildcard subtype', () => {
		expect(matchesAccept('image/png', 'image/*')).toBe(true);
		expect(matchesAccept('video/mp4', 'image/*')).toBe(false);
	});

	it('matches an exact type', () => {
		expect(matchesAccept('image/png', 'image/png')).toBe(true);
		expect(matchesAccept('image/gif', 'image/png')).toBe(false);
	});

	it('matches everything for */*', () => {
		expect(matchesAccept('application/pdf', '*/*')).toBe(true);
	});

	it('reads the file type, not the extension', () => {
		const disguised = new File(['x'], 'photo.png', {
			type: 'application/x-msdownload'
		});
		expect(isAcceptedType(disguised, ['image/*'])).toBe(false);
	});
});

describe('screening files before they leave the browser (MC-02)', () => {
	it('accepts an image within the size cap', () => {
		const { accepted, rejected } = screenFiles([png()]);
		expect(accepted).toHaveLength(1);
		expect(rejected).toHaveLength(0);
	});

	it('rejects a file of the wrong type', () => {
		const pdf = new File(['x'], 'spec.pdf', { type: 'application/pdf' });
		const { accepted, rejected } = screenFiles([pdf]);

		expect(accepted).toHaveLength(0);
		expect(rejected[0]?.reason).toBe('type');
		expect(rejected[0]?.message).toContain('spec.pdf');
	});

	it('rejects a file over the cap without calling the adapter', () => {
		const huge = png('huge.png', DEFAULT_MAX_UPLOAD_BYTES + 1);
		const { accepted, rejected } = screenFiles([huge]);

		expect(accepted).toHaveLength(0);
		expect(rejected[0]?.reason).toBe('size');
		expect(rejected[0]?.message).toContain('10 MB');
	});

	it('splits a mixed batch', () => {
		const { accepted, rejected } = screenFiles([
			png('a.png'),
			new File(['x'], 'b.pdf', { type: 'application/pdf' }),
			png('c.png')
		]);

		expect(accepted.map((f) => f.name)).toEqual(['a.png', 'c.png']);
		expect(rejected).toHaveLength(1);
	});
});

describe('uploading through the adapter (MC-02)', () => {
	it('inserts an image when the upload resolves', async () => {
		const adapter: UploadAdapter = {
			upload: async () => ({ id: 'a', src: 'https://cdn.test/a.png' })
		};
		const editor = createEditor(adapter);

		editor.commands.uploadFiles([png()]);
		await flush();

		expect(images(editor)).toHaveLength(1);
		expect(images(editor)[0]?.src).toBe('https://cdn.test/a.png');
	});

	it('carries the intrinsic width through so the box is reserved', async () => {
		const adapter: UploadAdapter = {
			upload: async () => ({
				id: 'a',
				src: 'https://cdn.test/a.png',
				width: 1200,
				height: 800
			})
		};
		const editor = createEditor(adapter);

		editor.commands.uploadFiles([png()]);
		await flush();

		expect(images(editor)[0]?.width).toBe(1200);
	});

	it('shows a placeholder while in flight and clears it after', async () => {
		let release: ((result: UploadResult) => void) | undefined;
		const adapter: UploadAdapter = {
			upload: () =>
				new Promise<UploadResult>((resolve) => {
					release = resolve;
				})
		};
		const editor = createEditor(adapter);

		editor.commands.uploadFiles([png()]);
		expect(pendingCount(editor)).toBe(1);
		expect(images(editor)).toHaveLength(0);

		release?.({ id: 'a', src: 'https://cdn.test/a.png' });
		await flush();

		expect(pendingCount(editor)).toBe(0);
		expect(images(editor)).toHaveLength(1);
	});

	// The reason the placeholder is a mapped widget rather than a saved
	// position: the document moves under an in-flight upload.
	it('lands the image where the placeholder ended up, not where it started', async () => {
		let release: ((result: UploadResult) => void) | undefined;
		const adapter: UploadAdapter = {
			upload: () =>
				new Promise<UploadResult>((resolve) => {
					release = resolve;
				})
		};
		const editor = createEditor(adapter, undefined, '<p>Hello</p>');

		const end = editor.state.doc.content.size - 1;
		editor.commands.uploadFiles([png()], end);
		const startedAt =
			UPLOAD_PLUGIN_KEY.getState(editor.state)?.pending[0]?.pos ?? -1;

		// Type in front of the pending upload.
		editor.commands.insertContentAt(1, 'Prefixed ');
		const movedTo =
			UPLOAD_PLUGIN_KEY.getState(editor.state)?.pending[0]?.pos ?? -1;
		expect(movedTo).toBeGreaterThan(startedAt);

		release?.({ id: 'a', src: 'https://cdn.test/a.png' });
		await flush();

		const text = editor.state.doc.textBetween(
			0,
			editor.state.doc.content.size,
			' '
		);
		expect(text).toContain('Prefixed Hello');
		expect(images(editor)).toHaveLength(1);
	});

	it('discards a file when no adapter is configured, and says so', async () => {
		const onError = vi.fn();
		const editor = createEditor(null, onError);

		editor.commands.uploadFiles([png()]);
		await flush();

		expect(onError).toHaveBeenCalledTimes(1);
		expect(onError.mock.calls[0]?.[0]?.reason).toBe('no-adapter');
		expect(images(editor)).toHaveLength(0);
	});

	it('reports an adapter rejection and keeps the placeholder for a retry', async () => {
		const adapter: UploadAdapter = {
			upload: async () => {
				throw new Error('500');
			}
		};
		const onError = vi.fn();
		const editor = createEditor(adapter, onError);

		editor.commands.uploadFiles([png()]);
		await flush();

		expect(onError).toHaveBeenCalledTimes(1);
		expect(onError.mock.calls[0]?.[0]?.reason).toBe('adapter');
		// The entry stays, holding its position, so MC-03's Retry has
		// somewhere to put the image.
		expect(pendingCount(editor)).toBe(1);
		expect(images(editor)).toHaveLength(0);
	});

	it('refuses a result that is not an upload result', async () => {
		const adapter = {
			upload: async () => ({ url: 'https://cdn.test/a.png' })
		} as unknown as UploadAdapter;
		const onError = vi.fn();
		const editor = createEditor(adapter, onError);

		editor.commands.uploadFiles([png()]);
		await flush();

		expect(onError.mock.calls[0]?.[0]?.reason).toBe('result');
		expect(images(editor)).toHaveLength(0);
	});

	// A cancel is not a failure and must not be announced as one.
	it('stays silent when the upload is aborted', async () => {
		const adapter: UploadAdapter = {
			upload: (_file, { signal }) =>
				new Promise<UploadResult>((_resolve, reject) => {
					signal.addEventListener('abort', () => {
						reject(new DOMException('Aborted', 'AbortError'));
					});
				})
		};
		const onError = vi.fn();
		const editor = createEditor(adapter, onError);

		editor.commands.uploadFiles([png()]);
		expect(pendingCount(editor)).toBe(1);

		editor.destroy();
		editors.pop();
		await flush();

		expect(onError).not.toHaveBeenCalled();
	});

	it('reports every rejected file in a mixed batch', async () => {
		const adapter: UploadAdapter = {
			upload: async () => ({ id: 'a', src: 'https://cdn.test/a.png' })
		};
		const onError = vi.fn();
		const editor = createEditor(adapter, onError);

		editor.commands.uploadFiles([
			png('a.png'),
			new File(['x'], 'b.pdf', { type: 'application/pdf' })
		]);
		await flush();

		expect(onError).toHaveBeenCalledTimes(1);
		expect(onError.mock.calls[0]?.[0]?.reason).toBe('type');
		expect(images(editor)).toHaveLength(1);
	});

	it('does nothing for an empty batch', () => {
		const adapter: UploadAdapter = {
			upload: async () => ({ id: 'a', src: 'https://cdn.test/a.png' })
		};
		const editor = createEditor(adapter);
		expect(editor.commands.uploadFiles([])).toBe(false);
	});
});
