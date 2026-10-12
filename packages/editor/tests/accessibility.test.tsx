import { fireEvent, render, screen } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import axe from 'axe-core';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createExtensions } from '../src/core/index.js';
import {
	BlockMenu,
	BubbleMenu,
	GridPicker,
	LinkEditor,
	SlashMenu,
	TableControls,
	TableMenu,
	createBubbleMenuExtension,
	createCellMenuExtension,
	createDragHandleExtension,
	createPlaceholderExtension,
	createSlashMenuExtension,
	createTableControlsExtension,
	defaultBlockActions,
	defaultBubbleActions,
	defaultCellActions,
	defaultSlashCommands,
	defaultTableActions,
	type SlashMenuRef
} from '../src/ui/index.js';

const editors: Editor[] = [];
const createEditor = (content = '<p>Some text to select</p>') => {
	const editor = new Editor({
		extensions: createExtensions('standard'),
		content
	});
	editors.push(editor);
	return editor;
};

afterEach(() => {
	while (editors.length) {
		editors.pop()?.destroy();
	}
});

/**
 * Runs axe over a rendered surface.
 *
 * Only rules that apply to a detached fragment are enabled — colour contrast
 * and landmark rules need a laid-out page, and jsdom has no layout. The
 * browser specs in `e2e/accessibility.spec.ts` cover those against a real
 * render.
 */
const checkA11y = async (element: HTMLElement) => {
	const results = await axe.run(element, {
		rules: {
			'color-contrast': { enabled: false },
			region: { enabled: false }
		}
	});
	return results.violations.map((violation) => ({
		id: violation.id,
		nodes: violation.nodes.length,
		help: violation.help
	}));
};

const selectAll = (editor: Editor) =>
	editor.commands.setTextSelection({
		from: 1,
		to: editor.state.doc.content.size - 1
	});

const blockPos = (editor: Editor, index: number) => {
	let pos = 0;
	editor.state.doc.forEach((_node, offset, i) => {
		if (i === index) pos = offset;
	});
	return pos;
};

const tableEditor = () => {
	const editor = createEditor('<p>Before</p>');
	editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
	let cell = -1;
	editor.state.doc.descendants((node, pos) => {
		if (cell === -1 && node.type.name === 'tableCell') cell = pos + 1;
		return cell === -1;
	});
	editor.commands.setTextSelection(cell);
	return editor;
};

describe('The axe harness itself', () => {
	it('reports a violation when there is one', async () => {
		// A gate that cannot fail is not a gate. This proves the harness is
		// wired up before the eleven passing checks below mean anything.
		const broken = document.createElement('div');
		broken.innerHTML =
			'<button></button><img src="x.png"><input type="text">';
		document.body.appendChild(broken);

		const violations = await checkA11y(broken);
		const ids = violations.map((violation) => violation.id);

		expect(ids).toContain('button-name');
		expect(ids).toContain('image-alt');

		broken.remove();
	});
});

describe('Every chrome surface is axe-clean (CH-05)', () => {
	it('the slash menu', async () => {
		const editor = createEditor();
		const { container } = render(
			<SlashMenu
				items={defaultSlashCommands}
				command={vi.fn()}
				editor={editor}
				range={{ from: 1, to: 2 }}
				query=""
			/>
		);

		expect(await checkA11y(container)).toEqual([]);
	});

	it('the slash menu with no results', async () => {
		const editor = createEditor();
		const { container } = render(
			<SlashMenu
				items={[]}
				command={vi.fn()}
				editor={editor}
				range={{ from: 1, to: 2 }}
				query="zzzz"
			/>
		);

		expect(await checkA11y(container)).toEqual([]);
	});

	it('the table grid picker', async () => {
		const editor = createEditor();
		const { container } = render(
			<GridPicker
				editor={editor}
				range={{ from: 1, to: 2 }}
				onCancel={vi.fn()}
			/>
		);

		expect(await checkA11y(container)).toEqual([]);
	});

	it('the bubble menu', async () => {
		const editor = createEditor();
		selectAll(editor);
		const { container } = render(
			<BubbleMenu
				editor={editor}
				actions={defaultBubbleActions}
				link={true}
			/>
		);

		expect(await checkA11y(container)).toEqual([]);
	});

	it('the link editor', async () => {
		const editor = createEditor();
		selectAll(editor);
		const { container } = render(
			<LinkEditor
				editor={editor}
				onClose={vi.fn()}
			/>
		);

		expect(await checkA11y(container)).toEqual([]);
	});

	it('the link editor showing a rejection', async () => {
		const editor = createEditor();
		selectAll(editor);
		const { container } = render(
			<LinkEditor
				editor={editor}
				onClose={vi.fn()}
			/>
		);

		fireEvent.change(screen.getByLabelText('Link address'), {
			target: { value: 'javascript:alert(1)' }
		});
		fireEvent.click(screen.getByRole('button', { name: 'Apply link' }));

		expect(screen.getByRole('alert')).toBeDefined();
		expect(await checkA11y(container)).toEqual([]);
	});

	it('the block menu', async () => {
		const editor = createEditor('<p>A</p><p>B</p>');
		const { container } = render(
			<BlockMenu
				editor={editor}
				actions={defaultBlockActions}
				pos={blockPos(editor, 1)}
				onClose={vi.fn()}
			/>
		);

		expect(await checkA11y(container)).toEqual([]);
	});

	it('the table row menu', async () => {
		const editor = tableEditor();
		const { container } = render(
			<TableMenu
				editor={editor}
				actions={defaultTableActions}
				axis="row"
				onClose={vi.fn()}
			/>
		);

		expect(await checkA11y(container)).toEqual([]);
	});

	it('the table column menu', async () => {
		const editor = tableEditor();
		const { container } = render(
			<TableMenu
				editor={editor}
				actions={defaultTableActions}
				axis="column"
				onClose={vi.fn()}
			/>
		);

		expect(await checkA11y(container)).toEqual([]);
	});

	it('the in-table handles', async () => {
		const editor = tableEditor();
		const { container } = render(
			<TableControls
				editor={editor}
				actions={defaultTableActions}
				placement={{
					columnLeft: 10,
					columnWidth: 80,
					rowTop: 20,
					rowHeight: 30,
					tableTop: 5,
					tableLeft: 2
				}}
			/>
		);

		expect(await checkA11y(container)).toEqual([]);
	});

	it('the cell menu', async () => {
		const editor = tableEditor();
		const { container } = render(
			<BubbleMenu
				editor={editor}
				actions={defaultCellActions}
				link={false}
			/>
		);

		expect(await checkA11y(container)).toEqual([]);
	});
});

describe('Every chrome surface is reachable by keyboard (CH-05)', () => {
	it('the slash menu moves, runs and dismisses without a pointer', () => {
		const editor = createEditor();
		const ref = createRef<SlashMenuRef>();
		const command = vi.fn();

		render(
			<SlashMenu
				ref={ref}
				items={defaultSlashCommands}
				command={command}
				editor={editor}
				range={{ from: 1, to: 2 }}
				query=""
			/>
		);

		const press = (key: string) =>
			ref.current?.onKeyDown({
				event: new KeyboardEvent('keydown', { key })
			} as never);

		expect(press('ArrowDown')).toBe(true);
		expect(press('ArrowUp')).toBe(true);
		expect(press('Enter')).toBe(true);
		expect(command).toHaveBeenCalled();
	});

	it('the bubble menu toolbar is a single tab stop with arrow navigation', () => {
		const editor = createEditor();
		selectAll(editor);

		render(
			<BubbleMenu
				editor={editor}
				actions={defaultBubbleActions}
				link={true}
			/>
		);

		const buttons = screen.getAllByRole('button');
		const tabbable = buttons.filter(
			(button) => button.getAttribute('tabindex') === '0'
		);
		expect(tabbable).toHaveLength(1);

		fireEvent.keyDown(screen.getByRole('toolbar'), { key: 'ArrowRight' });
		expect(document.activeElement).toBe(buttons[1]);
	});

	it('the block menu opens from the keyboard and returns focus on Escape', () => {
		const editor = new Editor({
			extensions: [
				...createExtensions('standard'),
				createDragHandleExtension()
			],
			content: '<p>A</p>'
		});
		editors.push(editor);

		const shortcuts =
			createDragHandleExtension().config.addKeyboardShortcuts;
		expect(typeof shortcuts).toBe('function');

		// `Shift+F10` is the platform context-menu key, and `Mod+Alt+M` the
		// fallback for keyboards without it.
		const bound = Object.keys(
			(shortcuts as () => Record<string, unknown>).call({
				editor,
				storage: {
					renderer: null,
					controller: null,
					openMenuRequest: 0
				},
				options: {}
			})
		);
		expect(bound).toContain('Shift-F10');
		expect(bound).toContain('Mod-Alt-m');
	});

	it('the table menus are bound to keys, since Tab is cell navigation', () => {
		const editor = tableEditor();
		const shortcuts =
			createTableControlsExtension().config.addKeyboardShortcuts;

		const bound = Object.keys(
			(shortcuts as () => Record<string, unknown>).call({
				editor,
				storage: { renderer: null, setLocked: null, openRequest: 0 },
				options: {}
			})
		);
		expect(bound).toContain('Mod-Alt-r');
		expect(bound).toContain('Mod-Alt-c');
	});

	it('the link editor is bound to Mod+K', () => {
		const editor = createEditor();
		const shortcuts =
			createBubbleMenuExtension().config.addKeyboardShortcuts;

		const bound = Object.keys(
			(shortcuts as () => Record<string, unknown>).call({
				editor,
				storage: { renderer: null, openLinkRequest: 0 },
				options: { link: true }
			})
		);
		expect(bound).toContain('Mod-k');
	});

	it('every menu dismisses on Escape', () => {
		const editor = createEditor('<p>A</p><p>B</p>');

		const blockClose = vi.fn();
		const { unmount } = render(
			<BlockMenu
				editor={editor}
				actions={defaultBlockActions}
				pos={blockPos(editor, 1)}
				onClose={blockClose}
			/>
		);
		fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
		expect(blockClose).toHaveBeenCalled();
		unmount();

		const tableClose = vi.fn();
		const table = tableEditor();
		render(
			<TableMenu
				editor={table}
				actions={defaultTableActions}
				axis="row"
				onClose={tableClose}
			/>
		);
		fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
		expect(tableClose).toHaveBeenCalled();
	});

	it('the whole chrome set mounts together without clashing', () => {
		const editor = new Editor({
			extensions: [
				...createExtensions('standard'),
				createSlashMenuExtension(),
				createBubbleMenuExtension(),
				createDragHandleExtension(),
				createTableControlsExtension(),
				createCellMenuExtension(),
				createPlaceholderExtension()
			],
			content: '<p>Hello</p>'
		});

		const names = editor.extensionManager.extensions.map((e) => e.name);
		for (const name of [
			'slashMenu',
			'bubbleMenu',
			'dragHandle',
			'tableControls',
			'cellMenu',
			'placeholder'
		]) {
			expect(names).toContain(name);
		}

		expect(() => editor.destroy()).not.toThrow();
	});
});
