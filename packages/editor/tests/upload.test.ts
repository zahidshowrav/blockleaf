import { describe, expect, it, vi } from 'vitest';

import {
	isAbortError,
	isUploadResult,
	type UploadAdapter,
	type UploadResult
} from '../src/core/upload.js';

describe('upload result validation (MC-01)', () => {
	it('accepts a minimal result', () => {
		expect(
			isUploadResult({ id: 'abc', src: 'https://cdn.test/a.png' })
		).toBe(true);
	});

	it('accepts optional intrinsic dimensions', () => {
		expect(
			isUploadResult({
				id: 'abc',
				src: 'https://cdn.test/a.png',
				width: 1200,
				height: 800
			})
		).toBe(true);
	});

	it('accepts a richer object than the interface describes', () => {
		expect(
			isUploadResult({
				id: 'abc',
				src: 'https://cdn.test/a.png',
				etag: 'W/"xyz"',
				bucket: 'uploads'
			})
		).toBe(true);
	});

	it('rejects anything that is not an object', () => {
		for (const value of [
			null,
			undefined,
			'https://cdn.test/a.png',
			42,
			true
		]) {
			expect(isUploadResult(value)).toBe(false);
		}
	});

	it('rejects a missing or empty id', () => {
		expect(isUploadResult({ src: 'https://cdn.test/a.png' })).toBe(false);
		expect(isUploadResult({ id: '', src: 'https://cdn.test/a.png' })).toBe(
			false
		);
		expect(
			isUploadResult({ id: '   ', src: 'https://cdn.test/a.png' })
		).toBe(false);
	});

	it('rejects a missing or empty src', () => {
		expect(isUploadResult({ id: 'abc' })).toBe(false);
		expect(isUploadResult({ id: 'abc', src: '' })).toBe(false);
		expect(isUploadResult({ id: 'abc', src: '  ' })).toBe(false);
	});

	// The mistake this guard exists to catch: an endpoint that answers with
	// `{ url }`, which would otherwise store an image node with no src.
	it('rejects the common `url` instead of `src` mistake', () => {
		expect(
			isUploadResult({ id: 'abc', url: 'https://cdn.test/a.png' })
		).toBe(false);
	});

	it('rejects non-string identifiers', () => {
		expect(isUploadResult({ id: 7, src: 'https://cdn.test/a.png' })).toBe(
			false
		);
		expect(isUploadResult({ id: 'abc', src: 7 })).toBe(false);
	});

	it('rejects dimensions that are not positive finite numbers', () => {
		const base = { id: 'abc', src: 'https://cdn.test/a.png' };
		for (const width of [
			0,
			-10,
			Number.NaN,
			Number.POSITIVE_INFINITY,
			'800'
		]) {
			expect(isUploadResult({ ...base, width })).toBe(false);
		}
		for (const height of [0, -10, Number.NaN, '600']) {
			expect(isUploadResult({ ...base, height })).toBe(false);
		}
	});
});

describe('abort detection (MC-01)', () => {
	it('recognises the DOMException fetch throws on abort', () => {
		expect(isAbortError(new DOMException('Aborted', 'AbortError'))).toBe(
			true
		);
	});

	it('recognises a plain error carrying the same name', () => {
		const error = new Error('Aborted');
		error.name = 'AbortError';
		expect(isAbortError(error)).toBe(true);
	});

	it('treats a genuine failure as a failure', () => {
		expect(isAbortError(new Error('500 Internal Server Error'))).toBe(
			false
		);
		expect(isAbortError(new TypeError('Failed to fetch'))).toBe(false);
	});

	it('does not throw on non-error values', () => {
		for (const value of [null, undefined, 'AbortError', 42]) {
			expect(isAbortError(value)).toBe(false);
		}
	});
});

describe('upload adapter contract (MC-01)', () => {
	it('drives an adapter that reports progress and resolves', async () => {
		const onProgress = vi.fn();
		const adapter: UploadAdapter = {
			async upload(file, context) {
				context.onProgress?.(0.5);
				context.onProgress?.(1);
				return { id: file.name, src: `https://cdn.test/${file.name}` };
			}
		};

		const controller = new AbortController();
		const file = new File(['bytes'], 'photo.png', { type: 'image/png' });
		const result = await adapter.upload(file, {
			signal: controller.signal,
			onProgress
		});

		expect(isUploadResult(result)).toBe(true);
		expect(result.src).toBe('https://cdn.test/photo.png');
		expect(onProgress).toHaveBeenCalledTimes(2);
		expect(onProgress).toHaveBeenLastCalledWith(1);
	});

	it('lets an adapter omit progress entirely', async () => {
		const adapter: UploadAdapter = {
			upload: async (file): Promise<UploadResult> => ({
				id: file.name,
				src: `https://cdn.test/${file.name}`
			})
		};

		const file = new File(['bytes'], 'photo.png', { type: 'image/png' });
		const result = await adapter.upload(file, {
			signal: new AbortController().signal
		});

		expect(isUploadResult(result)).toBe(true);
	});

	it('surfaces an abort through the signal as a cancel, not a failure', async () => {
		const adapter: UploadAdapter = {
			upload: (_file, { signal }) =>
				new Promise((_resolve, reject) => {
					signal.addEventListener('abort', () => {
						reject(new DOMException('Aborted', 'AbortError'));
					});
				})
		};

		const controller = new AbortController();
		const file = new File(['bytes'], 'photo.png', { type: 'image/png' });
		const pending = adapter.upload(file, { signal: controller.signal });
		controller.abort();

		await expect(pending).rejects.toThrow('Aborted');
		await pending.catch((error: unknown) => {
			expect(isAbortError(error)).toBe(true);
		});
	});

	it('treats `remove` as optional', () => {
		const adapter: UploadAdapter = {
			upload: async (file) => ({
				id: file.name,
				src: 'https://cdn.test/a'
			})
		};
		expect(adapter.remove).toBeUndefined();
	});
});
