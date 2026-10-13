import { Extension, type Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import { isAbortError, isUploadResult, type UploadAdapter } from './upload.js';

export const UPLOAD_PLUGIN_KEY = /* @__PURE__ */ new PluginKey<UploadState>(
	'blockleafUpload'
);

/** 10 MB. Large enough for a phone photo, small enough to catch a mistake. */
export const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Only images for now; MC is scoped to media the editor can render. */
export const DEFAULT_UPLOAD_ACCEPT = ['image/*'];

export type UploadFailureReason =
	/** No adapter was given, so there is nothing to upload to. */
	| 'no-adapter'
	/** The file's MIME type is not in `accept`. */
	| 'type'
	/** The file is larger than `maxBytes`. */
	| 'size'
	/** The adapter rejected. */
	| 'adapter'
	/** The adapter resolved with something that is not an `UploadResult`. */
	| 'result';

export type UploadFailure = {
	file: File;
	reason: UploadFailureReason;
	message: string;
	cause?: unknown;
};

/**
 * Matches a file against one `accept` entry.
 *
 * Supports the two forms an `<input accept>` takes: an exact type
 * (`image/png`) and a wildcard subtype (`image/*`). Extension entries
 * (`.png`) are deliberately unsupported — the type is what the browser
 * reports and what a server should check.
 */
export const matchesAccept = (type: string, pattern: string): boolean => {
	if (pattern === '*/*') return true;
	if (pattern.endsWith('/*')) {
		return type.startsWith(pattern.slice(0, -1));
	}
	return type === pattern;
};

export const isAcceptedType = (file: File, accept: string[]): boolean =>
	accept.some((pattern) => matchesAccept(file.type, pattern));

export type UploadScreening = {
	accepted: File[];
	rejected: UploadFailure[];
};

/**
 * Splits a batch into what will be uploaded and what will not, with a reason
 * per rejection.
 *
 * Screening happens before the adapter is called so that a 40 MB video
 * dropped by accident never leaves the browser.
 */
export const screenFiles = (
	files: File[],
	{
		accept = DEFAULT_UPLOAD_ACCEPT,
		maxBytes = DEFAULT_MAX_UPLOAD_BYTES
	}: { accept?: string[]; maxBytes?: number } = {}
): UploadScreening => {
	const accepted: File[] = [];
	const rejected: UploadFailure[] = [];

	for (const file of files) {
		if (!isAcceptedType(file, accept)) {
			rejected.push({
				file,
				reason: 'type',
				message: `${file.name} is not an accepted file type.`
			});
			continue;
		}
		if (file.size > maxBytes) {
			rejected.push({
				file,
				reason: 'size',
				message: `${file.name} is larger than the ${Math.round(
					maxBytes / 1024 / 1024
				)} MB limit.`
			});
			continue;
		}
		accepted.push(file);
	}

	return { accepted, rejected };
};

/** One in-flight upload, as the plugin tracks it. */
export type PendingUpload = {
	id: string;
	name: string;
	/** Where the image will land. Mapped through every transaction. */
	pos: number;
	/**
	 * Fraction complete, or `null` when the adapter cannot measure it —
	 * `fetch` cannot report upload progress, so an indeterminate state is the
	 * honest default rather than a bar that lies.
	 */
	progress: number | null;
	/**
	 * Set when the upload failed. The entry stays in the document so the
	 * failure is visible and retryable rather than vanishing silently.
	 */
	error: string | null;
	/** Kept so a retry does not need the file handed to it again. */
	file: File;
};

export type UploadState = {
	pending: PendingUpload[];
};

type UploadMeta =
	| { type: 'start'; id: string; name: string; pos: number; file: File }
	| { type: 'progress'; id: string; progress: number }
	| { type: 'fail'; id: string; message: string }
	| { type: 'finish'; id: string };

export interface UploadExtensionOptions {
	adapter: UploadAdapter | null;
	accept: string[];
	maxBytes: number;
	onError?: (failure: UploadFailure) => void;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		blockleafUpload: {
			/** Screens, uploads and inserts. `at` defaults to the selection. */
			uploadFiles: (files: File[] | FileList, at?: number) => ReturnType;
			/** Opens the system file picker, then `uploadFiles`. */
			openUploadPicker: () => ReturnType;
			/** Aborts an in-flight upload. */
			cancelUpload: (id: string) => ReturnType;
			/** Runs a failed upload again, at the position it still holds. */
			retryUpload: (id: string) => ReturnType;
			/** Removes a failed upload's placeholder without retrying. */
			dismissUpload: (id: string) => ReturnType;
		};
	}
}

let uploadCounter = 0;
const nextUploadId = (): string => `upload-${++uploadCounter}`;

/**
 * The widget shown where the image will land.
 *
 * A widget rather than a real node: it holds a position that ProseMirror maps
 * for free through every edit made while the upload is in flight, without
 * putting a placeholder into the document the host would then have to strip
 * before saving. MC-03 renders progress into this element.
 */
const button = (
	label: string,
	onClick: () => void,
	variant: string
): HTMLButtonElement => {
	const element = document.createElement('button');
	element.type = 'button';
	element.className = 'blockleaf-upload__action';
	element.dataset.action = variant;
	element.textContent = label;
	element.addEventListener('click', (event) => {
		event.preventDefault();
		onClick();
	});
	return element;
};

const renderPlaceholder =
	(entry: PendingUpload, editor: Editor) => (): HTMLElement => {
		const element = document.createElement('div');
		element.className = 'blockleaf-upload';
		element.dataset.uploadId = entry.id;
		// Not contenteditable, and not part of the document — a widget the
		// caret must skip rather than land inside.
		element.contentEditable = 'false';

		if (entry.error) {
			element.dataset.state = 'error';
			// `alert` rather than `status`: a failed upload is the one thing
			// here a screen reader user must not miss.
			element.setAttribute('role', 'alert');

			const message = document.createElement('span');
			message.className = 'blockleaf-upload__name';
			message.textContent = entry.error;
			element.append(
				message,
				button(
					'Retry',
					() => editor.commands.retryUpload(entry.id),
					'retry'
				),
				button(
					'Dismiss',
					() => editor.commands.dismissUpload(entry.id),
					'dismiss'
				)
			);
			return element;
		}

		element.dataset.state = 'uploading';
		element.setAttribute('role', 'status');
		element.setAttribute('aria-live', 'polite');

		const name = document.createElement('span');
		name.className = 'blockleaf-upload__name';
		name.textContent = `Uploading ${entry.name}…`;

		const track = document.createElement('div');
		track.className = 'blockleaf-upload__track';
		track.setAttribute('role', 'progressbar');
		track.setAttribute('aria-label', `Uploading ${entry.name}`);
		track.setAttribute('aria-valuemin', '0');
		track.setAttribute('aria-valuemax', '100');

		const bar = document.createElement('div');
		bar.className = 'blockleaf-upload__bar';

		if (entry.progress === null) {
			// An indeterminate progressbar omits `aria-valuenow`. Saying
			// nothing is correct; saying zero would be a claim.
			track.dataset.indeterminate = 'true';
		} else {
			const percent = Math.round(entry.progress * 100);
			track.setAttribute('aria-valuenow', String(percent));
			bar.style.width = `${percent}%`;
		}

		track.append(bar);
		element.append(
			name,
			track,
			button(
				'Cancel',
				() => editor.commands.cancelUpload(entry.id),
				'cancel'
			)
		);
		return element;
	};

const pendingPosition = (editor: Editor, id: string, fallback: number) => {
	const state = UPLOAD_PLUGIN_KEY.getState(editor.state);
	return state?.pending.find((entry) => entry.id === id)?.pos ?? fallback;
};

export const UploadExtension = /* @__PURE__ */ Extension.create<
	UploadExtensionOptions,
	{ controllers: Map<string, AbortController> }
>({
	name: 'blockleafUpload',

	// Above PasteNormalizer, so a pasted file is taken before the plain-text
	// branch has a chance to look at an empty clipboard string.
	priority: 150,

	addOptions() {
		return {
			adapter: null,
			accept: DEFAULT_UPLOAD_ACCEPT,
			maxBytes: DEFAULT_MAX_UPLOAD_BYTES,
			onError: undefined
		};
	},

	addStorage() {
		return { controllers: new Map<string, AbortController>() };
	},

	addCommands() {
		const report = (failure: UploadFailure) => {
			this.options.onError?.(failure);
		};

		const run = (files: File[], at: number) => {
			const { adapter, accept, maxBytes } = this.options;
			const editor = this.editor;

			if (!adapter) {
				for (const file of files) {
					report({
						file,
						reason: 'no-adapter',
						message:
							'No upload adapter is configured, so the file was discarded.'
					});
				}
				return;
			}

			const { accepted, rejected } = screenFiles(files, {
				accept,
				maxBytes
			});
			rejected.forEach(report);

			for (const file of accepted) {
				void uploadOne(
					editor,
					this.storage.controllers,
					adapter,
					file,
					at,
					report
				);
			}
		};

		return {
			uploadFiles:
				(files, at) =>
				({ editor }) => {
					const list = Array.from(files);
					if (list.length === 0) return false;
					run(list, at ?? editor.state.selection.from);
					return true;
				},

			cancelUpload:
				(id) =>
				({ editor }) => {
					const controller = this.storage.controllers.get(id);
					if (controller) {
						// The adapter's rejection drives the cleanup, so the
						// cancelled and the never-started cases take the same
						// path through `uploadOne`.
						controller.abort();
						return true;
					}
					return editor.commands.dismissUpload(id);
				},

			retryUpload:
				(id) =>
				({ editor }) => {
					const { adapter } = this.options;
					const entry = UPLOAD_PLUGIN_KEY.getState(
						editor.state
					)?.pending.find((pending) => pending.id === id);

					if (!adapter || !entry || !entry.error) return false;

					void uploadOne(
						editor,
						this.storage.controllers,
						adapter,
						entry.file,
						entry.pos,
						report,
						// Same id, so the entry keeps the position it has been
						// mapping all along.
						id
					);
					return true;
				},

			dismissUpload:
				(id) =>
				({ editor, dispatch }) => {
					const exists = UPLOAD_PLUGIN_KEY.getState(
						editor.state
					)?.pending.some((pending) => pending.id === id);
					if (!exists) return false;

					if (dispatch) {
						editor.view.dispatch(
							editor.view.state.tr.setMeta(UPLOAD_PLUGIN_KEY, {
								type: 'finish',
								id
							})
						);
					}
					return true;
				},

			openUploadPicker:
				() =>
				({ editor }) => {
					if (typeof document === 'undefined') return false;

					const input = document.createElement('input');
					input.type = 'file';
					input.multiple = true;
					input.accept = this.options.accept.join(',');
					// Off-screen rather than display:none — a hidden input is
					// not clickable in every browser.
					input.style.position = 'fixed';
					input.style.left = '-9999px';

					input.addEventListener('change', () => {
						const files = input.files;
						if (files && files.length > 0) {
							editor.commands.uploadFiles(files);
						}
						input.remove();
					});

					document.body.appendChild(input);
					input.click();
					return true;
				}
		};
	},

	addProseMirrorPlugins() {
		const { editor } = this;

		return [
			new Plugin<UploadState>({
				key: UPLOAD_PLUGIN_KEY,

				state: {
					init: () => ({ pending: [] }),
					apply(tr, value) {
						const meta = tr.getMeta(UPLOAD_PLUGIN_KEY) as
							UploadMeta | undefined;

						const pending = value.pending.map((entry) => ({
							...entry,
							pos: tr.mapping.map(entry.pos)
						}));

						if (meta?.type === 'start') {
							return {
								pending: [
									...pending,
									{
										id: meta.id,
										name: meta.name,
										pos: meta.pos,
										progress: null,
										error: null,
										file: meta.file
									}
								]
							};
						}
						if (meta?.type === 'progress') {
							return {
								pending: pending.map((entry) =>
									entry.id === meta.id
										? { ...entry, progress: meta.progress }
										: entry
								)
							};
						}
						if (meta?.type === 'fail') {
							return {
								pending: pending.map((entry) =>
									entry.id === meta.id
										? { ...entry, error: meta.message }
										: entry
								)
							};
						}
						if (meta?.type === 'finish') {
							return {
								pending: pending.filter(
									(entry) => entry.id !== meta.id
								)
							};
						}
						return { pending };
					}
				},

				props: {
					decorations(state) {
						const pending =
							UPLOAD_PLUGIN_KEY.getState(state)?.pending ?? [];
						if (pending.length === 0) return DecorationSet.empty;

						return DecorationSet.create(
							state.doc,
							pending.map((entry) =>
								Decoration.widget(
									entry.pos,
									renderPlaceholder(entry, editor),
									{
										side: -1,
										// A widget whose key is unchanged is reused
										// as-is, so the key has to carry what is
										// rendered or a progress tick never reaches
										// the DOM.
										key: `${entry.id}:${entry.error ? 'e' : entry.progress}`
									}
								)
							)
						);
					},

					handleDrop(view, event) {
						const files = Array.from(
							event.dataTransfer?.files ?? []
						);
						if (files.length === 0) return false;

						event.preventDefault();
						const coords = view.posAtCoords({
							left: event.clientX,
							top: event.clientY
						});
						editor.commands.uploadFiles(
							files,
							coords?.pos ?? view.state.selection.from
						);
						return true;
					},

					handlePaste(view, event) {
						const files = Array.from(
							event.clipboardData?.files ?? []
						);
						if (files.length === 0) return false;

						event.preventDefault();
						editor.commands.uploadFiles(
							files,
							view.state.selection.from
						);
						return true;
					}
				}
			})
		];
	},

	onDestroy() {
		// Abort on unmount, so an abandoned upload does not keep a request
		// alive against an editor that no longer exists.
		for (const controller of this.storage.controllers.values()) {
			controller.abort();
		}
		this.storage.controllers.clear();
	}
});

/**
 * Progress is only dispatched when the rounded percentage moves by this much.
 *
 * Every dispatch is a ProseMirror transaction, and an adapter reporting each
 * chunk of a 5 MB file would produce hundreds. They change no document, so
 * they never reach `onChange` or the undo stack, but they still cost a
 * state recomputation each.
 */
const PROGRESS_STEP = 0.05;

const uploadOne = async (
	editor: Editor,
	controllers: Map<string, AbortController>,
	adapter: UploadAdapter,
	file: File,
	at: number,
	report: (failure: UploadFailure) => void,
	existingId?: string
): Promise<void> => {
	const id = existingId ?? nextUploadId();
	const controller = new AbortController();
	controllers.set(id, controller);

	const dispatch = (meta: UploadMeta) => {
		if (editor.isDestroyed) return;
		editor.view.dispatch(
			editor.view.state.tr.setMeta(UPLOAD_PLUGIN_KEY, meta)
		);
	};

	if (existingId) {
		// A retry reuses the entry, and so its mapped position, rather than
		// starting a new one wherever the selection happens to be now.
		dispatch({ type: 'progress', id, progress: 0 });
	} else {
		dispatch({ type: 'start', id, name: file.name, pos: at, file });
	}

	const finish = () => {
		controllers.delete(id);
		dispatch({ type: 'finish', id });
	};

	let reported = -1;
	const onProgress = (fraction: number) => {
		// An adapter is host code: clamp rather than trust, or a bad number
		// ends up in `aria-valuenow`.
		const clamped = Math.min(1, Math.max(0, fraction));
		if (reported >= 0 && Math.abs(clamped - reported) < PROGRESS_STEP) {
			if (clamped !== 1) return;
		}
		reported = clamped;
		dispatch({ type: 'progress', id, progress: clamped });
	};

	try {
		const result = await adapter.upload(file, {
			signal: controller.signal,
			onProgress
		});

		if (!isUploadResult(result)) {
			controllers.delete(id);
			const message = `Could not upload ${file.name}.`;
			dispatch({ type: 'fail', id, message });
			report({
				file,
				reason: 'result',
				message: `The upload adapter returned something that is not an upload result for ${file.name}.`,
				cause: result
			});
			return;
		}

		if (editor.isDestroyed) {
			controllers.delete(id);
			return;
		}

		// Read the mapped position before the finish transaction, then insert
		// at it. The widget occupies no space, so removing it cannot move the
		// insertion point.
		const position = pendingPosition(editor, id, at);
		finish();

		editor
			.chain()
			.insertContentAt(position, {
				type: 'image',
				attrs: {
					src: result.src,
					// `height` is not a node attribute: `width` alone plus the
					// stylesheet's `height: auto` reserves the right box
					// without storing a number that a re-encode can falsify.
					width: result.width ?? null,
					alt: null
				}
			})
			.run();
	} catch (error) {
		controllers.delete(id);

		// A cancelled upload is not a failure. The placeholder goes away and
		// nothing is reported — the user asked for this.
		if (isAbortError(error)) {
			dispatch({ type: 'finish', id });
			return;
		}

		// A failure keeps its placeholder, holding the position so Retry has
		// somewhere to put the image.
		dispatch({
			type: 'fail',
			id,
			message: `Could not upload ${file.name}.`
		});
		report({
			file,
			reason: 'adapter',
			message: `Could not upload ${file.name}.`,
			cause: error
		});
	}
};

export const createUploadExtension = (
	options: Partial<UploadExtensionOptions> = {}
) => UploadExtension.configure(options);
