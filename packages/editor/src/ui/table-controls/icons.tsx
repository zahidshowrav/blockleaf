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

export const InsertAboveIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="M12 3v6M9 6h6M3 13h18M3 13v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6" />
	</svg>
);

export const InsertBelowIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="M12 21v-6M9 18h6M3 11h18M3 11V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" />
	</svg>
);

export const InsertLeftIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="M3 12h6M6 9v6M13 3v18M13 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
	</svg>
);

export const InsertRightIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="M21 12h-6M18 9v6M11 3v18M11 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
	</svg>
);

export const HeaderIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<rect
			x="3"
			y="4"
			width="18"
			height="16"
			rx="2"
		/>
		<path d="M3 9h18" />
	</svg>
);

export const MergeIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="M3 5h18M3 19h18M8 12h8M8 12l3-3M8 12l3 3M16 12l-3-3M16 12l-3 3" />
	</svg>
);

export const SplitIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="M3 5h18M3 19h18M12 8v8M8 12H4M8 12l2-2M8 12l2 2M16 12h4M16 12l-2-2M16 12l-2 2" />
	</svg>
);

export const DeleteTableIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<rect
			x="3"
			y="4"
			width="18"
			height="16"
			rx="2"
		/>
		<path d="M9 9l6 6M15 9l-6 6" />
	</svg>
);

export type { IconProps };
