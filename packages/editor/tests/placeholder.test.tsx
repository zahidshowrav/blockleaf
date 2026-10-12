import { render } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import {
	TRAILING_NODE_NOT_AFTER,
	TrailingNodeOnLoad,
	createExtensions
} from '../src/core/index.js';
import {
	BlockleafEditor,
	createPlaceholderExtension,
	defaultPlaceholderLabels,
	labelFor
} from '../src/ui/index.js';

const editors: Editor[] = [];
const createEditor = (content: string | object) => {
	const editor = new Editor({
		extensions: [
			...createExtensions('standard'),
			createPlaceholderExtension()
		],
		content
	});
	editors.push(editor);
	return editor;
};

/**
 * A document as it comes back from storage: every block already carries an
 * id, so `UniqueID` has nothing to assign and dispatches nothing on load.
 * This is the case `TrailingNodeOnLoad` exists for — with no startup
 * transaction, `appendTransaction` never runs.
 */
const savedDocumentEndingInARule = {
	type: 'doc',
	content: [
		{
			type: 'paragraph',
			attrs: { id: 'block-a' },
			content: [{ type: 'text', text: 'A' }]
		},
		{ type: 'horizontalRule', attrs: { id: 'block-b' } }
	]
};

afterEach(() => {
	while (editors.length) {
		editors.pop()?.destroy();
	}
});

const lastChildName = (editor: Editor) => editor.state.doc.lastChild?.type.name;

/** Tiptap emits `create` from a timeout, so startup normalisation is async. */
const afterCreate = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Placeholder (CH-04)', () => {
	it('registers under the placeholder name', () => {
		expect(createPlaceholderExtension().name).toBe('placeholder');
	});

	it('labels paragraphs and headings differently by default', () => {
		expect(defaultPlaceholderLabels.paragraph).toBe(
			"Type '/' for commands"
		);
		expect(defaultPlaceholderLabels.heading(2)).toBe('Heading 2');
		expect(defaultPlaceholderLabels.heading(9)).toBe('Heading');
	});

	it('labels a node from the resolved label set', () => {
		const editor = createEditor('<p></p>');
		const paragraph = editor.state.doc.firstChild!;

		expect(labelFor(paragraph, defaultPlaceholderLabels)).toBe(
			"Type '/' for commands"
		);
	});

	it('decorates the empty block the cursor is in', () => {
		const editor = createEditor('<p></p><p>Filled</p>');
		editor.commands.setTextSelection(1);

		const decorated = editor.view.dom.querySelector(
			'.blockleaf-empty-node'
		);
		expect(decorated).not.toBeNull();
		expect(decorated?.getAttribute('data-placeholder')).toBe(
			"Type '/' for commands"
		);
	});

	it('labels an empty heading by its level', () => {
		const editor = createEditor('<h2></h2>');
		editor.commands.setTextSelection(1);

		expect(
			editor.view.dom
				.querySelector('.blockleaf-empty-node')
				?.getAttribute('data-placeholder')
		).toBe('Heading 2');
	});

	it('decorates nothing when the block has content', () => {
		const editor = createEditor('<p>Filled</p>');
		editor.commands.setTextSelection(2);

		expect(
			editor.view.dom.querySelector('.blockleaf-empty-node')
		).toBeNull();
	});

	it('decorates nothing while text is selected', () => {
		const editor = createEditor('<p>Filled</p>');
		editor.commands.setTextSelection({ from: 1, to: 6 });

		expect(
			editor.view.dom.querySelector('.blockleaf-empty-node')
		).toBeNull();
	});

	it('decorates nothing when the editor is read-only', () => {
		const editor = createEditor('<p></p>');
		editor.setEditable(false);
		editor.commands.setTextSelection(1);

		expect(
			editor.view.dom.querySelector('.blockleaf-empty-node')
		).toBeNull();
	});

	it('a single string overrides both paragraph and fallback', () => {
		const labels = { ...defaultPlaceholderLabels, paragraph: 'Start here' };
		const editor = createEditor('<p></p>');

		expect(labelFor(editor.state.doc.firstChild!, labels)).toBe(
			'Start here'
		);
	});

	it('BlockleafEditor drops the placeholder when told to', () => {
		const { container } = render(<BlockleafEditor placeholder={false} />);
		expect(container.querySelector('.blockleaf-editor')).not.toBeNull();
	});
});

describe('Trailing node (CH-04)', () => {
	it('is configured not to append after a paragraph or a heading', () => {
		expect([...TRAILING_NODE_NOT_AFTER]).toEqual(['paragraph', 'heading']);
	});

	it('ships the startup pass in the standard preset', () => {
		expect(
			createExtensions('standard').some(
				(ext) => ext.name === TrailingNodeOnLoad.name
			)
		).toBe(true);
	});

	it('adds a paragraph when a table is inserted at the end', () => {
		const editor = createEditor('<p>A</p>');
		editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true });

		expect(lastChildName(editor)).toBe('paragraph');
	});

	it('adds a paragraph to a loaded document ending in a code block', async () => {
		const editor = createEditor('<pre><code>x</code></pre>');
		await afterCreate();
		expect(lastChildName(editor)).toBe('paragraph');
	});

	it('adds a paragraph to a loaded document ending in a divider', async () => {
		const editor = createEditor('<p>A</p><hr>');
		await afterCreate();
		expect(lastChildName(editor)).toBe('paragraph');
	});

	it('fixes a saved document that no startup transaction would touch', async () => {
		const editor = createEditor(savedDocumentEndingInARule);
		expect(lastChildName(editor)).toBe('horizontalRule');

		await afterCreate();
		expect(lastChildName(editor)).toBe('paragraph');
	});

	it('reports no user edit for merely opening the document', async () => {
		const reported: unknown[] = [];
		const editor = createEditor(savedDocumentEndingInARule);

		// Mirrors the guard in `use-blockleaf-editor`'s `onUpdate`.
		editor.on('update', ({ transaction }) => {
			if (transaction.getMeta('blockleafNormalisation')) return;
			if (!transaction.docChanged) return;
			reported.push(transaction);
		});

		await afterCreate();

		expect(lastChildName(editor)).toBe('paragraph');
		expect(reported).toHaveLength(0);
	});

	it('still reports a real edit after the startup pass', async () => {
		const reported: unknown[] = [];
		const editor = createEditor(savedDocumentEndingInARule);
		editor.on('update', ({ transaction }) => {
			if (transaction.getMeta('blockleafNormalisation')) return;
			if (!transaction.docChanged) return;
			reported.push(transaction);
		});

		await afterCreate();
		editor.commands.insertContentAt(1, 'typed');

		expect(reported.length).toBeGreaterThan(0);
	});

	it('leaves the startup paragraph out of the undo history', async () => {
		const editor = createEditor(savedDocumentEndingInARule);
		await afterCreate();
		expect(lastChildName(editor)).toBe('paragraph');

		editor.commands.undo();
		expect(lastChildName(editor)).toBe('paragraph');
	});

	it('does not pile up paragraphs after one already there', () => {
		const editor = createEditor('<p>A</p><p></p>');
		const before = editor.state.doc.childCount;

		editor.commands.setTextSelection(1);
		editor.commands.insertContent(' more');

		expect(editor.state.doc.childCount).toBe(before);
		expect(lastChildName(editor)).toBe('paragraph');
	});

	it('leaves a document ending in a heading alone', async () => {
		const editor = createEditor('<p>A</p><h2>Title</h2>');
		await afterCreate();
		expect(lastChildName(editor)).toBe('heading');
	});
});
