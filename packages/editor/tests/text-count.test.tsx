import { act, render, screen, waitFor } from '@testing-library/react';
import { Editor, type JSONContent } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';
import {
	createEmptyDocument,
	type BlockleafDocument,
	type BlockNode
} from '../src/core/schema.js';
import { countPlainText, textCountOf } from '../src/core/text-count.js';
import { BlockleafEditor } from '../src/index.js';
import { withMentions } from '../src/mentions.js';
import {
	TextCount,
	countText,
	useTableOfContents,
	useTextCount,
	type TextCountState
} from '../src/toc.js';

const paragraph = (...content: JSONContent[]): JSONContent => ({
	type: 'paragraph',
	content
});

const text = (value: string): JSONContent => ({ type: 'text', text: value });

const docOf = (...content: JSONContent[]): BlockleafDocument => ({
	...createEmptyDocument(),
	content: content as BlockNode[]
});

let editor: Editor | null = null;

const openEditor = (...content: JSONContent[]): Editor => {
	editor = new Editor({
		extensions: withMentions(createExtensions('standard'), {
			items: () => []
		}),
		content: docOf(...content)
	});
	return editor;
};

afterEach(() => {
	editor?.destroy();
	editor = null;
});

describe('word and character count (PA-09)', () => {
	describe('counting', () => {
		it('counts words and characters, spaces included', () => {
			expect(countPlainText('Hello there, world')).toEqual({
				words: 3,
				characters: 18
			});
		});

		it('counts a contraction as one word, and an emoji as one character', () => {
			expect(countPlainText("don't 👍🏽")).toEqual({
				words: 1,
				characters: 7
			});
		});

		it('splits words at a line break, and does not count the break', () => {
			expect(countPlainText('one\ntwo')).toEqual({
				words: 2,
				characters: 6
			});
		});

		it('counts an empty text as nothing', () => {
			expect(countPlainText('')).toEqual({ words: 0, characters: 0 });
		});
	});

	describe('countText', () => {
		it('keeps blocks apart, and counts code, headings and mentions', () => {
			const doc = docOf(
				{
					type: 'heading',
					attrs: { level: 1 },
					content: [text('Title')]
				},
				paragraph(text('Hi '), {
					type: 'mention',
					attrs: { id: 'u1', label: 'Ada', kind: null }
				}),
				{ type: 'codeBlock', content: [text('let x')] },
				{
					type: 'image',
					attrs: { src: 'https://cdn.test/a.png', alt: 'not counted' }
				}
			);

			// "Title" + "Hi @Ada" + "let x": the blocks never run together.
			expect(countText(doc)).toEqual({ words: 5, characters: 17 });
		});

		it('agrees with the count of an open editor', () => {
			const content = [
				paragraph(text('First block here.')),
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [paragraph(text('A nested item'))]
						}
					]
				}
			];
			const instance = openEditor(...content);

			expect(textCountOf(instance.state.doc)).toEqual(
				countText(docOf(...content))
			);
		});
	});

	describe('useTextCount', () => {
		it('follows edits, and counts the selection while there is one', async () => {
			const instance = openEditor(paragraph(text('one two three')));
			const seen: TextCountState[] = [];
			const Probe = () => {
				const count = useTextCount(instance);
				seen.push(count);
				return null;
			};
			render(<Probe />);
			expect(seen.at(-1)).toEqual({
				words: 3,
				characters: 13,
				selection: null
			});

			act(() => {
				instance.commands.setTextSelection({ from: 1, to: 8 });
			});
			await waitFor(() =>
				expect(seen.at(-1)?.selection).toEqual({
					words: 2,
					characters: 7
				})
			);

			act(() => {
				instance.commands.insertContentAt(
					instance.state.doc.content.size - 1,
					' four'
				);
			});
			await waitFor(() => expect(seen.at(-1)?.words).toBe(4));
		});

		it('keeps the same object while nothing changes', () => {
			const instance = openEditor(paragraph(text('one two')));
			const seen: TextCountState[] = [];
			const Probe = () => {
				seen.push(useTextCount(instance));
				return null;
			};
			const { rerender } = render(<Probe />);
			rerender(<Probe />);

			expect(seen.at(-1)).toBe(seen.at(-2));
		});
	});

	describe('<TextCount />', () => {
		it('counts the BlockleafEditor it sits inside, with no prop', async () => {
			render(
				<BlockleafEditor
					defaultValue={docOf(paragraph(text('Three little words')))}
				>
					<TextCount />
				</BlockleafEditor>
			);

			const footer = await screen.findByLabelText('Word count');
			expect(footer.textContent).toBe('3 words · 18 characters');
		});

		it('says one word, not one words', () => {
			const instance = openEditor(paragraph(text('A')));
			render(<TextCount editor={instance} />);

			expect(screen.getByLabelText('Word count').textContent).toBe(
				'1 word · 1 character'
			);
		});

		it('shows the selection out of the total', async () => {
			const instance = openEditor(paragraph(text('one two three')));
			render(<TextCount editor={instance} />);

			act(() => {
				instance.commands.setTextSelection({ from: 1, to: 4 });
			});
			await waitFor(() =>
				expect(screen.getByLabelText('Word count').textContent).toBe(
					'1 of 3 words · 3 of 13 characters'
				)
			);
		});

		it('takes its strings from labels', () => {
			const instance = openEditor(paragraph(text('un deux')));
			render(
				<TextCount
					editor={instance}
					labels={{
						words: (count) => `${count} mots`,
						characters: (count) => `${count} caractères`,
						label: 'Nombre de mots'
					}}
				/>
			);

			expect(screen.getByLabelText('Nombre de mots').textContent).toBe(
				'2 mots · 7 caractères'
			);
		});
	});

	it('lets useTableOfContents read the editor from BlockleafEditor too', async () => {
		const Outline = () => (
			<ul>
				{useTableOfContents().map((entry) => (
					<li key={entry.text}>{entry.text}</li>
				))}
			</ul>
		);
		const { container } = render(
			<BlockleafEditor
				defaultValue={docOf({
					type: 'heading',
					attrs: { level: 1, id: 'h' },
					content: [text('Intro')]
				})}
			>
				<Outline />
			</BlockleafEditor>
		);

		await waitFor(() =>
			expect(container.querySelector('li')?.textContent).toBe('Intro')
		);
	});
});
