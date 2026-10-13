import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';
import {
	UPLOAD_PLUGIN_KEY,
	createUploadExtension,
	type UploadFailure
} from '../src/core/upload-extension.js';
import type {
	UploadAdapter,
	UploadContext,
	UploadResult
} from '../src/core/upload.js';

const editors: Editor[] = [];
const containers: HTMLElement[] = [];

afterEach(() => {
	while (editors.length) editors.pop()?.destroy();
	while (containers.length) containers.pop()?.remove();
});

const png = (name = 'photo.png') =>
	new File(['x'], name, { type: 'image/png' });

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const mount = (
	adapter: UploadAdapter | null,
	onError?: (failure: UploadFailure) => void
) => {
	const container = document.createElement('div');
	document.body.append(container);
	containers.push(container);

	const editor = new Editor({
		element: container,
		extensions: [
			...createExtensions('standard'),
			createUploadExtension({ adapter, onError })
		],
		content: '<p>Hello</p>'
	});
	editors.push(editor);
	return { editor, container };
};

const pending = (editor: Editor) =>
	UPLOAD_PLUGIN_KEY.getState(editor.state)?.pending ?? [];

const placeholder = (container: HTMLElement) =>
	container.querySelector<HTMLElement>('.blockleaf-upload');

/** An adapter whose upload is driven by the test. */
const deferredAdapter = () => {
	let resolve: ((result: UploadResult) => void) | undefined;
	let reject: ((error: unknown) => void) | undefined;
	let context: UploadContext | undefined;

	const adapter: UploadAdapter = {
		upload: (_file, ctx) =>
			new Promise<UploadResult>((res, rej) => {
				context = ctx;
				resolve = res;
				reject = rej;
				ctx.signal.addEventListener('abort', () => {
					rej(new DOMException('Aborted', 'AbortError'));
				});
			})
	};

	return {
		adapter,
		resolve: (result: UploadResult) => resolve?.(result),
		reject: (error: unknown) => reject?.(error),
		report: (fraction: number) => context?.onProgress?.(fraction)
	};
};

describe('upload progress (MC-03)', () => {
	it('starts indeterminate, because an adapter may not measure progress', () => {
		const { adapter } = deferredAdapter();
		const { editor } = mount(adapter);

		editor.commands.uploadFiles([png()]);
		expect(pending(editor)[0]?.progress).toBeNull();
	});

	it('records what the adapter reports', async () => {
		const deferred = deferredAdapter();
		const { editor } = mount(deferred.adapter);

		editor.commands.uploadFiles([png()]);
		deferred.report(0.5);
		await flush();

		expect(pending(editor)[0]?.progress).toBe(0.5);
	});

	// An adapter is host code; a bad number must not reach `aria-valuenow`.
	it('clamps a fraction outside 0 to 1', async () => {
		const deferred = deferredAdapter();
		const { editor } = mount(deferred.adapter);

		editor.commands.uploadFiles([png()]);
		deferred.report(-3);
		await flush();
		expect(pending(editor)[0]?.progress).toBe(0);

		deferred.report(17);
		await flush();
		expect(pending(editor)[0]?.progress).toBe(1);
	});

	it('ignores a move too small to be worth a transaction', async () => {
		const deferred = deferredAdapter();
		const { editor } = mount(deferred.adapter);

		editor.commands.uploadFiles([png()]);
		deferred.report(0.5);
		await flush();
		deferred.report(0.51);
		await flush();

		expect(pending(editor)[0]?.progress).toBe(0.5);
	});

	it('always lets the final 100% through', async () => {
		const deferred = deferredAdapter();
		const { editor } = mount(deferred.adapter);

		editor.commands.uploadFiles([png()]);
		deferred.report(0.99);
		await flush();
		deferred.report(1);
		await flush();

		expect(pending(editor)[0]?.progress).toBe(1);
	});

	it('renders a progressbar carrying the percentage', async () => {
		const deferred = deferredAdapter();
		const { editor, container } = mount(deferred.adapter);

		editor.commands.uploadFiles([png()]);
		deferred.report(0.4);
		await flush();

		const bar = container.querySelector('[role="progressbar"]');
		expect(bar?.getAttribute('aria-valuenow')).toBe('40');
		expect(bar?.getAttribute('aria-valuemax')).toBe('100');
	});

	// Saying nothing is correct here; saying zero would be a claim.
	it('omits aria-valuenow while indeterminate', () => {
		const { adapter } = deferredAdapter();
		const { editor, container } = mount(adapter);

		editor.commands.uploadFiles([png()]);

		const bar = container.querySelector('[role="progressbar"]');
		expect(bar?.hasAttribute('aria-valuenow')).toBe(false);
		expect(bar?.getAttribute('data-indeterminate')).toBe('true');
	});
});

describe('cancelling an upload (MC-03)', () => {
	it('removes the placeholder and reports nothing', async () => {
		const deferred = deferredAdapter();
		const onError = vi.fn();
		const { editor } = mount(deferred.adapter, onError);

		editor.commands.uploadFiles([png()]);
		const id = pending(editor)[0]?.id as string;

		editor.commands.cancelUpload(id);
		await flush();

		expect(pending(editor)).toHaveLength(0);
		expect(onError).not.toHaveBeenCalled();
	});

	it('is reachable from the placeholder itself', async () => {
		const deferred = deferredAdapter();
		const { editor, container } = mount(deferred.adapter);

		editor.commands.uploadFiles([png()]);
		const cancel = container.querySelector<HTMLButtonElement>(
			'[data-action="cancel"]'
		);
		expect(cancel).not.toBeNull();

		cancel?.click();
		await flush();

		expect(pending(editor)).toHaveLength(0);
	});
});

describe('a failed upload is retryable (MC-03)', () => {
	it('keeps the placeholder, in an error state', async () => {
		const deferred = deferredAdapter();
		const onError = vi.fn();
		const { editor, container } = mount(deferred.adapter, onError);

		editor.commands.uploadFiles([png()]);
		deferred.reject(new Error('503'));
		await flush();

		expect(pending(editor)).toHaveLength(1);
		expect(pending(editor)[0]?.error).toContain('photo.png');
		expect(placeholder(container)?.dataset.state).toBe('error');
		expect(placeholder(container)?.getAttribute('role')).toBe('alert');
		expect(onError).toHaveBeenCalledTimes(1);
	});

	it('runs again on retry and inserts the image', async () => {
		let attempt = 0;
		const adapter: UploadAdapter = {
			upload: async () => {
				attempt += 1;
				if (attempt === 1) throw new Error('503');
				return { id: 'a', src: 'https://cdn.test/a.png' };
			}
		};
		const { editor } = mount(adapter);

		editor.commands.uploadFiles([png()]);
		await flush();
		const id = pending(editor)[0]?.id as string;
		expect(pending(editor)[0]?.error).not.toBeNull();

		editor.commands.retryUpload(id);
		await flush();

		expect(pending(editor)).toHaveLength(0);
		const images: unknown[] = [];
		editor.state.doc.descendants((node) => {
			if (node.type.name === 'image') images.push(node.attrs);
			return true;
		});
		expect(images).toHaveLength(1);
		expect(attempt).toBe(2);
	});

	// The whole reason the failed entry stays: it is still mapping its slot.
	it('retries into the position the placeholder has been holding', async () => {
		let attempt = 0;
		const adapter: UploadAdapter = {
			upload: async () => {
				attempt += 1;
				if (attempt === 1) throw new Error('503');
				return { id: 'a', src: 'https://cdn.test/a.png' };
			}
		};
		const { editor } = mount(adapter);

		const end = editor.state.doc.content.size - 1;
		editor.commands.uploadFiles([png()], end);
		await flush();

		const id = pending(editor)[0]?.id as string;
		const before = pending(editor)[0]?.pos as number;

		editor.commands.insertContentAt(1, 'Prefixed ');
		const after = pending(editor)[0]?.pos as number;
		expect(after).toBeGreaterThan(before);

		editor.commands.retryUpload(id);
		await flush();

		const text = editor.state.doc.textBetween(
			0,
			editor.state.doc.content.size,
			' '
		);
		expect(text).toContain('Prefixed Hello');
	});

	it('is reachable from the placeholder itself', async () => {
		let attempt = 0;
		const adapter: UploadAdapter = {
			upload: async () => {
				attempt += 1;
				if (attempt === 1) throw new Error('503');
				return { id: 'a', src: 'https://cdn.test/a.png' };
			}
		};
		const { editor, container } = mount(adapter);

		editor.commands.uploadFiles([png()]);
		await flush();

		container
			.querySelector<HTMLButtonElement>('[data-action="retry"]')
			?.click();
		await flush();

		expect(pending(editor)).toHaveLength(0);
		expect(attempt).toBe(2);
	});

	it('dismisses without retrying', async () => {
		let attempt = 0;
		const adapter: UploadAdapter = {
			upload: async () => {
				attempt += 1;
				throw new Error('503');
			}
		};
		const { editor, container } = mount(adapter);

		editor.commands.uploadFiles([png()]);
		await flush();

		container
			.querySelector<HTMLButtonElement>('[data-action="dismiss"]')
			?.click();
		await flush();

		expect(pending(editor)).toHaveLength(0);
		expect(attempt).toBe(1);
	});

	it('refuses to retry an upload that is still running', () => {
		const deferred = deferredAdapter();
		const { editor } = mount(deferred.adapter);

		editor.commands.uploadFiles([png()]);
		const id = pending(editor)[0]?.id as string;

		expect(editor.commands.retryUpload(id)).toBe(false);
	});
});
