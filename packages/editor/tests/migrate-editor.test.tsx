import { render, waitFor } from '@testing-library/react';
import { type Editor } from '@tiptap/core';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type * as MigrateModule from '../src/core/migrate.js';
import { type BlockleafDocument } from '../src/core/schema.js';
import { useBlockleafEditor } from '../src/react/use-blockleaf-editor.js';

// There is no real migration while `SCHEMA_VERSION` is 1, so this stands in
// for one: it rewrites the text of a version 0 document. What is under test
// is that the editor runs `migrate` on `defaultValue` before reading it.
vi.mock('../src/core/migrate.js', async (importOriginal) => {
	const actual = await importOriginal<typeof MigrateModule>();
	return {
		...actual,
		migrate: vi.fn((doc: BlockleafDocument) =>
			doc.attrs.schemaVersion === 0
				? {
						type: 'doc',
						attrs: { schemaVersion: 1 },
						content: [
							{
								type: 'paragraph',
								content: [{ type: 'text', text: 'migrated' }]
							}
						]
					}
				: doc
		)
	};
});

const Probe = ({
	defaultValue,
	onReady
}: {
	defaultValue: BlockleafDocument;
	onReady: (editor: Editor) => void;
}) => {
	const editor = useBlockleafEditor({ defaultValue });
	useEffect(() => {
		if (editor) onReady(editor);
	}, [editor, onReady]);
	return null;
};

describe('the editor migrates defaultValue (HD-09)', () => {
	it('opens the migrated document, not the stored one', async () => {
		const stored = {
			type: 'doc',
			attrs: { schemaVersion: 0 },
			content: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'stored' }]
				}
			]
		} as BlockleafDocument;
		let editor: Editor | null = null;
		render(
			<Probe
				defaultValue={stored}
				onReady={(instance) => {
					editor = instance;
				}}
			/>
		);
		await waitFor(() => expect(editor).not.toBeNull());
		expect((editor as Editor | null)?.getText()).toBe('migrated');
	});
});
