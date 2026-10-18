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
