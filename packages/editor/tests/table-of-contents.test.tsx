import { act, render, waitFor } from '@testing-library/react';
import {
	Editor,
	getSchema,
	type Extensions,
	type JSONContent
} from '@tiptap/core';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { UNKNOWN_BLOCK_NODE } from '../src/core/constants.js';
import { createExtensions } from '../src/core/extensions.js';
import { resolveLabels } from '../src/core/labels.js';
import {
	createEmptyDocument,
	withSchemaVersion,
	type BlockleafDocument,
	type BlockNode
} from '../src/core/schema.js';
import { tableOfContentsOf } from '../src/core/toc.js';
import {
	unwrapUnknownContent,
	wrapUnknownContent
} from '../src/core/unknown-content.js';
import { BlockleafEditor, createCommandRegistry } from '../src/index.js';
import {
	TABLE_OF_CONTENTS_NODE,
	TableOfContents,
	createTableOfContents,
	getTableOfContents,
	useTableOfContents,
	withTableOfContents,
	type TableOfContentsEntry
} from '../src/toc.js';
import { validateDocument } from '../src/validate.js';

const heading = (level: 1 | 2 | 3, text: string, id?: string): JSONContent => ({
	type: 'heading',
	attrs: { level, ...(id ? { id } : {}) },
	content: text ? [{ type: 'text', text }] : []
});

const paragraph = (text: string): JSONContent => ({
	type: 'paragraph',
	content: [{ type: 'text', text }]
});

const toc = (id = 't1'): JSONContent => ({
	type: TABLE_OF_CONTENTS_NODE,
	attrs: { id }
});

const docOf = (...content: JSONContent[]): BlockleafDocument => ({
	...createEmptyDocument(),
	content: content as BlockNode[]
});

// jsdom has no layout, so a `Range` cannot measure itself, and going to a
// heading scrolls the caret into view. An empty rect is enough to scroll by.
beforeAll(() => {
	const empty = () => new DOMRect();
	Range.prototype.getBoundingClientRect ??= empty;
	Range.prototype.getClientRects ??= () =>
		({ length: 0, item: () => null }) as unknown as DOMRectList;
});

let editor: Editor | null = null;

const openEditor = (
	content: JSONContent[],
	extensions: Extensions = withTableOfContents(createExtensions('standard'))
): Editor => {
	const element = document.createElement('div');
	document.body.append(element);
	editor = new Editor({ element, extensions, content: docOf(...content) });
	return editor;
};

afterEach(() => {
	editor?.destroy();
	editor = null;
	document.body.replaceChildren();
});

const block = (instance: Editor): HTMLElement => {
	const found =
		instance.view.dom.querySelector<HTMLElement>('nav.blockleaf-toc');
	if (!found) throw new Error('no table of contents drawn');
	return found;
};

const linkTexts = (instance: Editor): string[] =>
	Array.from(block(instance).querySelectorAll('a')).map(
		(link) => link.textContent ?? ''
	);

describe('table of contents (PA-08)', () => {
	describe('stored shape (F27)', () => {
		it('stores nothing but its id, and saves back unchanged', () => {
			const instance = openEditor([toc(), heading(1, 'Intro', 'h1')]);

			expect(instance.getJSON().content?.[0]).toEqual(toc());
			expect(() =>
				validateDocument(withSchemaVersion(instance.getJSON()))
			).not.toThrow();
		});

		it('is given a block id when inserted', () => {
			const instance = openEditor([paragraph('x')]);
			instance.commands.setTextSelection(1);
			instance.commands.insertTableOfContents();

			const inserted = instance
				.getJSON()
				.content?.find((node) => node.type === TABLE_OF_CONTENTS_NODE);
			expect(typeof inserted?.attrs?.id).toBe('string');
		});

		it('writes an empty, named nav, and reads it back', () => {
			const instance = openEditor([toc(), heading(1, 'Intro', 'h1')]);
			const html = instance.getHTML();

			expect(html).toContain(
				'<nav data-id="t1" data-type="tableOfContents" class="blockleaf-toc" aria-label="Table of contents"></nav>'
			);

			instance.commands.setContent(html);
			expect(instance.getJSON().content?.[0]?.type).toBe(
				TABLE_OF_CONTENTS_NODE
			);
		});

		it('validates in a table cell, as the editor allows one there', () => {
			const doc = withSchemaVersion({
				content: [
					{
						type: 'table',
						content: [
							{
								type: 'tableRow',
								content: [
									{
										type: 'tableCell',
										content: [
											{ type: TABLE_OF_CONTENTS_NODE }
										]
									}
								]
							}
						]
					}
				]
			});
			expect(() => validateDocument(doc)).not.toThrow();
		});

		it('is kept as a placeholder by an editor without the subpath', () => {
			const extensions = createExtensions('standard');
			const stored = docOf(toc(), heading(1, 'Intro', 'h1'));
			editor = new Editor({
				extensions,
				content: wrapUnknownContent(stored, getSchema(extensions))
			});

			expect(editor.state.doc.firstChild?.type.name).toBe(
				UNKNOWN_BLOCK_NODE
			);
			expect(unwrapUnknownContent(editor.getJSON()).content?.[0]).toEqual(
				toc()
			);
		});
	});

	describe('getTableOfContents', () => {
		it('lists headings in order, indented from the highest level used', () => {
			const entries = getTableOfContents(
				docOf(
					heading(2, 'Setup', 'a'),
					paragraph('body'),
					heading(3, 'Install', 'b'),
					heading(2, 'Usage', 'c')
				)
			);

			expect(entries).toEqual<TableOfContentsEntry[]>([
				{ id: 'a', level: 2, depth: 1, text: 'Setup' },
				{ id: 'b', level: 3, depth: 2, text: 'Install' },
				{ id: 'c', level: 2, depth: 1, text: 'Usage' }
			]);
		});

		it('finds headings inside other blocks, and skips empty ones', () => {
			const entries = getTableOfContents(
				docOf(
					heading(1, '', 'empty'),
					{
						type: 'callout',
						content: [heading(1, 'Inside', 'in')]
					},
					heading(1, '   ', 'blank')
				)
			);

			expect(entries.map((entry) => entry.id)).toEqual(['in']);
		});

		it('reads a mention as @label, and a heading without an id as null', () => {
			const [entry] = getTableOfContents(
				docOf({
					type: 'heading',
					attrs: { level: 1 },
					content: [
						{ type: 'text', text: 'Notes for ' },
						{
							type: 'mention',
							attrs: { id: 'u1', label: 'Ada', kind: null }
						}
					]
				})
			);

			expect(entry).toEqual({
				id: null,
				level: 1,
				depth: 1,
				text: 'Notes for @Ada'
			});
		});

		it('returns an empty list for a document with no headings', () => {
			expect(getTableOfContents(docOf(paragraph('x')))).toEqual([]);
		});

		it('agrees with the list read from an open editor', () => {
			const content = [
				heading(1, 'One', 'a'),
				heading(3, 'Three', 'b'),
				heading(2, 'Two', 'c')
			];
			const instance = openEditor(content);

			expect(tableOfContentsOf(instance.state.doc)).toEqual(
				getTableOfContents(docOf(...content))
			);
		});
	});

	describe('in the editor', () => {
		it('draws a link to each heading', () => {
			const instance = openEditor([
				toc(),
				heading(1, 'Intro', 'h1'),
				heading(2, 'Details', 'h2')
			]);

			expect(linkTexts(instance)).toEqual(['Intro', 'Details']);
			const links = block(instance).querySelectorAll('a');
			expect(links[0]?.getAttribute('href')).toBe('#h1');
			expect(links[1]?.closest('li')?.dataset.depth).toBe('2');
			expect(block(instance).getAttribute('aria-label')).toBe(
				'Table of contents'
			);
		});

		it('follows edits, including a setContent that emits no update', () => {
			const instance = openEditor([toc(), heading(1, 'Intro', 'h1')]);

			instance.commands.insertContentAt(
				instance.state.doc.content.size,
				heading(2, 'Added', 'h2')
			);
			expect(linkTexts(instance)).toEqual(['Intro', 'Added']);

			instance.commands.setContent(
				docOf(toc(), heading(1, 'Replaced', 'h3')),
				{ emitUpdate: false }
			);
			expect(linkTexts(instance)).toEqual(['Replaced']);
		});

		it('says how to fill it while there are no headings', () => {
			const instance = openEditor([toc(), paragraph('x')]);

			expect(block(instance).textContent).toBe(
				'Add a heading and it will be listed here.'
			);
		});

		it('takes its strings from the label set', () => {
			const labels = resolveLabels({
				tableOfContents: { label: 'Sommaire', empty: 'Aucun titre' }
			});
			const instance = openEditor(
				[toc(), paragraph('x')],
				withTableOfContents(createExtensions('standard'), { labels })
			);

			expect(block(instance).textContent).toBe('Aucun titre');
			expect(block(instance).getAttribute('aria-label')).toBe('Sommaire');
		});

		it('moves the caret to a heading when its link is clicked', () => {
			const instance = openEditor([
				toc(),
				paragraph('between'),
				heading(1, 'Target', 'h1')
			]);
			const link = block(instance).querySelector('a');

			link?.click();

			const { $from } = instance.state.selection;
			expect($from.parent.type.name).toBe('heading');
			expect($from.parent.attrs.id).toBe('h1');
			expect($from.parentOffset).toBe(0);
		});

		it('goToHeading reports false for an id nobody has', () => {
			const instance = openEditor([heading(1, 'Intro', 'h1')]);

			expect(instance.commands.goToHeading('missing')).toBe(false);
			expect(instance.commands.goToHeading('h1')).toBe(true);
		});
	});

	describe('wiring', () => {
		it('withTableOfContents adds the node once, replacing one already there', () => {
			const extensions = withTableOfContents(
				withTableOfContents(createExtensions('standard'))
			);

			expect(
				extensions.filter(
					(extension) => extension.name === TABLE_OF_CONTENTS_NODE
				)
			).toHaveLength(1);
			expect(createTableOfContents()[0]?.name).toBe(TableOfContents.name);
		});

		it('offers the slash command only where the block is loaded', () => {
			const command = createCommandRegistry().get('table-of-contents');
			const withBlock = openEditor([paragraph('x')]);
			const without = new Editor({
				extensions: createExtensions('standard'),
				content: createEmptyDocument()
			});

			expect(command?.title).toBe('Table of contents');
			expect(command?.isAvailable?.(withBlock)).toBe(true);
			expect(command?.isAvailable?.(without)).toBe(false);
			without.destroy();
		});

		it('gets the editor labels from BlockleafEditor', async () => {
			const { container } = render(
				<BlockleafEditor
					defaultValue={docOf(toc(), paragraph('x'))}
					extensions={withTableOfContents(
						createExtensions('standard')
					)}
					labels={{ tableOfContents: { empty: 'Nada' } }}
				/>
			);

			await waitFor(() =>
				expect(
					container.querySelector('.blockleaf-toc__empty')
						?.textContent
				).toBe('Nada')
			);
		});
	});

	describe('useTableOfContents', () => {
		it('follows the headings, and keeps the same list while they do not change', async () => {
			const instance = openEditor([
				heading(1, 'Intro', 'h1'),
				paragraph('body')
			]);
			const seen: TableOfContentsEntry[][] = [];
			const Outline = () => {
				const entries = useTableOfContents(instance);
				seen.push(entries);
				return (
					<ul>
						{entries.map((entry) => (
							<li key={entry.id}>{entry.text}</li>
						))}
					</ul>
				);
			};
			const { container } = render(<Outline />);
			expect(container.textContent).toBe('Intro');

			const before = seen.at(-1);
			act(() => {
				instance.commands.insertContentAt(
					instance.state.doc.content.size - 1,
					' more'
				);
			});
			expect(seen.at(-1)).toBe(before);

			act(() => {
				instance.commands.insertContentAt(
					instance.state.doc.content.size,
					heading(2, 'Next', 'h2')
				);
			});
			await waitFor(() =>
				expect(container.textContent).toBe('IntroNext')
			);
		});

		it('returns an empty list without an editor', () => {
			const Outline = () => <p>{useTableOfContents(null).length}</p>;
			const { container } = render(<Outline />);
			expect(container.textContent).toBe('0');
		});
	});
});
