import { Extension } from '@tiptap/core';
import { DOMParser as PMDOMParser } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';

import { sanitizeHref } from './marks/link.js';

/**
 * Normalises pasted HTML into markup compatible with the Blockleaf schema.
 *
 * - Strips `<script>`, `<style>`, `<meta>`, and HTML comments.
 * - Caps headings deeper than level 3 to `<h3>`.
 * - Cleans Google Docs / Word style artifacts (e.g. bold spans).
 */
export const normalizePastedHTML = (html: string): string => {
	let clean = html;

	// Strip script, style, and meta tags
	clean = clean.replace(
		/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
		''
	);
	clean = clean.replace(
		/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
		''
	);
	clean = clean.replace(/<meta\b[^>]*>/gi, '');
	clean = clean.replace(/<!--[\s\S]*?-->/g, '');

	// Google Docs: unwrap spans with font-weight: normal inside bold tags
	clean = clean.replace(
		/<b\b[^>]*style="[^"]*font-weight:\s*normal[^"]*"[^>]*>([\s\S]*?)<\/b>/gi,
		'$1'
	);

	// Google Docs: convert font-weight: 700 / bold spans to strong
	clean = clean.replace(
		/<span\b[^>]*style="[^"]*font-weight:\s*(?:700|bold)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
		'<strong>$1</strong>'
	);

	// Cap headings: <h4>, <h5>, <h6> become <h3>
	clean = clean.replace(/<h[4-6]\b([^>]*)>/gi, '<h3$1>');
	clean = clean.replace(/<\/h[4-6]>/gi, '</h3>');

	return clean;
};

/**
 * Detects whether plain text looks like markdown.
 */
export const isMarkdownText = (text: string): boolean => {
	const trimmed = text.trim();
	if (!trimmed) return false;

	// Code block fence
	if (/```[\s\S]*?```/.test(trimmed)) return true;

	// Line-level markdown markers
	const lines = trimmed.split('\n');
	for (const line of lines) {
		const l = line.trim();
		if (/^#{1,3}\s+\S/.test(l)) return true;
		if (/^>\s+\S/.test(l)) return true;
		if (/^[-*+]\s+\S/.test(l)) return true;
		if (/^\d+\.\s+\S/.test(l)) return true;
		if (/^\[[ x]\]\s+\S/.test(l)) return true;
		if (/^:::\s+\S/.test(l)) return true;
		if (/^---+$/.test(l)) return true;
	}

	// Inline marks across the body
	if (/\*\*[^*]+\*\*/.test(trimmed)) return true;
	if (/~~[^~]+~~/.test(trimmed)) return true;
	if (/==[^=]+==/.test(trimmed)) return true;
	if (/\[[^\]]+\]\([^)]+\)/.test(trimmed)) return true;

	return false;
};

/**
 * Formats inline markdown elements into HTML.
 */
const formatInlines = (text: string): string => {
	let res = text;

	// Escape raw HTML entities in plain text
	res = res
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');

	// Code: `code`
	res = res.replace(/`([^`]+)`/g, '<code>$1</code>');

	// Bold: **text** or __text__
	res = res.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
	res = res.replace(/__([^_]+)__/g, '<strong>$1</strong>');

	// Italic: *text* or _text_
	res = res.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
	res = res.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');

	// Strike: ~~text~~
	res = res.replace(/~~([^~]+)~~/g, '<s>$1</s>');

	// Highlight: ==text==
	res = res.replace(/==([^=]+)==/g, '<mark>$1</mark>');

	// Markdown link: [text](url)
	res = res.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
		const sanitized = sanitizeHref(href);
		if (!sanitized) return label;
		return `<a href="${sanitized}">${label}</a>`;
	});

	return res;
};

/**
 * Converts a markdown plain-text string into Blockleaf-compatible HTML.
 */
export const markdownToHTML = (markdown: string): string => {
	const lines = markdown.split(/\r?\n/);
	const htmlBlocks: string[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i]!;

		// Code block
		if (line.trim().startsWith('```')) {
			const lang = line.trim().slice(3).trim();
			const codeLines: string[] = [];
			i++;
			while (i < lines.length && !lines[i]!.trim().startsWith('```')) {
				codeLines.push(lines[i]!);
				i++;
			}
			i++; // skip closing ```
			const langAttr = lang ? ` class="language-${lang}"` : '';
			const escapedCode = codeLines
				.join('\n')
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;');
			htmlBlocks.push(
				`<pre><code${langAttr}>${escapedCode}</code></pre>`
			);
			continue;
		}

		const trimmed = line.trim();

		// Empty line
		if (!trimmed) {
			i++;
			continue;
		}

		// Horizontal rule
		if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
			htmlBlocks.push('<hr>');
			i++;
			continue;
		}

		// Heading (levels 1–3)
		const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
		if (headingMatch) {
			const rawLevel = headingMatch[1]!.length;
			const level = Math.min(rawLevel, 3);
			htmlBlocks.push(
				`<h${level}>${formatInlines(headingMatch[2]!)}</h${level}>`
			);
			i++;
			continue;
		}

		// Blockquote
		if (trimmed.startsWith('>')) {
			const quoteLines: string[] = [];
			while (i < lines.length && lines[i]!.trim().startsWith('>')) {
				quoteLines.push(lines[i]!.trim().replace(/^>\s?/, ''));
				i++;
			}
			htmlBlocks.push(
				`<blockquote><p>${formatInlines(quoteLines.join(' '))}</p></blockquote>`
			);
			continue;
		}

		// Callout (::: admonition)
		if (trimmed.startsWith(':::')) {
			const calloutLines: string[] = [];
			const firstLine = trimmed.replace(/^:::\s?/, '');
			if (firstLine) calloutLines.push(firstLine);
			i++;
			while (
				i < lines.length &&
				!lines[i]!.trim().startsWith(':::') &&
				lines[i]!.trim() !== ''
			) {
				calloutLines.push(lines[i]!.trim());
				i++;
			}
			if (i < lines.length && lines[i]!.trim().startsWith(':::')) {
				i++; // skip closing :::
			}
			htmlBlocks.push(
				`<div data-type="callout"><p>${formatInlines(calloutLines.join(' '))}</p></div>`
			);
			continue;
		}

		// Task list: [ ] or [x]
		if (/^\[([ x])\]\s+(.*)$/.test(trimmed)) {
			const items: string[] = [];
			while (i < lines.length) {
				const match = lines[i]!.trim().match(/^\[([ x])\]\s+(.*)$/);
				if (!match) break;
				const checked = match[1] === 'x';
				items.push(
					`<li data-type="taskItem" data-checked="${checked}"><p>${formatInlines(match[2]!)}</p></li>`
				);
				i++;
			}
			htmlBlocks.push(`<ul data-type="taskList">${items.join('')}</ul>`);
			continue;
		}

		// Bullet list: - or * or +
		if (/^[-*+]\s+(.*)$/.test(trimmed)) {
			const items: string[] = [];
			while (i < lines.length) {
				const match = lines[i]!.trim().match(/^[-*+]\s+(.*)$/);
				if (!match) break;
				items.push(`<li><p>${formatInlines(match[1]!)}</p></li>`);
				i++;
			}
			htmlBlocks.push(`<ul>${items.join('')}</ul>`);
			continue;
		}

		// Ordered list: 1.
		if (/^\d+\.\s+(.*)$/.test(trimmed)) {
			const items: string[] = [];
			while (i < lines.length) {
				const match = lines[i]!.trim().match(/^\d+\.\s+(.*)$/);
				if (!match) break;
				items.push(`<li><p>${formatInlines(match[1]!)}</p></li>`);
				i++;
			}
			htmlBlocks.push(`<ol>${items.join('')}</ol>`);
			continue;
		}

		// Standard paragraph
		htmlBlocks.push(`<p>${formatInlines(trimmed)}</p>`);
		i++;
	}

	return htmlBlocks.join('');
};

/**
 * Extension that normalises pasted HTML and converts plain-text markdown paste.
 */
export const PasteNormalizer = Extension.create({
	name: 'pasteNormalizer',

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey('pasteNormalizer'),
				props: {
					transformPastedHTML(html) {
						return normalizePastedHTML(html);
					},
					handlePaste(view, event) {
						const text = event.clipboardData?.getData('text/plain');
						const html = event.clipboardData?.getData('text/html');

						// Only parse markdown when pasting plain text (or when HTML is empty)
						if (!html && text && isMarkdownText(text)) {
							const parsedHTML = markdownToHTML(text);
							if (typeof document !== 'undefined') {
								const parser = PMDOMParser.fromSchema(
									view.state.schema
								);
								const tempDiv = document.createElement('div');
								tempDiv.innerHTML = parsedHTML;
								const slice = parser.parseSlice(tempDiv);
								view.dispatch(
									view.state.tr.replaceSelection(slice)
								);
								return true;
							}
						}
						return false;
					}
				}
			})
		];
	}
});
