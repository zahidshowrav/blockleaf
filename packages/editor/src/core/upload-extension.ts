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
};

export type UploadState = {
	pending: PendingUpload[];
};

type UploadMeta =
	| { type: 'start'; id: string; name: string; pos: number }
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
const renderPlaceholder = (entry: PendingUpload) => (): HTMLElement => {
	const element = document.createElement('div');
	element.className = 'blockleaf-upload';
	element.dataset.uploadId = entry.id;
	element.setAttribute('role', 'status');
	element.setAttribute('aria-live', 'polite');
	element.textContent = `Uploading ${entry.name}…`;
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
										pos: meta.pos
									}
								]
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
									renderPlaceholder(entry),
									{ side: -1, key: entry.id }
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

const uploadOne = async (
	editor: Editor,
	controllers: Map<string, AbortController>,
	adapter: UploadAdapter,
	file: File,
	at: number,
	report: (failure: UploadFailure) => void
): Promise<void> => {
	const id = nextUploadId();
	const controller = new AbortController();
	controllers.set(id, controller);

	editor.view.dispatch(
		editor.view.state.tr.setMeta(UPLOAD_PLUGIN_KEY, {
			type: 'start',
			id,
			name: file.name,
			pos: at
		})
	);

	const finish = () => {
		controllers.delete(id);
		if (editor.isDestroyed) return;
		editor.view.dispatch(
			editor.view.state.tr.setMeta(UPLOAD_PLUGIN_KEY, {
				type: 'finish',
				id
			})
		);
	};

	try {
		const result = await adapter.upload(file, {
			signal: controller.signal
		});

		if (!isUploadResult(result)) {
			finish();
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
		finish();
		// A cancelled upload is not a failure and must not be reported as
		// one. See `isAbortError`.
		if (isAbortError(error)) return;
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
