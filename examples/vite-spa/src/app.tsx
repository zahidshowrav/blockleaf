import { useCallback, useMemo, useState } from 'react';

import { BlockleafEditor, createEmptyDocument } from '@blockleaf/editor';
import type { BlockleafDocument } from '@blockleaf/editor';
import { RenderDocument, extractHeadings } from '@blockleaf/renderer/react';

import { load, save } from './storage.js';

import '@blockleaf/editor/styles.css';

type Mode = 'write' | 'read';
type Theme = 'light' | 'dark';

/**
 * The smallest app that tells the whole story: write a document, store it as
 * JSON, and read it back without the editor.
 *
 * The reading half imports `@blockleaf/renderer`, which has no ProseMirror in
 * it at all. That is the point of storing a document rather than HTML — the
 * thing that renders it a thousand times does not have to carry the thing
 * that wrote it once.
 */
export const App = () => {
	const [doc, setDoc] = useState<BlockleafDocument>(
		() => load() ?? createEmptyDocument()
	);
	const [saved, setSaved] = useState<BlockleafDocument | null>(load);
	const [mode, setMode] = useState<Mode>('write');
	const [theme, setTheme] = useState<Theme>('light');

	const publish = useCallback(() => {
		save(doc);
		setSaved(doc);
		setMode('read');
	}, [doc]);

	// Straight off the stored JSON: no editor, no DOM, no parsing of HTML.
	// A sidebar, a search index and a table of contents are all this shape.
	const headings = useMemo(
		() => (saved ? extractHeadings(saved) : []),
		[saved]
	);

	const unpublished = saved !== doc;

	return (
		<main
			className="app"
			data-theme={theme}
		>
			<header className="app__bar">
				<h1>Write, store, publish</h1>

				<div
					className="app__modes"
					role="group"
					aria-label="View"
				>
					<button
						type="button"
						aria-pressed={mode === 'write'}
						onClick={() => setMode('write')}
					>
						Write
					</button>
					<button
						type="button"
						aria-pressed={mode === 'read'}
						disabled={!saved}
						onClick={() => setMode('read')}
					>
						Read
					</button>
				</div>

				<button
					type="button"
					onClick={() =>
						setTheme(theme === 'light' ? 'dark' : 'light')
					}
				>
					{theme === 'light' ? 'Dark' : 'Light'} theme
				</button>

				<button
					type="button"
					className="app__publish"
					disabled={!unpublished}
					onClick={publish}
				>
					{unpublished ? 'Publish' : 'Published'}
				</button>
			</header>

			{mode === 'write' ? (
				<section className="app__panel">
					<BlockleafEditor
						defaultValue={doc}
						data-theme={theme}
						onChange={setDoc}
						placeholder="Write something, then press Publish."
					/>
				</section>
			) : (
				<section className="app__panel app__panel--read">
					{headings.length > 0 && (
						<nav
							className="app__toc"
							aria-label="Contents"
						>
							<p className="app__toc-title">Contents</p>
							<ol>
								{headings.map((heading, index) => (
									<li
										key={heading.id ?? index}
										data-level={heading.level}
									>
										{heading.text}
									</li>
								))}
							</ol>
						</nav>
					)}

					<article className="blockleaf-editor__content">
						{saved && <RenderDocument doc={saved} />}
					</article>
				</section>
			)}
		</main>
	);
};
