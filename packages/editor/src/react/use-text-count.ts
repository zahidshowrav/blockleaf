import { type Editor } from '@tiptap/core';
import { useCurrentEditor } from '@tiptap/react';
import { useCallback, useRef, useSyncExternalStore } from 'react';

import {
	emptyTextCount,
	textCountBetween,
	textCountOf,
	type TextCounts
} from '../core/text-count.js';

/** What `useTextCount` returns: the document's count, and the selection's while there is one. */
export interface TextCountState extends TextCounts {
	/** The selected text's count, or `null` when nothing is selected. */
	selection: TextCounts | null;
}

const EMPTY: TextCountState = { ...emptyTextCount, selection: null };

interface Snapshot {
	doc: unknown;
	from: number;
	to: number;
	state: TextCountState;
}

/**
 * The open document's word and character counts, kept current as it is
 * edited, plus the selection's while text is selected.
 *
 * Each block's count is kept until that block changes, so a keystroke
 * recounts one block, not the document. Without an `editor`, it reads the
 * one it is rendered inside.
 *
 * ```tsx
 * const { words, selection } = useTextCount(editor);
 * ```
 */
export const useTextCount = (given?: Editor | null): TextCountState => {
	const { editor: current } = useCurrentEditor();
	const editor = given ?? current;
	const last = useRef<Snapshot | null>(null);

	const subscribe = useCallback(
		(notify: () => void) => {
			if (!editor) return () => undefined;
			editor.on('transaction', notify);
			return () => {
				editor.off('transaction', notify);
			};
		},
		[editor]
	);

	const read = useCallback((): TextCountState => {
		if (!editor || editor.isDestroyed) return EMPTY;
		const { doc, selection } = editor.state;
		const { from, to } = selection;
		const previous = last.current;
		if (
			previous?.doc === doc &&
			previous.from === from &&
			previous.to === to
		) {
			return previous.state;
		}
		const state: TextCountState = {
			...textCountOf(doc),
			selection: from === to ? null : textCountBetween(doc, from, to)
		};
		last.current = { doc, from, to, state };
		return state;
	}, [editor]);

	return useSyncExternalStore(subscribe, read, () => EMPTY);
};
