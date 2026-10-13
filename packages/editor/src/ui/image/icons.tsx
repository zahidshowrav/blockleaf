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

export const AlignLeftIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="M3 5h18M3 19h18M3 9h10M3 15h10" />
	</svg>
);

export const AlignCenterIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="M3 5h18M3 19h18M7 9h10M7 15h10" />
	</svg>
);

export const AlignRightIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="M3 5h18M3 19h18M11 9h10M11 15h10" />
	</svg>
);

export const AltTextIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="M4 20V8l4 8 4-8v12M15 20V4M15 12h4a4 4 0 0 1 0 8h-4" />
	</svg>
);
