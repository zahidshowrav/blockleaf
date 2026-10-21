import type { Editor, Extensions } from '@tiptap/core';
import { useEditor } from '@tiptap/react';
import { useEffect, useMemo, useRef } from 'react';

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
	label = 'Document',
	upload,
	uploadAccept,
	uploadMaxBytes,
	onUploadError
}: UseBlockleafEditorOptions = {}): Editor | null => {
	const onChangeRef = useRef(onChange);
	const onChangeImmediateRef = useRef(onChangeImmediate);
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
		editable,
		autofocus,
		// Next.js App Router hydrates on the client; rendering immediately is the
		// single most common Tiptap/SSR mismatch. Handle it rather than document it.
		immediatelyRender: false,
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
	}, [onChange, onChangeImmediate]);

	useEffect(() => {
		editor?.setEditable(editable);
	}, [editor, editable]);

	useEffect(() => () => clearTimeout(timerRef.current), []);

	return editor;
};
