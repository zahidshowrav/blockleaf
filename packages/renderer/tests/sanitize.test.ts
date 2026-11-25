import { describe, expect, it } from 'vitest';

import {
	EMBED_PROVIDERS,
	embedProviderOf as editorEmbedProvider
} from '@blockleaf/editor/embeds';
import {
	sanitizeHref as editorHref,
	sanitizeSrc as editorSrc
} from '@blockleaf/editor/extensions';
import { sanitizeMediaSrc as editorMediaSrc } from '@blockleaf/editor/media';

import {
	embedProviderOf,
	sanitizeHref,
	sanitizeMediaSrc,
	sanitizeSrc
} from '../src/sanitize.js';

/**
 * The renderer carries its own copy of the editor's URL rules, because it
 * reads documents the editor did not write and cannot assume they were ever
 * sanitised. Copies drift, so every vector runs through both implementations
 * and they must agree. See F15.
 */

const HREFS = [
	'https://example.com',
	'https://example.com/a?b=c#d',
	'mailto:someone@example.com',
	'/docs/getting-started',
	'#section',
	'docs/getting-started',
	'',
	'   ',
	'javascript:alert(1)',
	'JavaScript:alert(1)',
	'  javascript:alert(1)  ',
	'data:text/html,<script>alert(1)</script>',
	'vbscript:msgbox(1)',
	'//evil.example.com',
	'http://example.com',
	'file:///etc/passwd'
];

const SRCS = [
	'https://example.com/a.png',
	'/uploads/a.png',
	'uploads/a.png',
	'data:image/png;base64,iVBORw0KGgo=',
	'data:image/webp;base64,UklGRg==',
	'data:image/svg+xml;base64,PHN2Zz4=',
	'data:text/html;base64,PHNjcmlwdD4=',
	'blob:https://example.com/abc-123',
	'http://example.com/a.png',
	'//example.com/a.png',
	'javascript:alert(1)',
	'',
	'   '
];

describe('sanitizeHref agrees with the editor', () => {
	it.each(HREFS)('%j', (href) => {
		expect(sanitizeHref(href)).toBe(editorHref(href));
	});
});

describe('sanitizeSrc agrees with the editor', () => {
	it.each(SRCS)('%j', (src) => {
		expect(sanitizeSrc(src)).toBe(editorSrc(src));
	});
});

describe('the rules themselves', () => {
	it.each([
		'javascript:alert(1)',
		'JavaScript:alert(1)',
		'data:text/html,<script>alert(1)</script>',
		'vbscript:msgbox(1)',
		'//evil.example.com',
		'http://example.com',
		'file:///etc/passwd',
		''
	])('rejects %j as an href', (href) => {
		expect(sanitizeHref(href)).toBeNull();
	});

	it.each([
		'blob:https://example.com/abc',
		'data:image/svg+xml;base64,PHN2Zz4=',
		'data:text/html;base64,PHNjcmlwdD4=',
		'http://example.com/a.png',
		'//example.com/a.png',
		'javascript:alert(1)',
		''
	])('rejects %j as an image source', (src) => {
		expect(sanitizeSrc(src)).toBeNull();
	});
});

describe('sanitizeMediaSrc agrees with the editor (F29)', () => {
	it.each([
		...SRCS,
		'https://cdn.test/a.mp4',
		'/uploads/a.mp3',
		'media/a.pdf',
		'data:video/mp4;base64,AAAA',
		'data:application/pdf;base64,JVBERi0='
	])('%j', (src) => {
		expect(sanitizeMediaSrc(src)).toBe(editorMediaSrc(src));
	});

	it('refuses every data URL, raster images included', () => {
		expect(
			sanitizeMediaSrc('data:image/png;base64,iVBORw0KGgo=')
		).toBeNull();
	});
});

describe('embedProviderOf agrees with the editor', () => {
	it.each([
		'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
		'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90',
		'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1',
		'https://www.youtube.com/embed/dQw4w9WgXcQ',
		'http://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
		'https://www.youtube-nocookie.com.evil.test/embed/dQw4w9WgXcQ',
		'https://player.vimeo.com/video/76979871',
		'https://player.vimeo.com/video/76979871?h=af1d2c3b4e',
		'https://player.vimeo.com/video/abc',
		'https://www.loom.com/embed/0123456789abcdef0123456789abcdef',
		'https://www.loom.com/share/0123456789abcdef0123456789abcdef',
		'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC',
		'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
		'https://codepen.io/someone/embed/abcDEF1',
		'https://codepen.io/someone/pen/abcDEF1',
		'javascript:alert(1)',
		'https://evil.test',
		''
	])('%j', (src) => {
		expect(embedProviderOf(src)).toBe(editorEmbedProvider(src));
	});

	it('knows the same providers', () => {
		expect(
			Object.keys(EMBED_PROVIDERS).map((provider) =>
				embedProviderOf(
					{
						youtube:
							'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
						vimeo: 'https://player.vimeo.com/video/1',
						loom: 'https://www.loom.com/embed/0123456789abcdef0123456789abcdef',
						spotify:
							'https://open.spotify.com/embed/show/4uLU6hMCjMI75M1A2tKUQC',
						codepen: 'https://codepen.io/a/embed/b'
					}[provider] ?? ''
				)
			)
		).toEqual(Object.keys(EMBED_PROVIDERS));
	});
});
