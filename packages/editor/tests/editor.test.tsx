import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createEmptyDocument } from '../src/core/schema.js';
import { BlockleafEditor } from '../src/react/editor.js';

/** Queries are scoped to the render container — never `document` — so a leaked
 *  node from a previous test cannot satisfy an assertion. */
const surfaceOf = (container: HTMLElement) =>
	container.querySelector('.blockleaf-editor__content');

describe('<BlockleafEditor />', () => {
	it('renders an editable surface', async () => {
		const { container } = render(
			<BlockleafEditor defaultValue={createEmptyDocument()} />
		);

		await waitFor(() => expect(surfaceOf(container)).not.toBeNull());
		expect(surfaceOf(container)?.getAttribute('contenteditable')).toBe(
			'true'
		);
	});

	it('respects editable={false}', async () => {
		const { container } = render(<BlockleafEditor editable={false} />);

		await waitFor(() => expect(surfaceOf(container)).not.toBeNull());
		expect(surfaceOf(container)?.getAttribute('contenteditable')).toBe(
			'false'
		);
	});

	it('seeds its content from defaultValue', async () => {
		const doc = {
			...createEmptyDocument(),
			content: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'seeded' }]
				}
			]
		};
		const { container } = render(<BlockleafEditor defaultValue={doc} />);

		await waitFor(() =>
			expect(surfaceOf(container)?.textContent).toContain('seeded')
		);
	});

	it('keeps the base class when a custom className is given', async () => {
		const { container } = render(<BlockleafEditor className="my-editor" />);

		await waitFor(() => expect(surfaceOf(container)).not.toBeNull());
		const root = container.querySelector('.blockleaf-editor');
		expect(root?.classList.contains('blockleaf-editor')).toBe(true);
		expect(root?.classList.contains('my-editor')).toBe(true);
	});
});
