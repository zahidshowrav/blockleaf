'use client';

import { BlockleafEditor } from '@blockleaf/editor';

import { ExampleFrame } from '@/components/examples/example-frame';

/** The smallest thing that works: a `minimal` preset with no chrome but the bubble menu. */
export const MinimalExample = () => (
	<ExampleFrame
		caption="preset=minimal — paragraphs and inline marks, nothing else"
		height="14rem"
	>
		<BlockleafEditor
			className="min-h-full px-4 py-3"
			preset="minimal"
			placeholder="Leave a comment…"
			label="Comment"
			dragHandle={false}
			slashMenu={false}
		/>
	</ExampleFrame>
);
