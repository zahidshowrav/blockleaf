'use client';

import { useState } from 'react';

import { BlockleafEditor, type BlockleafDocument } from '@blockleaf/editor';

import { demoDocument } from '@/components/demo-document';

/**
 * The landing page's whole argument, above the fold: a real editor on the
 * left, the document it produces on the right, updating as you type.
 *
 * No screenshot and no video, because the claim being made is that the thing
 * works and gives you clean JSON, and both halves of that are checkable here
 * in about four seconds.
 */
export const LiveDemo = () => {
	const [doc, setDoc] = useState<BlockleafDocument>(demoDocument);

	return (
		<div className="grid w-full gap-4 lg:grid-cols-[1.15fr_1fr]">
			<div className="bl-demo-pane min-h-[26rem] overflow-y-auto">
				<BlockleafEditor
					defaultValue={demoDocument}
					onChangeImmediate={setDoc}
				/>
			</div>

			<div className="bl-demo-pane max-h-[26rem] overflow-auto p-0">
				<div className="text-fd-muted-foreground border-fd-border bg-fd-muted/40 sticky top-0 border-b px-4 py-2 font-mono text-xs">
					the document, live
				</div>
				<pre className="overflow-x-auto p-4 text-xs leading-relaxed">
					<code>{JSON.stringify(doc, null, 2)}</code>
				</pre>
			</div>
		</div>
	);
};
