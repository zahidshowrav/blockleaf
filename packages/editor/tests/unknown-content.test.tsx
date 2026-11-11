import { render, waitFor } from '@testing-library/react';
import { type Editor, getSchema, type Extensions } from '@tiptap/core';
import { EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	UNKNOWN_BLOCK_NODE,
	UNKNOWN_INLINE_NODE,
	UNKNOWN_MARK
} from '../src/core/constants.js';
import { createExtensions } from '../src/core/extensions.js';
import { SCHEMA_VERSION, type BlockleafDocument } from '../src/core/schema.js';
import {
	unwrapUnknownContent,
	wrapUnknownContent
} from '../src/core/unknown-content.js';
import {
	useBlockleafEditor,
	type UseBlockleafEditorOptions
} from '../src/react/use-blockleaf-editor.js';
import { BlockleafEditor } from '../src/ui/editor.js';

/** A table as the standard preset stores it — what a minimal editor has never heard of. */
const table = {
	type: 'table',
	attrs: { id: 't1' },
	content: [
		{
			type: 'tableRow',
			content: [
				{
					type: 'tableHeader',
					attrs: { colspan: 1, rowspan: 1, colwidth: [240] },
					content: [
						{
							type: 'paragraph',
							content: [{ type: 'text', text: 'Header' }]
						}
					]
				}
			]
		},
		{
			type: 'tableRow',
			content: [
				{
					type: 'tableCell',
					attrs: { colspan: 1, rowspan: 1, colwidth: null },
					// No ids inside, on purpose: nothing may stamp one on.
					content: [{ type: 'paragraph' }]
				}
			]
		}
	]
};

const mention = { type: 'mention', attrs: { id: 'u1', label: 'Ada' } };
const comment = { type: 'comment', attrs: { thread: 'c1' } };

const documentWithTables = {
	type: 'doc',
	attrs: { schemaVersion: SCHEMA_VERSION },
	content: [
		{
			type: 'paragraph',
			attrs: { id: 'p1' },
			content: [
				{ type: 'text', text: 'Hi ' },
				mention,
				{
					type: 'text',
					text: ' there',
					marks: [{ type: 'bold' }, comment, { type: 'italic' }]
				}
			]
		},
		table,
		{
			type: 'paragraph',
			attrs: { id: 'p2' },
			content: [{ type: 'text', text: 'after' }]
		}
	]
} as unknown as BlockleafDocument;

const Probe = ({
	onReady,
	...options
}: { onReady: (editor: Editor) => void } & UseBlockleafEditorOptions) => {
	const editor = useBlockleafEditor(options);
	useEffect(() => {
		if (editor) onReady(editor);
	}, [editor, onReady]);
	return editor ? <EditorContent editor={editor} /> : null;
};

const mount = async (options: UseBlockleafEditorOptions) => {
	const ready: { editor: Editor | null } = { editor: null };
	const view = render(
		<Probe
			onReady={(editor) => {
				ready.editor = editor;
			}}
			{...options}
		/>
	);
	await waitFor(() => expect(ready.editor).not.toBeNull());
	if (!ready.editor) throw new Error('editor did not mount');
	return { editor: ready.editor, container: view.container };
};

const typeAt = (editor: Editor, index: number) =>
	editor.state.doc.child(index).type.name;

describe('unknown nodes and marks (FC-03)', () => {
	beforeEach(() => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('opens an editor without tables on a document with one, editable', async () => {
		let failed = false;
		const { editor } = await mount({
			preset: 'minimal',
			defaultValue: documentWithTables,
			onContentError: () => {
				failed = true;
			}
		});

		expect(failed).toBe(false);
		expect(editor.isEditable).toBe(true);
		expect(typeAt(editor, 1)).toBe(UNKNOWN_BLOCK_NODE);
		expect(editor.getText()).toContain('Hi');
		expect(editor.getText()).toContain('after');
	});

	it('saves the table back byte for byte after an edit', async () => {
		// The block's exit test.
		const saved: BlockleafDocument[] = [];
		const { editor } = await mount({
			preset: 'minimal',
			defaultValue: documentWithTables,
			onChangeImmediate: (doc) => saved.push(doc)
		});

		editor.commands.insertContentAt(editor.state.doc.content.size - 1, '!');
		const doc = saved.at(-1);

		expect(JSON.stringify(doc?.content?.[1])).toBe(JSON.stringify(table));
		expect(JSON.stringify(doc)).not.toContain(UNKNOWN_BLOCK_NODE);
		expect(doc?.content?.[2]).toMatchObject({
			content: [{ type: 'text', text: 'after!' }]
		});
	});

	it('keeps an unknown inline node and an unknown mark where they were', async () => {
		const saved: BlockleafDocument[] = [];
		const { editor } = await mount({
			preset: 'minimal',
			defaultValue: documentWithTables,
			onChangeImmediate: (doc) => saved.push(doc)
		});

		const paragraph = editor.state.doc.child(0);
		expect(paragraph.child(1).type.name).toBe(UNKNOWN_INLINE_NODE);
		expect(
			paragraph.child(2).marks.map((mark) => mark.type.name)
		).toContain(UNKNOWN_MARK);

		editor.commands.insertContentAt(editor.state.doc.content.size - 1, '!');
		const first = saved.at(-1)?.content?.[0];

		// The mark sat between bold and italic, and goes back there, though
		// ProseMirror sorted the placeholder after both.
		expect(first).toEqual(documentWithTables.content?.[0]);
	});

	it('labels the placeholder with the type it stands for', async () => {
		const { container } = await mount({
			preset: 'minimal',
			defaultValue: documentWithTables
		});

		const block = container.querySelector('[data-unknown-type="table"]');
		expect(block?.textContent).toBe('Unsupported block: table');
		expect(block?.getAttribute('contenteditable')).toBe('false');
	});

	it('takes its label from the labels prop', async () => {
		const { container } = render(
			<BlockleafEditor
				preset="minimal"
				defaultValue={documentWithTables}
				labels={{
					unknown: { block: (type) => `Bloc inconnu : ${type}` }
				}}
			/>
		);

		await waitFor(() =>
			expect(
				container.querySelector('[data-unknown-type="table"]')
					?.textContent
			).toBe('Bloc inconnu : table')
		);
	});

	it("is added to a host's own extensions array", async () => {
		const extensions: Extensions = [StarterKit];
		const { editor } = await mount({
			extensions,
			defaultValue: {
				type: 'doc',
				attrs: { schemaVersion: SCHEMA_VERSION },
				content: [table]
			} as unknown as BlockleafDocument
		});

		expect(editor.isEditable).toBe(true);
		expect(typeAt(editor, 0)).toBe(UNKNOWN_BLOCK_NODE);
	});

	it('still locks an unknown block where no block may go', async () => {
		// A placeholder is a block; a bullet list takes list items only. The
		// structure is wrong, so the content check refuses it as before.
		const { editor } = await mount({
			defaultValue: {
				type: 'doc',
				attrs: { schemaVersion: SCHEMA_VERSION },
				content: [{ type: 'bulletList', content: [{ type: 'widget' }] }]
			} as unknown as BlockleafDocument
		});

		expect(editor.isEditable).toBe(false);
	});

	it('never builds a placeholder from pasted HTML', async () => {
		// A payload read from the clipboard could carry any node at all past
		// the schema and into storage.
		const { editor } = await mount({});

		editor.commands.insertContent(
			'<div data-type="unknown" data-unknown-type="image">x</div>'
		);

		const types: string[] = [];
		editor.state.doc.descendants((node) => {
			types.push(node.type.name);
		});
		expect(types).not.toContain(UNKNOWN_BLOCK_NODE);
	});
});

describe('wrapUnknownContent and unwrapUnknownContent', () => {
	const schema = getSchema(createExtensions('standard'));

	it('returns a document with nothing unknown unchanged, not copied', () => {
		const doc = {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] }
			]
		};

		expect(wrapUnknownContent(doc, schema)).toBe(doc);
		expect(unwrapUnknownContent(doc)).toBe(doc);
	});

	it('round-trips on plain JSON', () => {
		const wrapped = wrapUnknownContent(documentWithTables, schema);

		expect(JSON.stringify(wrapped)).toContain(UNKNOWN_INLINE_NODE);
		expect(unwrapUnknownContent(wrapped)).toEqual(documentWithTables);
	});

	it('does nothing against a schema without the placeholders', () => {
		const bare = getSchema([StarterKit]);

		expect(wrapUnknownContent(documentWithTables, bare)).toBe(
			documentWithTables
		);
	});
});
