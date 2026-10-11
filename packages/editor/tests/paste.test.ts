import { Editor } from '@tiptap/core';
import { Slice } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';
import {
	isMarkdownText,
	markdownToHTML,
	normalizePastedHTML
} from '../src/core/paste.js';

describe('paste normalisation (EC-08)', () => {
	describe('normalizePastedHTML', () => {
		it('strips script, style, and meta tags from HTML', () => {
			const raw =
				'<div><script>alert("xss")</script><style>body{color:red}</style><meta charset="utf-8"><p>Valid content</p></div>';
			const cleaned = normalizePastedHTML(raw);
			expect(cleaned).not.toContain('alert');
			expect(cleaned).not.toContain('<script>');
			expect(cleaned).not.toContain('<style>');
			expect(cleaned).not.toContain('<meta');
			expect(cleaned).toContain('<p>Valid content</p>');
		});

		it('caps headings 4, 5, 6 to level 3', () => {
			const raw = '<h4>Level 4</h4><h5>Level 5</h5><h6>Level 6</h6>';
			const cleaned = normalizePastedHTML(raw);
			expect(cleaned).toContain('<h3>Level 4</h3>');
			expect(cleaned).toContain('<h3>Level 5</h3>');
			expect(cleaned).toContain('<h3>Level 6</h3>');
			expect(cleaned).not.toContain('<h4>');
			expect(cleaned).not.toContain('<h5>');
			expect(cleaned).not.toContain('<h6>');
		});

		it('normalises Google Docs font-weight spans', () => {
			const raw =
				'<span style="font-weight: 700;">Google Docs Bold</span><b style="font-weight: normal;">Unbolded</b>';
			const cleaned = normalizePastedHTML(raw);
			expect(cleaned).toContain('<strong>Google Docs Bold</strong>');
			expect(cleaned).toContain('Unbolded');
			expect(cleaned).not.toContain('font-weight');
		});
	});

	describe('isMarkdownText', () => {
		it('detects markdown block markers and inlines', () => {
			expect(isMarkdownText('# Heading 1')).toBe(true);
			expect(isMarkdownText('## Heading 2')).toBe(true);
			expect(isMarkdownText('> Blockquote')).toBe(true);
			expect(isMarkdownText('- List item')).toBe(true);
			expect(isMarkdownText('1. Ordered item')).toBe(true);
			expect(isMarkdownText('[ ] Task item')).toBe(true);
			expect(isMarkdownText('::: Callout text')).toBe(true);
			expect(isMarkdownText('```ts\nconst x = 1;\n```')).toBe(true);
			expect(isMarkdownText('Some **bold text** in paragraph')).toBe(
				true
			);
			expect(
				isMarkdownText('Check [docs](https://example.com) for details')
			).toBe(true);
		});

		it('returns false for ordinary text', () => {
			expect(
				isMarkdownText(
					'This is a normal paragraph of text without any markdown markers.'
				)
			).toBe(false);
			expect(isMarkdownText('')).toBe(false);
		});
	});

	describe('markdownToHTML', () => {
		it('converts markdown blocks to semantic HTML', () => {
			const md =
				'# Title\n\n> Quote\n\n- Item 1\n- Item 2\n\n::: Note\n\n[ ] Task\n\n```js\nconsole.log(1)\n```';
			const html = markdownToHTML(md);

			expect(html).toContain('<h1>Title</h1>');
			expect(html).toContain('<blockquote><p>Quote</p></blockquote>');
			expect(html).toContain('<ul><li><p>Item 1</p></li>');
			expect(html).toContain(
				'<div data-type="callout"><p>Note</p></div>'
			);
			expect(html).toContain('<ul data-type="taskList">');
			expect(html).toContain('<pre><code class="language-js">');
		});

		it('sanitises links in markdownToHTML', () => {
			const md =
				'[safe link](https://blockleaf.dev) and [unsafe link](javascript:alert(1))';
			const html = markdownToHTML(md);

			expect(html).toContain(
				'<a href="https://blockleaf.dev">safe link</a>'
			);
			expect(html).not.toContain('javascript:');
			expect(html).toContain('unsafe link');
		});
	});

	describe('editor paste integration', () => {
		it('normalises pasted HTML headings and clean tags in editor', () => {
			const editor = new Editor({
				extensions: createExtensions('standard'),
				content: '<p></p>'
			});

			const dirtyHTML = '<h4>Subheading</h4><script>alert(1)</script>';
			editor.commands.setContent(normalizePastedHTML(dirtyHTML));

			const json = editor.getJSON();
			expect(json.content?.[0]?.type).toBe('heading');
			expect(json.content?.[0]?.attrs?.level).toBe(3);
			expect(JSON.stringify(json)).not.toContain('alert');

			editor.destroy();
		});

		it('handles plain text markdown paste via pasteNormalizer', () => {
			const editor = new Editor({
				extensions: createExtensions('standard'),
				content: '<p></p>'
			});

			const md = '## Pasted Heading\n\n- First point\n- Second point';
			const pasteEvent = new Event('paste', {
				bubbles: true,
				cancelable: true
			}) as unknown as ClipboardEvent;
			Object.defineProperty(pasteEvent, 'clipboardData', {
				value: {
					getData: (format: string) => {
						if (format === 'text/plain') return md;
						return '';
					}
				}
			});

			editor.view.someProp('handlePaste', (f) =>
				f(editor.view, pasteEvent, Slice.empty)
			);

			const json = editor.getJSON();
			expect(json.content?.some((n) => n.type === 'heading')).toBe(true);
			expect(json.content?.some((n) => n.type === 'bulletList')).toBe(
				true
			);

			editor.destroy();
		});
	});
});
