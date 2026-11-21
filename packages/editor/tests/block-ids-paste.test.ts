import { Editor, type JSONContent } from '@tiptap/core';
import { Slice } from '@tiptap/pm/model';
import { TextSelection, type Transaction } from '@tiptap/pm/state';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { UniqueID } from '../src/core/block-ids.js';
import { BLOCK_NODE_TYPES } from '../src/core/constants.js';
import { createExtensions } from '../src/core/extensions.js';

// jsdom has no `ClipboardEvent`, and `EditorView.pasteHTML` builds one.
beforeAll(() => {
	const scope = globalThis as { ClipboardEvent?: unknown };
	scope.ClipboardEvent ??= class extends Event {};
});

let editor: Editor | undefined;

afterEach(() => {
	editor?.destroy();
	editor = undefined;
});

const open = (content: JSONContent | string = '<p></p>'): Editor => {
	editor = new Editor({ extensions: createExtensions('standard'), content });
	return editor;
};

/**
 * Pastes the way a browser does: the `paste` DOM event first, which is what
 * tells `UniqueID` to clear copied ids, then the paste itself.
 */
const paste = (target: Editor, html: string): void => {
	const { view } = target;
	view.someProp('handleDOMEvents', (handlers) => {
		handlers.paste?.(view, new Event('paste') as unknown as ClipboardEvent);
	});
	view.pasteHTML(html);
};

const pastePlainText = (target: Editor, text: string): void => {
	const { view } = target;
	const event = new Event('paste') as unknown as ClipboardEvent;
	Object.defineProperty(event, 'clipboardData', {
		value: {
			getData: (format: string) => (format === 'text/plain' ? text : '')
		}
	});
	view.someProp('handleDOMEvents', (handlers) => {
		handlers.paste?.(view, event);
	});
	view.someProp('handlePaste', (handle) => handle(view, event, Slice.empty));
};

const blockIds = (target: Editor): unknown[] => {
	const ids: unknown[] = [];
	target.state.doc.descendants((node) => {
		if ('id' in node.attrs) ids.push(node.attrs.id);
	});
	return ids;
};

const paragraphs = (count: number): string =>
	Array.from({ length: count }, (_, i) => `<p>Paragraph ${i}</p>`).join('');

const expectEveryIdUnique = (target: Editor): void => {
	const ids = blockIds(target);
	expect(ids).not.toContain(null);
	expect(new Set(ids).size).toBe(ids.length);
};

describe('ids for pasted blocks (HD-13)', () => {
	it('gives every pasted block an id', () => {
		const target = open();
		paste(target, '<h2>Title</h2><ul><li><p>One</p></li></ul><p>End</p>');

		expectEveryIdUnique(target);
	});

	it('never keeps the id of the block a paste was copied from', () => {
		const target = open({
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					attrs: { id: 'original' },
					content: [{ type: 'text', text: 'Copied' }]
				}
			]
		});
		target.commands.setTextSelection(target.state.doc.content.size);
		paste(target, '<p data-id="original">Copied</p><p>And more</p>');

		expectEveryIdUnique(target);
		expect(target.state.doc.firstChild?.attrs.id).toBe('original');
	});

	// A paste in the middle of a block splits it. The half before the paste
	// keeps the block's id; the half after must not get the same one.
	it('gives a block split by a paste two different ids', () => {
		const target = open({
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					attrs: { id: 'split-me' },
					content: [{ type: 'text', text: 'BeforeAfter' }]
				}
			]
		});
		const { view } = target;
		view.dispatch(
			view.state.tr.setSelection(
				TextSelection.create(view.state.doc, 1 + 'Before'.length)
			)
		);
		paste(target, '<p>One</p><p>Two</p><p>Three</p>');

		expectEveryIdUnique(target);
		expect(target.state.doc.firstChild?.attrs.id).toBe('split-me');
		expect(target.state.doc.lastChild?.textContent).toContain('After');
	});

	it('gives blocks pasted as Markdown text their ids too', () => {
		const target = open();
		pastePlainText(target, '## Heading\n\n- First\n- Second');

		expect(blockIds(target).length).toBeGreaterThan(3);
		expectEveryIdUnique(target);
	});

	// The structural reason the paste is linear: the ids arrive with the
	// slice, so nothing has to go back and add them one step at a time.
	// `UniqueID`'s own pass was one step per block, each one copying the
	// document the step before it produced.
	it('adds no steps after a paste to give blocks their ids', () => {
		// Opened with its id already there, as `useBlockleafEditor` opens
		// every document (`withBlockIds`). A bare `Editor` adds the first
		// block's id later, on a timer, and that step is not the paste's.
		const target = open({
			type: 'doc',
			content: [{ type: 'paragraph', attrs: { id: 'start' } }]
		});
		const appended: Transaction[] = [];
		target.on('transaction', ({ appendedTransactions }) => {
			appended.push(...appendedTransactions);
		});

		paste(target, paragraphs(500));

		const idSteps = appended
			.filter((tr) => tr.getMeta('__uniqueIDTransaction') === true)
			.reduce((total, tr) => total + tr.steps.length, 0);
		expect(idSteps).toBe(0);
		expectEveryIdUnique(target);
	});

	// About two seconds alone, more when every package tests at once. The
	// quadratic path took over thirty, so twenty still catches it.
	it(
		'pastes ten thousand blocks with an id on each',
		{ timeout: 20_000 },
		() => {
			const target = open();
			paste(target, paragraphs(10_000));

			expect(target.state.doc.childCount).toBe(10_000);
			expectEveryIdUnique(target);
		}
	);

	// `UniqueID` is told to skip pastes, and nothing else: typing still goes
	// through it.
	it('still gives a block made by typing its id', () => {
		const target = open('<p>Hello</p>');
		target.commands.setTextSelection(target.state.doc.content.size - 1);
		target.commands.splitBlock();

		expectEveryIdUnique(target);
	});
});

// The documented way to give a block type of your own an id is to configure
// `UniqueID` again. That must not bring the slow path back.
describe("Blockleaf's UniqueID", () => {
	it('keeps leaving pastes to PastedBlockIds after configure', () => {
		const configured = UniqueID.configure({
			types: [...BLOCK_NODE_TYPES, 'callToAction']
		});
		const { filterTransaction } = configured.options;
		const pasted = open().state.tr.setMeta('uiEvent', 'paste');
		const typed = open().state.tr.insertText('a');

		expect(filterTransaction?.(pasted)).toBe(false);
		expect(filterTransaction?.(typed)).toBe(true);
	});
});
