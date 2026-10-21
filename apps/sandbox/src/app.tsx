import { useState } from 'react';

import {
	BlockleafEditor,
	SCHEMA_VERSION,
	createEmptyDocument
} from '@blockleaf/editor';
import type {
	BlockleafDocument,
	BlockleafLabels,
	UploadFailure
} from '@blockleaf/editor';

import { sandboxUpload } from './upload-adapter.js';

import '@blockleaf/editor/styles.css';

/**
 * Not a demo — a workbench. It exists so extension work has a fast reload loop
 * without booting the docs site. The polished demo lives in apps/docs (M4).
 */
/**
 * A deliberately partial translation, reached with `?fr`.
 *
 * Partial because that is the claim worth exercising: anything left out keeps
 * its English default. Defined at module scope because `labels` is in the
 * extension memo's dependencies, so an inline object would rebuild the chrome
 * on every render.
 */
const FRENCH: BlockleafLabels = {
	blockTypes: { 'heading-1': 'Titre 1' },
	slashMenu: { menu: 'Commandes', groups: { headings: 'Titres' } },
	blockMenu: { menu: 'Actions du bloc', handle: 'Actions du bloc' },
	link: { address: 'Adresse du lien' },
	upload: { cancel: 'Annuler' }
};

const params =
	typeof window === 'undefined'
		? new URLSearchParams()
		: new URLSearchParams(window.location.search);

const labels = params.has('fr') ? FRENCH : undefined;

/**
 * A table whose columns are wider than a phone, reached with `?wide`.
 *
 * Stored `colwidth` is the author's and a narrow screen does not get to
 * overrule it, so proving the table scrolls instead of cutting the document
 * off needs a document that is genuinely too wide to start with.
 */
const COLUMN_WIDTH = 260;

const wideTableDocument = (): BlockleafDocument => ({
	...createEmptyDocument(),
	content: [
		{
			type: 'table',
			content: [0, 1].map((row) => ({
				type: 'tableRow' as const,
				content: [0, 1, 2].map((column) => ({
					type: (row === 0 ? 'tableHeader' : 'tableCell') as
						'tableHeader' | 'tableCell',
					attrs: { colwidth: [COLUMN_WIDTH] },
					content: [
						{
							type: 'paragraph' as const,
							content: [
								{
									type: 'text' as const,
									text: `r${row + 1}c${column + 1}`
								}
							]
						}
					]
				}))
			}))
		}
	]
});

/**
 * A document of `?blocks=N` paragraphs, for measuring against a long one.
 *
 * Paragraphs rather than a mix, because the point is the count: a block the
 * editor has to lay out, map positions through and serialise is the unit that
 * HD-05 cares about, and the cheapest one is the honest floor.
 */
const longDocument = (blocks: number): BlockleafDocument => ({
	...createEmptyDocument(),
	content: Array.from({ length: blocks }, (_, index) => ({
		type: 'paragraph' as const,
		// `?ids=0` leaves them off, which is what an imported document looks
		// like; a document that was saved by this editor already has them.
		attrs: params.get('ids') === '0' ? undefined : { id: `block-${index}` },
		content: [
			{
				type: 'text' as const,
				text: `Block ${index + 1}. The quick brown fox jumps over the lazy dog.`
			}
		]
	}))
});

const initialDocument = () => {
	const blocks = Number(params.get('blocks'));
	if (Number.isFinite(blocks) && blocks > 0) return longDocument(blocks);
	return params.has('wide') ? wideTableDocument() : createEmptyDocument();
};

export const App = () => {
	const [doc, setDoc] = useState<BlockleafDocument>(initialDocument);
	const [dirty, setDirty] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);

	return (
		<main className="sandbox">
			<header className="sandbox__bar">
				<h1>Blockleaf sandbox</h1>
				<span className="sandbox__status">
					schema v{SCHEMA_VERSION} · {dirty ? 'typing…' : 'settled'}
				</span>
				{uploadError ? (
					<span
						className="sandbox__upload-error"
						role="alert"
					>
						{uploadError}
					</span>
				) : null}
			</header>

			<section className="sandbox__panes">
				<div className="sandbox__pane">
					<BlockleafEditor
						defaultValue={doc}
						labels={labels}
						autofocus
						upload={sandboxUpload}
						onUploadError={(failure: UploadFailure) =>
							setUploadError(failure.message)
						}
						onChangeImmediate={
							params.get('immediate') === '0'
								? undefined
								: () => setDirty(true)
						}
						onChange={(next) => {
							setDoc(next);
							setDirty(false);
						}}
					/>
				</div>

				{/*
				 * `?json=0` leaves it out. Re-stringifying a long document on
				 * every change is the workbench's own cost, and it swamps the
				 * editor's when something is being measured.
				 */}
				{params.get('json') === '0' ? null : (
					<pre className="sandbox__pane sandbox__json">
						{JSON.stringify(doc, null, 2)}
					</pre>
				)}
			</section>
		</main>
	);
};
