import type { ReactNode } from 'react';

/**
 * The box every live example sits in.
 *
 * Fixed height and its own scroll container, so an example that grows as you
 * type does not move the prose underneath it.
 */
export const ExampleFrame = ({
	caption,
	height = '22rem',
	children
}: {
	caption?: string;
	height?: string;
	children: ReactNode;
}) => (
	<div className="border-fd-border bg-fd-card not-prose my-6 overflow-hidden rounded-xl border">
		{caption ? (
			<p className="text-fd-muted-foreground border-fd-border flex h-9 items-center truncate border-b px-4 font-mono text-xs">
				{caption}
			</p>
		) : null}
		<div
			className="overflow-auto"
			style={{ height }}
		>
			{children}
		</div>
	</div>
);
