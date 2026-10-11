import { Editor } from '@tiptap/core';
import { describe, expect, it } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';

describe('TableKit integration (EC-12)', () => {
	it('integrates TableKit with table nodes in standard preset', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		expect(editor.schema.nodes.table).toBeDefined();
		expect(editor.schema.nodes.tableRow).toBeDefined();
		expect(editor.schema.nodes.tableHeader).toBeDefined();
		expect(editor.schema.nodes.tableCell).toBeDefined();

		editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true });
		const json = editor.getJSON();
		const tableNode = json.content?.find((n) => n.type === 'table');

		expect(tableNode).toBeDefined();
		expect(tableNode?.content).toHaveLength(2);

		editor.destroy();
	});
});

describe('insertTable command and keyboard path (EC-13)', () => {
	it('inserts table via insertTable command', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		const success = editor.commands.insertTable({
			rows: 3,
			cols: 3,
			withHeaderRow: true
		});
		expect(success).toBe(true);

		const json = editor.getJSON();
		const tableNode = json.content?.find((n) => n.type === 'table');
		expect(tableNode).toBeDefined();
		expect(tableNode?.content).toHaveLength(3);

		editor.destroy();
	});

	it('inserts table via Mod-Alt-t shortcut', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		const event = new KeyboardEvent('keydown', {
			key: 't',
			bubbles: true,
			cancelable: true,
			ctrlKey: true,
			altKey: true
		});

		let handled = false;
		editor.view.someProp('handleKeyDown', (f) => {
			if (f(editor.view, event)) {
				handled = true;
				return true;
			}
			return false;
		});

		expect(handled).toBe(true);
		const json = editor.getJSON();
		const tableNode = json.content?.find((n) => n.type === 'table');
		expect(tableNode).toBeDefined();
		expect(tableNode?.content).toHaveLength(3);

		editor.destroy();
	});

	it('inserts table via ||| input rule', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		const text = '||| ';
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
				editor.view.dispatch(
					editor.state.tr.insertText(char, from, to)
				);
			}
		}

		const json = editor.getJSON();
		const tableNode = json.content?.find((n) => n.type === 'table');
		expect(tableNode).toBeDefined();
		expect(tableNode?.content).toHaveLength(3);

		editor.destroy();
	});
});
