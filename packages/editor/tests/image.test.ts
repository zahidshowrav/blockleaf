import { Editor } from '@tiptap/core';
import { describe, expect, it } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';
import { sanitizeSrc } from '../src/core/nodes/image.js';

const editorWith = (content: string): Editor =>
	new Editor({ extensions: createExtensions('standard'), content });

describe('image src sanitisation (MC-04)', () => {
	it('accepts https URLs', () => {
		expect(sanitizeSrc('https://cdn.test/a.png')).toBe(
			'https://cdn.test/a.png'
		);
		expect(sanitizeSrc('https://cdn.test/a.png?w=800#x')).toBe(
			'https://cdn.test/a.png?w=800#x'
		);
	});

	it('accepts site-relative and relative paths', () => {
		expect(sanitizeSrc('/uploads/a.png')).toBe('/uploads/a.png');
		expect(sanitizeSrc('img/a.png')).toBe('img/a.png');
	});

	it('accepts base64 data URLs for raster formats', () => {
		for (const type of ['png', 'jpeg', 'gif', 'webp', 'avif']) {
			const url = `data:image/${type};base64,AAAA`;
			expect(sanitizeSrc(url)).toBe(url);
		}
	});

	it('rejects javascript: above all', () => {
		expect(sanitizeSrc('javascript:alert(1)')).toBeNull();
		expect(sanitizeSrc('  JavaScript:alert(1)  ')).toBeNull();
	});

	// An SVG is a document, not a bitmap.
	it('rejects svg data URLs while accepting raster ones', () => {
		expect(sanitizeSrc('data:image/svg+xml;base64,AAAA')).toBeNull();
		expect(sanitizeSrc('data:image/svg+xml,<svg/>')).toBeNull();
		expect(sanitizeSrc('data:text/html;base64,AAAA')).toBeNull();
	});

	// A blob URL points into one browser session and is dead on reload.
	it('rejects blob URLs, which must never be stored', () => {
		expect(
			sanitizeSrc('blob:https://app.test/4f1e-8a2b-9c3d-0e5f')
		).toBeNull();
	});

	it('rejects http and protocol-relative URLs', () => {
		expect(sanitizeSrc('http://cdn.test/a.png')).toBeNull();
		expect(sanitizeSrc('//cdn.test/a.png')).toBeNull();
	});

	it('rejects empty and whitespace-only values', () => {
		expect(sanitizeSrc('')).toBeNull();
		expect(sanitizeSrc('   ')).toBeNull();
	});
});

describe('image node (MC-04)', () => {
	it('registers in the standard preset and carries a unique id', () => {
		const editor = editorWith('<p></p>');
		expect(editor.schema.nodes.image).toBeDefined();

		editor.commands.setImage({ src: 'https://cdn.test/a.png' });
		const image = editor
			.getJSON()
			.content?.find((node) => node.type === 'image');

		expect(image).toBeDefined();
		expect(image?.attrs?.src).toBe('https://cdn.test/a.png');
		expect(typeof image?.attrs?.id).toBe('string');
		editor.destroy();
	});

	it('stores alt, width and alignment', () => {
		const editor = editorWith('<p></p>');
		editor.commands.setImage({
			src: 'https://cdn.test/a.png',
			alt: 'A test image',
			width: 1200,
			align: 'center'
		});

		const image = editor
			.getJSON()
			.content?.find((node) => node.type === 'image');

		expect(image?.attrs?.alt).toBe('A test image');
		expect(image?.attrs?.width).toBe(1200);
		expect(image?.attrs?.align).toBe('center');
		editor.destroy();
	});

	it('refuses to insert an unsafe src', () => {
		const editor = editorWith('<p></p>');
		expect(editor.commands.setImage({ src: 'javascript:alert(1)' })).toBe(
			false
		);
		expect(
			editor.getJSON().content?.some((node) => node.type === 'image')
		).toBe(false);
		editor.destroy();
	});

	it('drops an unsafe img on parse rather than storing a null src', () => {
		const editor = editorWith(
			'<p>before</p><img src="javascript:alert(1)"><p>after</p>'
		);
		const types = editor.getJSON().content?.map((node) => node.type);

		expect(types).not.toContain('image');
		expect(types).toContain('paragraph');
		editor.destroy();
	});

	it('parses a safe img from pasted HTML', () => {
		const editor = editorWith(
			'<img src="https://cdn.test/a.png" alt="Alt" width="640">'
		);
		const image = editor
			.getJSON()
			.content?.find((node) => node.type === 'image');

		expect(image?.attrs?.src).toBe('https://cdn.test/a.png');
		expect(image?.attrs?.alt).toBe('Alt');
		expect(image?.attrs?.width).toBe(640);
		editor.destroy();
	});

	it('keeps an empty alt, which marks the image decorative', () => {
		const editor = editorWith('<img src="https://cdn.test/a.png" alt="">');
		const image = editor
			.getJSON()
			.content?.find((node) => node.type === 'image');

		expect(image?.attrs?.alt).toBe('');
		expect(editor.getHTML()).toContain('alt=""');
		editor.destroy();
	});

	it('ignores a width that is not a positive number', () => {
		const editor = editorWith(
			'<img src="https://cdn.test/a.png" width="-20">'
		);
		const image = editor
			.getJSON()
			.content?.find((node) => node.type === 'image');

		expect(image?.attrs?.width).toBeNull();
		editor.destroy();
	});

	it('ignores an unrecognised alignment', () => {
		const editor = editorWith(
			'<img src="https://cdn.test/a.png" data-align="sideways">'
		);
		const image = editor
			.getJSON()
			.content?.find((node) => node.type === 'image');

		expect(image?.attrs?.align).toBeNull();
		editor.destroy();
	});

	it('round-trips through HTML', () => {
		const editor = editorWith('<p></p>');
		editor.commands.setImage({
			src: 'https://cdn.test/a.png',
			alt: 'Alt',
			align: 'right'
		});

		const html = editor.getHTML();
		expect(html).toContain('src="https://cdn.test/a.png"');
		expect(html).toContain('data-align="right"');
		expect(html).toContain('class="blockleaf-image"');

		const reparsed = editorWith(html);
		const image = reparsed
			.getJSON()
			.content?.find((node) => node.type === 'image');
		expect(image?.attrs?.align).toBe('right');

		editor.destroy();
		reparsed.destroy();
	});
});

describe('image commands (MC-04)', () => {
	it('updates alignment on the selected image', () => {
		const editor = editorWith('<img src="https://cdn.test/a.png">');
		editor.commands.selectAll();
		editor.commands.setImageAlign('center');

		const image = editor
			.getJSON()
			.content?.find((node) => node.type === 'image');
		expect(image?.attrs?.align).toBe('center');
		editor.destroy();
	});

	it('updates alt text on the selected image', () => {
		const editor = editorWith('<img src="https://cdn.test/a.png">');
		editor.commands.selectAll();
		editor.commands.updateImage({ alt: 'Described' });

		const image = editor
			.getJSON()
			.content?.find((node) => node.type === 'image');
		expect(image?.attrs?.alt).toBe('Described');
		editor.destroy();
	});

	it('refuses to update to an unsafe src', () => {
		const editor = editorWith('<img src="https://cdn.test/a.png">');
		editor.commands.selectAll();

		expect(
			editor.commands.updateImage({ src: 'javascript:alert(1)' })
		).toBe(false);
		const image = editor
			.getJSON()
			.content?.find((node) => node.type === 'image');
		expect(image?.attrs?.src).toBe('https://cdn.test/a.png');
		editor.destroy();
	});
});
