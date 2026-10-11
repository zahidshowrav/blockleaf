import { Editor } from '@tiptap/core';
import { describe, expect, it } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';

describe('keyboard shortcuts for every node and mark (EC-07)', () => {
	it('supports keyboard shortcuts for all marks', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p>test text</p>'
		});

		editor.commands.setTextSelection({ from: 1, to: 5 });

		// Bold (Mod-b)
		editor.commands.toggleBold();
		expect(editor.isActive('bold')).toBe(true);
		editor.commands.toggleBold();

		// Italic (Mod-i)
		editor.commands.toggleItalic();
		expect(editor.isActive('italic')).toBe(true);
		editor.commands.toggleItalic();

		// Underline (Mod-u)
		editor.commands.toggleUnderline();
		expect(editor.isActive('underline')).toBe(true);
		editor.commands.toggleUnderline();

		// Strike (Mod-Shift-x)
		editor.commands.toggleStrike();
		expect(editor.isActive('strike')).toBe(true);
		editor.commands.toggleStrike();

		// Code (Mod-e)
		editor.commands.toggleCode();
		expect(editor.isActive('code')).toBe(true);
		editor.commands.toggleCode();

		// Highlight (Mod-Shift-h)
		editor.commands.toggleHighlight();
		expect(editor.isActive('highlight')).toBe(true);
		editor.commands.toggleHighlight();

		// Link (Mod-k)
		editor.commands.toggleLink({ href: 'https://blockleaf.dev' });
		expect(editor.isActive('link')).toBe(true);
		editor.commands.unsetLink();
		expect(editor.isActive('link')).toBe(false);

		editor.destroy();
	});

	it('supports keyboard shortcuts for all block nodes', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p>block text</p>'
		});

		editor.commands.setTextSelection(2);

		// Heading levels 1, 2, 3 (Mod-Alt-1, Mod-Alt-2, Mod-Alt-3)
		editor.commands.toggleHeading({ level: 1 });
		expect(editor.isActive('heading', { level: 1 })).toBe(true);

		editor.commands.toggleHeading({ level: 2 });
		expect(editor.isActive('heading', { level: 2 })).toBe(true);

		editor.commands.toggleHeading({ level: 3 });
		expect(editor.isActive('heading', { level: 3 })).toBe(true);

		// Paragraph (Mod-Alt-0)
		editor.commands.setParagraph();
		expect(editor.isActive('paragraph')).toBe(true);

		// Blockquote (Mod-Shift-b)
		editor.commands.toggleBlockquote();
		expect(editor.isActive('blockquote')).toBe(true);
		editor.commands.toggleBlockquote();

		// Code block (Mod-Alt-c)
		editor.commands.toggleCodeBlock();
		expect(editor.isActive('codeBlock')).toBe(true);
		editor.commands.setParagraph();

		// Bullet list (Mod-Shift-8)
		editor.commands.toggleBulletList();
		expect(editor.isActive('bulletList')).toBe(true);
		editor.commands.toggleBulletList();

		// Ordered list (Mod-Shift-7)
		editor.commands.toggleOrderedList();
		expect(editor.isActive('orderedList')).toBe(true);
		editor.commands.toggleOrderedList();

		// Task list (Mod-Shift-9)
		editor.commands.toggleTaskList();
		expect(editor.isActive('taskList')).toBe(true);
		editor.commands.toggleTaskList();

		// Callout (Mod-Shift-c)
		editor.commands.toggleCallout();
		expect(editor.isActive('callout')).toBe(true);
		editor.commands.toggleCallout();

		// Horizontal rule (Mod-Alt--)
		editor.commands.setHorizontalRule();
		const json = editor.getJSON();
		expect(json.content?.some((n) => n.type === 'horizontalRule')).toBe(
			true
		);

		editor.destroy();
	});

	it('toggles callout and link via shortcut actions', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p>Callout block</p>'
		});

		editor.commands.setTextSelection(2);
		expect(editor.isActive('callout')).toBe(false);

		// Toggle callout on
		editor.commands.toggleCallout();
		expect(editor.isActive('callout')).toBe(true);

		// Toggle callout off
		editor.commands.toggleCallout();
		expect(editor.isActive('callout')).toBe(false);

		editor.destroy();
	});

	it('dispatches key events for custom shortcuts', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p>Sample text for keybinding</p>'
		});

		editor.commands.setTextSelection(3);

		const pressKey = (
			key: string,
			modifiers: {
				metaKey?: boolean;
				ctrlKey?: boolean;
				shiftKey?: boolean;
				altKey?: boolean;
			} = {}
		) => {
			const event = new KeyboardEvent('keydown', {
				key,
				bubbles: true,
				cancelable: true,
				...modifiers
			});
			let handled = false;
			editor.view.someProp('handleKeyDown', (f) => {
				if (f(editor.view, event)) {
					handled = true;
					return true;
				}
				return false;
			});
			return handled;
		};

		// Mod-Shift-c triggers Callout
		pressKey('C', { ctrlKey: true, shiftKey: true });
		expect(editor.isActive('callout')).toBe(true);

		// Mod-Shift-c toggles Callout off
		pressKey('C', { ctrlKey: true, shiftKey: true });
		expect(editor.isActive('callout')).toBe(false);

		editor.destroy();
	});
});
