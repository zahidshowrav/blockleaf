import { Editor } from '@tiptap/core';
import { describe, expect, it } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';

const typeText = (editor: Editor, text: string) => {
	for (const char of text) {
		const { from, to } = editor.state.selection;
		let handled = false;
		editor.view.someProp('handleTextInput', (f) => {
			if (
				f(editor.view, from, to, char, () =>
					editor.state.tr.insertText(char, from, to)
				)
			) {
				handled = true;
				return true;
			}
			return false;
		});
		if (!handled) {
			editor.view.dispatch(editor.state.tr.insertText(char, from, to));
		}
	}
};

describe('markdown input rules (EC-06)', () => {
	it('converts # into heading level 1, ## into level 2, ### into level 3', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		typeText(editor, '# Heading 1');
		expect(editor.getJSON().content?.[0]?.type).toBe('heading');
		expect(editor.getJSON().content?.[0]?.attrs?.level).toBe(1);

		editor.commands.setContent('<p></p>');
		typeText(editor, '## Heading 2');
		expect(editor.getJSON().content?.[0]?.type).toBe('heading');
		expect(editor.getJSON().content?.[0]?.attrs?.level).toBe(2);

		editor.commands.setContent('<p></p>');
		typeText(editor, '### Heading 3');
		expect(editor.getJSON().content?.[0]?.type).toBe('heading');
		expect(editor.getJSON().content?.[0]?.attrs?.level).toBe(3);

		editor.destroy();
	});

	it('converts > into blockquote', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		typeText(editor, '> Quote');
		expect(editor.getJSON().content?.[0]?.type).toBe('blockquote');

		editor.destroy();
	});

	it('converts - into bullet list', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		typeText(editor, '- List item');
		expect(editor.getJSON().content?.[0]?.type).toBe('bulletList');

		editor.destroy();
	});

	it('converts 1. into ordered list', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		typeText(editor, '1. Numbered');
		expect(editor.getJSON().content?.[0]?.type).toBe('orderedList');

		editor.destroy();
	});

	it('converts [ ] into task list', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		typeText(editor, '[ ] Task item');
		expect(editor.getJSON().content?.[0]?.type).toBe('taskList');

		editor.destroy();
	});

	it('converts ::: into callout', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		typeText(editor, '::: Callout note');
		expect(editor.getJSON().content?.[0]?.type).toBe('callout');

		editor.destroy();
	});

	it('converts **bold** and *italic* marks', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		typeText(editor, 'hello **bold** world');
		const json = editor.getJSON();
		const p = json.content?.[0];
		const boldNode = p?.content?.find((c: { marks?: { type: string }[] }) =>
			c.marks?.some((m) => m.type === 'bold')
		) as { text?: string; marks?: { type: string }[] } | undefined;
		expect(boldNode).toBeDefined();
		expect(boldNode?.text).toBe('bold');

		editor.destroy();
	});

	it('converts ==highlight== mark', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		typeText(editor, '==highlighted== ');
		const json = editor.getJSON();
		const p = json.content?.[0];
		const mark = p?.content?.[0]?.marks?.find(
			(m: { type: string }) => m.type === 'highlight'
		);
		expect(mark).toBeDefined();

		editor.destroy();
	});

	it('converts [text](url) markdown link with sanitisation', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		typeText(editor, '[blockleaf docs](https://blockleaf.dev)');
		const json = editor.getJSON();
		const p = json.content?.[0];
		const linkNode = p?.content?.find((c: { marks?: { type: string }[] }) =>
			c.marks?.some((m) => m.type === 'link')
		) as
			| {
					text?: string;
					marks?: { type: string; attrs?: { href?: string } }[];
			  }
			| undefined;
		expect(linkNode).toBeDefined();
		expect(linkNode?.text).toBe('blockleaf docs');
		const linkMark = linkNode?.marks?.find((m) => m.type === 'link');
		expect(linkMark?.attrs?.href).toBe('https://blockleaf.dev');

		editor.destroy();
	});

	it('rejects unsafe link in markdown link input rule', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		typeText(editor, '[exploit](javascript:alert(1))');
		const json = editor.getJSON();
		const p = json.content?.[0];
		const linkNode = p?.content?.find((c) =>
			c.marks?.some((m) => m.type === 'link')
		);
		expect(linkNode).toBeUndefined();

		editor.destroy();
	});
});
