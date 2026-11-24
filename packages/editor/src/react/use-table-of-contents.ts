import { type Editor } from '@tiptap/core';
import { useCallback, useRef, useSyncExternalStore } from 'react';

import {
	sameTableOfContents,
	tableOfContentsOf,
	type TableOfContentsEntry
} from '../core/toc.js';

const EMPTY: TableOfContentsEntry[] = [];

/**
 * The open document's headings, kept current as it is edited (`PA-08`). For
 * a sidebar outline drawn outside the document; the in-document block is the
 * `tableOfContents` node.
 *
 * The array is the same object until the list itself changes, so typing in a
 * paragraph does not redraw the sidebar.
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
	editor: Editor | null | undefined
): TableOfContentsEntry[] => {
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
