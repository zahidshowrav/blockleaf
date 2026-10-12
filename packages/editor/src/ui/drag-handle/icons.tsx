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

export const GripIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		strokeWidth="0"
		fill="currentColor"
		{...props}
	>
		<circle
			cx="9"
			cy="6"
			r="1.6"
		/>
		<circle
			cx="15"
			cy="6"
			r="1.6"
		/>
		<circle
			cx="9"
			cy="12"
			r="1.6"
		/>
		<circle
			cx="15"
			cy="12"
			r="1.6"
		/>
		<circle
			cx="9"
			cy="18"
			r="1.6"
		/>
		<circle
			cx="15"
			cy="18"
			r="1.6"
		/>
	</svg>
);

export const PlusIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="M12 5v14M5 12h14" />
	</svg>
);

export const TrashIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" />
	</svg>
);

export const DuplicateIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<rect
			x="9"
			y="9"
			width="12"
			height="12"
			rx="2"
		/>
		<path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
	</svg>
);

export const ArrowUpIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="M12 19V5M5 12l7-7 7 7" />
	</svg>
);

export const ArrowDownIcon = (props: IconProps) => (
	<svg
		{...strokeProps}
		{...props}
	>
		<path d="M12 5v14M19 12l-7 7-7-7" />
	</svg>
);

export type { IconProps };
