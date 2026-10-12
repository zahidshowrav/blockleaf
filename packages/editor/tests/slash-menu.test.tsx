import { render, screen, fireEvent, act } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import type { SuggestionKeyDownProps } from '@tiptap/suggestion';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createExtensions, createEmptyDocument } from '../src/core/index.js';
import {
	BlockleafEditor,
	SlashMenu,
	createCommandRegistry,
	defaultSlashCommands,
	type SlashCommand,
	type SlashMenuRef
} from '../src/ui/index.js';

describe('Slash menu command registry (CH-01)', () => {
	it('initializes with all 12 default commands', () => {
		const registry = createCommandRegistry();
		const commands = registry.getAll();

		expect(commands).toHaveLength(12);
		const ids = commands.map((c) => c.id);
		expect(ids).toEqual([
			'paragraph',
			'heading-1',
			'heading-2',
			'heading-3',
			'bullet-list',
			'ordered-list',
			'task-list',
			'blockquote',
			'code-block',
			'callout',
			'divider',
			'table'
		]);
	});

	it('retrieves commands by id with get()', () => {
		const registry = createCommandRegistry();
		expect(registry.get('heading-1')?.title).toBe('Heading 1');
		expect(registry.get('non-existent')).toBeUndefined();
	});

	it('adds commands and supports before, after, and index options', () => {
		const registry = createCommandRegistry();
		const customCommand: SlashCommand = {
			id: 'custom-item',
			title: 'Custom item',
			group: 'Basic blocks',
			run: vi.fn()
		};

		registry.add(customCommand, { before: 'heading-1' });
		const ids = registry.getAll().map((c) => c.id);
		const customIdx = ids.indexOf('custom-item');
		const h1Idx = ids.indexOf('heading-1');
		expect(customIdx).toBe(h1Idx - 1);

		// Reposition with after
		registry.add(customCommand, { after: 'table' });
		const reorderedIds = registry.getAll().map((c) => c.id);
		const tableIdx = reorderedIds.indexOf('table');
		expect(reorderedIds.indexOf('custom-item')).toBe(tableIdx + 1);

		// Insert at exact index
		registry.add(customCommand, { index: 0 });
		expect(registry.getAll()[0]?.id).toBe('custom-item');
	});

	it('removes commands by id', () => {
		const registry = createCommandRegistry();
		registry.remove('divider');
		expect(registry.get('divider')).toBeUndefined();
		expect(registry.getAll()).toHaveLength(11);
	});

	it('reorders commands given an array of ids', () => {
		const registry = createCommandRegistry();
		registry.reorder(['table', 'task-list']);
		const ids = registry.getAll().map((c) => c.id);
		expect(ids[0]).toBe('table');
		expect(ids[1]).toBe('task-list');
		expect(ids).toHaveLength(12);
	});

	it('filters commands by query across titles, aliases, keywords, and descriptions', () => {
		const registry = createCommandRegistry();

		// Empty query returns all commands
		expect(registry.filter('')).toHaveLength(12);
		expect(registry.filter('   ')).toHaveLength(12);

		// Exact title matches rank highest
		const textResults = registry.filter('text');
		expect(textResults[0]?.id).toBe('paragraph');

		// Alias matching
		const h1Results = registry.filter('h1');
		expect(h1Results[0]?.id).toBe('heading-1');

		const todoResults = registry.filter('todo');
		expect(todoResults[0]?.id).toBe('task-list');

		const hrResults = registry.filter('hr');
		expect(hrResults[0]?.id).toBe('divider');

		// Keyword matching
		const quoteResults = registry.filter('citation');
		expect(quoteResults[0]?.id).toBe('blockquote');

		// Prefix matching
		const headingResults = registry.filter('head');
		expect(headingResults.slice(0, 3).map((c) => c.id)).toEqual([
			'heading-1',
			'heading-2',
			'heading-3'
		]);

		// Unmatched query
		expect(registry.filter('completely-nonexistent-string')).toEqual([]);
	});

	it('clones an independent copy of the registry', () => {
		const original = createCommandRegistry();
		const clone = original.clone();
		clone.remove('paragraph');

		expect(clone.get('paragraph')).toBeUndefined();
		expect(original.get('paragraph')).toBeDefined();
	});
});

describe('Default slash commands execution', () => {
	it('executes each default command against an active editor', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p>Initial text</p>'
		});

		const reset = () => {
			editor.commands.setContent('<p>Initial text</p>');
			editor.commands.focus();
		};

		try {
			// Test paragraph
			reset();
			const paragraphCmd = defaultSlashCommands.find(
				(c) => c.id === 'paragraph'
			);
			paragraphCmd?.run(editor);
			expect(editor.isActive('paragraph')).toBe(true);

			// Test heading 1
			reset();
			const h1Cmd = defaultSlashCommands.find(
				(c) => c.id === 'heading-1'
			);
			h1Cmd?.run(editor);
			expect(editor.isActive('heading', { level: 1 })).toBe(true);

			// Test heading 2
			reset();
			const h2Cmd = defaultSlashCommands.find(
				(c) => c.id === 'heading-2'
			);
			h2Cmd?.run(editor);
			expect(editor.isActive('heading', { level: 2 })).toBe(true);

			// Test heading 3
			reset();
			const h3Cmd = defaultSlashCommands.find(
				(c) => c.id === 'heading-3'
			);
			h3Cmd?.run(editor);
			expect(editor.isActive('heading', { level: 3 })).toBe(true);

			// Test bullet list
			reset();
			const bulletCmd = defaultSlashCommands.find(
				(c) => c.id === 'bullet-list'
			);
			bulletCmd?.run(editor);
			expect(editor.isActive('bulletList')).toBe(true);

			// Test ordered list
			reset();
			const orderedCmd = defaultSlashCommands.find(
				(c) => c.id === 'ordered-list'
			);
			orderedCmd?.run(editor);
			expect(editor.isActive('orderedList')).toBe(true);

			// Test task list
			reset();
			const taskCmd = defaultSlashCommands.find(
				(c) => c.id === 'task-list'
			);
			taskCmd?.run(editor);
			expect(editor.isActive('taskList')).toBe(true);

			// Test blockquote
			reset();
			const quoteCmd = defaultSlashCommands.find(
				(c) => c.id === 'blockquote'
			);
			quoteCmd?.run(editor);
			expect(editor.isActive('blockquote')).toBe(true);

			// Test code block
			reset();
			const codeCmd = defaultSlashCommands.find(
				(c) => c.id === 'code-block'
			);
			codeCmd?.run(editor);
			expect(editor.isActive('codeBlock')).toBe(true);

			// Test callout
			reset();
			const calloutCmd = defaultSlashCommands.find(
				(c) => c.id === 'callout'
			);
			calloutCmd?.run(editor);
			expect(editor.isActive('callout')).toBe(true);

			// Test divider
			reset();
			const dividerCmd = defaultSlashCommands.find(
				(c) => c.id === 'divider'
			);
			dividerCmd?.run(editor);
			expect(
				editor
					.getJSON()
					.content?.some((n) => n.type === 'horizontalRule')
			).toBe(true);

			// Test table
			reset();
			const tableCmd = defaultSlashCommands.find((c) => c.id === 'table');
			tableCmd?.run(editor);
			expect(editor.isActive('table')).toBe(true);
		} finally {
			editor.destroy();
		}
	});
});

describe('<SlashMenu /> UI Component', () => {
	it('renders listbox with accessible groups, options, and active descendant', () => {
		const mockCommand = vi.fn();
		const ref = createRef<SlashMenuRef>();

		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		try {
			render(
				<SlashMenu
					ref={ref}
					items={defaultSlashCommands}
					command={mockCommand}
					editor={editor}
					range={{ from: 1, to: 2 }}
					query=""
				/>
			);

			const listbox = screen.getByRole('listbox', {
				name: 'Slash commands'
			});
			expect(listbox).not.toBeNull();
			expect(listbox.getAttribute('aria-activedescendant')).toBe(
				'blockleaf-slash-item-paragraph'
			);

			// Group headers
			expect(
				screen.getByRole('group', { name: 'Basic blocks' })
			).not.toBeNull();
			expect(
				screen.getByRole('group', { name: 'Headings' })
			).not.toBeNull();
			expect(screen.getByRole('group', { name: 'Lists' })).not.toBeNull();
			expect(
				screen.getByRole('group', { name: 'Advanced' })
			).not.toBeNull();

			// Options
			const options = screen.getAllByRole('option');
			expect(options).toHaveLength(12);
			expect(options[0]?.getAttribute('aria-selected')).toBe('true');
			expect(options[1]?.getAttribute('aria-selected')).toBe('false');
		} finally {
			editor.destroy();
		}
	});

	it('navigates through options with arrow keys and selects with Enter', () => {
		const mockCommand = vi.fn();
		const ref = createRef<SlashMenuRef>();

		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		try {
			const { container } = render(
				<SlashMenu
					ref={ref}
					items={defaultSlashCommands}
					command={mockCommand}
					editor={editor}
					range={{ from: 1, to: 2 }}
					query=""
				/>
			);

			// Press ArrowDown
			let arrowDownHandled = false;
			act(() => {
				arrowDownHandled =
					ref.current?.onKeyDown({
						event: new KeyboardEvent('keydown', {
							key: 'ArrowDown'
						})
					} as SuggestionKeyDownProps) ?? false;
			});
			expect(arrowDownHandled).toBe(true);

			const selectedOption = container.querySelector(
				'[aria-selected="true"]'
			);
			expect(selectedOption?.id).toBe('blockleaf-slash-item-heading-1');

			// Press Enter on current option
			let enterHandled = false;
			act(() => {
				enterHandled =
					ref.current?.onKeyDown({
						event: new KeyboardEvent('keydown', { key: 'Enter' })
					} as SuggestionKeyDownProps) ?? false;
			});
			expect(enterHandled).toBe(true);
			expect(mockCommand).toHaveBeenCalledWith(defaultSlashCommands[1]);
		} finally {
			editor.destroy();
		}
	});

	it('selects option when clicked', () => {
		const mockCommand = vi.fn();
		const ref = createRef<SlashMenuRef>();

		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		try {
			render(
				<SlashMenu
					ref={ref}
					items={defaultSlashCommands}
					command={mockCommand}
					editor={editor}
					range={{ from: 1, to: 2 }}
					query=""
				/>
			);

			const heading1Option = screen.getByRole('option', {
				name: /Heading 1/i
			});
			fireEvent.click(heading1Option);

			expect(mockCommand).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'heading-1' })
			);
		} finally {
			editor.destroy();
		}
	});

	it('renders empty status message when no commands match', () => {
		const mockCommand = vi.fn();
		const ref = createRef<SlashMenuRef>();

		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		try {
			render(
				<SlashMenu
					ref={ref}
					items={[]}
					command={mockCommand}
					editor={editor}
					range={{ from: 1, to: 5 }}
					query="xyz"
				/>
			);

			const status = screen.getByRole('status');
			expect(status.textContent).toContain('No results found');
			expect(
				ref.current?.onKeyDown({
					event: new KeyboardEvent('keydown', { key: 'Enter' })
				} as SuggestionKeyDownProps)
			).toBe(false);
		} finally {
			editor.destroy();
		}
	});
});

describe('<BlockleafEditor /> Slash menu integration', () => {
	it('mounts with slash menu enabled by default', () => {
		const { container } = render(
			<BlockleafEditor defaultValue={createEmptyDocument()} />
		);
		expect(container.querySelector('.blockleaf-editor')).not.toBeNull();
	});

	it('supports disabling slash menu via slashMenu={false}', () => {
		const { container } = render(
			<BlockleafEditor
				defaultValue={createEmptyDocument()}
				slashMenu={false}
			/>
		);
		expect(container.querySelector('.blockleaf-editor')).not.toBeNull();
	});

	it('supports customizing slash menu commands via slashItems function', () => {
		const customCommand: SlashCommand = {
			id: 'custom-promo',
			title: 'Promo banner',
			group: 'Advanced',
			run: vi.fn()
		};

		const { container } = render(
			<BlockleafEditor
				defaultValue={createEmptyDocument()}
				slashItems={(defaults) => [customCommand, ...defaults]}
			/>
		);
		expect(container.querySelector('.blockleaf-editor')).not.toBeNull();
	});
});
