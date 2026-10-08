export {
  HEADING_LEVELS,
  MAX_LIST_DEPTH,
  DEFAULT_CHANGE_DEBOUNCE_MS,
  EDITOR_CLASS_NAME,
} from './constants.js';
export { createExtensions, presets, type PresetName } from './extensions.js';
export {
  SCHEMA_VERSION,
  createEmptyDocument,
  isBlockleafDocument,
  withSchemaVersion,
  type BlockleafDocument,
  type BlockleafMark,
  type BlockleafNode,
} from './schema.js';
