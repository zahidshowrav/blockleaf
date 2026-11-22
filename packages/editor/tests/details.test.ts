import { Editor, type JSONContent } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { afterEach, describe, expect, it } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';
import {
	createEmptyDocument,
	withBlockIds,
	withSchemaVersion,
	type BlockNode
} from '../src/core/schema.js';
import { createSlashCommands } from '../src/ui/slash-menu/registry.js';
import { validateDocument } from '../src/validate.js';

const paragraph = (text?: string): JSONContent => ({
	type: 'paragraph',
	...(text ? { content: [{ type: 'text', text }] } : {})
});

const toggle = (open: boolean, ...blocks: JSONContent[]): JSONContent => ({
	type: 'details',
	attrs: { open },
	content: blocks
});

let editor: Editor | null = null;

const openEditor = (
	content: JSONContent[] | string,
	preset: 'standard' | 'minimal' = 'standard'
) => {
	editor = new Editor({
		extensions: createExtensions(preset),
		content:
			typeof content === 'string'
				? content
				: // Ids up front, as `useBlockleafEditor` opens every document.
					withBlockIds({
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

const press = (instance: Editor, key: string, init: KeyboardEventInit = {}) =>
	instance.view.someProp('handleKeyDown', (handle) =>
		handle(instance.view, new KeyboardEvent('keydown', { key, ...init }))
	);

/** Puts the caret in the text node that reads `text`, `offset` into it. */
const caretIn = (instance: Editor, text: string, offset = 0) => {
	let target = -1;
	instance.state.doc.descendants((node, pos) => {
		if (target === -1 && node.isText && node.text === text) {
			target = pos + offset;
		}
	});
	instance.commands.setTextSelection(target);
};

/**
 * The top-level blocks, without the empty paragraph the trailing-node rule
 * keeps after a document that ends in a toggle.
 */
const top = (instance: Editor): JSONContent[] => {
	const content = [...((instance.getJSON() as JSONContent).content ?? [])];
	const last = content.at(-1);
	if (last?.type === 'paragraph' && !last.content) content.pop();
	return content;
};

const firstDetails = (instance: Editor): JSONContent | undefined =>
	top(instance).find((node) => node.type === 'details');

const textOf = (node: JSONContent | undefined): string =>
	(node?.content ?? []).map((child) => child.text ?? textOf(child)).join('');

describe('toggle block (PA-01)', () => {
	describe('stored shape (F23)', () => {
		it('stores the shape details has had since 0.1.0', () => {
			const instance = openEditor([
				toggle(false, paragraph('Title'), paragraph('Body'))
			]);
			const details = firstDetails(instance);

			expect(details?.attrs).toEqual({
				open: false,
				id: expect.any(String) as string
			});
			expect(details?.content?.map((node) => node.type)).toEqual([
				'paragraph',
				'paragraph'
			]);
			// What `useBlockleafEditor` saves: the editor's JSON with its version.
			expect(() =>
				validateDocument(withSchemaVersion(instance.getJSON()))
			).not.toThrow();
		});

		it('opens a stored toggle and saves it back unchanged', () => {
			const stored = withBlockIds({
				...createEmptyDocument(),
				content: [
					toggle(true, paragraph('Title'), paragraph('Body'))
				] as BlockNode[]
			});
			const instance = openEditor(stored.content as JSONContent[]);

			expect(top(instance)).toEqual(stored.content);
		});

		it('reads a summary from pasted HTML as the title', () => {
			const instance = openEditor(
				'<details open><summary>Title</summary><p>Body</p></details>'
			);
			const details = firstDetails(instance);

			expect(details?.attrs?.open).toBe(true);
			expect(details?.content?.map(textOf)).toEqual(['Title', 'Body']);
		});

		it('reads its own HTML back as the same toggle', () => {
			const first = openEditor([
				toggle(false, paragraph('Title'), paragraph('Body'))
			]);
			const html = first.getHTML();
			first.destroy();
			const instance = openEditor(html);

			expect(firstDetails(instance)?.attrs?.open).toBe(false);
			expect(firstDetails(instance)?.content?.map(textOf)).toEqual([
				'Title',
				'Body'
			]);
		});
	});

	describe('commands', () => {
		it('wraps the current block in an open toggle', () => {
			const instance = openEditor([paragraph('Title')]);
			caretIn(instance, 'Title');
			instance.commands.setDetails();

			expect(firstDetails(instance)?.attrs?.open).toBe(true);
			expect(textOf(firstDetails(instance)?.content?.[0])).toBe('Title');
		});

		it('opens and closes the toggle around the caret', () => {
			const instance = openEditor([
				toggle(false, paragraph('Title'), paragraph('Body'))
			]);
			caretIn(instance, 'Title');

			instance.commands.toggleDetailsOpen();
			expect(firstDetails(instance)?.attrs?.open).toBe(true);

			instance.commands.toggleDetailsOpen();
			expect(firstDetails(instance)?.attrs?.open).toBe(false);
		});

		it('moves the caret to the title when closed from the body', () => {
			const instance = openEditor([
				toggle(true, paragraph('Title'), paragraph('Body'))
			]);
			caretIn(instance, 'Body', 2);
			instance.commands.toggleDetailsOpen();

			expect(instance.state.selection.$from.parent.textContent).toBe(
				'Title'
			);
		});

		it('takes the blocks back out of the toggle', () => {
			const instance = openEditor([
				toggle(true, paragraph('Title'), paragraph('Body'))
			]);
			caretIn(instance, 'Body');
			instance.commands.unsetDetails();

			expect(top(instance).map(textOf)).toEqual(['Title', 'Body']);
			expect(firstDetails(instance)).toBeUndefined();
		});
	});

	describe('keyboard', () => {
		it('starts a block after a closed toggle on Enter at the end of its title', () => {
			const instance = openEditor([
				toggle(false, paragraph('Title'), paragraph('Body'))
			]);
			caretIn(instance, 'Title', 'Title'.length);
			press(instance, 'Enter');
			instance.commands.insertContent('After');

			expect(top(instance).map((node) => node.type)).toEqual([
				'details',
				'paragraph'
			]);
			expect(textOf(top(instance)[1])).toBe('After');
			expect(firstDetails(instance)?.content?.map(textOf)).toEqual([
				'Title',
				'Body'
			]);
		});

		it('opens a closed toggle on Enter in the middle of its title', () => {
			const instance = openEditor([
				toggle(false, paragraph('TitleRest'), paragraph('Body'))
			]);
			caretIn(instance, 'TitleRest', 'Title'.length);
			press(instance, 'Enter');

			expect(firstDetails(instance)?.attrs?.open).toBe(true);
			expect(firstDetails(instance)?.content?.map(textOf)).toEqual([
				'Title',
				'Rest',
				'Body'
			]);
		});

		it('adds a line to the body on Enter in an open title', () => {
			const instance = openEditor([
				toggle(true, paragraph('Title'), paragraph('Body'))
			]);
			caretIn(instance, 'Title', 'Title'.length);
			press(instance, 'Enter');
			instance.commands.insertContent('New');

			expect(firstDetails(instance)?.content?.map(textOf)).toEqual([
				'Title',
				'New',
				'Body'
			]);
		});

		it('turns the toggle back into its blocks on Backspace at the start of its title', () => {
			const instance = openEditor([
				paragraph('Before'),
				toggle(false, paragraph('Title'), paragraph('Body'))
			]);
			caretIn(instance, 'Title');
			press(instance, 'Backspace');

			expect(top(instance).map(textOf)).toEqual([
				'Before',
				'Title',
				'Body'
			]);
		});

		it('opens and closes with Mod-Enter', () => {
			const instance = openEditor([
				toggle(false, paragraph('Title'), paragraph('Body'))
			]);
			caretIn(instance, 'Title', 2);
			// jsdom is not a Mac, so Mod is Ctrl.
			press(instance, 'Enter', { ctrlKey: true });

			expect(firstDetails(instance)?.attrs?.open).toBe(true);
		});
	});

	// Undo, a search or a host's own selection can land the caret in a body
	// that is not displayed. It opens rather than typing into nothing.
	it('opens a closed toggle when the caret lands in its body', () => {
		const instance = openEditor([
			toggle(false, paragraph('Title'), paragraph('Body'))
		]);
		let body = -1;
		instance.state.doc.descendants((node, pos) => {
			if (node.isText && node.text === 'Body') body = pos;
		});
		instance.view.dispatch(
			instance.state.tr.setSelection(
				TextSelection.create(instance.state.doc, body)
			)
		);

		expect(firstDetails(instance)?.attrs?.open).toBe(true);
	});

	describe('slash menu', () => {
		const toggleCommand = createSlashCommands().find(
			(command) => command.id === 'toggle'
		);

		it('inserts a toggle', () => {
			const instance = openEditor([paragraph('Title')]);
			caretIn(instance, 'Title');
			toggleCommand?.run(instance);

			expect(firstDetails(instance)?.attrs?.open).toBe(true);
		});

		it('is not offered by an editor without the node', () => {
			const instance = openEditor([paragraph()], 'minimal');

			expect(toggleCommand?.isAvailable?.(instance)).toBe(false);
		});
	});
});
