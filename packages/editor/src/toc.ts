/**
 * The table of contents and the word count, as an opt-in subpath.
 *
 * The `tableOfContents` node is in the stored schema from version 2, but an
 * editor that never lists its headings should not ship it. Importing from
 * here is what adds the block and its slash-menu entry. An editor without it
 * keeps a stored table of contents as a placeholder and saves it back
 * unchanged.
 *
 * ```ts
 * import { presets } from '@blockleaf/editor/extensions';
 * import { withTableOfContents } from '@blockleaf/editor/toc';
 *
 * const extensions = withTableOfContents(presets.standard());
 * ```
 *
 * The word count is React and needs no extension: put `<TextCount />` inside
 * `BlockleafEditor`, or call `useTextCount`.
 */
export { TABLE_OF_CONTENTS_NODE } from './core/constants.js';
export {
	TableOfContents,
	createTableOfContents,
	withTableOfContents,
	type TableOfContentsOptions
} from './core/nodes/table-of-contents.js';
export { getTableOfContents, type TableOfContentsEntry } from './core/toc.js';
export { useTableOfContents } from './react/use-table-of-contents.js';
export { countText, type TextCounts } from './core/text-count.js';
export { useTextCount, type TextCountState } from './react/use-text-count.js';
export { TextCount, type TextCountProps } from './ui/text-count/text-count.js';
