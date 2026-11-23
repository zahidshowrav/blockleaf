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
	'details',
	'image',
	'table',
	'figure'
] as const;

/**
 * The name `@tiptap/extension-unique-id` registers under. Read to find its
 * options, so ids made outside it match the ones it makes.
 */
export const UNIQUE_ID_EXTENSION_NAME = 'uniqueID';

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

/**
 * The wrapper a captioned block lives in, and the caption itself (`F20`).
 * The caption is beside the block, not inside it: `prosemirror-tables` reads
 * every child of a `table` as a row.
 */
export const FIGURE_NODE = 'figure';
export const CAPTION_NODE = 'caption';

/** A toggle block: its first child is the title, the rest open and close (`F23`). */
export const DETAILS_NODE = 'details';

/**
 * An inline reference to a person, page or anything else a host can name
 * (`PA-02`). Stored as `{ id, label, kind }`; see `F24`. The node is in the
 * schema from version 2, but the editor only loads it from
 * `@blockleaf/editor/mentions`.
 */
export const MENTION_NODE = 'mention';

/** The suggestion extension that opens the mention picker. */
export const MENTIONS_EXTENSION_NAME = 'blockleafMentions';

/** What a mention shows before its label, in the editor and the renderer. */
export const MENTION_PREFIX = '@';

/** Subscript and superscript (`PA-07`): marks in the schema from version 2, loaded from `@blockleaf/editor/text-style`. */
export const SUBSCRIPT_MARK = 'subscript';
export const SUPERSCRIPT_MARK = 'superscript';

/**
 * Text alignment (`PA-06`, `F25`): an attribute on paragraphs and headings,
 * in the core schema so no editor drops it. `null` is the language's own
 * direction; these are the only other values a document stores.
 */
export const TEXT_ALIGNMENTS = ['left', 'center', 'right', 'justify'] as const;
export const TEXT_ALIGN_ATTRIBUTE_EXTENSION_NAME = 'blockleafTextAlign';
export const TEXT_ALIGN_TYPES = ['paragraph', 'heading'] as const;
/** The commands and shortcuts for `textAlign`, from `@blockleaf/editor/text-style`. */
export const TEXT_ALIGN_EXTENSION_NAME = 'textAlign';

/** The `:` picker that inserts an emoji as plain text (`PA-03`). */
export const EMOJI_EXTENSION_NAME = 'blockleafEmoji';

/**
 * Text colour (`PA-05`, `F18`, `F26`): a mark in the schema from version 2,
 * loaded from `@blockleaf/editor/text-style`. It stores a token, never a CSS
 * value; these are the ones the stylesheet defines and the picker offers.
 */
export const TEXT_COLOR_MARK = 'textColor';
export const TEXT_COLORS = [
	'gray',
	'brown',
	'orange',
	'yellow',
	'green',
	'blue',
	'purple',
	'pink',
	'red'
] as const;

/**
 * Font family (`PA-10`, `F26`): a token mark in the schema from version 2,
 * loaded from `@blockleaf/editor/text-style`. These are the families the
 * stylesheet defines and the picker offers; a host may define more.
 */
export const FONT_FAMILY_MARK = 'fontFamily';
export const FONT_FAMILIES = ['sans', 'serif', 'mono'] as const;

/**
 * What a style token may look like (`F18`): lower case, a letter first, at
 * most 32 characters. Checked wherever one is read, because it ends up inside
 * a `style` attribute and nothing that could close the `var()` may get there.
 * Here rather than beside the marks so the validator can use it without
 * importing Tiptap.
 */
export const STYLE_TOKEN = /^[a-z][a-z0-9-]{0,31}$/;
