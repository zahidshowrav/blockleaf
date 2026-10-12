import type { IconProps } from '../slash-menu/icons.js';

const strokeProps = {
	viewBox: '0 0 24 24',
	width: '16',
	height: '16',
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: '2',
	strokeLinecap: 'round',
	strokeLinejoin: 'round'
} as const;

export const BoldIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="M6 4h7a4 4 0 0 1 0 8H6zM6 12h8a4 4 0 0 1 0 8H6z" />
	</svg>
);

export const ItalicIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="M19 4h-9M14 20H5M15 4 9 20" />
	</svg>
);

export const UnderlineIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="M6 4v6a6 6 0 0 0 12 0V4M4 21h16" />
	</svg>
);

export const StrikeIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="M4 12h16M16 6.5A4 4 0 0 0 12 4h-1a3.5 3.5 0 0 0-1.6 6.6M8 17.5A4 4 0 0 0 12 20h1a3.5 3.5 0 0 0 2.5-6" />
	</svg>
);

export const InlineCodeIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="m9 18-6-6 6-6M15 6l6 6-6 6" />
	</svg>
);

export const HighlightIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="m9 11 4-4 5 5-4 4zM7.5 12.5 5 19l6.5-2.5M4 21h16" />
	</svg>
);

export const LinkIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
		<path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
	</svg>
);

export const UnlinkIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="M17 7l1-1a5 5 0 0 1 7 7M7 17l-1 1a5 5 0 0 1-7-7" />
		<path d="M8 8l8 8M4 4l16 16" />
	</svg>
);

export const CheckIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="m20 6-11 11-5-5" />
	</svg>
);

export const ExternalLinkIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
		<path d="M15 3h6v6M10 14 21 3" />
	</svg>
);

export type { IconProps };
