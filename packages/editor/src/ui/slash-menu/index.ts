export {
	BulletListIcon,
	CalloutIcon,
	CodeIcon,
	DividerIcon,
	Heading1Icon,
	Heading2Icon,
	Heading3Icon,
	OrderedListIcon,
	QuoteIcon,
	TableIcon,
	TaskListIcon,
	TextIcon,
	type IconProps
} from './icons.js';
export {
	CommandRegistry,
	createCommandRegistry,
	defaultSlashCommands,
	type AddCommandOptions
} from './registry.js';
export { SlashMenu } from './slash-menu.js';
export { SlashMenuExtension, createSlashMenuExtension } from './extension.js';
export type {
	SlashCommand,
	SlashCommandGroup,
	SlashMenuOptions,
	SlashMenuProps,
	SlashMenuRef
} from './types.js';
