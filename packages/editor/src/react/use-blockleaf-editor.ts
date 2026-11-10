import type { Editor, EditorEvents, Extensions } from '@tiptap/core';
import { useEditor } from '@tiptap/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
	DEFAULT_CHANGE_DEBOUNCE_MS,
	EDITOR_CLASS_NAME,
	IncompatibleDocumentError,
	NORMALISATION_META,
	createExtensions,
	createUploadExtension,
	newerSchemaVersion,
	withBlockIds,
	withSchemaVersion,
	type BlockleafDocument,
	type PresetName,
	type UploadAdapter,
	type UploadFailure
} from '../core/index.js';

export type ContentErrorProps = EditorEvents['contentError'];
export type ContentErrorCallback = (props: ContentErrorProps) => void;
/** See `UseBlockleafEditorOptions.incompatibleDocument`. */
export type IncompatibleDocumentPolicy = 'readonly' | 'discard' | 'throw';

export type UseBlockleafEditorOptions = {
	/**
	 * Initial content. The editor is **uncontrolled**: changing this prop later
	 * does nothing. A controlled ProseMirror fights its own transactions and
	 * destroys the undo stack — use `editor.commands.setContent()` instead.
	 */
	defaultValue?: BlockleafDocument;
	extensions?: Extensions;
	preset?: PresetName;
	/** Debounced (see `debounceMs`). */
	onChange?: (doc: BlockleafDocument) => void;
	/** Fires on every transaction — for "unsaved changes" indicators. */
	onChangeImmediate?: (doc: BlockleafDocument) => void;
	debounceMs?: number;
	editable?: boolean;
	autofocus?: boolean;
	/**
	 * What to do with a `defaultValue` the editor should not edit as it
	 * stands. Two things trigger it:
	 *
	 * - the document **cannot be read** — an unrecognised node or mark, or a
	 *   structure the schema refuses. Tiptap's fallback is an empty document.
	 * - its `attrs.schemaVersion` is **newer** than this editor's
	 *   `SCHEMA_VERSION`. It reads, but a newer editor wrote it, and saving it
	 *   from here would stamp it with an older version than it has.
	 *
	 * The policies:
	 *
	 * - `'readonly'` (default): the editor opens read-only whatever `editable`
	 *   says, and `onChange` and `onChangeImmediate` stay silent, so nothing
	 *   can be saved over the stored document. `onContentError` still fires,
	 *   so the host can say why.
	 * - `'discard'`: the editor opens editable — the empty fallback for an
	 *   unreadable document, the document itself for a newer one. The host
	 *   has accepted the loss.
	 * - `'throw'`: the hook throws an `IncompatibleDocumentError` during
	 *   render, for an error boundary to catch. Nothing is mounted.
	 *
	 * The prop is live: flipping it to `'discard'` after a confirmation
	 * unlocks the editor. Keeping an unknown block intact instead is `FC-03`.
	 */
	incompatibleDocument?: IncompatibleDocumentPolicy;
	/**
	 * Check content against the schema instead of letting Tiptap drop what
	 * does not fit behind a console warning. On by default: it is how the
	 * editor knows to lock itself (see `incompatibleDocument`).
	 *
	 * A failed check ends differently on each path. `defaultValue` fires
	 * `onContentError` and the editor opens with an **empty document**, the
	 * valid blocks gone with the unknown one. `insertContent` fires it and
	 * returns `false`. `setContent` throws, fires nothing, and leaves the
	 * document as it was — wrap that call.
	 *
	 * `false` restores Tiptap's own behaviour: the empty document opens
	 * editable, nothing fires, and nothing locks.
	 */
	enableContentCheck?: boolean;
	/**
	 * Only read when `enableContentCheck` is `false`: `insertContent` then
	 * still fires `onContentError`, and goes ahead with whatever could be
	 * parsed. It has no effect on `defaultValue` or `setContent`. Defaults to
	 * `true` when `onContentError` is given.
	 */
	emitContentError?: boolean;
	/**
	 * Called when content fails the schema check. For `defaultValue` the
	 * editor has already fallen back to an empty document and, unless
	 * `incompatibleDocument` says otherwise, locked itself by the time this
	 * runs. The job left for the host is to tell the user.
	 *
	 * Also called once, as the editor is created, for a `defaultValue` whose
	 * `schemaVersion` is newer than the editor's. The `error` is then an
	 * `IncompatibleDocumentError` with `reason: 'newer-version'`.
	 */
	onContentError?: ContentErrorCallback;
	/**
	 * Accessible name for the editing surface.
	 *
	 * A `contenteditable` is an ARIA textbox, and an unnamed one is read out
	 * as nothing at all — axe files it as `aria-input-field-name`. It is a
	 * prop rather than a constant because the right name depends on what the
	 * host is editing; `labels` in HD-02 will fold it into the wider i18n
	 * surface.
	 */
	label?: string;
	/**
	 * Where dropped, pasted and picked files go. Without it the editor has
	 * nowhere to put a file, and discards it with an `onUploadError` of
	 * `no-adapter` rather than failing silently.
	 */
	upload?: UploadAdapter;
	/** MIME patterns accepted, e.g. `['image/png', 'image/*']`. */
	uploadAccept?: string[];
	/** Largest file accepted, in bytes. */
	uploadMaxBytes?: number;
	/** Called for every rejected file and every failed upload. */
	onUploadError?: (failure: UploadFailure) => void;
};

const schemaVersionOf = (doc: unknown): number | undefined => {
	const version = (doc as { attrs?: { schemaVersion?: unknown } } | undefined)
		?.attrs?.schemaVersion;
	return typeof version === 'number' ? version : undefined;
};

export const useBlockleafEditor = ({
	defaultValue,
	extensions,
	preset = 'standard',
	onChange,
	onChangeImmediate,
	debounceMs = DEFAULT_CHANGE_DEBOUNCE_MS,
	editable = true,
	autofocus = false,
	enableContentCheck = true,
	emitContentError,
	onContentError,
	incompatibleDocument = 'readonly',
	label = 'Document',
	upload,
	uploadAccept,
	uploadMaxBytes,
	onUploadError
}: UseBlockleafEditorOptions = {}): Editor | null => {
	const onChangeRef = useRef(onChange);
	const onChangeImmediateRef = useRef(onChangeImmediate);
	const onContentErrorRef = useRef(onContentError);
	const editorRef = useRef<Editor | null>(null);
	// Set the moment Tiptap reports that `defaultValue` could not be read,
	// which happens inside the editor's constructor. The ref is for the
	// callbacks that can run before React has re-rendered with the state.
	const [unreadable, setUnreadable] = useState(false);
	const unreadableRef = useRef(false);
	// Read once, like `defaultValue` itself: the editor is uncontrolled.
	const [newerVersion] = useState(() => newerSchemaVersion(defaultValue));
	const incompatible = unreadable || newerVersion !== undefined;
	const locked = incompatible && incompatibleDocument === 'readonly';
	// `onUpdate` is the closure Tiptap was created with, and the policy is
	// live, so the callback reads it through a ref.
	const policyRef = useRef(incompatibleDocument);
	const effectiveEditable = editable && !locked;
	const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined
	);

	const resolvedExtensions = useMemo(() => {
		const base = extensions ?? createExtensions(preset);
		if (!upload) return base;
		// Only added when there is an adapter: the plugin's drop and
		// paste handlers swallow files, and swallowing them with nowhere
		// to put them would be worse than letting the browser refuse.
		return [
			...base,
			createUploadExtension({
				adapter: upload,
				...(uploadAccept ? { accept: uploadAccept } : {}),
				...(uploadMaxBytes ? { maxBytes: uploadMaxBytes } : {}),
				onError: onUploadError
			})
		];
	}, [
		extensions,
		preset,
		upload,
		uploadAccept,
		uploadMaxBytes,
		onUploadError
	]);

	// Ids are stamped here rather than left to `UniqueID`, which assigns
	// them one quadratic transaction step at a time once the document is
	// already inside ProseMirror. See `withBlockIds`.
	const content = useMemo(
		() => (defaultValue ? withBlockIds(defaultValue) : defaultValue),
		[defaultValue]
	);

	const editor = useEditor({
		extensions: resolvedExtensions,
		content,
		editable: effectiveEditable,
		// Autofocus is done in `onCreate` below rather than handed to Tiptap.
		// On Android, iOS and desktop Safari Tiptap's `focus` command focuses
		// the DOM synchronously, which makes its own focus plugin dispatch a
		// transaction before the command's one, and the command's one then
		// throws "Applying a mismatched transaction". The throw happens inside
		// Tiptap's mount timer, ahead of `create`, so the event never fires
		// and `TrailingNodeOnLoad` never runs. Tiptap issue 8546; drop this
		// once a pinned release has it fixed.
		autofocus: false,
		onCreate: ({ editor: instance }) => {
			if (newerVersion !== undefined) {
				// The document read, so Tiptap reported nothing. Say why the
				// editor is locked through the same callback as the other case.
				onContentErrorRef.current?.({
					editor: instance,
					error: new IncompatibleDocumentError(
						'newer-version',
						newerVersion
					),
					disableCollaboration: () => {}
				});
			}
			if (!autofocus) return;
			// Focusing the DOM first lets the focus plugin's transaction land
			// on its own. The command then finds the view focused and dispatches
			// against the state that produced.
			instance.view.focus();
			instance.commands.focus(autofocus);
		},
		// Next.js App Router hydrates on the client; rendering immediately is the
		// single most common Tiptap/SSR mismatch. Handle it rather than document it.
		immediatelyRender: false,
		enableContentCheck,
		emitContentError: emitContentError ?? Boolean(onContentError),
		onContentError: (props) => {
			// The initial document fails inside the constructor, before this
			// hook has been handed an editor. A failure that arrives once it
			// has one came from `insertContent`, and that locks nothing.
			if (editorRef.current === null) {
				unreadableRef.current = true;
				setUnreadable(true);
			}
			onContentErrorRef.current?.(props);
		},
		editorProps: {
			attributes: {
				class: `${EDITOR_CLASS_NAME}__content`,
				'aria-label': label
			}
		},
		onUpdate: ({ editor: instance, transaction }) => {
			// Normalising the document on load is not a user edit. The meta
			// catches the transaction itself; the step check catches the
			// empty transaction ProseMirror appends after it, which is what
			// Tiptap actually hands this callback.
			if (transaction.getMeta(NORMALISATION_META)) return;
			if (!transaction.docChanged) return;
			// Locked means the document in the editor is Tiptap's empty
			// fallback, or one a newer editor wrote. Neither may reach a
			// save path. The ref covers the constructor, before React has
			// re-rendered with `unreadable`.
			if (
				(unreadableRef.current || newerVersion !== undefined) &&
				policyRef.current === 'readonly'
			) {
				return;
			}

			// The one cast in the package, and the right place for it: Tiptap's
			// JSONContent is `any`-typed, so this is where a loose shape becomes the
			// documented contract. M1 validates here instead of asserting.
			const serialise = () =>
				withSchemaVersion(instance.getJSON() as BlockleafDocument);

			onChangeImmediateRef.current?.(serialise());

			if (!onChangeRef.current) return;
			clearTimeout(timerRef.current);
			// Serialised inside the timer, not before it. Serialising on every
			// keystroke and then debouncing only the delivery is what the
			// debounce exists to avoid — the whole document is walked either
			// way, and on a long one that is the keystroke's cost.
			timerRef.current = setTimeout(() => {
				if (instance.isDestroyed) return;
				onChangeRef.current?.(serialise());
			}, debounceMs);
		}
	});

	useEffect(() => {
		onChangeRef.current = onChange;
		onChangeImmediateRef.current = onChangeImmediate;
		onContentErrorRef.current = onContentError;
		policyRef.current = incompatibleDocument;
	}, [onChange, onChangeImmediate, onContentError, incompatibleDocument]);

	useEffect(() => {
		editorRef.current = editor;
	}, [editor]);

	useEffect(() => {
		editor?.setEditable(effectiveEditable);
	}, [editor, effectiveEditable]);

	useEffect(() => () => clearTimeout(timerRef.current), []);

	// Thrown during render rather than from a callback, so it reaches the
	// host's error boundary. A newer version is known before the editor
	// exists; an unreadable one only once Tiptap has tried to parse it.
	if (incompatible && incompatibleDocument === 'throw') {
		throw new IncompatibleDocumentError(
			unreadable ? 'unreadable' : 'newer-version',
			newerVersion ?? schemaVersionOf(defaultValue)
		);
	}

	return editor;
};
