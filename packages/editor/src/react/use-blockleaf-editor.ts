import type { Editor, Extensions } from '@tiptap/core';
import { useEditor } from '@tiptap/react';
import { useEffect, useMemo, useRef } from 'react';

import {
	DEFAULT_CHANGE_DEBOUNCE_MS,
	EDITOR_CLASS_NAME,
	NORMALISATION_META,
	createExtensions,
	withSchemaVersion,
	type BlockleafDocument,
	type PresetName
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
	label = 'Document'
}: UseBlockleafEditorOptions = {}): Editor | null => {
	const onChangeRef = useRef(onChange);
	const onChangeImmediateRef = useRef(onChangeImmediate);
	const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined
	);

	const resolvedExtensions = useMemo(
		() => extensions ?? createExtensions(preset),
		[extensions, preset]
	);

	const editor = useEditor({
		extensions: resolvedExtensions,
		content: defaultValue,
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
			const doc = withSchemaVersion(
				instance.getJSON() as BlockleafDocument
			);
			onChangeImmediateRef.current?.(doc);

			if (!onChangeRef.current) return;
			clearTimeout(timerRef.current);
			timerRef.current = setTimeout(
				() => onChangeRef.current?.(doc),
				debounceMs
			);
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
