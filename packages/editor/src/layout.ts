/**
 * Columns, as an opt-in subpath: blocks side by side, two to four in a row.
 *
 * The `columns` and `column` nodes are in the stored schema from version 2,
 * but an editor that never lays blocks out side by side should not ship
 * them. Importing from here adds the blocks, and the slash menu's
 * two- and three-column items appear. An editor without it keeps stored
 * columns as a placeholder and saves them back unchanged.
 *
 * ```ts
 * import { presets } from '@blockleaf/editor/extensions';
 * import { withLayout } from '@blockleaf/editor/layout';
 *
 * const extensions = withLayout(presets.standard());
 * ```
 */
export { COLUMN_NODE, COLUMNS_NODE } from './core/constants.js';
export {
	Column,
	Columns,
	MAX_COLUMNS,
	createLayout,
	withLayout,
	type ColumnsOptions
} from './core/nodes/columns.js';
