'use client';

import { useState } from 'react';

import { BlockleafEditor, type BlockleafDocument } from '@blockleaf/editor';
import { RenderDocument } from '@blockleaf/renderer/react';

import { ExampleFrame } from '@/components/examples/example-frame';
import { sampleDocument } from '@/components/examples/sample-document';

/**
 * The same document through both packages, side by side. The right-hand pane
 * is what a server component would send — no editor, no ProseMirror.
 */
export const ReadOnlyExample = () => {
	const [doc, setDoc] = useState<BlockleafDocument>(sampleDocument);

	return (
		<ExampleFrame caption="left: the editor · right: @blockleaf/renderer on the same document">
			<div className="divide-fd-border grid h-full grid-cols-1 divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
				<div className="overflow-auto">
					<BlockleafEditor
						className="min-h-full px-4 py-3"
						defaultValue={sampleDocument}
						onChangeImmediate={setDoc}
					/>
				</div>
				<div className="overflow-auto">
					<div className="blockleaf-editor min-h-full px-4 py-3">
						<div className="blockleaf-editor__content">
							<RenderDocument doc={doc} />
						</div>
					</div>
				</div>
			</div>
		</ExampleFrame>
	);
};
