import type { UploadAdapter, UploadResult } from '@blockleaf/editor';

/**
 * The landing page demo has no server, so the file never leaves the browser.
 *
 * It cannot be held as an object URL either: `sanitizeSrc` rejects `blob:`
 * deliberately, because such a URL is a pointer into one session's memory and
 * is dead as soon as the document is read anywhere else. A data URL is the
 * only scheme that both survives the sanitiser and shows the reader their own
 * image, so the file is downscaled to one.
 *
 * Downscaled hard, because the stored document is on screen beside the
 * editor: a full-size photo would put a megabyte of base64 into the pane the
 * page is using to argue that the JSON is readable.
 */
const MAX_EDGE = 320;
const QUALITY = 0.72;

const loadImage = (file: File) =>
	new Promise<HTMLImageElement>((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const image = new Image();

		image.onload = () => {
			URL.revokeObjectURL(url);
			resolve(image);
		};
		image.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('That file could not be read as an image.'));
		};
		image.src = url;
	});

const downscale = async (file: File): Promise<UploadResult> => {
	const image = await loadImage(file);
	const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
	const width = Math.max(1, Math.round(image.width * scale));
	const height = Math.max(1, Math.round(image.height * scale));

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;

	const context = canvas.getContext('2d');
	if (!context) throw new Error('This browser cannot resize the image.');
	context.drawImage(image, 0, 0, width, height);

	return {
		id: `${file.name}-${Date.now()}`,
		src: canvas.toDataURL('image/webp', QUALITY),
		width,
		height
	};
};

const STEPS = 5;
const STEP_MS = 60;

/**
 * Stepped rather than instant: the progress bar, Cancel and Retry are part of
 * what the demo is showing, and an upload that resolves in one frame shows
 * none of them.
 */
export const demoUpload: UploadAdapter = {
	upload: (file, { signal, onProgress }) =>
		new Promise<UploadResult>((resolve, reject) => {
			let step = 0;

			const timer = setInterval(() => {
				step += 1;
				onProgress?.(step / STEPS);
				if (step < STEPS) return;

				clearInterval(timer);
				downscale(file).then(resolve, reject);
			}, STEP_MS);

			signal.addEventListener('abort', () => {
				clearInterval(timer);
				reject(new DOMException('Aborted', 'AbortError'));
			});
		})
};
