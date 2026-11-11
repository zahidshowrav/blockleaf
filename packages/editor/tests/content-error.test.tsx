import { render, waitFor } from '@testing-library/react';
import { type Editor } from '@tiptap/core';
import { EditorContent } from '@tiptap/react';
import { Component, useEffect, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IncompatibleDocumentError } from '../src/core/incompatible-document.js';
import {
	SCHEMA_VERSION,
	createEmptyDocument,
	type BlockleafDocument
} from '../src/core/schema.js';
import { BlockleafEditor } from '../src/react/editor.js';
import {
	useBlockleafEditor,
	type UseBlockleafEditorOptions
} from '../src/react/use-blockleaf-editor.js';

/** One block the editor can read and one it cannot: a node with no type at
 *  all, the shape a broken migration leaves behind. An unknown *type* is no
 *  longer unreadable — it opens as a placeholder (FC-03). What happens to the
 *  readable block is the point of half the tests below. */
const unknownBlock = {
	type: 'doc',
	content: [
		{ type: 'paragraph', content: [{ type: 'text', text: 'kept?' }] },
		{ attrs: { payload: true } }
	]
} as unknown as BlockleafDocument;

/** `BlockleafEditor` keeps its editor to itself; the tests that drive
 *  commands and props need the instance. */
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
	const onReady = (editor: Editor) => {
		ready.editor = editor;
	};
	const view = render(
		<Probe
			onReady={onReady}
			{...options}
		/>
	);
	await waitFor(() => expect(ready.editor).not.toBeNull());
	if (!ready.editor) throw new Error('editor did not mount');
	const update = (next: UseBlockleafEditorOptions) =>
		view.rerender(
			<Probe
				onReady={onReady}
				{...next}
			/>
		);
	return { editor: ready.editor, update };
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('a defaultValue the editor cannot read (FC-01)', () => {
	// Tiptap's fallback path warns on the console; keep the output readable.
	beforeEach(() => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('fires onContentError', async () => {
		const errors: Error[] = [];
		render(
			<BlockleafEditor
				defaultValue={unknownBlock}
				onContentError={({ error }) => errors.push(error)}
			/>
		);

		await waitFor(() => expect(errors).toHaveLength(1));
		expect(errors.map((error) => error.message)).toEqual([
			'[tiptap error]: Invalid JSON content'
		]);
	});

	it('opens read-only and keeps every change callback silent', async () => {
		// Tiptap's fallback is an empty document, known blocks included. The
		// lock is what stops that empty document reaching a save path.
		const seen: BlockleafDocument[] = [];
		const { editor } = await mount({
			defaultValue: unknownBlock,
			editable: true,
			onChange: (doc) => seen.push(doc),
			onChangeImmediate: (doc) => seen.push(doc),
			debounceMs: 0
		});

		expect(editor.isEmpty).toBe(true);
		expect(editor.isEditable).toBe(false);

		// A programmatic edit still goes through; the callbacks must not.
		editor.commands.insertContent('typed anyway');
		await settle();
		expect(editor.getText()).toBe('typed anyway');
		expect(seen).toEqual([]);
	});

	it('locks without onContentError being given', async () => {
		const { editor } = await mount({ defaultValue: unknownBlock });

		expect(editor.isEditable).toBe(false);
	});

	it("opens editable with incompatibleDocument='discard'", async () => {
		const seen: BlockleafDocument[] = [];
		const { editor } = await mount({
			defaultValue: unknownBlock,
			incompatibleDocument: 'discard',
			onChangeImmediate: (doc) => seen.push(doc)
		});

		expect(editor.isEmpty).toBe(true);
		expect(editor.isEditable).toBe(true);

		// Stamping ids on the fallback already fired once on load.
		const before = seen.length;
		editor.commands.insertContent('start over');
		expect(seen).toHaveLength(before + 1);
		expect(editor.getText()).toBe('start over');
	});

	it('unlocks when the host flips the prop', async () => {
		const { editor, update } = await mount({ defaultValue: unknownBlock });
		expect(editor.isEditable).toBe(false);

		update({ defaultValue: unknownBlock, incompatibleDocument: 'discard' });

		await waitFor(() => expect(editor.isEditable).toBe(true));
	});

	it('does not lock a document it can read', async () => {
		const { editor } = await mount({ defaultValue: createEmptyDocument() });

		expect(editor.isEditable).toBe(true);
	});

	it('enableContentCheck={false} restores the silent fallback', async () => {
		let fired = false;
		const { editor } = await mount({
			defaultValue: unknownBlock,
			enableContentCheck: false,
			onContentError: () => {
				fired = true;
			}
		});

		expect(fired).toBe(false);
		expect(editor.isEmpty).toBe(true);
		expect(editor.isEditable).toBe(true);
		expect(console.warn).toHaveBeenCalled();
	});

	it('emitContentError alone does nothing for defaultValue', async () => {
		// Tiptap only reads `emitContentError` in `insertContent`. The docs
		// say so; this fails if that stops being true.
		let fired = false;
		await mount({
			defaultValue: unknownBlock,
			enableContentCheck: false,
			emitContentError: true,
			onContentError: () => {
				fired = true;
			}
		});

		expect(fired).toBe(false);
	});

	it('insertContent reports, refuses, and does not lock', async () => {
		let fired = false;
		const { editor } = await mount({
			onContentError: () => {
				fired = true;
			}
		});

		const inserted = editor.commands.insertContent({
			type: 'unknown_block',
			attrs: { payload: true }
		});

		expect(inserted).toBe(false);
		expect(fired).toBe(true);
		expect(editor.isEmpty).toBe(true);
		expect(editor.isEditable).toBe(true);
	});

	it('setContent throws instead of reporting', async () => {
		// Tiptap's `setContent` has no catch on this path. The docs tell hosts
		// to wrap the call; this fails if a Tiptap bump makes that stale.
		let fired = false;
		const { editor } = await mount({
			onContentError: () => {
				fired = true;
			}
		});

		expect(() => editor.commands.setContent(unknownBlock)).toThrow(
			'[tiptap error]: Invalid JSON content'
		);
		expect(fired).toBe(false);
		expect(editor.isEmpty).toBe(true);
	});
});

/** A document a newer editor wrote. Everything in it is readable here. */
const newerDocument = {
	type: 'doc',
	attrs: { schemaVersion: SCHEMA_VERSION + 1 },
	content: [
		{
			type: 'paragraph',
			attrs: { id: 'p1' },
			content: [{ type: 'text', text: 'from the future' }]
		}
	]
} as BlockleafDocument;

class Boundary extends Component<
	{ onError: (error: unknown) => void; children: ReactNode },
	{ failed: boolean }
> {
	override state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	override componentDidCatch(error: unknown) {
		this.props.onError(error);
	}
	override render() {
		return this.state.failed ? null : this.props.children;
	}
}

describe('a defaultValue with a newer schemaVersion (FC-02)', () => {
	beforeEach(() => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('opens the document read-only, with every change callback silent', async () => {
		const seen: BlockleafDocument[] = [];
		const { editor } = await mount({
			defaultValue: newerDocument,
			onChange: (doc) => seen.push(doc),
			onChangeImmediate: (doc) => seen.push(doc),
			debounceMs: 0
		});

		// Unlike an unreadable document, this one is shown as it is.
		expect(editor.getText()).toBe('from the future');
		expect(editor.isEditable).toBe(false);

		editor.commands.insertContent('typed anyway');
		await settle();
		expect(seen).toEqual([]);
	});

	it('reports an IncompatibleDocumentError through onContentError', async () => {
		const errors: Error[] = [];
		await mount({
			defaultValue: newerDocument,
			onContentError: ({ error }) => errors.push(error)
		});

		await waitFor(() => expect(errors).toHaveLength(1));
		const [error] = errors;
		expect(error).toBeInstanceOf(IncompatibleDocumentError);
		expect(error).toMatchObject({
			reason: 'newer-version',
			documentVersion: SCHEMA_VERSION + 1,
			editorVersion: SCHEMA_VERSION
		});
	});

	it("opens editable with incompatibleDocument='discard'", async () => {
		const seen: BlockleafDocument[] = [];
		const { editor } = await mount({
			defaultValue: newerDocument,
			incompatibleDocument: 'discard',
			onChangeImmediate: (doc) => seen.push(doc)
		});

		expect(editor.isEditable).toBe(true);
		editor.commands.insertContentAt(editor.state.doc.content.size, {
			type: 'paragraph',
			content: [{ type: 'text', text: 'edited here' }]
		});

		// Saving from here stamps this editor's version. That is the loss
		// the host accepted.
		expect(seen.at(-1)?.attrs.schemaVersion).toBe(SCHEMA_VERSION);
	});

	it('unlocks when the host flips the prop', async () => {
		const seen: BlockleafDocument[] = [];
		const { editor, update } = await mount({
			defaultValue: newerDocument,
			onChangeImmediate: (doc) => seen.push(doc)
		});
		expect(editor.isEditable).toBe(false);

		update({
			defaultValue: newerDocument,
			incompatibleDocument: 'discard',
			onChangeImmediate: (doc) => seen.push(doc)
		});

		await waitFor(() => expect(editor.isEditable).toBe(true));
		editor.commands.insertContent('now it saves');
		expect(seen).toHaveLength(1);
	});

	it('does not lock a document at or below its own version', async () => {
		const current = await mount({ defaultValue: createEmptyDocument() });
		expect(current.editor.isEditable).toBe(true);

		const older = await mount({
			defaultValue: {
				...createEmptyDocument(),
				attrs: { schemaVersion: SCHEMA_VERSION - 1 }
			}
		});
		expect(older.editor.isEditable).toBe(true);
	});
});

describe("incompatibleDocument='throw' (FC-02)", () => {
	beforeEach(() => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		// React logs every error a boundary catches.
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});
	afterEach(() => {
		vi.restoreAllMocks();
	});

	const renderThrowing = (defaultValue: BlockleafDocument) => {
		const caught: unknown[] = [];
		render(
			<Boundary onError={(error) => caught.push(error)}>
				<BlockleafEditor
					defaultValue={defaultValue}
					incompatibleDocument="throw"
				/>
			</Boundary>
		);
		return caught;
	};

	it('throws for a newer version before an editor exists', async () => {
		const caught = renderThrowing(newerDocument);

		await waitFor(() => expect(caught).toHaveLength(1));
		expect(caught[0]).toBeInstanceOf(IncompatibleDocumentError);
		expect(caught[0]).toMatchObject({ reason: 'newer-version' });
	});

	it('throws for a document it cannot read', async () => {
		const caught = renderThrowing(unknownBlock);

		await waitFor(() => expect(caught).toHaveLength(1));
		expect(caught[0]).toBeInstanceOf(IncompatibleDocumentError);
		expect(caught[0]).toMatchObject({ reason: 'unreadable' });
	});

	it('does not throw for a document it can read', async () => {
		const caught = renderThrowing(createEmptyDocument());

		await settle();
		expect(caught).toEqual([]);
	});
});
