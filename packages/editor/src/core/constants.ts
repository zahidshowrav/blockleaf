/** Levels 1–3 only: deeper headings are a document-structure smell. */
export const HEADING_LEVELS = [1, 2, 3] as const;

/** Nesting cap for lists, enforced in M1. */
export const MAX_LIST_DEPTH = 3;

/** Default `onChange` debounce. Serialising on every keystroke janks long docs. */
export const DEFAULT_CHANGE_DEBOUNCE_MS = 300;

export const EDITOR_CLASS_NAME = 'blockleaf-editor';
