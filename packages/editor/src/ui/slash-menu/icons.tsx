import type { SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement>;

export const TextIcon = (props: IconProps) => (
	<svg
		viewBox="0 0 24 24"
		width="16"
		height="16"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		<path d="M4 7V4h16v3M9 20h6M12 4v16" />
	</svg>
);

export const Heading1Icon = (props: IconProps) => (
	<svg
		viewBox="0 0 24 24"
		width="16"
		height="16"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		<path d="M4 12h8M4 18V6M12 18V6M17 12l3-2v8" />
	</svg>
);

export const Heading2Icon = (props: IconProps) => (
	<svg
		viewBox="0 0 24 24"
		width="16"
		height="16"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		<path d="M4 12h8M4 18V6M12 18V6M21 18h-4c0-4 4-3 4-6 0-1.5-1-2.5-2.5-2.5-1.2 0-2 .7-2.3 1.7" />
	</svg>
);

export const Heading3Icon = (props: IconProps) => (
	<svg
		viewBox="0 0 24 24"
		width="16"
		height="16"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		<path d="M4 12h8M4 18V6M12 18V6M17.5 10.5c.7-.7 1.7-1 2.5-.5 1 .6 1 2 0 2.5M17.5 15.5c.7.7 1.7 1 2.5.5 1-.6 1-2 0-2.5" />
	</svg>
);

export const BulletListIcon = (props: IconProps) => (
	<svg
		viewBox="0 0 24 24"
		width="16"
		height="16"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		<line
			x1="8"
			y1="6"
			x2="21"
			y2="6"
		/>
		<line
			x1="8"
			y1="12"
			x2="21"
			y2="12"
		/>
		<line
			x1="8"
			y1="18"
			x2="21"
			y2="18"
		/>
		<line
			x1="3"
			y1="6"
			x2="3.01"
			y2="6"
		/>
		<line
			x1="3"
			y1="12"
			x2="3.01"
			y2="12"
		/>
		<line
			x1="3"
			y1="18"
			x2="3.01"
			y2="18"
		/>
	</svg>
);

export const OrderedListIcon = (props: IconProps) => (
	<svg
		viewBox="0 0 24 24"
		width="16"
		height="16"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		<line
			x1="10"
			y1="6"
			x2="21"
			y2="6"
		/>
		<line
			x1="10"
			y1="12"
			x2="21"
			y2="12"
		/>
		<line
			x1="10"
			y1="18"
			x2="21"
			y2="18"
		/>
		<path d="M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
	</svg>
);

export const TaskListIcon = (props: IconProps) => (
	<svg
		viewBox="0 0 24 24"
		width="16"
		height="16"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		<rect
			x="3"
			y="5"
			width="6"
			height="6"
			rx="1"
		/>
		<path d="m5 8 1 1 2-2M13 6h8M13 12h8M13 18h8M3 15h6M3 19h6" />
	</svg>
);

export const QuoteIcon = (props: IconProps) => (
	<svg
		viewBox="0 0 24 24"
		width="16"
		height="16"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		<path d="M3 21c3 0 7-1 7-8V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2 0 4-2 6-3 6m12 0c3 0 7-1 7-8V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2 0 4-2 6-3 6" />
	</svg>
);

export const CodeIcon = (props: IconProps) => (
	<svg
		viewBox="0 0 24 24"
		width="16"
		height="16"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		<polyline points="16 18 22 12 16 6" />
		<polyline points="8 6 2 12 8 18" />
	</svg>
);

export const CalloutIcon = (props: IconProps) => (
	<svg
		viewBox="0 0 24 24"
		width="16"
		height="16"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4" />
	</svg>
);

export const DividerIcon = (props: IconProps) => (
	<svg
		viewBox="0 0 24 24"
		width="16"
		height="16"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		<line
			x1="3"
			y1="12"
			x2="21"
			y2="12"
		/>
	</svg>
);

export const TableIcon = (props: IconProps) => (
	<svg
		viewBox="0 0 24 24"
		width="16"
		height="16"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		<rect
			width="18"
			height="18"
			x="3"
			y="3"
			rx="2"
		/>
		<path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
	</svg>
);

export const ImageIcon = (props: IconProps) => (
	<svg
		viewBox="0 0 24 24"
		width="16"
		height="16"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		<rect
			width="18"
			height="18"
			x="3"
			y="3"
			rx="2"
		/>
		<circle
			cx="9"
			cy="9"
			r="2"
		/>
		<path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" />
	</svg>
);
