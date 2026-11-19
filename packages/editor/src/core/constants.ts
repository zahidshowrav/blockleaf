/** Levels 1–3 only: deeper headings are a document-structure smell. */
export const HEADING_LEVELS = [1, 2, 3] as const;

/** Nesting cap for lists, enforced in M1. */
export const MAX_LIST_DEPTH = 3;

/** Default `onChange` debounce. Serialising on every keystroke janks long docs. */
export const DEFAULT_CHANGE_DEBOUNCE_MS = 300;

export const EDITOR_CLASS_NAME = 'blockleaf-editor';

/**
 * Marks a transaction the chrome dispatched to normalise the document rather
 * than to record a user edit — adding the trailing paragraph on load, for
 * one. `onChange` skips these: a document that was only opened has not
 * changed, and telling the host otherwise triggers an autosave on load.
 */
export const NORMALISATION_META = 'blockleafNormalisation';

/**
 * The upload extension's name. The slash menu checks for it to decide
 * whether to offer the image item: without an upload adapter the extension
 * is never added, so `openUploadPicker` would not exist.
 */
export const UPLOAD_EXTENSION_NAME = 'blockleafUpload';

/**
 * The table accessibility extension's name.
 *
 * Named so `BlockleafEditor` can hand it the resolved label set: it is built
 * by `createExtensions`, which knows nothing about labels, and the strings it
 * announces have to be translatable like the rest of the chrome.
 */
export const TABLE_A11Y_EXTENSION_NAME = 'blockleafTableAccessibility';

/**
 * The node types that carry a stable block id.
 *
 * Here rather than beside the extension list because `schema.ts` reads it,
 * and `schema.ts` is what a server imports for `createEmptyDocument` alone.
 * Importing it from `extensions.ts` would pull Tiptap, StarterKit and the
 * table kit into a 2 kB budget — none of which ship `sideEffects: false`, so
 * none of which would be shaken back out.
 */
export const BLOCK_NODE_TYPES = [
	'paragraph',
	'heading',
	'blockquote',
	'codeBlock',
	'horizontalRule',
	'bulletList',
	'orderedList',
	'listItem',
	'taskList',
	'taskItem',
	'callout',
	'image',
	'table'
] as const;

/**
 * The extension that keeps nodes and marks this editor does not know.
 *
 * Named so `BlockleafEditor` can hand it the resolved labels, and so the hook
 * can tell whether a host's own `extensions` array already carries it.
 */
export const UNKNOWN_CONTENT_EXTENSION_NAME = 'blockleafUnknownContent';

/**
 * The placeholder types an unknown node or mark is swapped for while the
 * document is open. They never reach storage: the swap is undone on the way
 * out, so a stored document never contains these names.
 */
export const UNKNOWN_BLOCK_NODE = 'blockleafUnknownBlock';
export const UNKNOWN_INLINE_NODE = 'blockleafUnknownInline';
export const UNKNOWN_MARK = 'blockleafUnknownMark';
