import { act, render, screen } from '@testing-library/react';
import { Editor, type Extensions, type JSONContent } from '@tiptap/core';
import type { SuggestionKeyDownProps } from '@tiptap/suggestion';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';
import { defaultLabels, resolveLabels } from '../src/core/labels.js';
import { migrate, runMigrations, migrations } from '../src/core/migrate.js';
import {
	createEmptyDocument,
	withBlockIds,
	withSchemaVersion,
	type BlockNode
} from '../src/core/schema.js';
import {
	MENTIONS_EXTENSION_NAME,
	MENTION_NODE,
	Mention,
	MentionMenu,
	createMentions,
	withMentions,
	type MentionItem,
	type MentionMenuRef
} from '../src/mentions.js';
import { validateDocument } from '../src/validate.js';

const ada = { id: 'u_42', label: 'Ada Lovelace', kind: 'user' };

const mention = (attrs: Record<string, unknown> = ada): JSONContent => ({
	type: 'mention',
	attrs
});

const paragraph = (...content: JSONContent[]): JSONContent => ({
	type: 'paragraph',
	content
});

const people = ({ query }: { query: string }): MentionItem[] =>
	[
		{ id: 'u_42', label: 'Ada Lovelace', description: 'ada@example.com' },
		{ id: 'u_7', label: 'Grace Hopper' }
	].filter((person) =>
		person.label.toLowerCase().includes(query.toLowerCase())
	);

let editor: Editor | null = null;

const openEditor = (
	content: JSONContent[] | string,
	extensions: Extensions = withMentions(createExtensions('standard'), {
		items: people
	})
) => {
	editor = new Editor({
		extensions,
		content:
			typeof content === 'string'
				? content
				: withBlockIds({
						...createEmptyDocument(),
						content: content as BlockNode[]
					})
	});
	return editor;
};

afterEach(() => {
	editor?.destroy();
	editor = null;
});

const firstParagraph = (instance: Editor): JSONContent[] =>
	(instance.getJSON().content?.[0]?.content ?? []) as JSONContent[];

describe('mentions (PA-02)', () => {
	describe('stored shape (F24)', () => {
		it('opens a stored mention and saves it back unchanged', () => {
			const instance = openEditor([
				paragraph({ type: 'text', text: 'Hi ' }, mention())
			]);

			expect(firstParagraph(instance)[1]).toEqual(mention());
			expect(() =>
				validateDocument(withSchemaVersion(instance.getJSON()))
			).not.toThrow();
		});

		it('stores a null kind when nothing names one', () => {
			const instance = openEditor([paragraph()]);
			instance.commands.insertMention({ id: 'u_7', label: 'Grace' });

			expect(firstParagraph(instance)[0]).toEqual(
				mention({ id: 'u_7', label: 'Grace', kind: null })
			);
		});

		it('is never given a block id', () => {
			const instance = openEditor([paragraph(mention())]);

			expect(firstParagraph(instance)[0]?.attrs).toEqual(ada);
		});

		it('reads its own HTML back as the same mention', () => {
			const first = openEditor([paragraph(mention())]);
			const html = first.getHTML();
			first.destroy();
			const instance = openEditor(html);

			expect(html).toContain('data-mention-id="u_42"');
			expect(html).not.toContain('data-id="u_42"');
			expect(firstParagraph(instance)[0]).toEqual(mention());
		});

		it('reads a mention written by another editor', () => {
			const instance = openEditor(
				'<p><span data-type="mention" data-id="u_7" data-label="Grace">@Grace</span></p>'
			);

			expect(firstParagraph(instance)[0]).toEqual(
				mention({ id: 'u_7', label: 'Grace', kind: null })
			);
		});

		it('leaves a span that names nobody as its text', () => {
			const instance = openEditor(
				'<p><span data-type="mention">@nobody</span></p>'
			);

			expect(firstParagraph(instance)).toEqual([
				{ type: 'text', text: '@nobody' }
			]);
		});

		it('reads as its label in plain text', () => {
			const instance = openEditor([
				paragraph({ type: 'text', text: 'Hi ' }, mention())
			]);

			expect(instance.getText()).toBe('Hi @Ada Lovelace');
		});
	});

	describe('schema version 2', () => {
		it('migrates a version 1 document without changing its content', () => {
			const stored = {
				type: 'doc',
				attrs: { schemaVersion: 1 },
				content: [paragraph({ type: 'text', text: 'Hi' })]
			};
			const current = migrate(stored) as typeof stored;

			expect(current.attrs.schemaVersion).toBe(2);
			expect(current.content).toEqual(stored.content);
			expect(runMigrations(stored, migrations, 2)).toEqual(current);
		});

		it('validates a mention, and refuses one without a label', () => {
			const doc = (attrs: Record<string, unknown>) => ({
				...createEmptyDocument(),
				content: [paragraph(mention(attrs))]
			});

			expect(() => validateDocument(doc(ada))).not.toThrow();
			expect(() => validateDocument(doc({ id: 'u_42' }))).toThrow();
		});
	});

	describe('withMentions', () => {
		it('adds the node and the picker once, replacing any already there', () => {
			const once = withMentions(createExtensions('standard'), {
				items: people
			});
			const twice = withMentions(once, { items: people });
			const names = twice.map((extension) => extension.name);

			expect(names.filter((name) => name === MENTION_NODE)).toHaveLength(
				1
			);
			expect(
				names.filter((name) => name === MENTIONS_EXTENSION_NAME)
			).toHaveLength(1);
		});

		it('gives createMentions the same pair', () => {
			const [node, picker] = createMentions({ items: people });

			expect(node).toBe(Mention);
			expect(picker?.name).toBe(MENTIONS_EXTENSION_NAME);
		});
	});
});

describe('mention picker (PA-02)', () => {
	const renderMenu = (
		items: (props: {
			query: string;
		}) => MentionItem[] | Promise<MentionItem[]>,
		query = ''
	) => {
		const ref = createRef<MentionMenuRef>();
		const command = vi.fn();
		const view = render(
			<MentionMenu
				ref={ref}
				query={query}
				items={items}
				command={command}
				labels={defaultLabels}
			/>
		);
		return { ref, command, view };
	};

	const key = (ref: { current: MentionMenuRef | null }, name: string) =>
		act(() =>
			ref.current?.onKeyDown({
				event: new KeyboardEvent('keydown', { key: name })
			} as SuggestionKeyDownProps)
		);

	it('lists what the host found, with its description', async () => {
		renderMenu(people);

		const option = await screen.findByRole('option', {
			name: /Ada Lovelace/
		});
		expect(option.textContent).toContain('ada@example.com');
		expect(screen.getByRole('listbox').getAttribute('aria-label')).toBe(
			defaultLabels.mentions.menu
		);
	});

	it('shows a loading line until the host answers, then the empty one', async () => {
		let answer: (items: MentionItem[]) => void = () => undefined;
		renderMenu(
			() =>
				new Promise<MentionItem[]>((resolve) => {
					answer = resolve;
				})
		);

		expect((await screen.findByRole('status')).textContent).toBe(
			defaultLabels.mentions.loading
		);
		await act(async () => answer([]));
		expect(screen.getByRole('status').textContent).toBe(
			defaultLabels.mentions.empty
		);
	});

	it('treats a lookup that fails as finding nothing', async () => {
		renderMenu(() => Promise.reject(new Error('offline')));

		expect(
			await screen.findByText(defaultLabels.mentions.empty)
		).toBeTruthy();
	});

	it('drops an answer that arrives after a newer query', async () => {
		const pending = new Map<string, (items: MentionItem[]) => void>();
		const items = ({ query }: { query: string }) =>
			new Promise<MentionItem[]>((resolve) => {
				pending.set(query, resolve);
			});
		const { ref, command, view } = renderMenu(items, 'a');
		await act(async () => undefined);
		view.rerender(
			<MentionMenu
				ref={ref}
				query="gr"
				items={items}
				command={command}
				labels={defaultLabels}
			/>
		);
		await act(async () => undefined);

		await act(async () =>
			pending.get('gr')?.([{ id: 'u_7', label: 'Grace' }])
		);
		await act(async () =>
			pending.get('a')?.([{ id: 'u_42', label: 'Ada' }])
		);

		expect(screen.getByRole('option').textContent).toBe('Grace');
	});

	it('moves with the arrow keys and picks with Enter', async () => {
		const { ref, command } = renderMenu(people);
		await screen.findAllByRole('option');

		key(ref, 'ArrowDown');
		expect(
			screen
				.getByRole('option', { name: /Grace Hopper/ })
				.getAttribute('aria-selected')
		).toBe('true');
		key(ref, 'Enter');

		expect(command).toHaveBeenCalledWith({
			id: 'u_7',
			label: 'Grace Hopper'
		});
	});

	it('lets Enter through when there is nothing to pick', async () => {
		const { ref } = renderMenu(() => []);
		await screen.findByText(defaultLabels.mentions.empty);

		expect(
			ref.current?.onKeyDown({
				event: new KeyboardEvent('keydown', { key: 'Enter' })
			} as SuggestionKeyDownProps)
		).toBe(false);
	});

	it('takes its strings from the label set', async () => {
		const labels = resolveLabels({ mentions: { empty: 'Personne' } });
		render(
			<MentionMenu
				query=""
				items={() => []}
				command={vi.fn()}
				labels={labels}
			/>
		);

		expect(await screen.findByText('Personne')).toBeTruthy();
	});
});
