import { fireEvent, render, screen } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import { createExtensions } from '../src/core/index.js';
import {
	AltEditor,
	BubbleMenu,
	createImageMenuExtension,
	defaultImageActions,
	imageMenuShouldShow,
	isImageSelection
} from '../src/ui/index.js';

const editors: Editor[] = [];

const createImageEditor = (html = '<img src="https://cdn.test/a.png">') => {
	const editor = new Editor({
		extensions: createExtensions('standard'),
		content: html
	});
	editors.push(editor);
	return editor;
};

/** Puts a NodeSelection on the first image, which is what the menu keys on. */
const selectImage = (editor: Editor) => {
	let position = -1;
	editor.state.doc.descendants((node, pos) => {
		if (position === -1 && node.type.name === 'image') position = pos;
		return true;
	});
	if (position === -1) throw new Error('no image in the document');
	editor.commands.setNodeSelection(position);
	return position;
};

afterEach(() => {
	while (editors.length) {
		editors.pop()?.destroy();
	}
});

const imageAttrs = (editor: Editor) => {
	let attrs: Record<string, unknown> | null = null;
	editor.state.doc.descendants((node) => {
		if (!attrs && node.type.name === 'image') attrs = node.attrs;
		return true;
	});
	return attrs as Record<string, unknown> | null;
};

describe('image selection detection (MC-04)', () => {
	it('recognises a node selection on an image', () => {
		const editor = createImageEditor();
		selectImage(editor);
		expect(isImageSelection(editor.state.selection)).toBe(true);
	});

	it('ignores a text selection', () => {
		const editor = createImageEditor('<p>Some text here</p>');
		editor.commands.selectAll();
		expect(isImageSelection(editor.state.selection)).toBe(false);
	});

	it('ignores a node selection on a different node', () => {
		const editor = createImageEditor('<hr><p>after</p>');
		let position = -1;
		editor.state.doc.descendants((node, pos) => {
			if (position === -1 && node.type.name === 'horizontalRule') {
				position = pos;
			}
			return true;
		});
		editor.commands.setNodeSelection(position);
		expect(isImageSelection(editor.state.selection)).toBe(false);
	});
});

describe('image menu visibility (MC-04)', () => {
	const show = (editor: Editor) =>
		imageMenuShouldShow({
			editor,
			element: document.createElement('div'),
			view: editor.view,
			state: editor.state,
			from: editor.state.selection.from,
			to: editor.state.selection.to
		});

	it('shows for a selected image', () => {
		const editor = createImageEditor();
		selectImage(editor);
		expect(show(editor)).toBe(true);
	});

	it('stays hidden for a text selection', () => {
		const editor = createImageEditor('<p>Some text here</p>');
		editor.commands.selectAll();
		expect(show(editor)).toBe(false);
	});

	it('stays hidden in a read-only document', () => {
		const editor = createImageEditor();
		selectImage(editor);
		editor.setEditable(false);
		expect(show(editor)).toBe(false);
	});
});

describe('image menu actions (MC-04)', () => {
	it('offers alignment and delete', () => {
		expect(defaultImageActions.map((action) => action.id)).toEqual([
			'align-left',
			'align-center',
			'align-right',
			'delete-image'
		]);
	});

	it('sets each alignment on the selected image', () => {
		const editor = createImageEditor();
		selectImage(editor);

		for (const [id, expected] of [
			['align-center', 'center'],
			['align-right', 'right'],
			['align-left', 'left']
		] as const) {
			const action = defaultImageActions.find((entry) => entry.id === id);
			action?.run(editor);
			expect(imageAttrs(editor)?.align).toBe(expected);
		}
	});

	// An unset alignment renders flush left, so the button must say so.
	it('reports align-left as active while alignment is unset', () => {
		const editor = createImageEditor();
		selectImage(editor);

		const left = defaultImageActions.find((a) => a.id === 'align-left');
		const centre = defaultImageActions.find((a) => a.id === 'align-center');

		expect(imageAttrs(editor)?.align).toBeNull();
		expect(left?.isActive(editor)).toBe(true);
		expect(centre?.isActive(editor)).toBe(false);
	});

	it('deletes the selected image', () => {
		const editor = createImageEditor();
		selectImage(editor);

		defaultImageActions
			.find((action) => action.id === 'delete-image')
			?.run(editor);

		expect(imageAttrs(editor)).toBeNull();
	});
});

describe('alt text panel (MC-04)', () => {
	it('writes alt text onto the selected image', () => {
		const editor = createImageEditor();
		selectImage(editor);

		render(
			<AltEditor
				editor={editor}
				onClose={() => {}}
			/>
		);

		const input = screen.getByLabelText('Alt text');
		fireEvent.change(input, { target: { value: 'A cat on a wall' } });
		fireEvent.submit(input.closest('form') as HTMLFormElement);

		expect(imageAttrs(editor)?.alt).toBe('A cat on a wall');
	});

	it('loads the existing alt text into the field', () => {
		const editor = createImageEditor(
			'<img src="https://cdn.test/a.png" alt="Existing">'
		);
		selectImage(editor);

		render(
			<AltEditor
				editor={editor}
				onClose={() => {}}
			/>
		);

		const input = screen.getByLabelText('Alt text') as HTMLInputElement;
		expect(input.value).toBe('Existing');
	});

	// An empty alt is the documented way to mark an image decorative.
	it('treats an empty submission as marking the image decorative', () => {
		const editor = createImageEditor(
			'<img src="https://cdn.test/a.png" alt="Was described">'
		);
		selectImage(editor);

		render(
			<AltEditor
				editor={editor}
				onClose={() => {}}
			/>
		);

		const input = screen.getByLabelText('Alt text');
		fireEvent.change(input, { target: { value: '   ' } });
		fireEvent.submit(input.closest('form') as HTMLFormElement);

		expect(imageAttrs(editor)?.alt).toBe('');
	});

	it('closes without writing when Escape is pressed', () => {
		const editor = createImageEditor();
		selectImage(editor);

		let closed = false;
		render(
			<AltEditor
				editor={editor}
				onClose={() => {
					closed = true;
				}}
			/>
		);

		const input = screen.getByLabelText('Alt text');
		fireEvent.change(input, { target: { value: 'Discarded' } });
		fireEvent.keyDown(input, { key: 'Escape' });

		expect(closed).toBe(true);
		expect(imageAttrs(editor)?.alt).toBeNull();
	});
});

describe('image menu toolbar (MC-04)', () => {
	const renderMenu = (editor: Editor) =>
		render(
			<BubbleMenu
				editor={editor}
				actions={defaultImageActions}
				link={false}
				label="Image"
				panel={{
					id: 'alt',
					label: () => 'Add alt text',
					component: AltEditor
				}}
			/>
		);

	it('labels itself as an image toolbar, not text formatting', () => {
		const editor = createImageEditor();
		selectImage(editor);
		renderMenu(editor);

		expect(screen.getByRole('toolbar').getAttribute('aria-label')).toBe(
			'Image'
		);
	});

	it('offers no link button', () => {
		const editor = createImageEditor();
		selectImage(editor);
		renderMenu(editor);

		expect(screen.queryByLabelText('Add link')).toBeNull();
		expect(screen.queryByLabelText('Add alt text')).not.toBeNull();
	});

	it('opens the alt panel from the toolbar and returns focus on close', () => {
		const editor = createImageEditor();
		selectImage(editor);
		renderMenu(editor);

		fireEvent.click(screen.getByLabelText('Add alt text'));
		const input = screen.getByLabelText('Alt text');
		expect(document.body.contains(input)).toBe(true);

		fireEvent.keyDown(input, { key: 'Escape' });
		expect(document.activeElement).toBe(
			screen.getByLabelText('Add alt text')
		);
	});
});

describe('image menu extension (MC-04)', () => {
	it('registers under its own name so it can coexist with the text menu', () => {
		const editor = new Editor({
			extensions: [
				...createExtensions('standard'),
				createImageMenuExtension()
			]
		});
		editors.push(editor);

		const names = editor.extensionManager.extensions.map((ext) => ext.name);
		expect(names).toContain('imageMenu');
	});

	it('takes a function receiving the defaults', () => {
		const extension = createImageMenuExtension({
			actions: (defaults) =>
				defaults.filter((action) => action.id !== 'delete-image')
		});

		expect(extension.name).toBe('imageMenu');
	});
});
