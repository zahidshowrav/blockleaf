export {
	createBlockActions,
	defaultBlockActions,
	resolveBlockActions
} from './actions.js';
export { BlockHandle, type BlockHandleComponentProps } from './block-handle.js';
export { BlockMenu } from './block-menu.js';
export {
	DRAG_HANDLE_PLUGIN_KEY,
	DragHandleExtension,
	createDragHandleExtension
} from './extension.js';
export {
	ArrowDownIcon,
	ArrowUpIcon,
	DuplicateIcon,
	GripIcon,
	PlusIcon,
	TrashIcon
} from './icons.js';
export { createDragHandlePlugin, type DragHandleController } from './plugin.js';
export type {
	BlockAction,
	BlockActionGroup,
	BlockHandleProps,
	BlockMenuProps,
	DragHandleOptions
} from './types.js';
