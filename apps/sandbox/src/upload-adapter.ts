import type { UploadAdapter, UploadResult } from '@blockleaf/editor';

/**
 * A fake adapter, because the sandbox has no server.
 *
 * It behaves like a slow one on purpose — the progress bar, the Cancel button
 * and the retry path are all invisible against an upload that finishes
 * instantly, and they are exactly what MC-03 needs a human (and the e2e
 * suite) to be able to see.
 *
 * A file whose name contains `fail` fails its first attempt and succeeds on
 * the second, which is the only way to exercise Retry without a server to
 * break.
 */
const PIXEL =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const STEP_MS = 60;
const attempts = new Map<string, number>();

export const sandboxUpload: UploadAdapter = {
	upload: (file, { signal, onProgress }) =>
		new Promise<UploadResult>((resolve, reject) => {
			let progress = 0;

			const timer = setInterval(() => {
				progress = Math.min(1, progress + 0.2);
				onProgress?.(progress);
				if (progress < 1) return;

				clearInterval(timer);
				const seen = (attempts.get(file.name) ?? 0) + 1;
				attempts.set(file.name, seen);

				if (file.name.includes('fail') && seen === 1) {
					reject(new Error('Simulated upload failure'));
					return;
				}

				resolve({
					id: `${file.name}-${seen}`,
					src: PIXEL,
					width: 240,
					height: 160
				});
			}, STEP_MS);

			signal.addEventListener('abort', () => {
				clearInterval(timer);
				reject(new DOMException('Aborted', 'AbortError'));
			});
		})
};
