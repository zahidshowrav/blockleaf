import type { Editor, EditorEvents, Extensions } from '@tiptap/core';
import { useEditor } from '@tiptap/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
	DEFAULT_CHANGE_DEBOUNCE_MS,
	EDITOR_CLASS_NAME,
	NORMALISATION_META,
	createExtensions,
	createUploadExtension,
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
export type IncompatibleDocumentPolicy = 'readonly' | 'discard';

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
	 * What to do with a `defaultValue` the editor cannot read — an
	 * unrecognised node or mark, or a structure the schema refuses. Tiptap's
	 * fallback is an empty document; this decides what happens to it.
	 *
	 * - `'readonly'` (default): the editor opens read-only whatever `editable`
	 *   says, and `onChange` and `onChangeImmediate` stay silent, so the empty
	 *   document can never be saved over the stored one. `onContentError`
	 *   still fires, so the host can say why.
	 * - `'discard'`: the empty document opens editable. The host has accepted
	 *   that whatever could not be read is gone.
	 *
	 * The prop is live: flipping it to `'discard'` after a confirmation
	 * unlocks the editor. Keeping an unknown block intact instead is `FC-03`;
	 * a newer `attrs.schemaVersion` joining the trigger is `FC-02`.
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
	const locked = unreadable && incompatibleDocument === 'readonly';
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
		autofocus,
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
			// fallback, not the author's. It must not reach a save path.
			if (unreadableRef.current && incompatibleDocument === 'readonly') {
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
	}, [onChange, onChangeImmediate, onContentError]);

	useEffect(() => {
		editorRef.current = editor;
	}, [editor]);

	useEffect(() => {
		editor?.setEditable(effectiveEditable);
	}, [editor, effectiveEditable]);

	useEffect(() => () => clearTimeout(timerRef.current), []);

	return editor;
};
