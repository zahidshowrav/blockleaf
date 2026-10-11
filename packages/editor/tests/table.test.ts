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
