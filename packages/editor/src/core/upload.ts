/**
 * The upload boundary.
 *
 * blockleaf never talks to a storage provider. The host implements
 * {@link UploadAdapter} and the editor drives it — drop, paste, picker,
 * progress, abort and retry are ours; the bytes are theirs. Baking in S3 or
 * Uploadthing would make the package useless to everyone storing files
 * anywhere else, and every host already has an upload endpoint.
 *
 * Reference adapters live in the docs rather than in this package, so that
 * choosing a provider never costs a dependency.
 */

/**
 * What an adapter returns once the file is stored.
 *
 * `src` is written straight into the document, so it is sanitised — but by
 * the image node, not here. An `<img>` arriving through a paste never passes
 * through an adapter, so the only gate that catches every path is the one on
 * the node itself.
 */
export interface UploadResult {
	/** Stable identifier, passed back to {@link UploadAdapter.remove}. */
	id: string;
	/** URL the editor stores. Must survive the image node's sanitiser. */
	src: string;
	/** Intrinsic width in pixels, if the host knows it. */
	width?: number;
	/** Intrinsic height in pixels, if the host knows it. */
	height?: number;
	/**
	 * Alternative text for the image.
	 *
	 * A host that already has a description — a CMS field, a caption, a
	 * vision model — passes it here. Without one the editor falls back to
	 * the file's own name, which is a poor description but better than an
	 * image a screen reader can only announce by its URL.
	 */
	alt?: string;
}

/**
 * Everything the editor hands an adapter besides the file.
 *
 * PROJECT_PLAN §4 sketches `upload(file, signal)`. This is that signature
 * with the second argument widened to an object, because MC-03 needs
 * determinate progress and a bare `AbortSignal` has nowhere to put it.
 * Widening now costs nothing; adding a third positional argument later
 * would be a breaking change.
 */
export interface UploadContext {
	/**
	 * Aborted when the editor unmounts or the user cancels an in-flight
	 * upload. Pass it to `fetch`, or to `XMLHttpRequest.abort()`.
	 */
	signal: AbortSignal;
	/**
	 * Report progress as a fraction between 0 and 1.
	 *
	 * Optional in both directions: an adapter that cannot measure progress
	 * simply never calls it, and the editor shows an indeterminate state.
	 * `fetch` cannot report upload progress at all — the docs show the
	 * `XMLHttpRequest` adapter for hosts that want a real bar.
	 */
	onProgress?: (fraction: number) => void;
}

/**
 * Implemented by the host, passed to the editor as the `upload` prop.
 *
 * `upload` rejects to signal failure. Throwing an `AbortError` — which
 * `fetch` does for you when the signal fires — means cancelled, not failed,
 * and the editor removes the placeholder silently instead of offering a
 * retry. See {@link isAbortError}.
 */
export interface UploadAdapter {
	upload(file: File, context: UploadContext): Promise<UploadResult>;
	/**
	 * Called when an uploaded file is deleted from the document. Optional:
	 * plenty of hosts would rather sweep orphans in a cron job than trust an
	 * editor to tell them what to delete.
	 */
	remove?(id: string): Promise<void>;
}

const isNonEmptyString = (value: unknown): value is string =>
	typeof value === 'string' && value.trim().length > 0;

const isOptionalString = (value: unknown): boolean =>
	value === undefined || typeof value === 'string';

const isValidDimension = (value: unknown): boolean =>
	value === undefined ||
	(typeof value === 'number' && Number.isFinite(value) && value > 0);

/**
 * Validates what an adapter resolved with before any of it reaches the
 * document.
 *
 * The adapter is host code returning data that is about to be stored, which
 * makes it a boundary, and PROJECT_PLAN §3 puts validation at every boundary.
 * A host whose endpoint returns `{ url }` instead of `{ src }` should get a
 * clear error at the point of the mistake, not an image node with
 * `src: undefined` saved into their database.
 *
 * Structure only — extra properties pass, because the result is consumed
 * structurally and a host returning its own richer object is fine.
 */
export const isUploadResult = (value: unknown): value is UploadResult => {
	if (typeof value !== 'object' || value === null) return false;

	const candidate = value as Record<string, unknown>;

	return (
		isNonEmptyString(candidate.id) &&
		isNonEmptyString(candidate.src) &&
		isValidDimension(candidate.width) &&
		isValidDimension(candidate.height) &&
		isOptionalString(candidate.alt)
	);
};

/**
 * Distinguishes a cancelled upload from a failed one.
 *
 * `fetch` rejects with a `DOMException` named `AbortError` when its signal
 * fires; `XMLHttpRequest` adapters conventionally throw the same shape. The
 * name is checked rather than the constructor because `DOMException` is not
 * reliably available in every runtime the schema layer is imported into, and
 * because an adapter is free to throw its own error with that name.
 */
export const isAbortError = (error: unknown): boolean =>
	typeof error === 'object' &&
	error !== null &&
	'name' in error &&
	(error as { name: unknown }).name === 'AbortError';
