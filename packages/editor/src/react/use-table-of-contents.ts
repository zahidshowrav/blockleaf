import { type Editor } from '@tiptap/core';
import { useCurrentEditor } from '@tiptap/react';
import { useCallback, useRef, useSyncExternalStore } from 'react';

import {
	sameTableOfContents,
	tableOfContentsOf,
	type TableOfContentsEntry
} from '../core/toc.js';

const EMPTY: TableOfContentsEntry[] = [];

/**
 * The open document's headings, kept current as it is edited. For
 * a sidebar outline drawn outside the document; the in-document block is the
 * `tableOfContents` node.
 *
 * The array is the same object until the list itself changes, so typing in a
 * paragraph does not redraw the sidebar. Without an `editor`, it reads the
 * one it is rendered inside: a child of `BlockleafEditor` needs no prop.
 *
 * ```tsx
 * const headings = useTableOfContents(editor);
 * headings.map((heading) => (
 * 	<button onClick={() => editor.commands.goToHeading(heading.id)}>
 * 		{heading.text}
 * 	</button>
 * ));
 * ```
 */
export const useTableOfContents = (
	given?: Editor | null
): TableOfContentsEntry[] => {
	const { editor: current } = useCurrentEditor();
	const editor = given ?? current;
	const last = useRef<TableOfContentsEntry[]>(EMPTY);

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

	const read = useCallback((): TableOfContentsEntry[] => {
		const next =
			editor && !editor.isDestroyed
				? tableOfContentsOf(editor.state.doc)
				: EMPTY;
		if (sameTableOfContents(last.current, next)) return last.current;
		last.current = next;
		return next;
	}, [editor]);

	return useSyncExternalStore(subscribe, read, () => EMPTY);
};
