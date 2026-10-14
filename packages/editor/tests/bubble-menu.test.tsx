import { fireEvent, render, screen } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createExtensions } from '../src/core/index.js';
import {
	BlockleafEditor,
	BubbleMenu,
	LinkEditor,
	createBubbleMenuExtension,
	defaultBlockActions,
	defaultBubbleActions,
	defaultCellActions,
	defaultTableActions,
	resolveBubbleActions,
	type BubbleAction
} from '../src/ui/index.js';

const createEditor = (content = '<p>Hello world</p>') =>
	new Editor({
		extensions: createExtensions('standard'),
		content
	});

const selectAll = (editor: Editor) => {
	editor.commands.setTextSelection({
		from: 1,
		to: editor.state.doc.content.size - 1
	});
};

const editors: Editor[] = [];
const track = (editor: Editor) => {
	editors.push(editor);
	return editor;
};

afterEach(() => {
	while (editors.length) {
		editors.pop()?.destroy();
	}
});

describe('Bubble menu on a preset without every mark', () => {
	it('reports a toggle unavailable instead of throwing', () => {
		const editor = track(
			new Editor({
				extensions: createExtensions('minimal'),
				content: '<p>Hello world</p>'
			})
		);
		selectAll(editor);

		const highlight = defaultBubbleActions.find(
			(a) => a.id === 'highlight'
		);
		expect(highlight).toBeDefined();
		expect('highlight' in editor.schema.marks).toBe(false);
		expect(() => highlight?.isAvailable?.(editor)).not.toThrow();
		expect(highlight?.isAvailable?.(editor)).toBe(false);
	});

	it('still offers the marks the preset does have', () => {
		const editor = track(
			new Editor({
				extensions: createExtensions('minimal'),
				content: '<p>Hello world</p>'
			})
		);
		selectAll(editor);

		for (const id of ['bold', 'italic', 'underline', 'strike', 'code']) {
			const action = defaultBubbleActions.find((a) => a.id === id);
			expect(action?.isAvailable?.(editor)).toBe(true);
		}
	});

	it('reports table actions unavailable when there is no table node', () => {
		const editor = track(
			new Editor({
				extensions: createExtensions('minimal'),
				content: '<p>Hello world</p>'
			})
		);

		expect('table' in editor.schema.nodes).toBe(false);
		for (const action of [...defaultCellActions, ...defaultTableActions]) {
			expect(() => action.isAvailable?.(editor)).not.toThrow();
			expect(action.isAvailable?.(editor)).toBe(false);
		}
	});

	it('hides a block menu entry whose node type is missing', () => {
		const editor = track(
			new Editor({
				extensions: createExtensions('minimal'),
				content: '<p>Hello world</p>'
			})
		);

		const heading = defaultBlockActions.find(
			(a) => a.id === 'turn-heading-1'
		);
		const paragraph = defaultBlockActions.find(
			(a) => a.id === 'turn-paragraph'
		);

		expect(heading?.isAvailable?.(editor, 0)).toBe(false);
		expect(paragraph?.isAvailable?.(editor, 0)).toBe(true);
	});

	it('renders the toolbar without the missing toggle', () => {
		const editor = track(
			new Editor({
				extensions: createExtensions('minimal'),
				content: '<p>Hello world</p>'
			})
		);
		selectAll(editor);

		expect(() =>
			render(
				<BubbleMenu
					editor={editor}
					actions={defaultBubbleActions}
					link={false}
				/>
			)
		).not.toThrow();
		expect(screen.queryByRole('button', { name: /highlight/i })).toBeNull();
		expect(screen.getByRole('button', { name: /bold/i })).toBeTruthy();
	});
});

describe('Bubble menu actions (CH-02)', () => {
	it('ships the six default mark toggles in reading order', () => {
		expect(defaultBubbleActions.map((a) => a.id)).toEqual([
			'bold',
			'italic',
			'underline',
			'strike',
			'code',
			'highlight'
		]);
	});

	it('every default action toggles the mark it names', () => {
		const editor = track(createEditor());
		selectAll(editor);

		for (const action of defaultBubbleActions) {
			expect(action.isActive(editor)).toBe(false);
			action.run(editor);
			expect(action.isActive(editor)).toBe(true);
			action.run(editor);
			expect(action.isActive(editor)).toBe(false);
		}
	});

	it('resolves custom actions from an array or a function', () => {
		const custom: BubbleAction = {
			id: 'custom',
			title: 'Custom',
			isActive: () => false,
			run: vi.fn()
		};

		expect(resolveBubbleActions([custom])).toEqual([custom]);
		expect(resolveBubbleActions()).toBe(defaultBubbleActions);

		const extended = resolveBubbleActions((defaults) => [
			...defaults,
			custom
		]);
		expect(extended).toHaveLength(defaultBubbleActions.length + 1);
		expect(extended.at(-1)).toBe(custom);
	});
});

describe('Bubble menu toolbar', () => {
	it('renders a labelled toolbar with one button per action plus link', () => {
		const editor = track(createEditor());
		selectAll(editor);

		render(
			<BubbleMenu
				editor={editor}
				actions={defaultBubbleActions}
				link={true}
			/>
		);

		const toolbar = screen.getByRole('toolbar', {
			name: 'Text formatting'
		});
		expect(toolbar).toBeDefined();
		expect(toolbar.querySelectorAll('[data-bubble-button]')).toHaveLength(
			defaultBubbleActions.length + 1
		);
	});

	it('reflects mark state in aria-pressed', () => {
		const editor = track(createEditor());
		selectAll(editor);
		editor.commands.toggleBold();

		render(
			<BubbleMenu
				editor={editor}
				actions={defaultBubbleActions}
				link={true}
			/>
		);

		expect(
			screen
				.getByRole('button', { name: 'Bold' })
				.getAttribute('aria-pressed')
		).toBe('true');
		expect(
			screen
				.getByRole('button', { name: 'Italic' })
				.getAttribute('aria-pressed')
		).toBe('false');
	});

	it('runs the command when a button is clicked', () => {
		const editor = track(createEditor());
		selectAll(editor);

		render(
			<BubbleMenu
				editor={editor}
				actions={defaultBubbleActions}
				link={true}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: 'Italic' }));
		expect(editor.isActive('italic')).toBe(true);
	});

	it('hides an action that cannot apply to the selection', () => {
		const editor = track(createEditor());
		selectAll(editor);

		const unavailable: BubbleAction = {
			id: 'never',
			title: 'Never',
			isActive: () => false,
			isAvailable: () => false,
			run: vi.fn()
		};

		render(
			<BubbleMenu
				editor={editor}
				actions={[...defaultBubbleActions, unavailable]}
				link={false}
			/>
		);

		expect(screen.queryByRole('button', { name: 'Never' })).toBeNull();
	});

	it('moves focus with a roving tabindex, wrapping at both ends', () => {
		const editor = track(createEditor());
		selectAll(editor);

		render(
			<BubbleMenu
				editor={editor}
				actions={defaultBubbleActions}
				link={false}
			/>
		);

		const toolbar = screen.getByRole('toolbar');
		const bold = screen.getByRole('button', { name: 'Bold' });
		const italic = screen.getByRole('button', { name: 'Italic' });
		const highlight = screen.getByRole('button', { name: 'Highlight' });

		expect(bold.getAttribute('tabindex')).toBe('0');
		expect(italic.getAttribute('tabindex')).toBe('-1');

		fireEvent.keyDown(toolbar, { key: 'ArrowRight' });
		expect(document.activeElement).toBe(italic);

		fireEvent.keyDown(toolbar, { key: 'Home' });
		expect(document.activeElement).toBe(bold);

		fireEvent.keyDown(toolbar, { key: 'ArrowLeft' });
		expect(document.activeElement).toBe(highlight);

		fireEvent.keyDown(toolbar, { key: 'End' });
		expect(document.activeElement).toBe(highlight);
	});

	it('omits the link button when the link editor is disabled', () => {
		const editor = track(createEditor());
		selectAll(editor);

		render(
			<BubbleMenu
				editor={editor}
				actions={defaultBubbleActions}
				link={false}
			/>
		);

		expect(screen.queryByRole('button', { name: 'Add link' })).toBeNull();
	});

	it('opens the link editor from the link button', () => {
		const editor = track(createEditor());
		selectAll(editor);

		render(
			<BubbleMenu
				editor={editor}
				actions={defaultBubbleActions}
				link={true}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: 'Add link' }));
		expect(screen.getByLabelText('Link address')).toBeDefined();
	});

	it('opens the link editor when the extension raises openLinkRequest', () => {
		const editor = track(createEditor());
		selectAll(editor);

		const { rerender } = render(
			<BubbleMenu
				editor={editor}
				actions={defaultBubbleActions}
				link={true}
				openLinkRequest={0}
			/>
		);

		expect(screen.queryByLabelText('Link address')).toBeNull();

		rerender(
			<BubbleMenu
				editor={editor}
				actions={defaultBubbleActions}
				link={true}
				openLinkRequest={1}
			/>
		);

		expect(screen.getByLabelText('Link address')).toBeDefined();
	});
});

describe('Link editor', () => {
	it('applies a safe https href', () => {
		const editor = track(createEditor());
		selectAll(editor);
		const onClose = vi.fn();

		render(
			<LinkEditor
				editor={editor}
				onClose={onClose}
			/>
		);

		fireEvent.change(screen.getByLabelText('Link address'), {
			target: { value: 'https://example.com' }
		});
		fireEvent.click(screen.getByRole('button', { name: 'Apply link' }));

		expect(editor.getAttributes('link').href).toBe('https://example.com');
		expect(onClose).toHaveBeenCalled();
	});

	it('refuses a javascript: href and says why, without closing', () => {
		const editor = track(createEditor());
		selectAll(editor);
		const onClose = vi.fn();

		render(
			<LinkEditor
				editor={editor}
				onClose={onClose}
			/>
		);

		const input = screen.getByLabelText('Link address');
		fireEvent.change(input, {
			target: { value: 'javascript:alert(1)' }
		});
		fireEvent.click(screen.getByRole('button', { name: 'Apply link' }));

		expect(screen.getByRole('alert').textContent).toContain(
			'Only https, mailto and relative links are allowed.'
		);
		expect(input.getAttribute('aria-invalid')).toBe('true');
		expect(editor.getAttributes('link').href).toBeUndefined();
		expect(onClose).not.toHaveBeenCalled();
	});

	it('pre-fills the existing href and can remove the link', () => {
		const editor = track(
			createEditor('<p><a href="https://a.test">x</a></p>')
		);
		selectAll(editor);
		const onClose = vi.fn();

		render(
			<LinkEditor
				editor={editor}
				onClose={onClose}
			/>
		);

		const input = screen.getByLabelText<HTMLInputElement>('Link address');
		expect(input.value).toBe('https://a.test');

		fireEvent.click(screen.getByRole('button', { name: 'Remove link' }));
		expect(editor.isActive('link')).toBe(false);
		expect(onClose).toHaveBeenCalled();
	});

	it('clearing the field unsets the link', () => {
		const editor = track(
			createEditor('<p><a href="https://a.test">x</a></p>')
		);
		selectAll(editor);
		const onClose = vi.fn();

		render(
			<LinkEditor
				editor={editor}
				onClose={onClose}
			/>
		);

		fireEvent.change(screen.getByLabelText('Link address'), {
			target: { value: '   ' }
		});
		fireEvent.click(screen.getByRole('button', { name: 'Apply link' }));

		expect(editor.isActive('link')).toBe(false);
		expect(onClose).toHaveBeenCalled();
	});

	it('Escape closes without applying', () => {
		const editor = track(createEditor());
		selectAll(editor);
		const onClose = vi.fn();

		render(
			<LinkEditor
				editor={editor}
				onClose={onClose}
			/>
		);

		fireEvent.change(screen.getByLabelText('Link address'), {
			target: { value: 'https://example.com' }
		});
		fireEvent.keyDown(screen.getByLabelText('Link address'), {
			key: 'Escape'
		});

		expect(onClose).toHaveBeenCalled();
		expect(editor.isActive('link')).toBe(false);
	});
});

describe('Bubble menu extension wiring', () => {
	it('registers under the bubbleMenu name with a priority above Link', () => {
		const extension = createBubbleMenuExtension();
		expect(extension.name).toBe('bubbleMenu');
		expect(extension.config.priority).toBe(200);
	});

	it('mounts inside a real editor without tearing down on destroy', () => {
		const editor = new Editor({
			extensions: [
				...createExtensions('standard'),
				createBubbleMenuExtension()
			],
			content: '<p>Hello world</p>'
		});

		expect(
			editor.extensionManager.extensions.some(
				(ext) => ext.name === 'bubbleMenu'
			)
		).toBe(true);

		expect(() => editor.destroy()).not.toThrow();
	});

	it('BlockleafEditor adds the bubble menu by default and drops it when disabled', () => {
		const { container, rerender } = render(<BlockleafEditor />);
		expect(container.querySelector('.blockleaf-editor')).not.toBeNull();

		rerender(<BlockleafEditor bubbleMenu={false} />);
		expect(container.querySelector('.blockleaf-editor')).not.toBeNull();
	});
});
